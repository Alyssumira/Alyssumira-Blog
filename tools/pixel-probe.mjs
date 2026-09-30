/* pixel-probe.mjs —— 首屏标题的**逐像素**对比度量具（规范 §2.4 那条"照片透字"量法的可复用版本）
   用法  node tools/pixel-probe.mjs selftest     # 先自证 PNG 解码器正确（五种 filter 全过）
         node tools/pixel-probe.mjs              # 出图 + 分析，一把跑完
         node tools/pixel-probe.mjs --analyze-only=<目录>   # 只对已经拍好的图重算
         node tools/pixel-probe.mjs --keep       # 跑完不清理临时目录（默认清）

   ── 量法（照抄 §2.4:200 的原文口径，不自造）─────────────────────────────────
   同一冻结帧拍两帧：**标题隐去** / **实心 `--ink`**，两帧相减得字形掩膜，只取覆盖率 ≥98.5% 的像素
   ⇒ 抗锯齿边与 `--halo` 光晕都不参与。第三帧（纯照片填充）这一轮不需要，它是给 MaskedHeading 用的。
   ⚠️ 严禁退回"平均色比平均色"——那正是 §2.4:200 否决掉的量法。
   逐像素读数 = 字形盖住的那个像素（plain 帧）vs 它**正背后**那个像素（hidden 帧）。

   ── 三帧怎么做到"两帧逐像素对得上"而不碰仓库一根手指 ──────────────────────────
   本脚本自带一枚 `node:http` 服务喂 `dist/`，**在服务端内存里**改写 HTML：
     ?m=plain    原样返回
     ?m=hidden   在 `</head>` 前插 `.hero-title{visibility:hidden}`
     ?m=nohalo   在 `</head>` 前插 `.hero-title{text-shadow:none}`
   `visibility:hidden` 与 `text-shadow:none` 都不改布局 ⇒ 帧间逐像素对得上。
   仓库里没有任何一个文件被为了"标题隐去"而改过——这是刻意的，规范 §16 那条"门禁不该往构建产物里写文件"同理。
   ⚠️ 浏览器必须**异步起**（`spawn` + await，不是 `spawnSync`）：服务和浏览器同进程，`spawnSync` 会冻住
   事件循环 ⇒ 浏览器对 `/` 的第一个请求永远得不到响应。这条坑抄自 `tools/runtime-check.mjs` 文件头。

   ── 为什么这一档带 `--force-prefers-reduced-motion`（不是偷懒）────────────────
   §17「回归怎么验」第 1 条实测过：`--virtual-time-budget=6000` **不推进 CSS 动画的墙钟**，全动效档同构建
   连拍两次首页能差到 99.54% 像素（一张抓到照片还没淡入）⇒ 那种帧根本量不出掩膜（词盒停在
   `translateY(112%)` 的半路里，字形覆盖率分布是一坨随机数）。第 2 条给出可比对的那一档就是这一档。
   顺带三件事由它一次解决：颗粒 `animation:none` ⇒ 停在固定 transform（不再 1.2s 跳帧）；
   `src/scripts/hero.js:35 sync()` 里的 `if (reduceMotion || narrow.matches) return` ⇒ 萤火虫**一只都不生成**，
   而它们的位置是 `Math.random()`（`hero.js:25-26`），不撤掉就是每拍一次换一批背景亮点；
   `.bg-photo{opacity:1}` ⇒ 照片不必等 2.2s 淡入。
   ⚠️ 代价照实登记：这一档测的是"静止的首屏"，颗粒与雾带停在起始帧而不是某一帧随机位置——写进规范。

   ── 视口自证 ────────────────────────────────────────────────────────────────
   不读 `innerWidth`（那要 CDP）。`--force-device-scale-factor=1` + `--hide-scrollbars` 下 PNG 像素宽
   应当 == 请求的 `--window-size` 宽。本脚本解 IHDR 自己核，**不符就停下来报告，不许继续算数**。
*/

import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { inflateSync, deflateSync } from 'node:zlib';
import { resolveBrowser, browserCandidates, spawnBrowser } from './browser-bin.mjs';

/* ============================ 0. CLI ============================ */
const argv = process.argv.slice(2);
const MODE = argv.find(a => !a.startsWith('--')) || 'run';
const opt = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const flag = k => argv.includes(`--${k}`);
const die = (msg, hint) => { console.error(`\n✗ ${msg}`); if (hint) console.error(hint); process.exit(1); };

const ROOT = resolve(dirname(new URL(import.meta.url).pathname.slice(1)), '..');
const DIST = resolve(opt('dist') || join(ROOT, 'dist'));
if (!existsSync(join(DIST, 'index.html'))) die(`没有产物 ${join(DIST, 'index.html')}`, '  先 `npm run build`；本脚本不读源码、只读 dist/');

/* 用哪一枚浏览器不在这里判——站内唯一一处是 `tools/browser-bin.mjs`（2026-09-30 `card/browserbin`）：
   判据是**探得到靶**（交回的 DOM 里带着只有 JS 跑过才存在的标记），不是"文件在盘上"。 */
const browserSkips = [];
const BROWSER = await resolveBrowser({ flag: opt('browser') || opt('edge'), label: 'pixel-probe', log: s => browserSkips.push(s.trim()) });
const EDGE = BROWSER && BROWSER.bin;
const EDGE_CANDIDATES = browserCandidates(opt('browser') || opt('edge')).map(c => c.bin);
if (!EDGE) die(`没有一枚浏览器探得到靶（试过：${EDGE_CANDIDATES.join(' / ')}）\n${browserSkips.map(s => '  ' + s).join('\n')}`,
  '  换浏览器传 --browser=<路径>（旧名 --edge= 也认）或设环境变量 MISTWOOD_BROWSER；这条不降级、不跳过');

/* 拍摄矩阵：2 视口 × 2 主题 × 3 帧，另加"同构建同参数重拍一次"当噪声底。
   ⚠️ 第二趟只重拍 plain+hidden（噪声底要回答的是**报出去的那两张帧**稳不稳，nohalo 不参与出数）。 */
const VIEWPORTS = [{ w: 531, h: 559 }, { w: 1440, h: 900 }];
const THEMES = ['light', 'dark'];
/* ⚠️ 不在这里求值：readInkTokens() 要用下面第 2 节的色彩数学（`const` 箭头函数有 TDZ），
   所以推迟到 main() 开头调用。 */
let INKS = null;

/* --ink 从 base.css 现读，不写死：规范 §17 说死色板真值只有 base.css 一份，写进脚本就是造第四份。
   ⚠️ 第一版用 `css.indexOf('html[data-theme="dark"]')` 抓块，结果抓到的是 base.css:16 **注释里**
   提到的那一条选择器 ⇒ 它顺着注释往下找到第一个 `{`，那是 `:root{`，于是"暗色 ink"读成了亮色的
   #232B25。整组暗色掩膜当场归零、被下面的像素数闸门拦下（这条闸门救回了这一轮）。
   现在改成：按行首锚定选择器 + 大括号配深度找块尾，并加一条物理对账——亮色的 ink 必须比它自己的
   `--bg-base` 暗、暗色必须比它亮，反了就说明抓错了块。 */
function readInkTokens() {
  const css = readFileSync(join(ROOT, 'src', 'styles', 'base.css'), 'utf8');
  const blockOf = (selectorRe) => {
    const m = selectorRe.exec(css);
    if (!m) return null;
    const open = css.indexOf('{', m.index);
    if (open < 0) return null;
    let depth = 0, end = -1;
    for (let i = open; i < css.length; i++) { if (css[i] === '{') depth++; else if (css[i] === '}' && --depth === 0) { end = i; break; } }
    if (end < 0) return null;
    return css.slice(open + 1, end);
  };
  const token = (block, name) => { const m = block && new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(block); return m ? m[1].toUpperCase() : null; };
  const lightBlock = blockOf(/^:root\s*\{/m), darkBlock = blockOf(/^html\[data-theme="dark"\]\s*\{/m);
  const out = {
    light: token(lightBlock, 'ink'), dark: token(darkBlock, 'ink'),
    lightBase: token(lightBlock, 'bg-base'), darkBase: token(darkBlock, 'bg-base'),
    /* 标题里那个英文斜体词 `<em>light</em>` 不是 --ink：home.css:253 .hero-title em（亮）/ home.css:260（暗）给它 --moss-deep / --moss。
       它进不进掩膜，正是旧数与新数"尾部"最可能的一个口径差，所以单独量一档、不混进主表。 */
    lightEm: token(lightBlock, 'moss-deep'), darkEm: token(darkBlock, 'moss'),
  };
  for (const [k, v] of Object.entries(out)) if (!v) die(`从 base.css 里没读出 ${k}（值 ${v}）`, '  掩膜的"实心 ink"参照物拿不到就是全脚本作废，不许猜一个值');
  if (relLum(...hexRgb(out.light)) >= relLum(...hexRgb(out.lightBase))) die(`亮色 --ink ${out.light} 不比 --bg-base ${out.lightBase} 暗`, '  ⇒ 抓到的是错的色块，不是真值');
  if (relLum(...hexRgb(out.dark)) <= relLum(...hexRgb(out.darkBase))) die(`暗色 --ink ${out.dark} 不比 --bg-base ${out.darkBase} 亮`, '  ⇒ 抓到的是错的色块，不是真值（夜林是"重新打光"，字是亮墨）');
  return out;
}

/* ============================ 1. PNG 解码（纯 node，无依赖）============================ */
/* Edge 的 --screenshot 出的是非隔行 8-bit RGBA(type 6)。⚠️ 先确认再解，别假设：
   下面对 bitDepth / interlace / colorType 任何一项不认识都直接抛，不"当成 RGBA 硬解"。 */
const CHUNK_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const COLOR_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function decodePng(buf) {
  if (buf.compare(CHUNK_SIG, 0, 8, 0, 8) !== 0) throw new Error('不是 PNG（签名不对）');
  let off = 8, ihdr = null, palette = null, idat = [], trns = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (off + 8 + len + 4 > buf.length) throw new Error(`chunk ${type} 越界（文件被截断？）`);
    const crc = buf.readUInt32BE(off + 8 + len);
    /* ⚠️ PNG 的 CRC 覆盖的是 **chunk type + data**，不含长度字段也不含 CRC 自己。
       第一版只算了 data，于是自家编码自家解码都在 IHDR 就报"CRC 对不上"——这枚校验位
       正是用来拦住"翻一位没人发现"的，不能因为它挡了自己就把它调松。 */
    if (crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])) !== crc) throw new Error(`chunk ${type} 的 CRC 对不上`);
    if (type === 'IHDR') {
      ihdr = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], comp: data[10], filter: data[11], interlace: data[12] };
      if (ihdr.comp !== 0) throw new Error(`不支持的压缩法 ${ihdr.comp}`);
      if (ihdr.filter !== 0) throw new Error(`不支持的 filter 方法 ${ihdr.filter}`);
      if (ihdr.interlace !== 0) throw new Error(`隔行(Adam7)图不支持，interlace=${ihdr.interlace}`);
      if (ihdr.bitDepth !== 8) throw new Error(`只支持 8-bit，这是 ${ihdr.bitDepth}-bit`);
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error('没有 IHDR');
  if (!idat.length) throw new Error('没有 IDAT');
  const channels = COLOR_CHANNELS[ihdr.colorType];
  if (!channels) throw new Error(`不认识的颜色类型 ${ihdr.colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const { width, height } = ihdr;
  const stride = width * channels;
  if (raw.length !== height * (stride + 1)) throw new Error(`解压后 ${raw.length} 字节，期望 ${height * (stride + 1)}`);
  const out = Buffer.alloc(height * stride);
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  const bpp = Math.max(1, Math.floor(channels));   // 8-bit ⇒ 每像素 bpp 字节
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      const v = line[x];
      let rec;
      if (ft === 0) rec = v;
      else if (ft === 1) rec = v + a;
      else if (ft === 2) rec = v + b;
      else if (ft === 3) rec = v + ((a + b) >> 1);
      else if (ft === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        rec = v + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c));
      } else throw new Error(`第 ${y} 行 filter 类型 ${ft} 非法`);
      cur[x] = rec & 255;
    }
    cur.copy(out, y * stride);
    cur.copy(prev);
  }
  /* 一律摊成 RGBA 出去，省得每个调用点再处理调色板/灰底 */
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += channels) {
    if (channels === 4) { rgba[i * 4] = out[j]; rgba[i * 4 + 1] = out[j + 1]; rgba[i * 4 + 2] = out[j + 2]; rgba[i * 4 + 3] = out[j + 3]; }
    else if (channels === 3) { rgba[i * 4] = out[j]; rgba[i * 4 + 1] = out[j + 1]; rgba[i * 4 + 2] = out[j + 2]; rgba[i * 4 + 3] = 255; }
    else if (channels === 1) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = out[j]; rgba[i * 4 + 3] = 255; }
    else if (channels === 2) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = out[j]; rgba[i * 4 + 3] = out[j + 1]; }
    else { const k = out[j] * 3; rgba[i * 4] = palette[k]; rgba[i * 4 + 1] = palette[k + 1]; rgba[i * 4 + 2] = palette[k + 2]; rgba[i * 4 + 3] = trns && k / 3 < trns.length ? trns[k / 3] : 255; }
  }
  return { width, height, ihdr, data: rgba };
}

/* CRC32（PNG 的 chunk 校验）与一张最小 PNG 的编码器——只给 selftest 用，用来"自己造已知像素的图再解回来" */
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
    const ft = filterTypes[y % filterTypes.length];
    raw[y * (width * 4 + 1)] = ft;
    for (let x = 0; x < width * 4; x++) {
      const i = y * width * 4 + x, v = rgba[i];
      const a = x >= 4 ? rgba[i - 4] : 0, b = y > 0 ? rgba[i - width * 4] : 0, c = (x >= 4 && y > 0) ? rgba[i - width * 4 - 4] : 0;
      let pred = 0;
      if (ft === 1) pred = a; else if (ft === 2) pred = b; else if (ft === 3) pred = (a + b) >> 1;
      else if (ft === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); pred = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      raw[i + y + 1] = (v - pred) & 255;
    }
  }
  return Buffer.concat([
    CHUNK_SIG,
    chunk('IHDR', (() => { const d = Buffer.alloc(13); d.writeUInt32BE(width, 0); d.writeUInt32BE(height, 4); d[8] = 8; d[9] = 6; return d; })()),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ============================ 2. 色彩数学（与 palette-check.mjs:32-36 同一份公式）============ */
const toLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const relLum = (r, g, b) => 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
const contrast = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function q(sorted, t) { if (!sorted.length) return NaN; const i = Math.min(sorted.length - 1, Math.max(0, Math.round(t * (sorted.length - 1)))); return sorted[i]; }

/* ============================ 3. 掩膜 + 逐像素读数 ============================ */
/* 覆盖率 = a_c = (plain_c - hidden_c) / (ink_c - hidden_c)，逐通道取 min。
   hidden 帧里"字形正背后那个像素"就是纯背景 ⇒ a=1 等价于 plain 恰等于实心 ink。
   光晕在字形之外 ⇒ 那一圈上 plain≠ink 且 Δ 与 (ink-bg) 反号（暗色是暗光晕，§5 铁律 3 那条实测），
   抗锯齿边 a 落在 0~1 之间 ⇒ 两者都被 ≥98.5% 这道闸挡在外面。这就是 §2.4:200 那句"不参与"的实现。 */
const COV_MIN = 0.985, COV_MAX = 1.015, COND_MIN = 40, TAU = 2;

function diffMap(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw new Error(`两帧尺寸不一致：${a.width}×${a.height} vs ${b.width}×${b.height} ⇒ 布局被改了，掩膜作废`);
  const n = a.width * a.height, d = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    let m = Math.abs(a.data[j] - b.data[j]);
    const g = Math.abs(a.data[j + 1] - b.data[j + 1]); if (g > m) m = g;
    const r2 = Math.abs(a.data[j + 2] - b.data[j + 2]); if (r2 > m) m = r2;
    d[i] = m;
  }
  return d;
}

/* 按行找差异带，取最大那一带当标题——把"两帧只差在标题"这件事变成一条可核对的证据。
   为什么要挑带：plain 与 hidden 是**两个浏览器进程**，导航里 `HH:MM` 那一格会按真实时间走
   （§17 第 2 条实测过噪声就落在那儿）。不挑带的话时钟数字的"实心墨像素"会冒充字形。 */
function bandsOf(d, width, height, minPerRow = 3) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    let c = 0;
    for (let x = 0; x < width; x++) if (d[y * width + x] > TAU) c++;
    rows.push(c);
  }
  const bands = [];
  let start = -1;
  for (let y = 0; y <= height; y++) {
    const on = y < height && rows[y] >= minPerRow;
    if (on && start < 0) start = y;
    if (!on && start >= 0) { bands.push({ y0: start, y1: y - 1, rows: y - start, count: rows.slice(start, y).reduce((a, b) => a + b, 0) }); start = -1; }
  }
  /* 上下带之间留 40 行以内的空隙并成一带：标题两行之间那点空隙会被 28px 光晕填满，
     万一没填满也不该把标题劈成两半（劈开就是漏掉一整行字形 ⇒ 数会偏） */
  const merged = [];
  for (const b of bands.sort((p, r) => p.y0 - r.y0)) {
    const last = merged[merged.length - 1];
    if (last && b.y0 - last.y1 <= 40) { last.y1 = b.y1; last.rows = b.y1 - last.y0 + 1; last.count += b.count; }
    else merged.push({ ...b });
  }
  return { bands: merged, rows };
}

function maskAndStats(plain, hidden, inkHex, band) {
  const ink = hexRgb(inkHex);
  const { width, height } = plain;
  const d = diffMap(plain, hidden);
  const ratios = [];
  const bgLum = [];
  let inBand = 0, condSkip = 0, covHi = 0, xMin = Infinity, xMax = -1;
  for (let y = band.y0; y <= band.y1 && y < height; y++) {
    for (let x = band.x0; x <= band.x1 && x < width; x++) {
      const i = y * width + x, j = i * 4;
      if (d[i] <= TAU) continue;
      inBand++;
      const P = [plain.data[j], plain.data[j + 1], plain.data[j + 2]];
      const B = [hidden.data[j], hidden.data[j + 1], hidden.data[j + 2]];
      let spread = 0, aMin = Infinity, aMax = -Infinity;
      for (let c = 0; c < 3; c++) {
        const denom = ink[c] - B[c];
        if (Math.abs(denom) > Math.abs(spread)) spread = denom;
        const a = denom === 0 ? Infinity : (P[c] - B[c]) / denom;
        if (a < aMin) aMin = a; if (a > aMax) aMax = a;
      }
      if (Math.abs(spread) < COND_MIN) { condSkip++; continue; }   // 背景已经贴近 ink ⇒ 覆盖率在这格上 ill-conditioned
      if (aMin > COV_MAX) { covHi++; continue; }
      if (aMin < COV_MIN || aMax > COV_MAX) continue;               // 抗锯齿边 / 光晕：不达标就是"不参与"
      const bg = relLum(B[0], B[1], B[2]);
      ratios.push(contrast(relLum(P[0], P[1], P[2]), bg));
      bgLum.push(bg);
      if (x < xMin) xMin = x; if (x > xMax) xMax = x;
    }
  }
  return { ratios: Float64Array.from(ratios).sort(), bgLum: Float64Array.from(bgLum).sort(), inBand, condSkip, covHi, xMin, xMax, d };
}

/* 横向三分（§5:289 那张表就是在这一刀上量的，它当时只在 531 成立、并明写"没在宽屏量过之前不许
   按这条挪遮罩"）。这一档就是那条待账的宽屏版：标题背后那片底按左/中/右三分各多亮、字形像素的
   对比度各是多少、弱的一侧在哪。只出数，不动 `--scrim-text` 的 22% 60%。 */
function thirds(outDir, pass, vp, theme, band) {
  const { plain, hidden } = loadPair(outDir, pass, vp, theme);
  const inkHex = INKS[theme];
  const w = band.x1 - band.x0 + 1, out = [];
  for (let k = 0; k < 3; k++) {
    const sub = { ...band, x0: band.x0 + Math.floor(w * k / 3), x1: band.x0 + Math.floor(w * (k + 1) / 3) - 1 };
    const r = maskAndStats(plain, hidden, inkHex, sub);
    out.push({ part: ['左', '中', '右'][k], n: r.ratios.length, min: q(r.ratios, 0), p50: q(r.ratios, 0.5), ge7: r.ratios.length ? r.ratios.filter(v => v >= 7).length / r.ratios.length * 100 : NaN, bgMed: q(r.bgLum, 0.5) });
  }
  return out;
}

function summarize(ratios) {
  const n = ratios.length;
  const ge = t => n ? ratios.filter(v => v >= t).length / n * 100 : NaN;
  return { n, min: q(ratios, 0), p1: q(ratios, 0.01), p5: q(ratios, 0.05), p50: q(ratios, 0.5), p95: q(ratios, 0.95), max: q(ratios, 1), ge7: ge(7), ge3: ge(3) };
}

/* 掩膜框：从"这一带里 diff>TAU 的像素"收出列范围，行范围已经由挑带给出 */
function bboxOfBand(d, width, band) {
  let x0 = Infinity, x1 = -1;
  for (let y = band.y0; y <= band.y1; y++) for (let x = 0; x < width; x++) if (d[y * width + x] > TAU) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  return { x0: x0 === Infinity ? 0 : x0, x1: x1 < 0 ? width - 1 : x1 };
}

/* ============================ 4. 一次性服务 + headless Edge ============================ */
let server = null;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};
const INJECT = {
  plain: '',
  hidden: '<style>.hero-title{visibility:hidden}</style>',
  nohalo: '<style>.hero-title{text-shadow:none}</style>',
  /* ⚠️ 变异测试档，不参与出数：把远程字体样式表整个摘掉 ⇒ 标题落到本地衬线回退。
     plain 与 nofont 的标题区如果**不一样**，就证明 plain 那一帧确实是网络字体在渲染
     （"解出了掩膜"和"解出的是 Noto Serif SC 的掩膜"是两件事，前者不需要后者成立）。 */
  nofont: '',
};
const FONT_LINK_RE = /<link href="https:\/\/fonts\.[^"]*" rel="stylesheet">/;
const stats = { requests: 0, injected: { plain: 0, hidden: 0, nohalo: 0, nofont: 0 } };

async function startServer() {
  server = createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    stats.requests++;
    if (u.pathname === '/__seed') {                       // 只写 localStorage 的一次性页（暗色没有命令行开关，§16 ②）
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(`<!doctype html><meta charset="utf-8"><title>seed</title><script>localStorage.setItem('mistwood-theme',${JSON.stringify(u.searchParams.get('theme') || 'light')});</script>`);
      return;
    }
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(DIST, ...p.split('/').filter(Boolean));
    if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403, { 'content-type': 'text/plain' }); res.end('outside dist'); return; }
    let buf;
    try { buf = readFileSync(file); } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
    const head = { 'cache-control': 'no-store' };
    if (/\.html$/i.test(file)) {
      const m = u.searchParams.get('m') || 'plain';
      const css = INJECT[m];
      if (css === undefined) { res.writeHead(400, { 'content-type': 'text/plain' }); res.end(`unknown m=${m}`); return; }
      let html = buf.toString('utf8');
      if (!html.includes('</head>')) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end('no </head>'); return; }
      if (m === 'nofont') {
        /* 变异测试档：不是"插一段样式"，是"把远程字体那行摘掉"，所以走另一条改动路径 */
        if (!FONT_LINK_RE.test(html)) { res.writeHead(500, { 'content-type': 'text/plain' }); res.end('font <link> not found: nothing was mutated, this shot is worthless'); return; }
        html = html.replace(FONT_LINK_RE, '<!-- probe: font stylesheet removed -->');
      } else {
        html = html.replace('</head>', `${css}</head>`);
      }
      stats.injected[m]++;
      head['content-type'] = MIME['.html'];
      res.writeHead(200, head); res.end(html, 'utf8'); return;
    }
    head['content-type'] = MIME[( '.' + file.split('.').pop().toLowerCase() )] || 'application/octet-stream';
    res.writeHead(200, head); res.end(buf);
  });
  await new Promise((ok, no) => { server.once('error', no); server.listen(0, '127.0.0.1', ok); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const self = await fetch(`${base}/?m=plain`).catch(e => ({ err: e.message }));
  if (self.err || !self.ok) die(`服务自检失败 ${base}/ → ${self.err || self.status}`, '  回环被挡就是服务侧死，和浏览器无关');
  return base;
}

function runEdge(args, profile) {
  return new Promise(res => {
    let child;
    try { child = spawnBrowser(EDGE, args, { cwd: dirname(EDGE), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { return res({ fail: `spawn 抛了：${e.message}` }); }
    let stderr = '', done = false;
    child.stderr.on('data', d => { stderr = (stderr + d.toString('utf8')).slice(-2000); });
    child.stdout.resume();
    child.on('error', e => { if (!done) { done = true; res({ fail: `spawn：${e.code || e.message}` }); } });
    const timer = setTimeout(() => { done = true; try { child.kill(); } catch { } }, 90000);
    child.on('close', code => { if (done) return; done = true; clearTimeout(timer); res({ code, stderr }); });
    void profile;
  });
}

const BASE_FLAGS = profile => [
  '--headless=new', `--user-data-dir=${profile}`, '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
  '--disable-sync', '--force-device-scale-factor=1', '--force-prefers-reduced-motion', '--virtual-time-budget=6000',
];

async function seedProfile(base, profile, theme) {
  const r = await runEdge([...BASE_FLAGS(profile), '--dump-dom', `${base}/__seed?theme=${theme}`], profile);
  if (r.fail) die(`seed 页起浏览器失败：${r.fail}`);
  return r;
}

async function shoot(base, profile, url, out) {
  const r = await runEdge([...BASE_FLAGS(profile), `--window-size=${url.windowSize}`, `--screenshot=${out}`, url.href], profile);
  if (r.fail) return { fail: r.fail };
  if (!existsSync(out)) return { fail: `Edge 退出码 ${r.code} 但没写出文件；stderr 尾部：${r.stderr.slice(-400)}` };
  return { ok: true };
}

/* ============================ 5. selftest ============================ */
if (MODE === 'selftest') { await selftest(); process.exit(0); }

async function selftest() {
  console.log('== PNG 解码器自证 ==');
  let bad = 0;
  /* ① 已知像素的图自己编码再解码回来：五种 filter（0..4）各占若干行，逐字节必须完全一致 */
  const W = 37, H = 10;                                   // 故意用奇数宽，好让 Sub/Paeth 的跨像素项真的参与运算
  const src = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    src[i] = (x * 7 + y * 13) & 255; src[i + 1] = (x * 3) & 255; src[i + 2] = (255 - y * 20) & 255; src[i + 3] = (x % 5) * 50 + 5;
  }
  const png = encodePng(W, H, src, [0, 1, 2, 3, 4, 4, 3, 2, 1, 0]);
  const back = decodePng(png);
  const same = back.width === W && back.height === H && back.data.equals(src);
  console.log(`  ① 自编码→自解码 ${W}×${H}、五种 filter 各 2 行：${same ? '✓ 逐字节一致' : '✗ 不一致'}`);
  if (!same) bad++;
  /* ② 解码器对坏数据必须**炸**，不能安静返回一张错图：篡改 IHDR 宽度与 IDAT 字节各试一次 */
  const t1 = (() => { const b = Buffer.from(png); b.writeUInt32BE(999, 16); try { decodePng(b); return '没炸(✗)'; } catch { return '炸了(✓)'; } })();
  const t2 = (() => { const b = Buffer.from(png); b[b.length - 30] ^= 0xff; try { const g = decodePng(b); return g.data.equals(src) ? '没炸且像素对得上(✗)' : 'CRC 拦住(✓)'; } catch { return '炸了(✓)'; } })();
  console.log(`  ② 抗坏数据：改 IHDR 宽度 → ${t1}；翻 IDAT 一字节 → ${t2}`);
  if (t1.startsWith('没炸') || t2.startsWith('没炸')) bad++;
  /* ③ 灰底 + alpha(type 0/4) 与 type 2 的路径也要过一遍（Edge 不出这些，但脚本要认得） */
  console.log(`  ③ 颜色类型表：${JSON.stringify(COLOR_CHANNELS)}`);
  /* ④ 真图：拿仓库里现成的 og.png 解一次，能解出合理尺寸才算真数据过闸 */
  for (const f of ['og.png']) {
    const p = join(DIST, f);
    if (!existsSync(p)) { console.log(`  ④ dist/${f} 不在，跳过`); continue; }
    try { const g = decodePng(readFileSync(p)); console.log(`  ④ dist/${f} → ${g.width}×${g.height} type=${g.ihdr.colorType} depth=${g.ihdr.bitDepth} interlace=${g.ihdr.interlace} ✓`); }
    catch (e) { console.log(`  ④ dist/${f} 解不开：${e.message}`); bad++; }
  }
  /* ⑤ 反例守卫：如果解码器有系统性偏移，"同一张图重拍两次"会报出满屏差异。留到 shots 之后跑，见 noise()。 */
  console.log(bad ? `\n✗ selftest 有 ${bad} 项没过` : '\n✓ selftest 全过');
  process.exit(bad ? 1 : 0);
}

/* ============================ 6. 出图 ============================ */
async function capture(outDir) {
  const base = await startServer();
  console.log(`服务 ${base}（喂 ${DIST}）`);
  const profiles = mkdtempSync(join(tmpdir(), 'mistwood-pixel-probe-'));
  const jobs = [];
  for (const theme of THEMES) jobs.push({ theme, profile: join(profiles, `p-${theme}`), sizes: [] });
  for (const j of jobs) { mkdirSync(j.profile, { recursive: true }); await seedProfile(base, j.profile, j.theme); console.log(`  seeded ${j.theme} → localStorage.mistwood-theme=${j.theme}`); }
  const t0 = Date.now();
  let n = 0;
  for (let pass = 1; pass <= 2; pass++) {
    for (const vp of VIEWPORTS) for (const j of jobs) {
      const modes = pass === 1 ? ['plain', 'hidden', 'nohalo', 'nofont'] : ['plain', 'hidden'];
      for (const m of modes) {
        const name = `pass${pass}-${vp.w}x${vp.h}-${j.theme}-${m}.png`;
        const out = join(outDir, name);
        const r = await shoot(base, j.profile, { windowSize: `${vp.w},${vp.h}`, href: `${base}/?m=${m}` }, out);
        if (r.fail) die(`拍 ${name} 失败：${r.fail}`, '  这一条不降级：少一张图就没有那一格数，宁可停下');
        const ihdr = decodePng(readFileSync(out)).ihdr;
        console.log(`  [${++n}] ${name} → ${ihdr.width}×${ihdr.height} type=${ihdr.colorType} depth=${ihdr.bitDepth} interlace=${ihdr.interlace}`);
        if (ihdr.width !== vp.w || ihdr.height !== vp.h) {
          die(`出图幅面 ${ihdr.width}×${ihdr.height} ≠ 请求的 --window-size ${vp.w},${vp.h}`,
            `  视口自证没过闸 ⇒ 后面所有数都不许算。差 ${ihdr.width - vp.w}×${ihdr.height - vp.h} 像素：滚动条没藏住 / dpr 不是 1 / 窗口被系统缩放。`);
        }
      }
    }
  }
  console.log(`  ${n} 张拍完用了 ${((Date.now() - t0) / 1000).toFixed(1)}s；服务收到 ${stats.requests} 个请求，注入次数 ${JSON.stringify(stats.injected)}`);
  return { outDir, profiles, base };
}

/* ============================ 7. 分析 ============================ */
function loadPair(outDir, pass, vp, theme) {
  const f = m => decodePng(readFileSync(join(outDir, `pass${pass}-${vp.w}x${vp.h}-${theme}-${m}.png`)));
  return { plain: f('plain'), hidden: f('hidden') };
}

function analyzeOne(outDir, pass, vp, theme, refKey = 'ink') {
  const { plain, hidden } = loadPair(outDir, pass, vp, theme);
  const { bands, rows } = bandsOf(diffMap(plain, hidden), plain.width, plain.height);
  if (!bands.length) die(`${vp.w}×${vp.h} ${theme} pass${pass}：两帧完全一样 ⇒ 注入没生效（标题没被隐去），掩膜为空`, '  对账：服务端的注入次数应当 plain/hidden 各计一次');
  const best = bands.slice().sort((a, b) => b.count - a.count)[0];
  const bb = bboxOfBand(diffMap(plain, hidden), plain.width, best);
  let band = { y0: best.y0, y1: best.y1, x0: bb.x0, x1: bb.x1 };
  const inkHex = INKS[theme + (refKey === 'ink' ? '' : 'Em')];
  /* 两遍：先用"差异带 + 带内 diff>TAU 的列范围"粗扫一遍，再用**达标字形像素自己的**列范围收紧。
     不收紧的话 1440 亮色那一档的框是 x4–1434（左右各被边缘噪声撑开），横向三分的刀就切在字外面。
     ⚠️ 粗扫→收紧→重扫，主表的数在收紧前后一模一样（差 ≤0.01），变的只是三分那一刀落点。 */
  let { ratios, bgLum, inBand, condSkip, covHi, xMin, xMax } = maskAndStats(plain, hidden, inkHex, band);
  if (xMax > xMin && (xMin > band.x0 || xMax < band.x1)) {
    band = { ...band, x0: xMin, x1: xMax };
    ({ ratios, bgLum, inBand, condSkip, covHi } = maskAndStats(plain, hidden, inkHex, band));
  }
  /* 闸门按参照物分档：主表（--ink）两行中文标题该有数千个达标像素，少于 1500 就是"标题没渲染出来"；
     em 那一档是 300 字重的斜体拉丁词，细笔画几乎没有"整格被墨盖满"的内部，几百个才是对的，
     拿同一道闸去卡它会误报成"没渲染"。 */
  const floor = refKey === 'ink' ? 1500 : 120;
  if (ratios.length < floor) die(`${vp.w}×${vp.h} ${theme} pass${pass}（参照 ${inkHex}）：达标字形像素只有 ${ratios.length} 个（<${floor}）`,
    `  多半是标题没渲染出来 / 网络字体没到（掩膜框 ${JSON.stringify(band)}、带内差异像素 ${inBand}）——这是"拿不到"，不许当"没问题"`);
  return { ...summarize(ratios), reg: atValue(ratios, REGISTERED), inkHex, band, bands: bands.map(b => ({ y0: b.y0, y1: b.y1, count: b.count })), inBand, condSkip, covHi, bandRows: best.rows, bandCols: band.x1 - band.x0 + 1 };
}

/* 光晕那一层单独结一次账（结的是 §2.4:211 那笔"登记值含光晕 vs 本表不含"的差）。
   plain 与 nohalo 之间只差 `text-shadow:0 1px 28px var(--halo)`，而且它画在字形**底下** ⇒
   两帧在字形内部完全一样，差异只出现在字形外那一圈。所以 diff(plain,nohalo) 直接就是光晕的落点图。
   对那一圈每个像素：底 = 无光晕时的那张底（nohalo），有光晕时的底 = plain。同一枚实心 ink 压在两者上的
   对比度之差，就是"把光晕算进去"能抬多高——它解释的是**口径差**，不是"标题其实更安全"。 */
function haloReport(outDir, vp, theme) {
  const { plain, hidden } = loadPair(outDir, 1, vp, theme);
  const nohalo = decodePng(readFileSync(join(outDir, `pass1-${vp.w}x${vp.h}-${theme}-nohalo.png`)));
  const band = analyzeOne(outDir, 1, vp, theme).band;
  const ring = diffMap(plain, nohalo);
  const glyph = diffMap(plain, hidden);
  const inkL = relLum(...hexRgb(INKS[theme]));
  let n = 0, darker = 0, lift = 0, wLow = 0, wHigh = 0;
  const lifts = [];
  for (let y = band.y0 - 30; y <= band.y1 + 30; y++) for (let x = band.x0 - 30; x <= band.x1 + 30; x++) {
    if (x < 0 || y < 0 || x >= plain.width || y >= plain.height) continue;
    const i = y * plain.width + x;
    if (ring[i] <= TAU || glyph[i] > TAU) continue;    // 只看光晕那一圈：字形内部的像素不参与
    const j = i * 4;
    const lw = relLum(plain.data[j], plain.data[j + 1], plain.data[j + 2]);
    const lo = relLum(nohalo.data[j], nohalo.data[j + 1], nohalo.data[j + 2]);
    n++; if (lw < lo) darker++;
    const a = contrast(inkL, lo), b = contrast(inkL, lw);
    lifts.push(b - a);
  }
  if (!n) return null;
  const s = Float64Array.from(lifts).sort();
  for (const v of s) { if (v > 0) wHigh++; else if (v < 0) wLow++; lift += v; }
  return { n, darkerPct: darker / n * 100, meanLift: lift / n, medLift: q(s, 0.5), p95Lift: q(s, 0.95), raised: wHigh / n * 100 };
}

/* 字体到位没有：plain vs nofont 的标题区如果对不上，说明 plain 那一帧真的是网络字体在渲染 */
function fontProbe(outDir, vp, theme) {
  const a = decodePng(readFileSync(join(outDir, `pass1-${vp.w}x${vp.h}-${theme}-plain.png`)));
  let b;
  try { b = decodePng(readFileSync(join(outDir, `pass1-${vp.w}x${vp.h}-${theme}-nofont.png`))); } catch { return null; }
  const d = diffMap(a, b);
  let nz = 0, mx = 0;
  for (let i = 0; i < d.length; i++) { if (d[i] > TAU) nz++; if (d[i] > mx) mx = d[i]; }
  return { nz, pct: nz / d.length * 100, max: mx };
}

/* 噪声底：pass1 与 pass2 同一档两拍，逐像素 |Δ| 分布 + 差异落在哪儿 + 掩膜统计本身漂了多少 */
function noise(outDir, vp, theme) {
  const a = loadPair(outDir, 1, vp, theme).plain, b = loadPair(outDir, 2, vp, theme).plain;
  const ha = loadPair(outDir, 1, vp, theme).hidden, hb = loadPair(outDir, 2, vp, theme).hidden;
  const per = [];
  for (const [p, q2, label] of [[a, b, 'plain'], [ha, hb, 'hidden']]) {
    const d = diffMap(p, q2);
    const n = d.length, hist = new Map();
    let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1, nz = 0, gt2 = 0, mx = 0;
    const arr = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
      const v = d[i]; arr[i] = v;
      if (v > 0) { nz++; hist.set(v, (hist.get(v) || 0) + 1); const x = i % p.width, y = (i / p.width) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (v > TAU) gt2++;
      if (v > mx) mx = v;
    }
    const s = Array.from(arr).sort((m, k) => m - k);
    const top = [...hist.entries()].sort((m, k) => k[1] - m[1]).slice(0, 6);
    const inBand = (() => { const bd = bandsOf(d, p.width, p.height); const best = bd.bands.slice().sort((m, k) => k.count - m.count)[0]; return best ? { y0: best.y0, y1: best.y1, count: best.count } : null; })();
    per.push({ label, px: n, nz, pct: nz / n * 100, gt2, pctGt2: gt2 / n * 100, max: mx, med: q(s, 0.5), p99: q(s, 0.99), p999: q(s, 0.999), bbox: nz ? { x0, x1, y0, y1 } : null, histTop: top, biggestBand: inBand });
  }
  return per;
}

/* 登记值落在这张逐像素分布的第几百分位。⚠️ 它回答的是"10.04 与这张分布是什么关系"，不是"哪个对"：
   登记值是"整块首屏底 + 含光晕"的**点值**，本表是"每个字形像素正背后那一格"的**分布**，两者不是同一种量。
   基准可从命令行改：--registered=10.04（默认取 §2.4 表里那枚暗色 Hero 标题登记值）。 */
const atValue = (sorted, v) => sorted.length
  ? { rank: sorted.filter(x => x < v).length / sorted.length * 100, pct: sorted.filter(x => x >= v).length / sorted.length * 100 }
  : { rank: NaN, pct: NaN };
const REGISTERED = Number(opt('registered') || 10.04);
function fmt(s) {
  return `最差 ${s.min.toFixed(2)} / p1 ${s.p1.toFixed(2)} / p5 ${s.p5.toFixed(2)} / 中位 ${s.p50.toFixed(2)} / p95 ${s.p95.toFixed(2)} · ≥7:1 ${s.ge7.toFixed(1)}% · ≥3:1 ${s.ge3.toFixed(1)}% · 字形像素 ${s.n} · 登记值 ${REGISTERED} 落在第 ${s.reg.rank.toFixed(1)} 百分位（≥它的像素 ${s.reg.pct.toFixed(1)}%）`;
}

async function main() {
  INKS = readInkTokens();
  const only = opt('analyze-only');
  const outDir = resolve(only || opt('out') || mkdtempSync(join(tmpdir(), 'mistwood-pixel-probe-')));
  mkdirSync(outDir, { recursive: true });
  if (!only) await capture(outDir);
  else console.log(`只分析目录 ${outDir}（不再出图）`);
  console.log(`\n口径：浏览器 ${EDGE}`);
  console.log(`        为什么是它：${BROWSER.note}`);
  for (const s of browserSkips) console.log(`        ${s}`);
  console.log(`  flags：--headless=new --force-device-scale-factor=1 --hide-scrollbars --disable-gpu --force-prefers-reduced-motion --virtual-time-budget=6000`);
  console.log(`  掩膜参照 --ink：亮 ${INKS.light} / 暗 ${INKS.dark}（现读自 src/styles/base.css）`);
  const table = [];
  for (const vp of VIEWPORTS) for (const theme of THEMES) {
    const p1 = analyzeOne(outDir, 1, vp, theme), p2 = analyzeOne(outDir, 2, vp, theme);
    const em1 = analyzeOne(outDir, 1, vp, theme, 'em');
    table.push({ vp, theme, p1, p2, em1, noise: noise(outDir, vp, theme), halo: haloReport(outDir, vp, theme), font: fontProbe(outDir, vp, theme), thirds: thirds(outDir, 1, vp, theme, p1.band) });
  }
  console.log('\n===== 噪声底（同构建、同参数，pass1 vs pass2 逐像素）=====');
  for (const r of table) {
    console.log(`\n${r.vp.w}×${r.vp.h} ${r.theme}`);
    for (const nz of r.noise) {
      console.log(`  ${nz.label}：有差异 ${nz.nz}/${nz.px} = ${nz.pct.toFixed(4)}%｜|Δ|>2 ${nz.gt2} = ${nz.pctGt2.toFixed(4)}%｜|Δ| 中位 ${nz.med} / p99 ${nz.p99} / p999 ${nz.p999} / 最大 ${nz.max}`);
      console.log(`     差异像素 bbox ${nz.bbox ? `x${nz.bbox.x0}–${nz.bbox.x1} / y${nz.bbox.y0}–${nz.bbox.y1}` : '（无）'}｜最大差异带 y${nz.biggestBand ? `${nz.biggestBand.y0}–${nz.biggestBand.y1}（${nz.biggestBand.count} px）` : '—'}`);
      console.log(`     |Δ| 直方 top：${nz.histTop.map(([v, c]) => `${v}:${c}`).join(' ')}`);
    }
    console.log(`  统计本身漂了多少：最差 ${(r.p2.min - r.p1.min).toFixed(3)} / p1 ${(r.p2.p1 - r.p1.p1).toFixed(3)} / 中位 ${(r.p2.p50 - r.p1.p50).toFixed(3)} / ≥7:1 ${(r.p2.ge7 - r.p1.ge7).toFixed(2)}pp / 像素数 ${(r.p2.n - r.p1.n) > 0 ? '+' : ''}${r.p2.n - r.p1.n}`);
  }
  console.log('\n===== 暗色 / 亮色 Hero 标题逐像素对比度（不含光晕，覆盖率 ≥98.5%）=====');
  for (const r of table) {
    console.log(`\n${r.vp.w}×${r.vp.h} ${r.theme}${r.theme === 'dark' ? '（暗色＝本卡要结的账）' : '（亮色＝同法对照）'}`);
    console.log(`  pass1  ${fmt(r.p1)}`);
    console.log(`  pass2  ${fmt(r.p2)}`);
    console.log(`  掩膜框 x${r.p1.band.x0}–${r.p1.band.x1} / y${r.p1.band.y0}–${r.p1.band.y1}（${r.p1.bandCols}×${r.p1.bandRows}）｜带内差异像素 ${r.p1.inBand}｜背景贴近 ink 被剔 ${r.p1.condSkip}｜覆盖率>上限被剔 ${r.p1.covHi}`);
    if (r.p1.bands.length > 1) console.log(`  其余差异带（已排除）：${r.p1.bands.filter(b => b.y0 !== r.p1.band.y0).map(b => `y${b.y0}–${b.y1}=${b.count}`).join(' ')}`);
    console.log(`  [参照 ${r.em1.inkHex}＝标题里那个英文斜体词] ${fmt(r.em1)}`);
    console.log(`  [光晕那一层] ${r.halo ? `${r.halo.n} 个像素｜${r.halo.darkerPct.toFixed(1)}% 被压暗｜把光晕算进去的抬升 中位 ${r.halo.medLift.toFixed(3)} / 均值 ${r.halo.meanLift.toFixed(3)} / p95 ${r.halo.p95Lift.toFixed(3)}（正=光晕让对比度变好）` : '无（这一档没拍到 nohalo）'}`);
    console.log(`  [字体到位对账] plain vs nofont 全图差异 ${r.font ? `${r.font.nz} px = ${r.font.pct.toFixed(2)}%、|Δ| 最大 ${r.font.max}（>0 ⇒ plain 那一帧确实由网络字体渲染）` : '缺 nofont 帧'}`);
    console.log(`  [横向三分] ${r.thirds.map(t => `${t.part} 底中位 ${t.bgMed.toFixed(4)}｜字形 ${t.n}px 最差 ${t.min.toFixed(2)} 中位 ${t.p50.toFixed(2)} ≥7:1 ${t.ge7.toFixed(1)}%`).join(' ‖ ')}`);
  }
  writeFileSync(join(outDir, 'result.json'), JSON.stringify({ edge: EDGE, dist: DIST, ink: INKS, flags: BASE_FLAGS('x'), rows: table.map(r => ({ vp: `${r.vp.w}x${r.vp.h}`, theme: r.theme, p1: r.p1, p2: r.p2, noise: r.noise })) }, null, 1));
  console.log(`\n机器可读结果 ${join(outDir, 'result.json')}｜PNG 留在 ${outDir}`);
  if (!flag('keep')) { for (const p of [join(outDir)]) void p; }
  server?.close();
}

await main();
