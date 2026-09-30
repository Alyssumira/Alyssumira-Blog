/* font-fallback-check.mjs —— 字体度量回退的两档量具（规范 §3.3「度量回退」那一格）
   靶（2026-09-30 `card/fallbackrepoint` 重钉）：站内自托管的 `/fonts/**.woff2`——乙档由服务端对它们回 404。
   用法  node tools/font-fallback-check.mjs            # 两档对照，只出数与表（人读的）
         node tools/font-fallback-check.mjs --gate     # 判据档：乙档没拦到／回退位移不达标 ⇒ exit 1
         node tools/font-fallback-check.mjs --json     # 机器可读的数值表（朝窄逐字节回归比这一份）
         node tools/font-fallback-check.mjs --tol-h=2 --tol-w=2   # 换容差（百分点，不许为了变绿去拧它）

   ── 这一把尺量的是什么 ────────────────────────────────────────────────────────
   字取不到时，访客不会看到报错——整站悄悄换成别的脸，行盒高度、字宽、基线全变，
   页面看起来"还是那个网站"。2026-09-30 `6ea31e8`（§21／`card/cjk-subset`）之后四族**全部站内自托管**
   （`public/fonts/**` 的 woff2，face 表在 `src/styles/base.css`），产物里再也没有 css2 那枚远程 `<link>`
   ——所以"取不到字"今天在访客身上的**形状**是：HTML 与 `_astro/*.css` 全到、`@font-face` 的名字被占死、
   而那几枚 `/fonts/**.woff2` 的请求 404。本工具对**同一批文字**读两档：
     甲档 remote  ：原样喂 dist/，四族自托管的 woff2 真落地（在场＝资源齐全那一侧的格子）；
     乙档 blocked ：服务端对 `/fonts/<族目录>/<文件>.woff2` 的请求**回 404＋空响应体**（照 pixel-probe 的
                    nofont 档、runtime-check 的内联隔离档那条路——**不改任何源码、不改 FONT_HOST 默认值、
                    盘上一个字节不动**；CSS 照旧全量送达，这一档拦的从来不是"样式表没了"，见下面第 0 问）。
                    拦不到就当场红（旧版是 500＋摘 link 计数），不许回一份"其实没拦"的页面让 Δ 假装是 0。
   每枚探针读三件：元素 `getBoundingClientRect().height`（行盒高）、`Range.getClientRects()` 的
   宽度总和（字宽）、rect 枚数（行数——折行挪位在这一维看得见）。Δ% = (乙−甲)/甲。

   ── 在场判定用的是哪一枚证据（§13a 钉过：check() 在零 face 注册时是**空真**，computed family
      名也不算证据）──────────────────────────────────────────────────────────
   ① `selfFacesLoaded`＝`document.fonts.values()` 里 status==='loaded' 且 family 是四族**正身**（名字不带
      `-fallback`）的枚数——自托管时代这一枚才是"字真落地"；只数 loaded 总枚数会骗人，影子家族也 loaded。
   ② `/fonts/**` 的 resource timing：请求枚数 ＋ **到位字节**之和（同站内 `encodedBodySize` 读得到，
      不需要 Timing-Allow-Origin；404 空响应体 ⇒ 到位字节恒 0。`responseStatus` 一并打出来当第二枚见证物）。
   ③ canvas `measureText` 的 size-adjust 指纹（见下面"落点证据"那节）。
   乙档对账（旧那句"fonts.loli.net / gstatic 的资源请求枚数必须是 0"在新靶下的等价物）：
      被拦的 `/fonts/**` 枚数**必须 >0**（服务端计数，逐页都数得到、四族目录一枚都不能缺）、
      乙档里正身 loaded 必须 0、`/fonts/**` 到位字节必须 0、样式表必须**照旧在场**（否则这一档测的是另一件事）；
      远程 fonts/gstatic 的请求枚数两档仍必须是 **0**——站里不该再有远程字，读到非 0 就是产品长回了外链。
   ⚠️ 本机装有同名的 NotoSerifSC-VF.ttf / NotoSansSC-VF.ttf（HKLM 在册）——"Noto Serif SC"这枚名字
   在乙档照样可能命中本地同名安装（注册过的 @font-face 压过同名本地字体，但 face 载入失败后那一格
   到底谁接住，真页面上量不出访客侧的形状）。所以 **CJK 两族的回退位移由下面的 ghost 探针量**，
   真页那四枚 CJK 探针只出数不判红；甲档的在场性由 ①② 两枚独立见证物钉死，不受本机安装影响。
   `document.fonts.size` 读 0 与否在**本机**不证明任何事。

   ── 落点证据：拦掉之后屏上落到哪枚 face（影子家族还是 UA 默认）──────────────
   `document.fonts` 的状态表只说明注册表里发生了什么（乙档实测：正身 error 8/5/4 枚、loaded 0 枚，
   影子家族 loaded 9/7/6 枚），本机同名安装那一层它看不见 ⇒ 再加 canvas 的两维读数当指纹：
   `measureText().width`（推进宽）＋ `fontBoundingBoxAscent+Descent`（行盒——ascent/descent-override
   与 size-adjust 正作用在这一维上）。每族拿三枚候选比：影子家族的 canvas 度量、UA 通用关键字的
   canvas 度量、以及**同一页上把影子家族摘掉的那枚 ghost 探针（g_*）＝屏上真正的"没有影子会落成什么样"**。
   判据：屏上 f_* 必须**贴住影子的度量**（两维都在容差内）且**离"没影子"那一枚远**（至少一维冲出容差）。
   ⚠️ 负对照为什么不取 canvas 的 UA 关键字：方块区里 `serif`/`sans-serif` 今天解析到宋体／雅黑，
      正是影子家族自己锚的那枚字 ⇒ 两枚读数逐位相同（实测 盒 26/宽 198 全等），拿它当负对照是自己比自己。
      `check()` 与 computed family 名一枚都不许当证据（本机装过同名 CJK 可变脸时它们都是空真）。

   ── ghost 探针：把"访客那台没装 Noto 的机器"搬进本工具 ──────────────────────
   服务端在同一页注入一段 position:fixed;top:-99999px 的探针组（不参与版面、不改任何数）：
     r_* ＝ 正身栈（`"Noto Serif SC"` 等，甲档里由站内 woff2 接住），只在甲档取数＝参照 R；
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
   朝窄：甲档（在场）的所有读数不许被回退栈动过——量具把甲档数写成稳定 JSON，
          改动前后各跑一次、`tr -d '\r'` 后逐字节对（这台机器 core.autocrlf=true，raw md5 永远不等是坑不是回归）。
   朝宽：把任意一枚 size-adjust 歪 10%，F 那一档的 Δ 必须冲破容差 ⇒ --gate exit 1。
   中间那格（乙档自己成立）：**拦不到＝红，而且红名必须指"没拦到"（打 `[乙档空转]`）不指"读数不达标"**——
          上一轮踩的就是这个格：产物里没那枚 link 之后 stripped=0，它照常往下跑，17 条红里只有第一条说的是
          真话，其余 16 条全是"乙档读到的是 500 错误页"的连带噪音。这一格要的就是红得认得出靶子塌了。
   ⚠️ 这把尺**不在 `check`/`gate` 链里**（要起本机 headless Edge，同 runtime-check 上不了 Vercel 的理由），
      塞进门禁会让干净检出"红的是环境"。它红了由人读：用法与判据落点登记在 `docs/部署与复现.md`
      那张链外表与规范 §3.3，见这两格的"谁来看这枚红"。
*/

import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir, homedir } from 'node:os';
import { resolveBrowser, browserCandidates, spawnBrowser } from './browser-bin.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = n => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };
const flag = n => argv.includes(`--${n}`);
const DIST = resolve(opt('dist') || join(ROOT, 'dist'));
const GATE = flag('gate');
const TOL_H = Number(opt('tol-h') || 2);   // 行盒高容差（百分点）——出处＝规范 §3.3 那条"逐探针 ≤2%"的签字，不是手感
const TOL_W = Number(opt('tol-w') || 2);   // 字宽容差（⚠️ 不许为了变绿去拧它：拧过就等于换了一把尺去比历史读数）
/* die() 也要收摊，而且**不许硬退**：这工具死在半路时浏览器、CDP 的 WebSocket、两台内存服务器都还活着，
   直接 process.exit(1) 会在 Windows 上撞出 libuv 的 `!(handle->flags & UV_HANDLE_CLOSING)` 断言，
   退出码变成 127、断言那行还盖在真正的那句话后面（本轮变异(a)实测踩过两回）。
   所以：先杀子进程／关 ws／关服务器，再只设 exitCode 让事件循环自己走完，另留一枚 unref 的兜底定时器。 */
let browser = null, ws = null, doneFlag = false;
const servers = [];
const die = (msg, hint) => {
  console.error(`\n✗ font-fallback-check 停在半路：${msg}`); if (hint) console.error('  ' + hint); console.error('  ⚠️ 这是硬失败：判据没跑到就等于没绿。');
  doneFlag = true;
  try { browser && browser.kill(); } catch { }
  try { ws && (ws.readyState === 0 || ws.readyState === 1) && ws.close(); } catch { }
  for (const s of servers) { try { s.close(); } catch { } }
  process.exitCode = 1;
  setTimeout(() => process.exit(1), 3000).unref();
};

if (!existsSync(join(DIST, 'index.html'))) die(`没有产物 ${DIST}`, '  先 `npm run build`——本工具读 dist/，不读源码');
/* 用哪一枚浏览器不在这里判——站内唯一一处是 `tools/browser-bin.mjs`（2026-09-30 `card/browserbin`）：
   判据是**探得到靶**（交回的 DOM 里带着只有 JS 跑过才存在的标记），不是"msedge 的文件在不在盘上"。 */
const browserSkips = [];
const BROWSER = await resolveBrowser({ flag: opt('browser') || opt('edge'), label: 'font-fallback-check', log: s => browserSkips.push(s.trim()) });
const EDGE = BROWSER && BROWSER.bin;
const EDGE_CANDIDATES = browserCandidates(opt('browser') || opt('edge')).map(c => c.bin);
if (!EDGE) die(`没有一枚浏览器探得到靶（试过：${EDGE_CANDIDATES.join(' / ')}）\n${browserSkips.map(s => '  ' + s).join('\n')}`,
  '  换浏览器传 --browser=<路径>（旧名 --edge= 也认）或设环境变量 MISTWOOD_BROWSER；这条不降级、不跳过');

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

/* ---------- 第 0 问的靶：站内自托管那四族的字文件 ----------
   正身族名（`-fallback` 尾巴的是影子家族，另一回事）与 `public/fonts/**` 的目录段一一对应。
   列在这里只为了对账"四族一枚都没漏"，路径判据本身按目录段认、不写死文件名——加一族不用改判据。
   ⚠️ 裁决（第 0 问第 3 件）：**拉丁两族一起拦**，不是"顺手全拦"。三条理由：
     ① 访客身上发生的是同一件事——站内 `/fonts/**` 取不到，四族现在住同一个门牌，只拦 CJK 是造半件事；
     ② 真页那四枚判据（`.hero-name`/`#post-body em`/`.row-min`/`.post-meta`，管 Fraunces 与 Plex）是这把尺
        唯一的**非 ghost** 牙；只拦 CJK 时它们两档逐位相同（Δ 天生 0），"什么都没变却算作通过"正是本卡要堵的形状；
     ③ 拦得到的枚数按族目录对账（fraunces／ibm-plex-mono／两枚 subset 各 ≥1），缺一族就红——只拦 CJK 时
        这两枚目录永远数不到，对账项自己就是个洞。
   CJK 的反面也写清楚：真页那三枚 CJK 探针**不判红**（本机同名安装与影子家族在这一维都是 0%，分不开），
   它们的位移账由 ghost 九枚管——同一件事不许有两处真值，也不许有一处空真。 */
const SHIPPED_FAMILIES = ['Fraunces', 'IBM Plex Mono', 'Noto Serif SC', 'Noto Sans SC'];
const FONT_DIRS = ['fraunces', 'ibm-plex-mono', 'noto-serif-sc-subset', 'noto-sans-sc-subset'];
const SELF_FONT_RE = /^\/fonts\/[A-Za-z0-9._%-]+\/[A-Za-z0-9._%-]+\.woff2$/i;
/* 服务侧自证拿的是**盘上真存在**的那枚字文件（不是编一个不存在的名字）：
   ⚠️ 编名字在"拦档"与"文件本来就没有"两种情况下都回 404，那枚自证就是空真——靶名写错照样过，
      正是本卡要堵的那个形状。所以：拦档那台必须对真文件回 404·空体，在场那台必须回 200·原字节数。 */
function aRealFontFile() {
  const root = join(DIST, 'fonts');
  if (!existsSync(root)) die(`产物里没有 ${root}——四族自托管的字文件不在 dist 里，先 npm run build（尺子读不到被测对象从来不算绿）`);
  for (const d of readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const f = readdirSync(join(root, d.name)).find(n => /\.woff2$/i.test(n));
    if (f) return { p: `/fonts/${d.name}/${f}`, bytes: readFileSync(join(root, d.name, f)).length };
  }
  die(`${root} 里一枚 woff2 都没有——乙档的靶不存在，不许拿空集当"拦到了"`);
}
const REAL_FONT = aRealFontFile();
const CSS_RE = /^\/_astro\/[A-Za-z0-9._%-]+\.css$/i;
/* 落点判读表（第 0 问第 2 件）：每族拿一枚"屏上真读到的"探针串，比较三枚候选读数——
   ① 影子家族的 canvas 度量（带 override/size-adjust）、② UA 通用关键字的 canvas 度量、
   ③ 同一页上**把影子家族摘掉**的那枚 ghost 探针（g_*，屏上真正的"没有影子会落成什么样"）。
   ⚠️ 为什么负对照要取 ③ 不取 ②：方块区里 canvas 的 `serif`/`sans-serif` 今天解析到的就是
      宋体／雅黑——**正是影子家族自己锚的那枚字**，两枚读数逐位相同（实测 盒 26/宽 198 全等），
      拿它当负对照等于拿自己比自己。③ 走的是页面里那条真栈，才是访客那台机器上没有 face 表时的形状。
   串必须与 PROBES 里某枚 normal400 探针逐字符相同（下面按 (fam,text) 找，找不到就报"脱钩"）。 */
const LAND = [
  { fam: 'Fraunces',      kw: 'serif',      text: 'Fog & light — 0123456789' },
  { fam: 'IBM Plex Mono', kw: 'monospace',  text: '2026.09.28 fog 482' },
  { fam: 'Noto Serif SC', kw: 'serif',      text: '雾天调试法把灯光提着走' },
  { fam: 'Noto Sans SC',  kw: 'sans-serif', text: '雨后的人行道反着光' },
];
const CANVAS_PROBES = LAND.flatMap(({ fam, kw, text }) => [
  { key: `正身|${fam}`, kind: '正身', font: `'${fam}'`, text },
  { key: `影子|${fam}`, kind: '影子家族', font: `'${fam}-fallback'`, text },
  { key: `UA|${fam}`, kind: 'UA 默认', font: kw, text },
]);

/* ---------- 服务端：喂 dist + 拦自托管字文件 + 注入探针（全在内存里改，盘上一个字节不动） ----------
   乙档的靶是 `/fonts/<族目录>/<名>.woff2` 的 **404＋空响应体**（空体是给页内 `encodedBodySize` 读的：
   到位字节 0 是"字节真没到"的页内侧证据，跟服务端计数是两把独立的尺）。
   ⚠️ 旧版那枚 `FONT_LINK_RE`（摘 css2 `<link>`）随 `6ea31e8` 一起作废——四族全自托管后产物里没那枚 link。
   ⚠️ 拦的是**字文件**不是 `_astro/*.css`：样式表一没就没有 face 表、没有影子家族、也没有版面，
      那一档量的是"整站裸 HTML"，不是"访客取不到字"（第 0 问的裁决）；所以 CSS 反过来是对账项，
      它在乙档必须**照旧在场**，不在场就当红报警（跑偏，不是回退）。 */
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
/* ⚠️ 档记在**服务器（端口）**身上，不记在 URL 的 query 上——这是本轮踩过的一格：
   `/fonts/**` 是样式表按绝对路径发出的子资源请求，永远不会带上 `?arm=blocked`；沿用旧版"HTML 挂参数、
   服务端读参数"那一路，新靶会一枚都拦不到，然后照常往下跑 Δ（正是上一轮 stripped=0 那个坑换了马甲）。
   端口就是档名：两个 origin 各走各的，全站 `cache-control: no-store` 兜住缓存，盘上一个字节不动。 */
async function startArm(name, block) {
  const stats = { name, block, blockedFiles: 0, blockedByDir: {}, injected: 0 };
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(DIST, ...p.split('/').filter(Boolean));
    if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403).end('outside dist'); return; }
    if (block && SELF_FONT_RE.test(p)) {
      const dir = p.split('/')[2].toLowerCase();
      stats.blockedFiles++;
      stats.blockedByDir[dir] = (stats.blockedByDir[dir] || 0) + 1;
      res.writeHead(404, { 'content-type': MIME['.woff2'], 'cache-control': 'no-store' });
      res.end(); return;                       // 空响应体＝页内侧"到位字节 0"那把尺的证据
    }
    let buf; try { buf = readFileSync(file); } catch { res.writeHead(404).end('not found'); return; }
    if (/\.html$/i.test(file)) {
      let html = buf.toString('utf8');
      if (!html.includes('</head>')) { res.writeHead(500).end('no </head>'); return; }
      html = html.replace('</head>', `<style>.grain,.fog,.fireflies{animation:none!important}</style></head>`);
      if (u.pathname === '/' || u.pathname === '/index.html') {
        html = html.replace('</body>', `<div id="fm-probes" style="position:fixed;top:-99999px;left:0;">${probeHtml()}</div></body>`);
        stats.injected++;
      }
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(html, 'utf8'); return;
    }
    res.writeHead(200, { 'content-type': MIME[( '.' + file.split('.').pop().toLowerCase() )] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(buf);
  });
  await new Promise((ok, no) => { server.once('error', no); server.listen(0, '127.0.0.1', ok); });
  servers.push(server);
  const base = `http://127.0.0.1:${server.address().port}`;
  /* 服务自检走 /about/ 不走 /：首页那次请求会被算进"注入探针×N"，Node 侧那一枚不该混进浏览器那一批计数 */
  const self = await fetch(`${base}/about/`).then(r => r.text()).catch(e => die(`${name} 服务自检失败：${e.message}`, '  回环被挡是服务侧死，和浏览器无关'));
  if (!/<html/i.test(self)) die(`${name} 服务自检没拿到 <html`);
  { // 服务侧自证（不靠浏览器）：拦档那台对真文件必须回 404·空体，在场那台必须回 200·原字节
    const probe = await fetch(`${base}${REAL_FONT.p}`);
    const got = (await probe.arrayBuffer()).byteLength;
    if (block && (probe.status !== 404 || got !== 0))
      die(`${name} 自证失败：拦档服务器对在册文件 ${REAL_FONT.p} 回了 ${probe.status}·${got}B，要的是 404·空体——靶名/路径跟产品对不上，这一档一枚都拦不到（Δ 全是假数，别往下跑）`);
    if (!block && (probe.status !== 200 || got !== REAL_FONT.bytes))
      die(`${name} 自证失败：在场那台对 ${REAL_FONT.p} 回了 ${probe.status}·${got}B，要的是 200·${REAL_FONT.bytes}B——甲档没把字送到，参照系塌了`);
  }
  return { base, stats };
}

/* ---------- CDP 路线 B：一次浏览器会话，两档 × 三页逐档导航 ---------- */
const profile = mkdtempSync(join(tmpdir(), 'mistwood-ffb-'));
const WS = globalThis.WebSocket;
if (!WS) die('这个 Node 没有全局 WebSocket（需要 ≥22），CDP 路线 B 起不来');
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
browser = spawnBrowser(EDGE, [
  '--headless=new', `--user-data-dir=${profile}`, '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
  '--disable-sync', '--force-device-scale-factor=1', '--force-prefers-reduced-motion', '--remote-debugging-port=0',
  '--window-size=1440,900', 'about:blank',
], { cwd: dirname(EDGE), windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = ''; browser.stderr.on('data', d => { stderr = (stderr + d.toString('utf8')).slice(-4000); });
browser.on('exit', c => { if (!doneFlag) die(`浏览器中途退出（exit=${c}）`, '  stderr 尾部：' + stderr.slice(-500)); });

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

let msgId = 0; const pending = new Map(); const events = [];   // ws 那枚绑定在文件头上（die 收摊时要关它）
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
  /* 新靶的对账（旧的是 gstatic/fonts.loli 那批域名）：站内 /fonts/**.woff2 的请求枚数、**到位字节**
     （encodedBodySize——404 空响应体恒 0，同站内不需要 Timing-Allow-Origin）、responseStatus 分布；
     远程那批域名反过来数：两档都必须是 0，非 0 ＝ 产品长回了外链。 */
  const res_ = performance.getEntriesByType('resource');
  const selfFont = res_.filter(e => /\\/fonts\\/[^/]+\\/[^/]+\\.woff2$/i.test(e.name));
  const remoteFont = res_.filter(e => /gstatic\\.[a-z.]+|fonts\\.[a-z.]+loli|fonts\\.loli|fonts\\.googleapis/.test(e.name));
  const css = res_.filter(e => /\\/_astro\\/[^/]+\\.css$/i.test(e.name));
  const arrived = selfFont.reduce((a, e) => a + (e.encodedBodySize || 0), 0);
  const stat = {};
  for (const f of [...document.fonts.values()]) {
    const s = stat[f.family] || (stat[f.family] = {});
    s[f.status] = (s[f.status] || 0) + 1;
  }
  const count = (fams, st) => fams.reduce((a, fam) => a + ((stat[fam] || {})[st] || 0), 0);
  const SHADOW = ${JSON.stringify(SHIPPED_FAMILIES)}.map(f => f + '-fallback');
  const cvs = document.createElement('canvas'); cvs.width = 8; cvs.height = 8;
  const cx = cvs.getContext('2d');
  const canvas = {};
  for (const c of ${JSON.stringify(CANVAS_PROBES)}) {
    const shorthand = '18px ' + c.font;
    let faces = '';
    try { faces = (await document.fonts.load(shorthand, c.text)).map(f => f.family + ':' + f.status).join(' ') || '(无 face)'; }
    catch (e) { faces = 'load() 抛:' + e.name; }
    cx.font = shorthand;
    const m = cx.measureText(c.text);
    canvas[c.key] = {
      w: +m.width.toFixed(3),
      box: +(((m.fontBoundingBoxAscent || 0) + (m.fontBoundingBoxDescent || 0))).toFixed(3),
      faces, text: c.text,
    };
  }
  return {
    innerWidthOK,
    facesSize: document.fonts.size,
    selfFacesLoaded: count(${JSON.stringify(SHIPPED_FAMILIES)}, 'loaded'),
    selfFacesError: count(${JSON.stringify(SHIPPED_FAMILIES)}, 'error'),
    shadowFacesLoaded: count(SHADOW, 'loaded'),
    facesLoaded: [...document.fonts.values()].filter(f => f.status === 'loaded').length,
    faceStatus: stat,
    selfFontReqs: selfFont.length, selfFontBytes: arrived,
    selfFontStatus: selfFont.reduce((a, e) => { const k = String(e.responseStatus); a[k] = (a[k] || 0) + 1; return a; }, {}),
    remoteFontReqs: remoteFont.length,
    cssReqs: css.length, cssBytes: css.reduce((a, e) => a + (e.encodedBodySize || 0), 0),
    canvas,
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
    const ok = await navigateWait(`${base}${pg.startsWith('/') ? pg : '/' + pg}`);
    if (!ok) die(`${arm} 档导航 ${pg} 没等到 load 事件（60s）`, '  "拿不到"从来不算通过');
    const res = await S('Runtime.evaluate', { expression: EVAL, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) die(`${arm} 档 ${pg} 页内求值抛了：${JSON.stringify(res.exceptionDetails.exception?.description || res.exceptionDetails).slice(0, 300)}`);
    out[pg] = res.result.value;
    if (out[pg].innerWidthOK !== 1440) die(`${arm} 档 ${pg} innerWidth=${out[pg].innerWidthOK} ≠ 1440`, '  视口对账没过，后面所有数都不许算（§3.1 老规矩）');
  }
  return out;
}
const armA = await startArm('甲档（在场）', false);
const armB = await startArm('乙档（取不到）', true);
const remote = await runArm(armA.base, '甲档');
const blocked = await runArm(armB.base, '乙档');
const injectStats = armB.stats;                      // 拦字文件的计数长在乙档那台身上
doneFlag = true;
try { browser.kill(); } catch { }

/* ---------- 防空转：两档的见证物一枚都不能缺 ----------
   两类红分开立：`idle`＝"这一档自己没成立"（靶没打中／资源跑偏），`problems`＝"档成了但读数不达标"。
   idle 非空时 Δ 那条路**整条不判**——上一轮的坑就是拦不到还照跑 Δ，17 条红里 16 条是连带噪音。 */
const problems = [];
const idle = [];
const perPage = o => Object.entries(o).map(([pg, v]) => ({ pg, ...v }));
{
  const R = perPage(remote), B = perPage(blocked);
  /* 甲档＝资源齐全（在场）：请求枚数、到位字节、正身 loaded 三枚一枚都不能空 */
  for (const o of R) if (o.selfFontReqs === 0) idle.push(`[甲档空转] ${o.pg} 一个 /fonts/** 字文件都没请求（0 枚）——"在场"那一侧没取过字，参照系塌了`);
  for (const o of R) if (o.selfFontBytes === 0) idle.push(`[甲档空转] ${o.pg} 的 /fonts/** 到位字节 0（encodedBodySize 口径）——请求了却没拿到字节，甲档不是"在场"那一档`);
  for (const o of R) if (o.selfFacesLoaded === 0) idle.push(`[甲档空转] ${o.pg} 四族正身 loaded 枚数 0（error=${o.selfFacesError}）——document.fonts 里没有一枚正身落地`);
  /* 乙档＝取不到（回退）：拦了就必须数得到被拦的枚数 >0，一枚都没拦到不许继续算数 */
  if (injectStats.blockedFiles === 0) idle.push(`[乙档空转] 服务端一枚 /fonts/** 字文件都没拦到（blockedFiles=0）——靶没打中，这一档读到的就是甲档，Δ 全是假数`);
  for (const o of B) if (o.selfFontReqs === 0) idle.push(`[乙档空转] ${o.pg} 浏览器根本没请求 /fonts/**（0 枚）——那一页没字可拦，它的读数不算这一档的证据`);
  for (const o of B) if (o.selfFontBytes !== 0) idle.push(`[乙档空转] ${o.pg} 的 /fonts/** 还有到位字节 ${o.selfFontBytes}B——拦漏了（404 空响应体该是 0）`);
  for (const o of B) if (o.selfFacesLoaded !== 0) idle.push(`[乙档空转] ${o.pg} 还有 ${o.selfFacesLoaded} 枚正身 face 是 loaded（error=${o.selfFacesError}）——字其实到了，这一档不是"取不到"`);
  const missed = FONT_DIRS.filter(d => !injectStats.blockedByDir[d]);
  if (injectStats.blockedFiles > 0 && missed.length) idle.push(`[乙档空转] 这些族目录一次都没被拦到：${missed.join(' / ')}（拦到的是 ${Object.entries(injectStats.blockedByDir).map(([k, v]) => k + '×' + v).join(' / ')}）——靶名/路径跟产品对不上，别让它绿着空转`);
  /* 这一档模拟的是"取不到字"，不是"取不到样式表"：CSS 反过来必须在场，否则量的是另一件事 */
  for (const o of B) if (o.cssBytes === 0) idle.push(`[乙档跑偏] ${o.pg} 的 _astro/*.css 到位字节 0——样式表没了就没有 face 表／影子家族／版面，那一档量的不是"访客取不到字"（第 0 问的裁决）`);
  /* 旧对账那句（fonts/gstatic 请求必须 0）在新靶下的另一半：两档都不该再有远程字 */
  for (const o of [...R, ...B]) if (o.remoteFontReqs !== 0) idle.push(`[外链复活] ${o.pg} 读到 ${o.remoteFontReqs} 枚 fonts/gstatic 资源请求——四族全自托管后站里不该有远程字`);
  if (armA.stats.injected === 0 || armB.stats.injected === 0) idle.push(`[空转] 探针没在两档都注入过（甲档×${armA.stats.injected}、乙档×${armB.stats.injected}）`);
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
  rows.push({ kind: 'probe', fam: p.fam, what: `ghost ${p.style}${p.weight}「${p.text.slice(0, 10)}」${C.h === B.h && C.w === B.w ? '（-fallback 未生效：F≡G）' : ''}`,
    page: PROBE_PAGE, sel: `fm-*-${i}`, R: A, G: B, F: C,
    dHG: pct(B.h, A.h), dWG: pct(B.w, A.w), dHF: C === B ? null : pct(C.h, A.h), dWF: C === B ? null : pct(C.w, A.w), dHFself: pct(C.h, B.h), lines: `${A.lines}→${B.lines}` });
});
/* ---------- 落点判读（第 0 问第 2 件）：拦掉之后屏上落到哪枚 face ----------
   证据只有两枚，一枚都不许是 `check()` 或 computed family 名（§3.3 钉过：本机装有同名 CJK 可变脸，
   `fonts.size=0` 都不证明回退发生过）：① `document.fonts` 的逐族状态表（正身 error／影子家族 loaded，
   上面那张逐页状态表）；② 这一枚——同一串文字在**屏上**的行盒/推进宽，与两枚候选 face 各自的
   canvas 读数（影子家族带 override/size-adjust、UA 默认不带）比。
   判读规则：只信"影子与 UA 分得开"的那些维（两候选彼此差 > 容差才叫分得开）；屏上读数必须**逐维站到
   影子那一侧**（离影子比离 UA 近）才算落点成立。全族都分不开 ⇒ 这一问本机答不了 ⇒ 红，不许当绿。 */
const cvB = blocked[PROBE_PAGE].canvas || {}, cvR = remote[PROBE_PAGE].canvas || {};
const TOL_SEP = Math.max(TOL_H, TOL_W);
const land = [];
for (const l of LAND) {
  const i = PROBES.findIndex(p => p.fam === l.fam && p.text === l.text && p.style === 'normal' && p.weight === 400);
  const F = i >= 0 ? blocked[PROBE_PAGE].probe[`fm-f-${i}`] : null;      // 屏上：链里带影子家族
  const G = i >= 0 ? blocked[PROBE_PAGE].probe[`fm-g-${i}`] : null;      // 屏上：同一串、把影子家族摘掉＝负对照
  const s = cvB[`影子|${l.fam}`], u = cvB[`UA|${l.fam}`], rB = cvB[`正身|${l.fam}`], rR = cvR[`正身|${l.fam}`];
  if (!F || !G || !s || !u) { problems.push(`落点判读 ${l.fam}：屏上读数或候选 face 读数缺一（PROBES⇄LAND 脱钩了？i=${i}）`); continue; }
  const dims = [{ k: '盒', f: F.h, sh: s.box, ua: u.box, g: G.h }, { k: '宽', f: F.w, sh: s.w, ua: u.w, g: G.w }]
    .map(d => ({ ...d, dShadow: pct(d.f, d.sh), dNoShadow: pct(d.f, d.g), dUa: pct(d.f, d.ua), shVsUa: pct(d.sh, d.ua) }));
  const hugsShadow = dims.every(d => Math.abs(d.dShadow) <= TOL_SEP);              // 屏上读数＝这枚 face 的度量
  const movedVsNoShadow = dims.some(d => Math.abs(d.dNoShadow) > TOL_SEP);         // 它在场真的换了屏
  const uaCanvasBlind = dims.every(d => Math.abs(d.shVsUa) <= TOL_SEP);            // canvas 的 UA 关键字与影子撞车
  land.push({ fam: l.fam, text: l.text, probeIndex: i, F, G, shadow: s, ua: u, noShadow: G,
    realInBlockedArm: rB, realInRemoteArm: rR, dims, hugsShadow, movedVsNoShadow, uaCanvasBlind,
    onShadow: hugsShadow && movedVsNoShadow });
}
const landed = land.filter(x => x.onShadow).map(x => x.fam);
const faceErrInBlocked = Object.entries(cvB).filter(([k, v]) => k.startsWith('正身|') && /NetworkError|error/i.test(v.faces || '')).map(([k]) => k.split('|')[1]);
if (GATE) {
  if (landed.length === 0) idle.push(`[证据退化] 四族都判不出"屏上落在影子家族"（屏上读数不贴影子的度量，或贴了却与"没有影子"那一枚分不开）——"拦掉之后落到哪枚 face"这一问本机答不了，判据在空转`);
  if (faceErrInBlocked.length === 0) idle.push(`[证据退化] 乙档里「document.fonts.load 正身」一枚都没抛 NetworkError／没读到我方 face 的 error 状态——"正身取不到"这件事没有第二枚见证物`);
  const anyG = rows.filter(r => r.kind === 'probe').some(r => Math.abs(r.dHG) > TOL_H || Math.abs(r.dWG) > TOL_W);
  if (!anyG) idle.push(`[证据退化] 九枚 ghost 探针的 Δ(R,G) 全在 ±${TOL_H}/±${TOL_W} 之内——"取不到字"这一档没造出任何位移，F⇄G 那两条格子都是空真`);
}
if (GATE && idle.length === 0) {
  for (const r of rows) {
    if (r.kind === 'real') {
      /* 甲档不被动：真页读数两档对不上只在"回退栈动了在场那一档"时红——由外部对 json 逐字节比；
         这里判的是乙档位移：字文件取不到的真形状。
         ⚠️ 只判拉丁两族：CJK 真页那两枚本机有同名安装挡着（§3.2 那格），Δ≈0 既可能是"影子家族接住了"
            也可能是"同名安装接住了"，这一维分不开 ⇒ 不许拿它当牙（位移账由 ghost 九枚管）。 */
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
console.log(`浏览器 ${EDGE}（${BROWSER.note}）｜容差 ±${TOL_H}/±${TOL_W}${(TOL_H !== 2 || TOL_W !== 2) ? ' ⚠️ 这一跑拧过容差（默认 2/2）——不是同一把尺，别拿去跟历史读数对账，更不许拿它把红拧成绿' : '（默认档）'}`);
const j0 = (o, k) => Object.values(o).map(x => x[k]).join('/');
const sum0 = (o, k) => Object.values(o).map(x => x[k]).reduce((a, b) => a + b, 0);
console.log(`见证物 甲档（在场）：/fonts 请求=${j0(remote, 'selfFontReqs')} 枚、到位字节=${sum0(remote, 'selfFontBytes')}B、正身 loaded=${j0(remote, 'selfFacesLoaded')} 枚`);
console.log(`见证物 乙档（取不到）：/fonts 请求=${j0(blocked, 'selfFontReqs')} 枚、到位字节=${sum0(blocked, 'selfFontBytes')}B、正身 loaded=${j0(blocked, 'selfFacesLoaded')}/error=${j0(blocked, 'selfFacesError')}、影子 loaded=${j0(blocked, 'shadowFacesLoaded')} 枚`);
console.log(`服务端：拦字文件×${injectStats.blockedFiles}（${Object.entries(injectStats.blockedByDir).map(([k, v]) => k + '×' + v).join(' / ') || '一枚没拦'}）、注入探针×${injectStats.injected}；两档自证文件 ${REAL_FONT.p}（${REAL_FONT.bytes}B，拦档回 404·空体／在场回 200·原字节，起不来就 die）；远程 fonts/gstatic 请求两档=${sum0(remote, 'remoteFontReqs')}/${sum0(blocked, 'remoteFontReqs')} 枚`);
console.log('逐页状态表（face 状态按族名分档，/fonts 与 css 的枚数·到位字节·responseStatus）：');
for (const [nm, arm] of Object.entries({ 甲档: remote, 乙档: blocked })) for (const [pg, o] of Object.entries(arm))
  console.log(`  ${nm} ${pg.padEnd(24)} size=${o.facesSize} 正身 loaded=${o.selfFacesLoaded} error=${o.selfFacesError} 影子 loaded=${o.shadowFacesLoaded}  /fonts ${o.selfFontReqs}枚·${o.selfFontBytes}·status=${JSON.stringify(o.selfFontStatus)}  css ${o.cssReqs}枚·${o.cssBytes}B`);
console.log('落点判读（负对照用屏上"没有影子家族"那一枚 g_*，不用 canvas 的 UA 关键字——方块区那两枚在本机撞车）：');
for (const x of land) {
  const verdict = x.onShadow ? '落在影子家族' : (x.hugsShadow ? '⚠️ 贴影子但与"没影子"分不开' : '⚠️ 不站影子那侧');
  console.log(`  ${x.fam.padEnd(14)} ${verdict}｜屏上 盒${x.F.h}/宽${x.F.w} ‖ 影子 canvas 盒${x.shadow.box}/宽${x.shadow.w} ‖ 没影子（g_*）盒${x.G.h}/宽${x.G.w} ‖ UA 关键字 canvas 盒${x.ua.box}/宽${x.ua.w}${x.uaCanvasBlind ? '＝与影子撞车' : ''}｜正身 canvas 宽 甲=${(x.realInRemoteArm || {}).w}→乙=${(x.realInBlockedArm || {}).w}（${(x.realInBlockedArm || {}).faces}）`);
  console.log(`    「${x.text}」 ` + x.dims.map(d => `${d.k}：离影子 ${d.dShadow}%／离没影子 ${d.dNoShadow}%／离 UA 关键字 ${d.dUa}%（影子⇄UA 彼此差 ${d.shVsUa}%）`).join('；'));
}
console.log(`\n${'族'.padEnd(14)} 探针          Δ高%   Δ宽%   行数     备注`);
for (const r of rows) {
  if (r.kind === 'real') console.log(`${r.fam.padEnd(14)} 真页 ${r.sel.padEnd(14)} ${String(r.dH).padStart(6)} ${String(r.dW).padStart(7)}  ${r.lines.padStart(6)}  ${r.what}`);
  else console.log(`${r.fam.padEnd(14)} ghost R=${r.R.h}/${r.R.w} G ${String(r.dHG).padStart(6)}% 宽 ${String(r.dWG).padStart(6)}% | F ${String(r.dHF).padStart(6)}% 宽 ${String(r.dWF).padStart(6)}%  ${r.what}`);
}
const machine = { edge: EDGE, dist: DIST, tol: { h: TOL_H, w: TOL_W }, target: 'self-hosted /fonts/**.woff2 404', witness: { remote: { reqs: j0(remote, 'selfFontReqs'), bytes: sum0(remote, 'selfFontBytes'), selfLoaded: j0(remote, 'selfFacesLoaded') }, blocked: { reqs: j0(blocked, 'selfFontReqs'), bytes: sum0(blocked, 'selfFontBytes'), selfLoaded: j0(blocked, 'selfFacesLoaded'), selfError: j0(blocked, 'selfFacesError'), shadowLoaded: j0(blocked, 'shadowFacesLoaded') }, remoteFontReqs: { remote: sum0(remote, 'remoteFontReqs'), blocked: sum0(blocked, 'remoteFontReqs') } }, injectStats, canvasRemote: cvR, canvasBlocked: cvB, land, landed, faceErrInBlocked, idle, rows };
if (flag('json')) console.log('\n@@JSON-START\n' + JSON.stringify(machine, null, 1) + '\n@@JSON-END');
const all = [...idle, ...problems];
if (all.length) {
  console.log(`\n✗ font-fallback-check ${GATE ? '红了' : '发现问题（人读档不判红）'} ${all.length} 条：`);
  for (const p of idle) console.log('  · ' + p);
  if (idle.length && GATE) console.log('  · （Δ 判据那一路本轮**没跑**：档自己没成立时读数不达标的话不配说——上一轮 17 条连带噪音就是这个形状）');
  for (const p of problems) console.log('  · ' + p);
  process.exit(1);
}
console.log(`\n✓ font-fallback-check：两档读数交付${GATE ? '，判据全过（乙档拦到 ' + injectStats.blockedFiles + ' 枚字文件、落点证据可辨）' : '（未带 --gate，只出数）'}`);
try { rmSync(profile, { recursive: true, force: true }); } catch { }
for (const s of servers) s.close();
process.exit(0);
