/* visited-probe.mjs —— 读 `:visited` 到底画不画得出像素的量具（规范 §12 那句"墨色差"的第 0 问）
   为什么只能走像素：Blink/WebKit 出于反指纹，`getComputedStyle()` 对 `:visited` 返回**未访问值**
   ⇒ "读 computed color 证明它生效了"这条路原理上走不通；§12:982 那条"凡'跑一遍某把尺子'式的验收，
   必须先证明那把尺子读得到被测对象"在这里直接适用。剩下能读它的只有绘制结果 ⇒ 出图比像素。

   用法  node tools/visited-probe.mjs selftest                     # 先自证 PNG 解码与判读函数（口径抄 pixel-probe）
         node tools/visited-probe.mjs [--themes=light,dark] [--keep]   # 默认：headless Edge + CDP，访问由页内 click() 记
         node tools/visited-probe.mjs --headed                     # 同一把尺换真窗口：读得到，但整幅被显示色彩配置
                                                                   # 搬了 3–4 个单位 ⇒ 精确 hex 匹配失效，判读走形状计数
   ⚠️ 这台机器上跑过但**作废**的两条导航档，读数登记在下面那条边界里，脚本里没有第二份实现：
      ① `--screenshot` 两进程共享 `--user-data-dir`（拍→换进程真导航→再拍）：历史确实写进了 profile 的 History
         （库里的 URL 串核过），canary 仍然 0 枚 —— 进程之间的 visited 资格集没递过来。
      ② CDP `Page.navigate` 去访问、再 `Page.navigate` 回列表：同样 0 枚；**改成页内 `click()` 就画**（就是
         下面的 roundTrip）。⇒ "造已访问状态"必须由**渲染进程发起**的那一跳记下，这是最容易踩空的一格，
         所以 roundTrip 是本脚本唯一的 warm 方式，而 apiCanary 那一帧专门用来复现这条边界。
   本仓先例：CDP 写法照 tools/font-fallback-check.mjs:177，出图与 IHDR 自证照 tools/pixel-probe.mjs:76/:340。

   帧序（每个主题一套，同一个 profile 串行）：
     F1 plain   什么都没访问过                       → 未访问基线
     warm       真导航去 /essays/<slug>/             → 把那条地址写进历史
     F2 plain   再回 /essays/（先拍一拍、等 1.2s 再拍）→ 已访问档（Blink 的 visited 样式是历史查询异步回来才落的）
     F3 canary  服务端注入 a.row:visited{color:#FF00FF} → 正对照：证"通道张得开 + 注入真的落盘"
     F5 noop    服务端注入 a.row:visited{color:var(--ink)} → 期望零变化：证"已访问状态本身不引起假变化"
     F4 plain   同档再拍一次                          → 噪声底
   ⚠️ 判读不走"两帧阈值"，走三样绝对读数：① 变化像素的 (改前色→改后色) 众数对，② 变化区逐行归属（拿页内
   读到的 h3 rect 摆框；rect 不是 :visited 的受污属性，读它合法），③ 新色在整幅图里的精确像素数与 y 带。
   这样"行 1 变深、行 2/3 没动"是**读数**不是推断。

   ⚠️ 三条失效边界照抄 §17：只认 --force-prefers-reduced-motion 那一档；--virtual-time-budget 不是像素仪器
   （cli 档用它只为"等到渲染完"）；字形栅格化在两次出图之间会抖（§17 第 6 条，峰 |Δ|103）。
   ⚠️ 出图与 diff 一律落 %TEMP%，不进仓库（§17 第 5 条）。
*/
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync } from 'node:zlib';

const argv = process.argv.slice(2);
const ROUTE = (argv.find(a => a.startsWith('--route=')) || '--route=cdp').slice(8);
const flag = k => argv.includes(`--${k}`);
const die = (m, h) => { console.error(`\n✗ ${m}`); if (h) console.error(h); process.exit(1); };
const OPTROOT = (argv.find(a => a.startsWith('--root=')) || '').slice(7);
const ROOT = OPTROOT ? resolve(OPTROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
if (!existsSync(join(DIST, 'index.html'))) die(`没有产物 ${join(DIST, 'index.html')}`, '  先 `npm run build`；本脚本不读源码、只读 dist/');
const TARGET = '/essays/forest-blog/';            /* /essays/ 第一枚目录行的靶（产物行序 forest-blog → fog-debugging → slow-frontend） */

/* 色板从 base.css 现读，不写死（§17"色板真值只有 base.css 一份"）；抓块法抄 pixel-probe:76（行首锚定 + 配深度 + 物理对账） */
function readTokens() {
  const css = readFileSync(join(ROOT, 'src', 'styles', 'base.css'), 'utf8');
  const blockOf = re => { const m = re.exec(css); if (!m) return null; const o = css.indexOf('{', m.index); if (o < 0) return null;
    let d = 0, e = -1; for (let i = o; i < css.length; i++) { if (css[i] === '{') d++; else if (css[i] === '}' && --d === 0) { e = i; break; } }
    return e < 0 ? null : css.slice(o + 1, e); };
  const tok = (b, n) => { const m = b && new RegExp(`--${n}:\\s*(#[0-9A-Fa-f]{6})`).exec(b); return m ? m[1].toUpperCase() : null; };
  const L = blockOf(/^:root\s*\{/m), D = blockOf(/^html\[data-theme="dark"\]\s*\{/m);
  const out = { light: { ink: tok(L, 'ink'), read: tok(L, 'ink-visited'), base: tok(L, 'bg-base') }, dark: { ink: tok(D, 'ink'), read: tok(D, 'ink-visited'), base: tok(D, 'bg-base') } };
  for (const [k, v] of Object.entries(out)) if (!v.ink || !v.base) die(`${k} 读不到 --ink / --bg-base —— 色板真值不在 base.css 的那个块里？`);
  return out;
}
const TK = readTokens();

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env['PROGRAMFILES'] && join(process.env['PROGRAMFILES'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  process.env['LOCALAPPDATA'] && join(process.env['LOCALAPPDATA'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
];
const EDGE = EDGE_CANDIDATES.find(p => p && existsSync(p));
if (!EDGE) die(`找不到 msedge（试过 ${EDGE_CANDIDATES.join(' / ')}）`, '  换浏览器传 --edge=<路径>；这条不降级、不跳过');

/* 注入档只活在服务端内存里的那一次响应，仓库与 dist 一个字都不改（pixel-probe:22 同法）。
   canary 用 #FF00FF 是**故意违宪**的哨兵（§17 第 7 条"极端值自证"），不是要上线的色。
   noop 用 var(--ink) ⇒ 同主题同值，期望零变化。两条都带 !important，为了压过将来可能加的一切规则。 */
const INJECT = { plain: '', noop: 'a.row:visited{color:var(--ink) !important}', canary: 'a.row:visited{color:#FF00FF !important}',
  /* 正对照：不带 :visited 的同宿主同属性规则。它画不出来 ⇒ 死的是"注入+绘制"这一截，不是 visited */
  paintctl: 'a.row{color:#FF00FF !important}' };

/* ---------- PNG 解码（逐字抄 tools/pixel-probe.mjs 第 1 节）---------- */
const CHUNK_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const COLOR_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
function decodePng(buf) {
  if (buf.compare(CHUNK_SIG, 0, 8, 0, 8) !== 0) throw new Error('不是 PNG（签名不对）');
  let off = 8, ihdr = null, palette = null, idat = [], trns = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (off + 8 + len + 4 > buf.length) throw new Error(`chunk ${type} 越界`);
    if (crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])) !== buf.readUInt32BE(off + 8 + len)) throw new Error(`chunk ${type} 的 CRC 对不上`);
    if (type === 'IHDR') {
      ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], comp: data[10], filter: data[11], interlace: data[12] };
      if (ihdr.comp !== 0 || ihdr.filter !== 0) throw new Error('不支持的压缩/filter');
      if (ihdr.interlace !== 0) throw new Error(`隔行图不支持 interlace=${ihdr.interlace}`);
      if (ihdr.bitDepth !== 8) throw new Error(`只支持 8-bit，这是 ${ihdr.bitDepth}-bit`);
    } else if (type === 'PLTE') palette = data; else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data); else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr || !idat.length) throw new Error('没有 IHDR/IDAT');
  const ch = COLOR_CHANNELS[ihdr.colorType]; if (!ch) throw new Error(`不认识的颜色类型 ${ihdr.colorType}`);
  const raw = inflateSync(Buffer.concat(idat)), { width, height } = ihdr, stride = width * ch;
  if (raw.length !== height * (stride + 1)) throw new Error(`解压后 ${raw.length}，期望 ${height * (stride + 1)}`);
  const out = Buffer.alloc(height * stride), prev = Buffer.alloc(stride), cur = Buffer.alloc(stride), bpp = Math.max(1, ch);
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0, v = line[x];
      let rec;
      if (ft === 0) rec = v; else if (ft === 1) rec = v + a; else if (ft === 2) rec = v + b;
      else if (ft === 3) rec = v + ((a + b) >> 1);
      else if (ft === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); rec = v + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)); }
      else throw new Error(`第 ${y} 行 filter ${ft} 非法`);
      cur[x] = rec & 255;
    }
    cur.copy(out, y * stride); cur.copy(prev);
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += ch) {
    if (ch === 4) { rgba[i * 4] = out[j]; rgba[i * 4 + 1] = out[j + 1]; rgba[i * 4 + 2] = out[j + 2]; rgba[i * 4 + 3] = out[j + 3]; }
    else if (ch === 3) { rgba[i * 4] = out[j]; rgba[i * 4 + 1] = out[j + 1]; rgba[i * 4 + 2] = out[j + 2]; rgba[i * 4 + 3] = 255; }
    else if (ch === 1) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = out[j]; rgba[i * 4 + 3] = 255; }
    else if (ch === 2) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = out[j]; rgba[i * 4 + 3] = out[j + 1]; }
    else { const k = out[j] * 3; rgba[i * 4] = palette[k]; rgba[i * 4 + 1] = palette[k + 1]; rgba[i * 4 + 2] = palette[k + 2]; rgba[i * 4 + 3] = trns && k / 3 < trns.length ? trns[k / 3] : 255; }
  }
  return { width, height, ihdr, data: rgba };
}
const CRC_TABLE = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = ~0; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8); return ~c >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(width, height, rgba, filterTypes) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const ft = filterTypes[y % filterTypes.length]; raw[y * (width * 4 + 1)] = ft;
    for (let x = 0; x < width * 4; x++) {
      const i = y * width * 4 + x, v = rgba[i];
      const a = x >= 4 ? rgba[i - 4] : 0, b = y > 0 ? rgba[i - width * 4] : 0, c = (x >= 4 && y > 0) ? rgba[i - width * 4 - 4] : 0;
      let pred = 0;
      if (ft === 1) pred = a; else if (ft === 2) pred = b; else if (ft === 3) pred = (a + b) >> 1;
      else if (ft === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pred = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      raw[i + y + 1] = (v - pred) & 255;
    }
  }
  return Buffer.concat([CHUNK_SIG, chunk('IHDR', (() => { const d = Buffer.alloc(13); d.writeUInt32BE(width, 0); d.writeUInt32BE(height, 4); d[8] = 8; d[9] = 6; return d; })()), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- 一次性服务 ---------- */
let server = null; const hits = {};
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
async function startServer() {
  server = createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname === '/__seed') {
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(`<!doctype html><meta charset="utf-8"><title>seed</title><script>localStorage.setItem('mistwood-theme',${JSON.stringify(u.searchParams.get('theme') || 'light')});</script>`);
      return;
    }
    /* __clickstart：不是"浏览器把地址打进去"，而是**页内一次真 click()** ⇒ 渲染进程发起的 LINK 导航。
       这一档只为回答一枚嫌疑：Chromium 的历史资格判定（visited_history_util::IsVisitedURLEligible）
       会不会把 browser-initiated（CDP Page.navigate / --screenshot）的访问排除在 visited 集合之外。
       回来的那一跳写在文章页自己身上（下面 TARGET 那条），因为回程 URL 不能带 query——带了就不是那一枚链接。 */
    if (u.pathname === '/__clickstart') {
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(`<!doctype html><meta charset="utf-8"><title>clickstart</title><a id=L href="${TARGET}">go</a><script>sessionStorage.setItem('vto',${JSON.stringify(u.searchParams.get('to') || 'canary')});addEventListener('load',function(){document.getElementById('L').click()});</script>`);
      return;
    }
    let p = decodeURIComponent(u.pathname); if (p.endsWith('/')) p += 'index.html';
    const file = join(DIST, ...p.split('/').filter(Boolean));
    if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403); res.end('outside dist'); return; }
    let buf; try { buf = readFileSync(file); } catch { res.writeHead(404); res.end('not found'); return; }
    const head = { 'cache-control': 'no-store' };
    if (/\.html$/i.test(file)) {
      const m = u.searchParams.get('m') ?? 'plain';
      if (INJECT[m] === undefined) { res.writeHead(400); res.end(`unknown m=${m}`); return; }
      hits[m] = (hits[m] || 0) + 1;
      let html = buf.toString('utf8');
      if (!html.includes('</head>')) { res.writeHead(500); res.end('no </head>'); return; }
      if (INJECT[m]) html = html.replace('</head>', `<style>${INJECT[m]}</style></head>`);
      /* 回程那一跳钉在靶页自己身上（地址必须一个字符都不多，否则它就不是列表里那一枚链接指的那条地址）。
         只在 clickstart 档留了 'vto' 标记时才动，别的档里它是一次 no-op。 */
      if (file.split(sep).join('/') === DIST.split(sep).join('/') + '/essays/forest-blog/index.html') html = html.replace('</head>', `<script>addEventListener('load',function(){var t=sessionStorage.getItem('vto');if(t){sessionStorage.removeItem('vto');location.href='/essays/?m='+t;}});</script></head>`);
      head['content-type'] = MIME['.html']; res.writeHead(200, head); res.end(html, 'utf8'); return;
    }
    head['content-type'] = MIME['.' + file.split('.').pop().toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, head); res.end(buf);
  });
  await new Promise((ok, no) => { server.once('error', no); server.listen(0, '127.0.0.1', ok); });
  const base = `http://127.0.0.1:${server.address().port}`;
  /* ⚠️ 证注入落盘（§17 第 7 条）：不 fetch 回读一遍就开拍，等于拿一条没进过响应体的规则当证据 */
  const probe = await fetch(`${base}/essays/?m=canary`).catch(e => ({ err: e.message }));
  if (probe.err || !probe.ok) die(`服务自检失败 ${base}/ → ${probe.err || probe.status}`);
  const body = await probe.text();
  if (!body.includes('a.row:visited{color:#FF00FF !important}')) die('canary 注入没进响应体 —— 后面的每一张图都没有意义');
  const plain = await (await fetch(`${base}/essays/?m=plain`)).text();
  if (plain.includes('#FF00FF')) die('plain 档里出现了 canary —— 服务端串档');
  console.log(`  注入对账 ✓ canary 在 ?m=canary 的响应体里、不在 ?m=plain 里`);
  return base;
}

/* ---------- 判读 ---------- */
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const key = (d, i) => `${d[i]},${d[i + 1]},${d[i + 2]}`;
function exact(img, hex, tol = 0) {
  const [R, G, B] = hexRgb(hex); const n = img.width * img.height; let c = 0;
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  for (let i = 0; i < n; i++) { const j = i * 4;
    if (Math.abs(img.data[j] - R) <= tol && Math.abs(img.data[j + 1] - G) <= tol && Math.abs(img.data[j + 2] - B) <= tol) {
      c++; const x = i % img.width, y = (i / img.width) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  return { n: c, bbox: c ? { x0, x1, y0, y1 } : null };
}
function transitions(a, b, limit = 6) {
  if (a.width !== b.width || a.height !== b.height) throw new Error(`两帧尺寸不一致 ${a.width}×${a.height} vs ${b.width}×${b.height} ⇒ 布局被改了`);
  const n = a.width * a.height, pairs = new Map(), changed = [];
  for (let i = 0; i < n; i++) { const j = i * 4;
    if (a.data[j] === b.data[j] && a.data[j + 1] === b.data[j + 1] && a.data[j + 2] === b.data[j + 2]) continue;
    const k = `${key(a.data, j)} → ${key(b.data, j)}`; pairs.set(k, (pairs.get(k) || 0) + 1); changed.push(i); }
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1, mx = 0;
  for (const i of changed) { const j = i * 4, x = i % a.width, y = (i / a.width) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    const d = Math.max(Math.abs(a.data[j] - b.data[j]), Math.abs(a.data[j + 1] - b.data[j + 1]), Math.abs(a.data[j + 2] - b.data[j + 2])); if (d > mx) mx = d; }
  return { changed: changed.length, top: [...pairs.entries()].sort((x, y) => y[1] - x[1]).slice(0, limit), bbox: changed.length ? { x0, x1, y0, y1 } : null, maxDelta: mx, set: new Set(changed) };
}
/* 哨兵色计数不走精确 hex：headed 档整幅被显示色彩配置搬了 3–4 个单位（实测 255,0,255 落成的不是它自己），
   所以判"洋红在场"用形状不用逐字节相等：R 与 B 都高、G 显著低。headless 档它是 255,0,255，同样命中。 */
function magenta(img) { let c = 0; const n = img.width * img.height;
  for (let i = 0; i < n; i++) { const j = i * 4, r = img.data[j], g = img.data[j + 1], b = img.data[j + 2];
    if (r > 190 && b > 190 && g < Math.min(r, b) - 70) c++; }
  return c; }

/* 逐行归属：拿页内读到的 h3 rect 摆框（外扩 1px），数每一行盒里变了多少枚。
   ⚠️ 这是"变化落在第几枚链接上"的证据，不是"变化有多大"的证据——两件事分开报。 */
function bandDiff(a, b, band) {
  let n = 0, mx = 0; const { x0, y0, x1, y1 } = band;
  for (let y = Math.max(0, y0); y <= Math.min(a.height - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(a.width - 1, x1); x++) {
    const i = (y * a.width + x) * 4;
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d) { n++; if (d > mx) mx = d; } }
  return { n, mx };
}
/* 最长连续变化段：§17 那条"量细线别用整行阈值"的同族口径——散布的 1–2 枚差（栅格化抖）
   与一段连续的几十枚差（真换了色）在这里天然分开 */
function longestRun(a, b, band) {
  let best = 0, bestY = -1;
  for (let y = Math.max(0, band.y0); y <= Math.min(a.height - 1, band.y1); y++) {
    let run = 0;
    for (let x = Math.max(0, band.x0); x <= Math.min(a.width - 1, band.x1); x++) {
      const i = (y * a.width + x) * 4;
      const same = a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] && a.data[i + 2] === b.data[i + 2];
      run = same ? 0 : run + 1; if (run > best) { best = run; bestY = y; } } }
  return { best, bestY };
}

const ROW_GEOM = `(() => {
  const rows = [...document.querySelectorAll('a.row')];
  return { theme: document.documentElement.getAttribute('data-theme'), phase: document.documentElement.getAttribute('data-phase'),
    innerWidth: window.innerWidth, visitedMatches: document.querySelectorAll('a.row:visited').length, rows: rows.map((a, i) => { const h3 = a.querySelector('h3'); const ra = a.getBoundingClientRect(), rh = h3 && h3.getBoundingClientRect();
      return { i, href: a.getAttribute('href'), text: h3 ? h3.textContent.slice(0, 10) : null,
        row: [+ra.x.toFixed(2), +ra.y.toFixed(2), +ra.width.toFixed(2), +ra.height.toFixed(2)],
        h3: rh ? [+rh.x.toFixed(2), +rh.y.toFixed(2), +rh.width.toFixed(2), +rh.height.toFixed(2)] : null,
        computedColor: getComputedStyle(h3 || a).color }; }) };
})()`;

function mkBands(geom) {
  return geom.rows.map(r => r.h3 && { x0: Math.floor(r.h3[0]) - 1, y0: Math.floor(r.h3[1]) - 1, x1: Math.ceil(r.h3[0] + r.h3[2]) + 1, y1: Math.ceil(r.h3[1] + r.h3[3]) + 1 });
}
function reportTheme(theme, F, geom, geom2, S) {
  const bands = mkBands(geom);
  const show = (label, a, b) => {
    const t = transitions(a, b);
    console.log(`  ${label}\n      变化 ${t.changed} 枚  bbox ${t.bbox ? `x${t.bbox.x0}…${t.bbox.x1} / y${t.bbox.y0}…${t.bbox.y1}` : '（零）'}  峰 |Δ|${t.maxDelta}`);
    for (const [k, n] of t.top) console.log(`        ${String(n).padStart(6)}  ${k}`);
    console.log(`      逐行 h3 带：` + bands.map((bd, i) => `行${i + 1} ${bd ? bandDiff(a, b, bd).n : '?'}枚(峰${bd ? bandDiff(a, b, bd).mx : 0})`).join(' '));
    if (bands[0]) { const lr = longestRun(a, b, bands[0]); console.log(`      行1 带内最长连续变化段：${lr.best} 枚${lr.bestY >= 0 ? ` @y${lr.bestY}` : ''}`); }
    return t;
  };
  console.log(`\n=== ${theme}（访问由页内 click() 发起；/essays/ 三枚目录行，靶=行1 的 ${TARGET}）===`);
  console.log(`  data-theme=${geom.theme} data-phase=${geom.phase} innerWidth=${geom.innerWidth}`);
  console.log('  行盒：' + geom.rows.map(r => `#${r.i} ${r.text}「${r.href}」 h3=[${r.h3.join(',')}]`).join('  |  '));
  const noise = show('① 噪声底（已访问档重拍两遍）', F.apiVis, F.noise);
  const real = show('② ★ 上线档：未访问 → 已访问（同一份 CSS，只有历史不同）', F.unvis, F.vis);
  const ctl = show('③ ★ 正对照：已访问 + 注入 a.row:visited{color:#FF00FF}', F.unvis, F.clickCanary);
  show('④ 反证：访问由 CDP Page.navigate 发起之后回列表（canary 注入）', F.unvis, F.apiCanary);
  const same12 = transitions(F.vis, F.apiVis).changed;
  const noopT = show('⑤ noop（:visited 值＝var(--ink)）对比已访问档：期望只差随时间走的那几枚', F.vis, F.noop);
  show('⑥ 绘制通道正对照：注入 a.row{color:#FF00FF}（不带 :visited）', F.unvis, F.paint);
  const cnt = (img, hex, tol = 0) => { const e = exact(img, hex, tol); return `${e.n}${e.bbox ? `@y${e.bbox.y0}…${e.bbox.y1}` : ''}`; };
  const ink = TK[theme].ink, rd = TK[theme].read;
  console.log(`  精确色在场（tol 0）--ink ${ink}：未访问=${cnt(F.unvis, ink)} 已访问=${cnt(F.vis, ink)} 重拍=${cnt(F.noise, ink)}`);
  console.log(`  ${rd ? `--ink-visited ${rd}（tol 5）：未访问=${cnt(F.unvis, rd, 5)} 已访问=${cnt(F.vis, rd, 5)} 重拍=${cnt(F.noise, rd, 5)}（tol 0 已访问=${exact(F.vis, rd).n}，bbox=${JSON.stringify(exact(F.vis, rd, 5).bbox)}）` : '--ink-visited 还没落盘（对照档本该如此）'}`);
  console.log(`  洋红形状（R&B>190 且 G<min-70）：未访问=${magenta(F.unvis)} 已访问=${magenta(F.vis)} click档canary=${magenta(F.clickCanary)} api回访canary=${magenta(F.apiCanary)} noop=${magenta(F.noop)} paintctl=${magenta(F.paint)}`);
  console.log(`  ⚠️ computed color（受污通道，只当反例登记）：未访问行1=${geom.rows[0].computedColor} / 已访问行1=${geom2.rows[0].computedColor}`);
  console.log(`  ⚠️ querySelectorAll('a.row:visited') 命中数（已访问档）=${geom2.visitedMatches}（JS 侧同受反指纹限，只当旁证）`);
  const verdict = [];
  verdict.push(magenta(F.paint) > 0 ? `✓ 绘制通道活着：paintctl（不带 :visited）洋红 ${magenta(F.paint)} 枚` : '✗ paintctl 也没画：死的是注入/绘制这一截，与 visited 无关，本档作废');
  verdict.push(magenta(F.clickCanary) > 0 ? `✓ 量法跑通：由页内 click() 记下的访问，让 a.row:visited{color:#FF00FF} 画出 ${magenta(F.clickCanary)} 枚洋红、逐行只在行1（带内 ${bands[0] ? bandDiff(F.unvis, F.clickCanary, bands[0]).n : '?'} 枚）` : `✗ 量法没跑通：click 记下的访问仍然 0 枚（同档 paintctl ${magenta(F.paint)} 枚在场）⇒ :visited 在这台机器上读不到，本卡该停手`);
  verdict.push(magenta(F.apiCanary) === 0 ? `✓ 边界复现：同一枚链接、同一份注入，访问若由 CDP Page.navigate 记下则 0 枚 ⇒ "造已访问状态"必须走渲染进程发起的 click（这条已写进入档头，下一轮别踩）` : `⚠ api 回访也画了 ${magenta(F.apiCanary)} 枚 ⇒ 发起模型不是必要条件`);
  verdict.push(noise.changed <= 200 ? `✓ 噪声底 ${noise.changed} 枚（行1 带内 ${bands[0] ? bandDiff(F.apiVis, F.noise, bands[0]).n : '?'} 枚）；已访问档两次读法（click 回/api 回）差 ${same12} 枚` : `⚠ 噪声底 ${noise.changed} 枚，偏大`);
  verdict.push(Math.abs(noopT.changed - real.changed) <= 200 ? `✓ 反向格：给 :visited 挂上 var(--ink) 之后那批像素**退回来**了（noop 与已访问档差 ${noopT.changed} 枚 ≈ 上线档的 ${real.changed} 枚，差 ${Math.abs(noopT.changed - real.changed)} 枚）⇒ 上线声明撤掉就是原状，不承重` : `✗ 反向格对不上：noop 差 ${noopT.changed} 枚、上线档差 ${real.changed} 枚——那 3249/3397 枚不是由 :visited 这一条给的`);
  verdict.push(rd ? (real.changed > 0 && exact(F.vis, rd, 5).n > 0 ? `✓ 上线档读得到：F(未访问)→F(已访问) 变 ${real.changed} 枚、其中 ${exact(F.vis, rd, 5).n} 枚落在 --ink-visited ${rd} 的 bbox 内（未访问档同色 ${exact(F.unvis, rd, 5).n} 枚）` : `✗ 上线档没读出来：变 ${real.changed} 枚、新色在场 ${exact(F.vis, rd, 5).n} 枚`) : '— 上线档不适用（色还没落盘）');
  console.log('  判读：\n    ' + verdict.join('\n    '));
  S.push({ theme, noise: noise.changed, real: real.changed, ctl: ctl.changed, paint: magenta(F.paint), clickCanary: magenta(F.clickCanary), apiCanary: magenta(F.apiCanary), rdIn: rd ? exact(F.vis, rd, 5).n : 0, verdict });
}

async function selftest() {
  console.log('== PNG 解码器自证（口径抄 tools/pixel-probe.mjs:428）==');
  let bad = 0;
  const W = 37, H = 10, src = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4;
    src[i] = (x * 7 + y * 13) & 255; src[i + 1] = (x * 3) & 255; src[i + 2] = (255 - y * 20) & 255; src[i + 3] = (x % 5) * 50 + 5; }
  const png = encodePng(W, H, src, [0, 1, 2, 3, 4, 4, 3, 2, 1, 0]), back = decodePng(png);
  const same = back.width === W && back.height === H && back.data.equals(src);
  console.log(`  ① 自编码→自解码 ${W}×${H}、五种 filter 各 2 行：${same ? '✓ 逐字节一致' : '✗ 不一致'}`); if (!same) bad++;
  const t1 = (() => { const b = Buffer.from(png); b.writeUInt32BE(999, 16); try { decodePng(b); return '没炸(✗)'; } catch { return '炸了(✓)'; } })();
  const t2 = (() => { const b = Buffer.from(png); b[b.length - 30] ^= 0xff; try { const g = decodePng(b); return g.data.equals(src) ? '没炸且像素对得上(✗)' : 'CRC 拦住(✓)'; } catch { return '炸了(✓)'; } })();
  console.log(`  ② 抗坏数据：改 IHDR 宽度 → ${t1}；翻 IDAT 一字节 → ${t2}`);
  if (t1.startsWith('没炸') || t2.startsWith('没炸')) bad++;
  const og = join(DIST, 'og.png');
  if (existsSync(og)) { try { const g = decodePng(readFileSync(og)); console.log(`  ③ 真图 dist/og.png → ${g.width}×${g.height} type=${g.ihdr.colorType} ✓`); } catch (e) { console.log(`  ③ dist/og.png 解不开：${e.message}`); bad++; } }
  /* ④ 判读函数自己的门票：造一张两帧，只在第 3 行的一条带里把纯色改掉，transitions/exact/longestRun 必须各归对位置 */
  const W2 = 40, H2 = 6;
  const A = Buffer.alloc(W2 * H2 * 4, 255), B = Buffer.alloc(W2 * H2 * 4, 255);
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) { const i = (y * W2 + x) * 4; A[i] = 35; A[i + 1] = 43; A[i + 2] = 37; B[i] = 35; B[i + 1] = 43; B[i + 2] = 37; A[i + 3] = B[i + 3] = 255; }
  for (let y = 2; y < 4; y++) for (let x = 5; x < 25; x++) { const i = (y * W2 + x) * 4; B[i] = 255; B[i + 1] = 0; B[i + 2] = 255; }
  const ia = { width: W2, height: H2, data: A }, ib = { width: W2, height: H2, data: B };
  const tt = transitions(ia, ib), ex = exact(ib, '#FF00FF');
  const ok4 = tt.changed === 40 && ex.n === 40 && ex.bbox.y0 === 2 && ex.bbox.y1 === 3 && longestRun(ia, ib, { x0: 0, y0: 0, x1: W2 - 1, y1: H2 - 1 }).best === 20;
  console.log(`  ④ 判读函数定位：构造 ${40} 枚已知变化 → transitions ${tt.changed}、exact #FF00FF ${ex.n} @y${ex.bbox && ex.bbox.y0}…${ex.bbox && ex.bbox.y1}、最长段 ${longestRun(ia, ib, { x0: 0, y0: 0, x1: W2 - 1, y1: H2 - 1 }).best} ${ok4 ? '✓' : '✗ 位置不对'}`);
  if (!ok4) bad++;
  console.log(bad ? `\n✗ selftest 有 ${bad} 项没过` : '\n✓ selftest 全过');
  process.exit(bad ? 1 : 0);
}

/* ---------- CDP 档 ---------- */
let doneFlag = false;
const wait = ms => new Promise(r => setTimeout(r, ms));
async function cdpOpen(profile) {
  const WS = globalThis.WebSocket;
  if (!WS) die('这个 Node 没有全局 WebSocket（需要 ≥22），CDP 档起不来');
  /* --headed 档：把 'about:blank' 留着当首屏，窗口挪到屏幕外。这一步只回答一个问题——
     ":visited 不画"到底是 headless 的历史服务缺席，还是 Blink 根本不画它。同一枚 Blink，只差 headless。 */
  const headless = flag('headed') ? null : '--headless=new';
  const extra = flag('headed') ? ['--window-size=1440,900', '--window-position=-4000,-4000', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] : [];
  const browser = spawn(EDGE, [
    ...(headless ? [headless] : []), `--user-data-dir=${profile}`, '--disable-gpu', '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
    '--disable-sync', '--force-device-scale-factor=1', '--force-prefers-reduced-motion', '--remote-debugging-port=0',
    ...extra, 'about:blank',
  ], { cwd: dirname(EDGE), windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  if (flag('headed')) console.log('  ⚠️ headed 档：屏幕外开一个真窗口（只为本机这一次量，不进仓库）');
  let stderr = ''; browser.stderr.on('data', d => { stderr = (stderr + d.toString('utf8')).slice(-4000); });
  browser.on('exit', c => { if (!doneFlag) console.error(`浏览器中途退出 exit=${c} ${stderr.slice(-300)}`); });
  let portLine = null;
  for (let i = 0; i < 60 && !portLine; i++) { const f = join(profile, 'DevToolsActivePort'); if (existsSync(f)) portLine = readFileSync(f, 'utf8').trim(); else await wait(250); }
  if (!portLine) { try { browser.kill(); } catch { } die('等 15s 没等到 DevToolsActivePort'); }
  const info = await fetch(`http://127.0.0.1:${portLine.split('\n')[0]}/json/version`).then(r => r.json()).catch(e => die(`/json/version 拿不到：${e.message}`));
  let msgId = 0; const pending = new Map(); const events = [];
  const ws = new WS(info.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = () => no('WebSocket 连不上 devtools'); });
  ws.onmessage = m => { const o = JSON.parse(m.data);
    if (o.id && pending.has(o.id)) { const p = pending.get(o.id); pending.delete(o.id); o.error ? p.no(new Error(o.error.message)) : p.ok(o.result); return; }
    if (o.method) events.push(o); };
  const send = (method, params = {}, sessionId) => new Promise((ok, no) => { const id = ++msgId; pending.set(id, { ok, no }); ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  async function nav(url) {
    events.length = 0;
    await S('Page.navigate', { url });
    for (let i = 0; i < 240; i++) { if (events.some(e => e.method === 'Page.loadEventFired')) return true; await wait(250); }
    return false;
  }
  async function shot() { const r = await S('Page.captureScreenshot', { format: 'png' }); return decodePng(Buffer.from(r.data, 'base64')); }
  async function ev(expression) {
    const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) die('页内求值抛了：' + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result.value;
  }
  return { browser, nav, shot, ev, close: () => { doneFlag = true; try { ws.close(); } catch { } try { browser.kill(); } catch { } } };
}

async function main() {
  const base = await startServer();
  console.log(`服务 ${base}（喂 ${DIST}）；档=${ROUTE}`);
  console.log(`  色板现读：亮 --ink ${TK.light.ink} / --ink-visited ${TK.light.read || '（未落盘）'}；暗 --ink ${TK.dark.ink} / --ink-visited ${TK.dark.read || '（未落盘）'}`);
  const root = mkdtempSync(join(tmpdir(), 'mistwood-visited-probe-'));
  const S = [];
  for (const theme of (argv.find(a => a.startsWith('--themes=')) || '--themes=light,dark').slice(9).split(',')) {
    const profile = join(root, `cdp-${theme}`); mkdirSync(profile, { recursive: true });
    const C = await cdpOpen(profile);
    if (!await C.nav(`${base}/__seed?theme=${theme}`)) die('seed 页没等到 load');
    if (!await C.nav(`${base}/essays/?m=plain`)) die('F1 导航没等到 load');
    await wait(600);
    const geom = await C.ev(ROW_GEOM);
    if (geom.theme !== theme) die(`seed 没生效：页上 data-theme=${geom.theme}，要的是 ${theme}`);
    if (geom.innerWidth !== 1440) die(`innerWidth=${geom.innerWidth} ≠ 1440，视口对账没过`);
    if (geom.rows.length !== 3) die(`/essays/ 上读到 ${geom.rows.length} 枚 a.row，期望 3 枚（产物账变了）`);
    /* roundTrip(to)：__clickstart 页里对**靶链接**做一次真 click()（渲染进程发起）→ 落在靶页 →
       靶页上的脚本把窗口带回 /essays/?m=<to>。整条路就是用户"点进去—读完—回来"的路。
       ⚠️ 回程地址不能带多余 query：多一个字符就不是那一枚链接指的那条地址。 */
    async function roundTrip(to) {
      if (!await C.nav(`${base}/__clickstart?to=${to}`)) die(`clickstart(?to=${to}) 导航没等到 load`);
      const done = new RegExp(`/essays/\\?m=${to}$`);
      let here = '';
      for (let i = 0; i < 80; i++) { here = await C.ev('location.href').catch(() => here); if (done.test(here)) break; await wait(250); }
      if (!done.test(here)) die(`click 往返没落到 /essays/?m=${to}（终点 ${here}）——这一档作废，不许当负结果`);
      await wait(1600);                       // visited 样式是历史查询异步回来才落的
      return C.shot();
    }
    const unvis = await C.shot();
    if (unvis.width !== 1440 || unvis.height !== 900) console.log(`  ⚠️ 幅面 ${unvis.width}×${unvis.height}（请求 1440×900）——headed 档那条硬闸放宽为登记`);
    /* 反证档：访问由 browser-initiated 导航记下，然后同样 browser-initiated 回列表 */
    if (!await C.nav(`${base}${TARGET}`)) die('api warm 导航没等到 load');
    await wait(500);
    if (!await C.nav(`${base}/essays/?m=canary`)) die('apiCanary 导航没等到 load');
    await wait(1600);
    const apiCanary = await C.shot();
    const clickCanary = await roundTrip('canary');
    const vis = await roundTrip('plain');
    const geom2 = await C.ev(ROW_GEOM);
    const noop = await roundTrip('noop');
    if (!await C.nav(`${base}/essays/?m=paintctl`)) die('paintctl 导航没等到 load');
    await wait(900);
    const paint = await C.shot();
    /* 已访问状态由 click 记下了；这一档换成 browser-initiated 回列表，读"读的那一跳依不依赖发起模型" */
    if (!await C.nav(`${base}/essays/?m=plain`)) die('apiVis 导航没等到 load');
    await wait(1600);
    const apiVis = await C.shot();
    await wait(1200);
    const noise = await C.shot();
    C.close();
    reportTheme(theme, { unvis, apiCanary, clickCanary, vis, noop, paint, apiVis, noise }, geom, geom2, S);
  }
  console.log(`\n服务命中（注入真的被请求过没有）：${JSON.stringify(hits)}`);
  const dead = S.filter(s => s.verdict.some(v => v.startsWith('✗ 量法没跑通') || v.startsWith('✗ 上线档没读出来') || v.startsWith('✗ paintctl')));
  const ok = S.length && !dead.length && S.every(s => s.verdict.some(v => v.startsWith('✓ 量法跑通')));
  console.log(`\n总结判读：${ok ? '✓ 每一档都读到了：量法成立' + (TK.light.read ? '，上线档的新色也在像素里在场' : '（对照档，上线色还没落盘）') : '✗ 有档没读到 —— 见上面逐档判读'}`);
  console.log(`图留在 ${root}${flag('keep') ? '（--keep）' : '（跑完删净）'}`);
  if (!flag('keep')) rmSync(root, { recursive: true, force: true });
  server.close();
  process.exit(dead.length ? 1 : 0);
}

if (argv.includes('selftest')) await selftest(); else if (ROUTE === 'cdp') await main(); else die(`不认识的 --route=${ROUTE}`, '  只有 cdp 一档在这个脚本里；两条作废的导航档（两进程 --screenshot / 双向 Page.navigate）的读数登记在档头与规范 §12 那一格');
