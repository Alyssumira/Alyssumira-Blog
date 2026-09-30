/* font-fallback-check.mjs —— 字体度量回退的两档量具（规范 §3「度量回退」那一格）
   用法  node tools/font-fallback-check.mjs            # 两档对照，只出数与表（人读的）
         node tools/font-fallback-check.mjs --gate     # 判据档：回退压位移不达标 ⇒ exit 1
         node tools/font-fallback-check.mjs --json     # 机器可读的数值表（朝窄逐字节回归比这一份）
         node tools/font-fallback-check.mjs --tol-h=2 --tol-w=2   # 换容差（百分点）

   ── 这一把尺量的是什么 ────────────────────────────────────────────────────────
   远程 css2 取不到时，访客不会看到报错——整站悄悄换成系统默认字，行盒高度、字宽、基线全变，
   页面看起来"还是那个网站"。本工具对**同一批文字**读两档：
     甲档 remote  ：原样喂 dist/，`fonts.loli.net` 的 css2 与 gstatic 的字体文件真落地；
     乙档 blocked ：服务端把那枚 <link rel="stylesheet"> 摘掉再喂（照 pixel-probe 的 nofont 档、
                    runtime-check 的内联隔离档那条路——**不改任何源码、不改 FONT_HOST 默认值**，
                    摘不动就 500，不许回一份"其实没改"的页面让 Δ 假装是 0）。
   每枚探针读三件：元素 `getBoundingClientRect().height`（行盒高）、`Range.getClientRects()` 的
   宽度总和（字宽）、rect 枚数（行数——折行挪位在这一维看得见）。Δ% = (乙−甲)/甲。

   ── 在场判定用的是哪一枚证据（§13a 钉过：check() 在零 face 注册时是**空真**，computed family
      名也不算证据）──────────────────────────────────────────────────────────
   ① `facesloaded`＝`document.fonts.values()` 里 status==='loaded' 的枚数（>0 才叫远程 face 真落地）；
   ② gstatic 的 resource timing：枚数与 transferSize 之和（transferSize>0 ＝ 真从网络取过字节；
      ⚠️ 跨源没有 Timing-Allow-Origin 时 responseStatus 恒读 0，0 ≠ 失败，看 transferSize，runbook 那条）。
   乙档反向对账：fonts.loli.net / gstatic 的资源请求枚数必须是 **0**，否则这一档白跑。
   ⚠️ 本机装有同名的 NotoSerifSC-VF.ttf / NotoSansSC-VF.ttf（HKLM 在册）——"Noto Serif SC"这枚名字
   在乙档照样命中本地同名安装。所以 **CJK 两族的回退链在真页面上量不出访客侧的形状**，
   那两族由下面的 ghost 探针量；而甲档的在场性由 ①② 两枚独立见证物钉死，不受本机安装影响
   （注册过的 @font-face 压过同名本地字体）。`document.fonts.size` 读 0 与否在**本机**不证明任何事。

   ── ghost 探针：把"访客那台没装 Noto 的机器"搬进本工具 ──────────────────────
   服务端在同一页注入一段 position:fixed;top:-99999px 的探针组（不参与版面、不改任何数）：
     r_* ＝ 远程真身栈（`"Noto Serif SC"` 等），只在甲档取数＝参照 R；
     g_* ＝ 把栈头换成 `"__ghost__"` 的**现状回退链**（去掉本地同名安装这一层遮挡），乙档取数＝G；
     f_* ＝ 同一串加上度量回退 face 的链，乙档取数＝F。
   改动前 f_* 里那枚 `-fallback` 家族没注册、也没本地同名 ⇒ 与 g_* 逐位相同（量具自证"改动没落地时
   它不装绿"）；改动后 F 必须比 G 更接近 R。Δ(R,G) 是访客今天的位移，Δ(R,F) 是回退后的位移，
   --gate 判的就是它：**F 既要比 G 小，也要落在容差里**（只小不达标不算治好）。

   ── 取数路线：CDP 路线 B（§3.1/§3.2 实测跑通并登记过的那条）────────────────
   `--remote-debugging-port=0` → 读 profile 里的 `DevToolsActivePort` → `/json/version` →
   Node 24 全局 WebSocket → `Target.createTarget`+`attachToTarget{flatten}` →
   `Emulation.setDeviceMetricsOverride` 1440×900 → `Page.navigate` → 每页
   `Runtime.evaluate{awaitPromise,returnByValue}`：先 `await document.fonts.ready`，再量。
   ⚠️ 无头环境的坑（本卡实测并写进规范）：`visibilityState=hidden` 时 CSS 过渡不走帧——所以
   读数**不依赖任何动画落位**（带 `--force-prefers-reduced-motion` 把雾带钉死，§17 第 2 条同因），
   等的是 `document.fonts.ready` 而不是 rAF；`document.fonts.check()` 一枚都不许当证据（空真，见上）。
   每档导航完把 `window.innerWidth` 读回来对账（必须 1440），不等就停——§3.1 那条老规矩。

   ── 两侧格子（--gate 才有牙）───────────────────────────────────────────────
   朝窄：甲档（远程在场）的所有读数不许被回退栈动过——量具把甲档数写成稳定 JSON，
          改动前后各跑一次、`tr -d '\r'` 后逐字节对（这台机器 core.autocrlf=true，raw md5 永远不等是坑不是回归）。
   朝宽：把任意一枚 size-adjust 歪 10%，F 那一档的 Δ 必须冲破容差 ⇒ --gate exit 1。
*/
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir, homedir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = n => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };
const flag = n => argv.includes(`--${n}`);
const DIST = resolve(opt('dist') || join(ROOT, 'dist'));
const GATE = flag('gate');
const TOL_H = Number(opt('tol-h') || 2);   // 行盒高容差（百分点）——见文件尾"容差是怎么定的"
const TOL_W = Number(opt('tol-w') || 2);   // 字宽容差
const die = (msg, hint) => { console.error(`\n✗ font-fallback-check 停在半路：${msg}`); if (hint) console.error('  ' + hint); console.error('  ⚠️ 这是硬失败：判据没跑到就等于没绿。'); process.exit(1); };

if (!existsSync(join(DIST, 'index.html'))) die(`没有产物 ${DIST}`, '  先 `npm run build`——本工具读 dist/，不读源码');
const EDGE_CANDIDATES = [
  opt('edge'),
  process.env['PROGRAMFILES'] && join(process.env['PROGRAMFILES'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  process.env['LOCALAPPDATA'] && join(process.env['LOCALAPPDATA'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
].filter(Boolean);
const EDGE = opt('edge') ? resolve(opt('edge')) : EDGE_CANDIDATES.find(p => existsSync(p));
if (!EDGE || !existsSync(EDGE)) die(`找不到 msedge（试过 ${EDGE_CANDIDATES.join(' / ')}）`, '  换浏览器传 --edge=<路径>；这条不降级、不跳过');

/* ---------- 探针表：真页面上现成的元素（两档都量，甲档是参照） ----------
   文字必须是**静态**的：#clock 会被 site.js 改写、about 页 colophon 有构建时刻三行——都不选。 */
const REAL = [
  { fam: 'Fraunces',      page: '/',                        sel: '.hero-name',           what: '站名（Fraunces 正体拉丁）' },
  { fam: 'Fraunces',      page: '/essays/fog-debugging/',   sel: '#post-body em',        what: '正文斜体词（Fraunces 斜体）' },
  { fam: 'IBM Plex Mono', page: '/',                        sel: '.row-min',             what: '行末分钟数（等宽数字）' },
  { fam: 'IBM Plex Mono', page: '/essays/fog-debugging/',   sel: '.post-meta',           what: '日期行（等宽＋一枚汉字"字"）' },
  { fam: 'Noto Serif SC', page: '/essays/fog-debugging/',   sel: '.post-title',          what: '篇名（衬线中文标题）' },
  { fam: 'Noto Serif SC', page: '/essays/fog-debugging/',   sel: '#post-body h2',        what: '章题（衬线中文 30px）' },
  { fam: 'Noto Sans SC',  page: '/about/',                  sel: '.col-grid dd',         what: '站点档案行（无衬线混排）' },
];
/* ---------- ghost 探针：访客侧形状（CJK 两族本机被同名安装遮挡，只有这条路能量） ----------
   r/g/f 三串栈逐条显式写死（不派生）：f 与 shipped 样式表的追加位置同一口径——`-fallback` 钉在
   自己的族名身位（ghost 顶掉的那格）之后、下一枚本地偏好之前；追加到通用关键字之后永远轮不上，那是自骗。
   改动前 f_* 里那枚 `-fallback` 家族没注册、也没本地同名 ⇒ 与 g_* 逐位相同（量具自证"改动没落地时
   它不装绿"）；改动后 F 必须比 G 更接近 R。Δ(R,G) 是访客今天的位移，Δ(R,F) 是回退后的位移，
   --gate 判的就是它：**F 既要比 G 小，也要落在容差里**（只小不达标不算治好）。
   text 定长、字号 18px / line-height:normal / nowrap inline-block ⇒ 一枚行盒、一串推进宽。 */
const PROBE_FONT = 'font-size:18px;line-height:normal;letter-spacing:0;display:inline-block;white-space:nowrap;';
const PROBES = [
  { fam: 'Fraunces',      style: 'normal', weight: 400, text: 'Fog & light — 0123456789',
    r: `'Fraunces',serif`, g: `'__ghost__',serif`, f: `'__ghost__','Fraunces-fallback',serif` },
  { fam: 'Fraunces',      style: 'normal', weight: 600, text: 'Alyssumira',
    r: `'Fraunces',serif`, g: `'__ghost__',serif`, f: `'__ghost__','Fraunces-fallback',serif` },
  { fam: 'Fraunces',      style: 'italic', weight: 400, text: 'light and misty 2026',
    r: `'Fraunces',serif`, g: `'__ghost__',serif`, f: `'__ghost__','Fraunces-fallback',serif` },
  { fam: 'IBM Plex Mono', style: 'normal', weight: 400, text: '2026.09.28 fog 482',
    r: `'IBM Plex Mono',monospace`, g: `'__ghost__',monospace`, f: `'__ghost__','IBM Plex Mono-fallback',monospace` },
  { fam: 'IBM Plex Mono', style: 'normal', weight: 500, text: '2026.09.28 fog 482',
    r: `'IBM Plex Mono',monospace`, g: `'__ghost__',monospace`, f: `'__ghost__','IBM Plex Mono-fallback',monospace` },
  { fam: 'Noto Serif SC', style: 'normal', weight: 400, text: '雾天调试法把灯光提着走',
    r: `'Noto Serif SC',serif`, g: `'__ghost__','Songti SC','STSong',serif`, f: `'__ghost__','Noto Serif SC-fallback','Songti SC','STSong',serif` },
  { fam: 'Noto Serif SC', style: 'normal', weight: 400, text: 'fog 482 · 2026 — light',
    r: `'Noto Serif SC',serif`, g: `'__ghost__','Songti SC','STSong',serif`, f: `'__ghost__','Noto Serif SC-fallback','Songti SC','STSong',serif` },
  { fam: 'Noto Sans SC',  style: 'normal', weight: 400, text: '雨后的人行道反着光',
    r: `'Noto Sans SC',sans-serif`, g: `'__ghost__',-apple-system,'PingFang SC','Microsoft YaHei',sans-serif`, f: `'__ghost__','Noto Sans SC-fallback',-apple-system,'PingFang SC','Microsoft YaHei',sans-serif` },
  { fam: 'Noto Sans SC',  style: 'normal', weight: 400, text: 'fog 482 · 2026 — light',
    r: `'Noto Sans SC',sans-serif`, g: `'__ghost__',-apple-system,'PingFang SC','Microsoft YaHei',sans-serif`, f: `'__ghost__','Noto Sans SC-fallback',-apple-system,'PingFang SC','Microsoft YaHei',sans-serif` },
];
const PROBE_PAGE = '/';   // 注入在哪一页（fixed 挂 out-of-flow，别处也能量，统一放首页）

/* ---------- 服务端：喂 dist + 摘 link + 注入探针（全在内存里改，盘上一个字节不动） ---------- */
const FONT_LINK_RE = /<link href="https:\/\/fonts\.[^"]*" rel="stylesheet">/;
const injectStats = { stripped: 0, injected: 0 };
let server;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg',
};
function probeHtml() {
  return PROBES.map((p, i) => {
    const st = PROBE_FONT + `font-style:${p.style};font-weight:${p.weight};`;
    const esc = p.text.replace(/&/g, '&amp;');
    /* f 链与 shipped 样式表的追加位置同一口径：`-fallback` 钉在自己的族名（这里是 __ghost__ 顶掉的
       那个位置）身后、下一枚本地偏好之前——追加到通用关键字之后永远轮不上，那是自骗。 */
    const mk = (tag, fam) => `<span id="fm-${tag}-${i}" style="${st}font-family:${fam}">${esc}</span>`;
    return mk('r', p.r) + mk('g', p.g) + mk('f', p.f);
  }).join('');
}
async function startServer() {
  server = createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    const arm = u.searchParams.get('arm') || 'remote';
    if (arm !== 'remote' && arm !== 'blocked') { res.writeHead(400).end('bad arm'); return; }
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(DIST, ...p.split('/').filter(Boolean));
    if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403).end('outside dist'); return; }
    let buf; try { buf = readFileSync(file); } catch { res.writeHead(404).end('not found'); return; }
    if (/\.html$/i.test(file)) {
      let html = buf.toString('utf8');
      if (!html.includes('</head>')) { res.writeHead(500).end('no </head>'); return; }
      if (arm === 'blocked') {
        if (!FONT_LINK_RE.test(html)) { res.writeHead(500).end('font <link> not found: nothing was stripped, this arm is worthless'); return; }
        html = html.replace(FONT_LINK_RE, '<!-- ffb: remote stylesheet stripped -->');
        if (FONT_LINK_RE.test(html)) { res.writeHead(500).end('stripped link still present'); return; }
        injectStats.stripped++;
      }
      html = html.replace('</head>', `<style>.grain,.fog,.fireflies{animation:none!important}</style></head>`);
      if (u.pathname === '/' || u.pathname === '/index.html') {
        html = html.replace('</body>', `<div id="fm-probes" style="position:fixed;top:-99999px;left:0;">${probeHtml()}</div></body>`);
        injectStats.injected++;
      }
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(html, 'utf8'); return;
    }
    res.writeHead(200, { 'content-type': MIME[( '.' + file.split('.').pop().toLowerCase() )] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(buf);
  });
  await new Promise((ok, no) => { server.once('error', no); server.listen(0, '127.0.0.1', ok); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const self = await fetch(`${base}/?arm=remote`).then(r => r.text()).catch(e => die(`服务自检失败：${e.message}`, '  回环被挡是服务侧死，和浏览器无关'));
  if (!/<html/i.test(self)) die('服务自检没拿到 <html');
  return base;
}

/* ---------- CDP 路线 B：一次浏览器会话，两档 × 三页逐档导航 ---------- */
const profile = mkdtempSync(join(tmpdir(), 'mistwood-ffb-'));
const WS = globalThis.WebSocket;
if (!WS) die('这个 Node 没有全局 WebSocket（需要 ≥22），CDP 路线 B 起不来');
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
const browser = spawn(EDGE, [
  '--headless=new', `--user-data-dir=${profile}`, '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
  '--disable-sync', '--force-device-scale-factor=1', '--force-prefers-reduced-motion', '--remote-debugging-port=0',
  '--window-size=1440,900', 'about:blank',
], { cwd: dirname(EDGE), windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = ''; browser.stderr.on('data', d => { stderr = (stderr + d.toString('utf8')).slice(-4000); });
browser.on('exit', c => { if (!doneFlag) die(`浏览器中途退出（exit=${c}）`, '  stderr 尾部：' + stderr.slice(-500)); });
let doneFlag = false;

async function readPort() {
  for (let i = 0; i < 60; i++) {
    const f = join(profile, 'DevToolsActivePort');
    if (existsSync(f)) { const t = readFileSync(f, 'utf8').trim(); if (t) return t; }
    await wait(250);
  }
  return null;
}
const portLine = await readPort();
if (!portLine) die(`等 15s 没等到 DevToolsActivePort（profile=${profile}）`, '  stderr 尾部：' + stderr.slice(-500));
const port = portLine.split('\n')[0];
const info = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json()).catch(e => die(`/json/version 拿不到：${e.message}`));

let ws, msgId = 0; const pending = new Map(); const events = [];
function send(method, params = {}, sessionId) {
  return new Promise((ok, no) => {
    const id = ++msgId; pending.set(id, { ok, no });
    ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
  });
}
ws = new WS(info.webSocketDebuggerUrl);
await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = e => no(new Error('WebSocket 连不上 devtools')); });
ws.onmessage = m => {
  const o = JSON.parse(m.data);
  if (o.id && pending.has(o.id)) { const p = pending.get(o.id); pending.delete(o.id); o.error ? p.no(new Error(o.error.message)) : p.ok(o.result); return; }
  if (o.method) events.push(o);
};
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Page.enable'); await S('Runtime.enable');
await S('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

async function navigateWait(url) {
  events.length = 0;
  await S('Page.navigate', { url });
  for (let i = 0; i < 240; i++) {                       // loadEventFired 最多等 60s（远程字体在 virtual 之外真走网络）
    if (events.some(e => e.method === 'Page.loadEventFired')) return true;
    await wait(250);
  }
  return false;
}
const EVAL = `(async () => {
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 250));           // swap 落地后再钉一小截，读数不靠运气
  const innerWidthOK = window.innerWidth;
  const measure = el => {
    const rect = el.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(el);
    const rs = [...rg.getClientRects()];
    let w = 0; for (const r of rs) w += r.width;
    return { h: +rect.height.toFixed(4), w: +w.toFixed(4), lines: Math.max(1, rs.filter(r => r.width > 0).length) };
  };
  const bySel = sel => document.querySelector(sel);
  const texts = {};
  for (const t of document.querySelectorAll('#fm-probes [id]')) texts[t.id] = t.textContent.length;
  const gstatic = performance.getEntriesByType('resource').filter(e => /gstatic\\.[a-z.]+|fonts\\.[a-z.]+loli|fonts\\.loli|fonts\\.googleapis/.test(e.name));
  const gbytes = gstatic.reduce((a, e) => a + (e.transferSize || 0), 0);
  const loaded = [...document.fonts.values()].filter(f => f.status === 'loaded');
  return {
    innerWidthOK,
    facesSize: document.fonts.size,
    facesLoaded: loaded.length,
    facesLoadedByFamily: loaded.reduce((a, f) => { a[f.family] = (a[f.family] || 0) + 1; return a; }, {}),
    fontRequests: gstatic.length, fontBytes: gbytes,
    real: Object.fromEntries(${JSON.stringify(REAL.map(r => r.page + '|' + r.sel))}.map(k => {
      const el = bySel(k.split('|')[1]);
      return [k, el ? measure(el) : null];
    })),
    probe: Object.fromEntries([...document.querySelectorAll('#fm-probes [id]')].map(el => [el.id, measure(el)])),
    probeTextLen: texts,
  };
})()`;

async function runArm(base, arm) {
  const pages = [...new Set([...REAL.map(r => r.page), PROBE_PAGE])];
  const out = {};
  for (const pg of pages) {
    const ok = await navigateWait(`${base}${pg.startsWith('/') ? pg : '/' + pg}?arm=${arm}`);
    if (!ok) die(`${arm} 档导航 ${pg} 没等到 load 事件（60s）`, '  "拿不到"从来不算通过');
    const res = await S('Runtime.evaluate', { expression: EVAL, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) die(`${arm} 档 ${pg} 页内求值抛了：${JSON.stringify(res.exceptionDetails.exception?.description || res.exceptionDetails).slice(0, 300)}`);
    out[pg] = res.result.value;
    if (out[pg].innerWidthOK !== 1440) die(`${arm} 档 ${pg} innerWidth=${out[pg].innerWidthOK} ≠ 1440`, '  视口对账没过，后面所有数都不许算（§3.1 老规矩）');
  }
  return out;
}
const base = await startServer();
const remote = await runArm(base, 'remote');
const blocked = await runArm(base, 'blocked');
doneFlag = true;
try { browser.kill(); } catch { }

/* ---------- 防空转：两档的见证物一枚都不能缺 ---------- */
const problems = [];
{
  const rp = Object.values(remote).map(o => ({ loaded: o.facesLoaded, bytes: o.fontBytes, reqs: o.fontRequests }));
  if (rp.every(o => o.loaded === 0)) problems.push(`甲档 facesloaded 全是 0 —— 远程 face 一枚都没落地，参照系塌了（这是网络/镜像的事，不是"读数没问题"）`);
  if (rp.every(o => o.fontBytes === 0)) problems.push(`甲档 fontBytes 全是 0 —— 没有一枚字体真从网络取过字节（transferSize 口径，responseStatus 跨源恒 0 不算证据）`);
  const bp = Object.values(blocked).map(o => o.fontRequests);
  if (bp.some(n => n !== 0)) problems.push(`乙档里 fonts/gstatic 资源请求不是 0（读到 ${bp.join('/')}）—— link 没摘干净，这一档白跑`);
  if (injectStats.stripped === 0) problems.push(`乙档一份 HTML 都没摘过 link（injectStats.stripped=0）`);
  if (injectStats.injected === 0) problems.push(`探针一枚都没注入过`);
  /* r_* 与 f_* 逐位相同＝回退 face 没注册（改动前形态）。--gate 时这不算错——但所有 Δ(R,G) 必须已被 Δ(R,F) 压进容差，所以它必然红；不带 --gate 时如实标注。 */
}

/* ---------- 汇总表 ---------- */
const pct = (a, b) => b ? +(((a - b) / b) * 100).toFixed(2) : null;   // (a−b)/b，b 是甲档参照
const rows = [];
for (const r of REAL) {
  const k = r.page + '|' + r.sel;
  const A = remote[r.page].real[k], B = blocked[r.page].real[k];
  if (!A || !B) { problems.push(`真页探针 ${r.page} ${r.sel} 有一档读到 null（元素不在？量具与页面脱钩了）`); continue; }
  rows.push({ kind: 'real', fam: r.fam, what: r.what, page: r.page, sel: r.sel,
    R: A, G: B, dH: pct(B.h, A.h), dW: pct(B.w, A.w), lines: `${A.lines}→${B.lines}` });
}
PROBES.forEach((p, i) => {
  const A = remote[PROBE_PAGE].probe[`fm-r-${i}`], B = blocked[PROBE_PAGE].probe[`fm-g-${i}`], C = blocked[PROBE_PAGE].probe[`fm-f-${i}`];
  if (!A || !B || !C) { problems.push(`ghost 探针 ${p.fam}/${p.style} 有档读不到`); return; }
  rows.push({ kind: 'probe', fam: p.fam, what: `ghost ${p.style}${p.weight}「${p.text.slice(0, 10)}」${C.h === B.h && C.w === B.w ? '（-fallback 未注册：F≡G）' : ''}`,
    page: PROBE_PAGE, sel: `fm-*-${i}`, R: A, G: B, F: C,
    dHG: pct(B.h, A.h), dWG: pct(B.w, A.w), dHF: C === B ? null : pct(C.h, A.h), dWF: C === B ? null : pct(C.w, A.w), dHFself: pct(C.h, B.h), lines: `${A.lines}→${B.lines}` });
});
if (GATE) {
  for (const r of rows) {
    if (r.kind === 'real') {
      /* 甲档不被动：真页读数两档对不上只在"回退栈动了在场那一档"时红——由外部对 json 逐字节比；
         这里判的是乙档位移：远程没在场的真形状（拉丁两族在本机走的就是这条真链） */
      if (['Fraunces', 'IBM Plex Mono'].includes(r.fam)) {
        if (Math.abs(r.dH) > TOL_H || Math.abs(r.dW) > TOL_W) problems.push(`[gate] 真页 ${r.fam} ${r.page} ${r.sel}：Δ高 ${r.dH}% Δ宽 ${r.dW}% 超出 ±${TOL_H}/±${TOL_W} —— 回退没把这行压进容差`);
      }
    } else {
      if (r.dHG === null) continue;
      /* 两条格子：位移必须**进容差**（治好不是靠近一点点）；改前有超标位移的，还必须**被压小**
         （F 比 G 近）。G 本来就在容差内的维度（中日韩推进宽 1em 对 1em，Δ宽天生 0）不要求"严格更小"——
         压一枚 0 是伪命题，那条要挡的是"有位移却没治好"。 */
      if (Math.abs(r.dHG) > TOL_H && Math.abs(r.dHF) >= Math.abs(r.dHG)) problems.push(`[gate] ${r.what}：Δ高(R,F)=${r.dHF}% ≥ Δ高(R,G)=${r.dHG}% —— 回退没压小行盒位移（朝宽的格子该轮它红）`);
      if (Math.abs(r.dWG) > TOL_W && Math.abs(r.dWF) >= Math.abs(r.dWG)) problems.push(`[gate] ${r.what}：Δ宽(R,F)=${r.dWF}% ≥ Δ宽(R,G)=${r.dWG}% —— 回退没压小字宽位移`);
      if (Math.abs(r.dHF) > TOL_H) problems.push(`[gate] ${r.what}：回退后 Δ高 ${r.dHF}% 仍超 ±${TOL_H}`);
      if (Math.abs(r.dWF) > TOL_W) problems.push(`[gate] ${r.what}：回退后 Δ宽 ${r.dWF}% 仍超 ±${TOL_W}`);
    }
  }
}
console.log(`浏览器 ${EDGE}`);
console.log(`见证物：甲档 facesloaded=${rp0(remote)}／fontBytes=${rb0(remote)}B；乙档 字体请求=${bp0(blocked)} 枚；服务端 摘link×${injectStats.stripped}、注入探针×${injectStats.injected}`);
function rp0(o) { return Object.values(o).map(x => x.facesLoaded).join('/'); }
function rb0(o) { return Object.values(o).map(x => x.fontBytes).reduce((a, b) => a + b, 0); }
function bp0(o) { return Object.values(o).map(x => x.fontRequests).join('/'); }
console.log('甲档逐页 loaded face 枚数与按族分布：');
for (const [pg, o] of Object.entries(remote)) console.log(`  ${pg}  size=${o.facesSize} loaded=${o.facesLoaded}  ${JSON.stringify(o.facesLoadedByFamily)}`);
console.log(`\n${'族'.padEnd(14)} 探针          Δ高%   Δ宽%   行数     备注`);
for (const r of rows) {
  if (r.kind === 'real') console.log(`${r.fam.padEnd(14)} 真页 ${r.sel.padEnd(14)} ${String(r.dH).padStart(6)} ${String(r.dW).padStart(7)}  ${r.lines.padStart(6)}  ${r.what}`);
  else console.log(`${r.fam.padEnd(14)} ghost R=${r.R.h}/${r.R.w} G ${String(r.dHG).padStart(6)}% 宽 ${String(r.dWG).padStart(6)}% | F ${String(r.dHF).padStart(6)}% 宽 ${String(r.dWF).padStart(6)}%  ${r.what}`);
}
const machine = { edge: EDGE, dist: DIST, tol: { h: TOL_H, w: TOL_W }, witness: { remoteLoaded: rp0(remote), remoteBytes: rb0(remote), blockedReqs: bp0(blocked) }, injectStats, rows };
if (flag('json')) console.log('\n@@JSON-START\n' + JSON.stringify(machine, null, 1) + '\n@@JSON-END');
if (problems.length) { console.log(`\n✗ font-fallback-check ${GATE ? '红了' : '发现问题（人读档不判红）'} ${problems.length} 条：`); for (const p of problems) console.log('  · ' + p); process.exit(GATE ? 1 : 1); }
console.log(`\n✓ font-fallback-check：两档读数交付${GATE ? '，判据全过' : '（未带 --gate，只出数）'}`);
try { rmSync(profile, { recursive: true, force: true }); } catch { }
server.close();
process.exit(0);
