/* runtime-check.mjs —— 第四类门禁：构建之后起 headless 浏览器，读 dist/ 的**运行时 DOM**
   用法  npm run build && node tools/runtime-check.mjs
         npm run gate   （= check && build && 本脚本，规范 §16 登记的落点）
         node tools/runtime-check.mjs --strict-site    （把占位域名的警告升成红）

   要堵的洞（规范 §16 那条待办的原文）：`Layout.astro` 里两段 `<script is:inline>` 之一被写成
   "语法完全合法但整段不执行"（`})();` → `});`，IIFE 变成定义出来再丢弃的函数表达式），
   `astro build` 绿、`npm run check` 三类全绿、控制台也不报错，只是四枚显示属性全退到 CSS 默认值、
   回访判定永远不写。数 `})();` 出现次数已被规范否决（脆），所以这里量的是**结果**：
   浏览器里 `<html>` 上到底有没有那五枚、值合不合法。

   ── 为什么每个页面跑两档（本卡踩出来的，不是洁癖）─────────────────────────────
   第一版只跑"完整档"，看着全绿，其实是**假门禁**：`src/scripts/site.js:45 disp` 把 dataset 当唯一真相源读回来
   （`fog: root.dataset.fog || 'normal'`），第 40-43 行 `paintSettings()` 再把这四个值原样写回 `root.dataset`。
   也就是说——**内联脚本整段不跑，只要打包脚本在跑，data-fog/data-grain/data-fireflies/data-enter 照样是
   normal/on/on/auto，五枚一枚都不少**（第一次变异测试就是这么漏掉的，改动写在文件末尾的"踩坑"注释里）。所以：
     · 内联隔离档：本服务对任何 `.js` 请求回 404，让页面里**只剩 `<script is:inline>` 这一个写者**。
       五枚属性在这档里出现，才真的证明内联脚本跑了。抓事故靠这一档。
     · 完整档：资源照常喂（含 `_astro/*.js`，MIME 必须是 text/javascript，否则模块脚本被浏览器拒收），
       验"用户实际看到的那一面"同样是这五枚，并额外要求一个"打包脚本确实在跑"的见证物：`#clock` 的文本
       被 site.js 从静态产物里的 `--:--` 改写成了 `HH:MM`（见证物为什么不用 `checked`，见第 6 节那段注释——
       `i.checked = true` 是 property，`outerHTML` 里看不见，用它当判据就是永远断言不到）。
       隔离档反向对账：那一档的 `#clock` 必须还是 `--:--`，否则说明 .js 根本没拦住、这一档白跑。
   两档合起来才是"内联脚本在跑 **且** 打包脚本也在跑"。

   ── 取值合法集从哪来（不是猜的）───────────────────────────────────────────────
   写者只有一处：`src/layouts/Layout.astro` 第 55-67 行（第一段 `setAttribute('data-theme',t)`；第二段
   `d.fog||'normal'` / `d.grain||'on'` / `d.fireflies||'on'` / `enter=d.enter||'auto'`）。
   词汇表三处对齐：`src/scripts/site.js:45` 的 `disp` 对象（同样四个默认值）、`Layout.astro` 里那排
   `<input type=radio>` 的 value（fog：thin/normal/thick，grain：on/off，fireflies：on/off，enter：auto/full）、
   `src/styles/mistwood.css:229-231` 真正生效的 `html[data-fog="thin"]` / `[data-fog="thick"]` / `[data-grain="off"]`
   （normal 与 on 是 CSS 默认分支所以不出现，但仍是合法值）。theme 的 light/dark 见 `home.css`/`mistwood.css` 的
   `html[data-theme="dark"]` 与静态 `<html data-theme="light">`。
   空串与集合外的值一律算红——"属性在但值是垃圾"和"属性不在"是同一件事。

   ── 防空转（规范 §16 那条"检查静默空转、退出码 0，长得像全绿"教的）──────────────
   每一处"拿不到"都是 exit 1，并点名是哪一步死的：没有 dist / dist 里没有 HTML / 找不到 msedge /
   临时 profile 建不出来或不可写 / 服务 listen 失败 / Node 自己都连不上 / dump 为空 / dump 里没有 `<html` /
   解析不出文档标签 / 浏览器 spawn 报错或超时 / 断言份数为 0。
   每页**打印实际读到的五枚属性清单**（缺的显示 ∅），不只打印 ✓。

   ── 故意没做的三条（报告里登记为"未验到"，不假装它们在里面）───────────────────
   ① `data-revisit`：只在 `sessionStorage.getItem('mistwood-seen')` 已存在时才写（`Layout.astro:115` 那枚 `r.setAttribute('data-revisit','1')`），
      而 sessionStorage 是标签页级的 ⇒ 要同一浏览器**进程内两次导航**。`--dump-dom` 只有一次导航，
      给不出真判据；写一条永远断言不到的判据就是造假门禁。所以只**打印**、不判定。
   ② 暗色下 `meta[name="theme-color"]` 改成 #0E130D（`Layout.astro:107` 里那句 `m.setAttribute('content','#0E130D')`）：这版 Edge 不认
      `--force-prefers-color-scheme`（§16 ②），暗色只能靠 profile 预置 `localStorage.mistwood-theme=dark`，
      上一轮的做法是往 `dist/` 写一枚一次性种子页——门禁不该往构建产物里写文件（那会让 dist 的内容
      取决于门禁跑没跑过）。要做得先验证"预置 profile 可复跑"，本轮没验 ⇒ 不进自动化。
   ③ `SITE` 占位域名：默认**警告 + exit 0**，只有 `--strict-site` 才红。理由：现在恒红会让这枚门禁
      一进门就挡掉所有工作，而逼人绕过门禁比没有门禁更糟。判法从**产物**里读绝对地址（og:url / rss /
      sitemap），不正则去抠 astro.config.mjs 的写法——配置将来改成 `process.env.SITE ?? '…'` 也不会瞎。
      一个绝对地址都读不到会打印一条"判据没吃到东西"的提示，不静默。
      普查窗口（第 7 节）＝`dist/` 里**全部文本产物**（按内容判文本，不是按名单），另配一条
      "名单点名的产物不在盘上就红"的断言——窗口宽窄与"读没读到"是两件事，都得有格子看着。

   ── 取 DOM 的路线结论（写死在这里，下次不必再试）─────────────────────────────
   路线 A 通：`msedge --headless=new --user-data-dir=<一次性目录> --virtual-time-budget=6000 --dump-dom <url>`，
   stdout 就是脚本执行后的 outerHTML。没退到路线 B（CDP + Node 24 全局 WebSocket）——B 一次都没用上，属未验到。
   没用 `file:///`：那底下 localStorage/sessionStorage 常被禁，且 `base:'/'` 的资源引用会断。
   服务用本脚本自带的 `http://127.0.0.1:<随机端口>`（显式绑 127.0.0.1），绕开 §16 ① 那个
   "dev/preview 只听 [::1]，127.0.0.1 直接 ERR_CONNECTION_REFUSED" 的坑——不依赖 astro preview 的绑定习惯。
   ⚠️ 踩过的坑，钉在这里：**浏览器必须异步起**。第一版用 `spawnSync`，而 HTTP 服务在同一个 Node 进程里——
   spawnSync 冻住事件循环 ⇒ 浏览器对 `/` 的第一个请求永远得不到响应 ⇒ 90s 超时，报"浏览器没起来"
   （看着像浏览器坏了，其实是自己把服务憋死了）。现在 `spawn` + await，并且并发跑多个页面。
   ⚠️ 另一个坑：**一次性 profile 删不干净**。`--dump-dom` 的主进程退了，crashpad/GPU/network 子进程还会在
   几百毫秒里往 user-data-dir 写，于是"rmSync 没抛 + existsSync 说没了"之后目录能自己长回来
   （本机实测：一次 gate 悄悄留下 8 枚满目录、脚本一声不吭）。删除要"等一会儿再复验"，见 cleanupProfiles()。

   ── 自检开关（变异测试与"防假绿"验证用的，日常不用传）─────────────────────────
     --dist=<dir>          换构建产物目录        （指向空目录 ⇒ "一份 HTML 都没有" ⇒ exit 1）
     --edge=<path>         换浏览器可执行文件    （指向不存在的路径 ⇒ exit 1，不许跳过）
     --profile-dir=<dir>   换 --user-data-dir 的落点（不可写的路径 ⇒ exit 1）
     --port=<n>            固定服务端口          （端口被占 ⇒ 服务起不来 ⇒ exit 1）
     --jobs=<n>            并发浏览器数（默认 4；每档每槽位一枚一次性 profile，共 2×jobs 枚，跑完删）
     --keep-profile        跑完不删临时 profile（调试用，会打印路径）
     --strict-site         占位域名从警告变红
     --static-only         只跑不碰浏览器的三段（1b 结构／1c 不列入／1d 死锚点两侧对账），
                           浏览器两档当众报"没跑"（`card/anchors` 当天本机 msedge 起不来才加的退路；
                           日常 `npm run gate` 不引用它，别把它读成绿）
*/
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
/* 第十轮（`card/taxonomy`）：判"哪些稿件该出现在产物里"这件事只准用 shipped 的那一份规则。
   `src/lib/taxonomy.js` 不 import 'astro:content'，所以 node 侧能直接拿它跑（带 astro:content 的
   `posts.js` 反而拿不了——那一层只做"取集合 + 滤草稿 + 排序"，规则本身在这份里）。
   front matter 的读法同 `new-post.mjs --check` 那一份：两处各写一个 split 迟早对"什么算草稿"读成两种。 */
import { splitFm, readTaxonomy } from './frontmatter.mjs';
/* 第十七轮 `card/aliases`：旧地址那一族的归一化读法也吃 shipped 的那一份（页面与门禁不会两套） */
import { aliasesOf } from '../src/lib/taxonomy.js';
import { isDraft, isUnlisted, sortPosts, categoryOf, tagGroups, bySize, groupBy } from '../src/lib/taxonomy.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- 参数 ---------- */
const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const opt = n => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };

const DIST = resolve(opt('dist') || join(ROOT, 'dist'));
const PORT = opt('port') ? Number(opt('port')) : 0;
const JOBS = Math.max(1, Number(opt('jobs') || 4));
const STRICT_SITE = flag('--strict-site');
/* ⚠️ `--static-only` 是给"本机起不了 headless 浏览器"那一条环境退路（2026-09-30 `card/anchors` 当天撞上：
   msedge 无论 `--dump-dom` 还是 `--screenshot` 都**当场 exit 0、零 stdout、零 stderr**，连 about:blank 都不出图，
   profile 目录倒是建起来了 ⇒ 24 次浏览器一枚都读不到数）。它只跑不碰浏览器的三段（1b 结构／1c 不列入／1d 死锚点），
   并且**当众打印"运行时 DOM 那一档没跑"**——它不是一条绿，是一次部分交付。
   `npm run gate` 一个字都没引用它；日常门禁仍然是两档 × 全站。 */
const STATIC_ONLY = flag('--static-only');
const KEEP_PROFILE = flag('--keep-profile');
const LAUNCH_TIMEOUT = 90_000;
const MAX_DUMP = 64 * 1024 * 1024;

/* ---------- 判据表：五枚属性 + 合法取值（来源见文件头） ---------- */
const REQUIRED = [
  ['data-theme', ['light', 'dark']],
  ['data-fog', ['thin', 'normal', 'thick']],
  ['data-grain', ['on', 'off']],
  ['data-fireflies', ['on', 'off']],
  ['data-enter', ['auto', 'full']],
];
const KEYS = REQUIRED.map(([k]) => k);

/* ---------- data-phase：第六枚，只判"取值合法 + 与 node 侧同一个函数对得上" ----------
   2026-09-28 起 `data-phase` 的**边界**改成按经纬度算真太阳位置（规范 §2.3），判定住在
   `src/lib/phase.js`（纯函数）。这一枚必须在这里露一面，理由和文件头那条事故同源：
   "语法完全合法但整段不执行" 前三类原理上看不见，而新挂上去的 getCurrentPosition 回调正是
   一段"没跑也什么都不报错"的代码。⚠️ 但它**不进 REQUIRED**：那五枚的证明是"内联脚本在跑"，
   而 data-phase 的写者是打包脚本（首帧那枚 day 是静态 HTML 里的，见 Layout.astro:63），
   混进同一张表会让内联隔离档的断言变成废话。
   对账口径：拿本机器钟表的**月份表**预测比——访客没授权时浏览器里跑的也是这条退路，两边必须同档。
   ⚠️ 唯一要让路的是"正好压在边界上"那几分钟：浏览器起进程要一两秒，跨过边界两边就会差一档，
   那不是 bug 是判据自己在抖。所以距任一边界 <3 分钟时只报不判，并打印一句"跳过对账"。 */
import { tableBounds, phaseAt } from '../src/lib/phase.js';
const PHASE_VALUES = ['dawn', 'day', 'dusk', 'night'];

function phaseWitness(label) {
  const now = new Date();
  const b = tableBounds(now);
  const h = now.getHours() + now.getMinutes() / 60;
  const dist = Math.min(...[b.dawnStart, b.dawnEnd, b.duskStart, b.duskEnd, 24 + b.dawnStart, b.duskEnd - 24]
    .map(x => Math.abs(h - x)));
  return { predicted: phaseAt(now, b), nearEdge: dist < 3 / 60, at: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` };
}

function assertPhase(label, url, attrs, w) {
  const got = attrs['data-phase'];
  if (got === undefined) { problems.push(`${label} ${url}：<html> 上没有 data-phase —— 写它的是 site.js，§2.3 的时段色温与 §2.1 的方向光全挂在这枚属性上`); return; }
  if (!PHASE_VALUES.includes(got)) { problems.push(`${label} ${url}：data-phase=${JSON.stringify(got)} 不在四档枚举 ${PHASE_VALUES.join('/')} 里 —— 边界算法交出了非法档位（"静默产出 undefined"就是这个形状）`); return; }
  if (w.nearEdge) notes.push(`${label} ${url} data-phase=${JSON.stringify(got)}（${w.at} 距档位边界 <3 分钟，跳过与 node 的对账）`);
  else if (got !== w.predicted) problems.push(`${label} ${url}：浏览器实测 data-phase=${JSON.stringify(got)}，node 侧跑同一份 phaseAt 在同一分钟算出 ${JSON.stringify(w.predicted)}（${w.at}，月份表退路）—— 两边不是同一个函数了`);
  else notes.push(`${label} ${url} data-phase=${JSON.stringify(got)} ✓ 与 node 侧 phaseAt 同档（${w.at}）`);
}

/* ---------- 失败收集：所有页面都跑完再报，但任何一处"拿不到"都通向 exit 1 ---------- */
const problems = [];
const notes = [];
const profiles = [];
let server = null;

function cleanupProfiles() {
  if (KEEP_PROFILE) { for (const p of profiles) console.log(`  --keep-profile：临时 profile 留在 ${p}`); return; }
  /* ⚠️ 这条不是形式主义：`--dump-dom` 的**主进程**退了，crashpad / GPU / network 那些子进程还会在几百毫秒里
     往 user-data-dir 里写——所以"rmSync 成功 + existsSync 说没了"之后目录还能**自己长回来**
     （本机实测：一次 gate 留下 8 枚满目录，脚本却一声不吭）。判据是"删完等一会儿还在 ⇒ 再删一次"，
     不是"rmSync 没抛就算删干净"。留着临时目录在人家 %TEMP% 里，是这枚门禁自己的债。 */
  wait(600);                                  // 让 Edge 的子进程先落地
  for (const p of profiles) {
    for (let i = 0; i < 6; i++) {
      try { rmSync(p, { recursive: true, force: true }); } catch { /* 下面用 existsSync 判成败，不看它抛没抛 */ }
      wait(200 + i * 120);
      if (!existsSync(p)) break;
      if (i === 5) console.log(`  ⚠️ 临时 profile 删不掉：${p}（手工清一下；不影响判定）`);
    }
  }
}
function wait(ms) { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { /* 平台不支持就立刻重试 */ } }

function die(msg, hint) {
  console.log(`\n✗ runtime-check 停在半路：${msg}`);
  if (hint) console.log(`  ${hint}`);
  console.log('  ⚠️ 这是硬失败，不是跳过——判据没跑到就等于没绿。');
  try { server?.close(); } catch { /* 已经关了就无所谓 */ }
  cleanupProfiles();
  process.exit(1);
}

console.log('── runtime-check（第四类门禁：构建产物 + headless 运行时 DOM）');

/* ---------- 1. 产物 ---------- */
if (!existsSync(DIST)) die(`没有构建产物目录 ${DIST}`, '  先 `npm run build`——本脚本读的是 dist/，干净检出上单独跑它就是红的（所以落点是 gate 不是 check，§16）');
if (!statSync(DIST).isDirectory()) die(`${DIST} 不是目录`);

const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.html?$/i.test(name)) htmlFiles.push(p);
  }
})(DIST);

const toUrl = p => {
  const rel = '/' + p.slice(DIST.length + 1).split('\\').join('/');
  return /\/index\.html$/i.test(rel) ? rel.replace(/index\.html$/i, '') : rel;
};
const PAGES = htmlFiles.map(p => ({ file: p, url: toUrl(p) })).sort((a, b) => a.url.localeCompare(b.url));
if (!PAGES.length) die(`${DIST} 里一份 HTML 都没有`, '  dist/ 空＝build 没产出＝断言环节根本没走到，不许算过');

/* ---------- 1b. 正文结构 + 草稿可见性对账（不碰浏览器）----------
   build 全绿 ≠ 正文成了形。这一格盯的是"整篇塌成一枚 <p>"那类事故：切块用 /\n{2,}/，而 `core.autocrlf=true`
   的 checkout 会把稿件落成 CRLF（'\r\n\r\n' 里两枚 '\n' 不相邻）⇒ 那时 build 一点不红，三篇稿子全成一段、
   '## ' 以字面量上屏（2026-09-28 在 worktree 里实测到，规范 §16）。
   ⚠️ 尺子不许走渲染器：拿 renderMd 的输出去对 renderMd 的输出，渲染器塌了两边一起塌，正好互相赦免。
   所以期望值从**源码行首的 '## '** 独立数出来（这条读法对行尾天然免疫：'^' 只看 '\n' 之后）。
   ⚠️ 产物侧要摘掉脚注那枚标题：footnotes() 发的是 '<h2 class="fn-title">注</h2>'（markdown.js:87），
   今天三篇都没写脚注所以朴素计数恰好相等——但有人加一枚 [^1] 的那天，不摘的尺子就会假红。
   ⚠️ 第十一轮（`card/detail`）这一格多两读，都是"产物侧才看得见"的形状：
   ① **H3 那一档**（源码 `^### ` ⇄ 产物 `<h3>`）——目录本轮起收 H3，期望值必须能独立数出来，
      不能拿 `buildToc` 自己的输出当尺子；② **灯箱的在场判据**（图版枚数 ⇄ 那枚原生对话框的枚数，
      读产物前先摘注释）——"正文没图 ⇒ 整块不出现"这条只能在这儿有牙，因为它是构建期那半件的事，
      运行时那一侧的对应格子在第 6 节（目录⇄刻度⇄复制钮）。

   ⚠️ 第十轮（`card/taxonomy`）这一格多担两件事，因为它们是"产物侧才看得见"的那种事故：
   ① **草稿泄漏**：`getStaticPaths` 里漏掉 filter 时，列表页搜不到这一篇、地址却照样烘出来（og:url、
      prev/next 还都带着它）——astro build 与 `npm run check` 那几关全都不会红。这一格是那一格唯一的牙。
      判据与页面**同源**：`isDraft` / `sortPosts` 直接 import `src/lib/taxonomy.js`（那份不碰 astro:content），
      front matter 的读法 import `tools/frontmatter.mjs`（三处工具共用一份），不在本文件里再猜一遍"什么算草稿"。
   ② **关于页那几个数**：colophon 报的"N 篇"必须等于**可见**稿件数——喂给 siteFacts 的若是整份集合，
      草稿会从列表消失却仍然被数进档案（§15 那条"两处必须同一把尺子"讲的正是这一对）。
   ⚠️ 顺序也在这里对：`/essays/` 里各行出现的先后必须等于 `sortPosts()` 给的那个顺序（置顶在最前）。
      文本判据管不住"比较函数写反"，这一条读的是产物。 */
/* ⚠️ 扫产物 HTML 之前先把 <!-- --> 摘掉（本卡实测到的假红逼出来的，不是预防性写法）：
   `src/layouts/Layout.astro:80` 那段规范链接的注释里原话写着"同一篇稿子的 /essays/foo 与 /essays/foo/
   各自回 200"——那是**给人读的一句说明**，今天真的烘进了每一页产物，于是"列表先后"那一格实测读出
   `foo forest-blog fog-debugging slow-frontend` 四行（多出来的 `foo` 就是那半句注释）⇒ exit 1。
   判据要抓的是**访客走得到的地址**，注释里的地址访客走不到 ⇒ 不算泄漏、也不算一行。
   ⚠️ 同一把尺子顺手盖住"关于页那几个数"那一格——今天那里读到 1 处 `N 篇 · 约`、注释里 0 处，
   也就是说这一格是**预防性的**，不是本轮实测到的假红（登记在未验到，别把它读成"已经抓到过一次"）。
   摘注释只作用于"数地址与数那几个数"的三格，不作用于结构对账那一格——那一格数的是 `<h2>`，
   注释里不会出现它，动了反而少一层见证。 */
const stripComments = txt => txt.replace(/<!--[\s\S]*?-->/g, ' ');

const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const postFiles = existsSync(POSTS_DIR) ? readdirSync(POSTS_DIR).filter(f => /\.md$/i.test(f)).sort() : [];
if (!postFiles.length) problems.push(`正文结构对账没跑：${POSTS_DIR} 里一篇 .md 都没有 ⇒ 这一格判据空转（读不到稿件不算过）`);
/* 源码侧的"应该看得见的那批"，用 shipped 的那两个函数算，不在此处重写规则 */
const corpus = [];
for (const name of postFiles) {
  const slug = name.replace(/\.md$/i, '');
  const raw = readFileSync(join(POSTS_DIR, name), 'utf8');
  const parsed = splitFm(raw);
  if (!parsed) { problems.push(`${slug}：front matter 不成形，这一格的可见性判据读不出它是草稿还是已发布（宁缺不假绿）`); continue; }
  const tax = readTaxonomy(parsed.fmText);
  if (tax.errors.length) { problems.push(`${slug}：front matter 的四枚新键读不过预检（${tax.errors[0]}）——--check 那一格本该先拦下`); continue; }
  corpus.push({ id: slug, body: raw, data: { category: tax.category, tags: tax.tags, draft: tax.draft, pinned: tax.pinned, unlisted: tax.unlisted, aliases: tax.aliases, date: new Date(parsed.fm.date) } });
}
/* 三份名单，各对一个"页面那侧的谁"，一枚都不许多出来（第十五轮 `card/unlisted` 起了中间那枚）：
   · `routable` ⇄ `publishedPosts()`（只滤草稿）——**这些页必须在 dist/ 里存在**，包括不列入的那几枚；
   · `visible`  ⇄ `visiblePosts()`（滤草稿＋滤不列入）——列表顺序、关于页那几个数、三族目录、feed 与索引
     吃的都是这一份，所以"产物里被指到的那批"最多只能有这一份那么大；
   · `unlisted` ⇄ `routable ∩ isUnlisted`——这一格的当事人：页面在、带 noindex、任何一处不指它。
   ⚠️ 草稿与不列入**在两枚名单上方向相反**（这是这一族最容易做歪的地方）：草稿要求 `dist/essays/<id>/`
      **不存在**，不列入要求它**存在**。把两条判据抄成同一条，红的那一侧就会把另一侧悄悄放过。 */
const routable = sortPosts(corpus.filter(p => !isDraft(p)));
const visible = sortPosts(routable.filter(p => !isUnlisted(p)));
const unlisted = routable.filter(p => isUnlisted(p));
const drafts = corpus.filter(p => isDraft(p));
/* ⚠️ 键里那四枚相对 DIST 而言**不带** dist/ 前缀——上一版把显示名和路径名混成一枚串，
   join(DIST, 'dist/essays/index.html') 得到 dist/dist/... ⇒ 四份产物一份都不存在、被 filter 静默丢掉，
   "草稿泄漏"那一格于是变成零对象的空转还照样 exit 0。本卡第一次喂进真草稿才把它撞出来（见下面那条红）。
   现在 rel 只管给人看、parts 只管找文件，两件事分开写。 */
const READABLE = [['dist/essays/index.html', ['essays', 'index.html']],
                  ['dist/index.html', ['index.html']],
                  ['dist/rss.xml', ['rss.xml']],
                  ['dist/atom.xml', ['atom.xml']]]
  .map(([rel, parts]) => ({ rel, path: join(DIST, ...parts), html: null }))
  .filter(t => existsSync(t.path));
/* ⚠️ 这一格的"看得见"与"判据"同等重要（§16 那条老账：全绿却不打印数，就等于没人知道它跑没跑）：
   有草稿时逐枚点名"产物里没有它"，没草稿时点名"今天没有对象"，一份可读产物都找不到时算红而不是算过。 */
if (drafts.length && !READABLE.length) problems.push(`草稿对账：源码里有 ${drafts.length} 篇 draft，dist/ 里却一份可读产物都没有（essays 列表／首页／rss／atom 全不在）⇒ 这一格没吃到东西，不许算过`);
if (!drafts.length) notes.push(`草稿对账：源码里没有一篇 draft ⇒ 这一格今天没有对象（读得到稿件、判据仍然算跑过：可见 ${visible.length} 篇已逐个点名）`);
const gone = [];
for (const p of drafts) {
  const out = join(DIST, 'essays', p.id, 'index.html');
  let clean = !existsSync(out);
  if (existsSync(out)) problems.push(`${p.id}：draft: true 而 dist/essays/${p.id}/index.html 还在 ⇒ 详情页照样能访问（getStaticPaths 那一格漏了过滤，这是"列表没有、地址活着"那一族假完成）`);
  for (const t of READABLE) {
    const txt = (t.html ??= stripComments(readFileSync(t.path, 'utf8')));
    if (txt.includes(`/essays/${p.id}/`)) { clean = false; problems.push(`${p.id}：draft: true 却仍出现在 ${t.rel} ⇒ 那一处的 getCollection 没走 visiblePosts()`); }
  }
  if (clean) gone.push(p.id);
}
if (gone.length) notes.push(`草稿对账：${drafts.length} 篇 draft（${drafts.map(d => d.id).join('、')}）——逐个回读 dist/essays/<id>/index.html 不存在、${READABLE.length} 份可读产物（${READABLE.map(t => t.rel).join(' / ')}）零提及 ✓`);
/* 列表顺序 ⇄ 产物里各行的先后 */
{
  const listPath = join(DIST, 'essays', 'index.html');
  if (!existsSync(listPath)) problems.push('dist/essays/index.html 不在 ⇒ 顺序与草稿泄漏两笔判据都没了对象（这一格在空转）');
  else {
    const html = stripComments(readFileSync(listPath, 'utf8'));
    const seen = [...html.matchAll(/\/essays\/([a-z0-9-]+)\//g)].map(m => m[1]);
    const uniq = seen.filter((v, i) => seen.indexOf(v) === i);
    const want = visible.map(p => p.id);
    if (uniq.join(' ') !== want.join(' ')) problems.push(`/essays/ 里各行的先后是 ${uniq.join(' ')}，而 visiblePosts() 给的是 ${want.join(' ')} ⇒ 列表自己又排了一遍（或置顶没生效）——顺序只许住在 lib/posts.js`);
    else notes.push(`列表顺序对账：产物 ${uniq.length} 行 ＝ visiblePosts() 的顺序（置顶在最前，其余按日期倒序）✓`);
    /* 门牌必须连着数：置顶插到最前之后，folio 仍旧 01 02 03…（§15 那一格点名的就是这一条——
       编号是从渲染顺序加出来的，不是从日期算的，所以它比"顺序对不对"更狠一点：漏一号也是红） */
    const folios = [...html.matchAll(/class="folio">(\d{2})</g)].map(m => Number(m[1]));
    const expect = want.map((_, i) => i + 1);
    if (folios.join(' ') !== expect.join(' ')) problems.push(`/essays/ 的门牌读出来是 ${folios.join(' ')}，应该是 01…${String(want.length).padStart(2, '0')} 连续一号 —— 编号跨了分节就会断，断在那儿没人报告`);
    else notes.push(`门牌对账：${folios.length} 号连续（01…${String(folios.length).padStart(2, '0')}）✓`);
  }
}
/* 关于页的篇数 ⇄ 可见稿件数（同一把尺子，§15） */
{
  const aboutPath = join(DIST, 'about', 'index.html');
  if (!existsSync(aboutPath)) problems.push('dist/about/index.html 不在 ⇒ "档案那几个数与列表同一把尺子"这条判据没吃到东西');
  else {
    const m = /(\d+)\s*篇 · 约/.exec(stripComments(readFileSync(aboutPath, 'utf8')).replace(/<[^>]+>/g, ''));
    if (!m) problems.push('关于页的站点档案里读不到"N 篇 · 约 …"那一行 ⇒ 对账的尺子落空（模板换了写法要同步改这里）');
    else if (Number(m[1]) !== visible.length) problems.push(`关于页站点档案报 ${m[1]} 篇，可见稿件是 ${visible.length} 篇 ⇒ siteFacts() 吃的不是 visiblePosts()，草稿被数进档案而列表里没有`);
    else notes.push(`站点档案对账：关于页 ${m[1]} 篇 ＝ 可见稿件 ${visible.length} 篇（草稿没被数进去）✓`);
  }
}
/* 分类 / 标签两族页面：清单里有的，产物里必须在；一枚都没有时索引页必须在（空态不是白屏） */
for (const [key, groups, dir] of [['分类', bySize(groupBy(visible, categoryOf)), 'categories'], ['标签', bySize(tagGroups(visible)), 'tags']]) {
  if (!existsSync(join(DIST, dir, 'index.html'))) { problems.push(`dist/${dir}/index.html 不在 ⇒ 一个分类/标签都没有时这一页必须走空态，不是不构建`); continue; }
  for (const g of groups) {
    if (!g.slug) { problems.push(`${key}"${g.name}" 归一化之后没有地址 ⇒ 页面上会出现一枚指向 /${dir}// 的死锚点（§12）`); continue; }
    if (!existsSync(join(DIST, dir, g.slug, 'index.html'))) problems.push(`${key} "${g.name}" 在清单里，dist/${dir}/${g.slug}/index.html 却不在 ⇒ 索引页那枚胶囊是死锚点（getStaticPaths 与清单不同源）`);
  }
  notes.push(`${key}清单对账：${groups.length} 枚（${groups.map(g => `${g.slug}×${g.posts.length}`).join(' ') || '一枚都没有 ⇒ 索引页走空态'}）`);
}
/* 目录与刻度到底收了几级标题，是**运行时**才知道的事（两排节点都由 site.js 造），所以这一格
   要读到浏览器那一侧去。这里先把源码侧的期望值算好存起来，交给第 6 节的完整档对账。
   ⚠️ 口径与上面那格 `^## ` 完全同一条（同一枚 `m` 标志、同一份 p.body、同一笔"围栏里不该写行首井号"的
   已知局限——今天三篇稿子零枚围栏，见 §15），只是把 H3 一起数进来：本轮详情页收 H3，
   而**目录与刻度必须收同一批**（`site.js` 那枚 HEAD_SEL 是唯一出处），所以判据要能看见"只改了一处"。 */
const HEADS = new Map();      // slug → { h2, h3, total }
/* 逐页对账吃 `routable`（含不列入的那几枚）：那一页**在盘上**，读者拿地址就读得到它，
   所以它的正文也必须成了形——"不列入"减掉的是别人指向它，不是它自己的内容。 */
for (const p of routable) {
  const out = join(DIST, 'essays', p.id, 'index.html');
  if (!existsSync(out)) { problems.push(`${p.id}：源码有稿而 dist/essays/${p.id}/index.html 不在 ⇒ 这一页根本没构建出来，结构对账无从谈起`); continue; }
  const want = (p.body.match(/^## /gm) || []).length;
  const wantH3 = (p.body.match(/^### /gm) || []).length;
  HEADS.set(p.id, { h2: want, h3: wantH3, total: want + wantH3 });
  const html = readFileSync(out, 'utf8');
  const got = (html.match(/<h2\b[^>]*>/g) || []).filter(t => !/fn-title/.test(t)).length;
  if (got !== want) problems.push(`${p.id}：源码有 ${want} 枚行首 "## "，产物里只有 ${got} 个 <h2> ⇒ 块级结构在渲染器里塌了（切块口径见 markdown.js:204 的 splitBlocks()；成段塌成一枚 <p> 是最常见的形状）`);
  else notes.push(`结构对账 ${p.id}：源 ${want} 枚 "## " ＝ 产物 ${got} 个 <h2> ✓（fn-title 那枚已摘除；全绿时也要看得见这两枚数，否则"没匹配到"与"全过"长得一样）`);
  /* H3 这一档今天三篇稿子都是 0 枚 —— 0 是合法读数，不是空转：它同时钉着"渲染器没把 ### 吃成 <p>"
     与"目录没有凭空多收"两侧；有载体的那一跑（本卡实测过）读的就是非零那档。 */
  const gotH3 = (html.match(/<h3\b[^>]*>/g) || []).length;
  if (gotH3 !== wantH3) problems.push(`${p.id}：源码有 ${wantH3} 枚行首 "### "，产物里却有 ${gotH3} 个 <h3> ⇒ H3 在渲染器里要么塌了、要么多出来的那枚不是稿子里写的（详情页正文区不许自己长标题）`);
  else notes.push(`结构对账 ${p.id}：源 ${wantH3} 枚 "### " ＝ 产物 ${gotH3} 个 <h3> ✓（目录与刻度收的就是这一批，见下面"目录⇄刻度"那一格）`);
  /* 灯箱的在场判据（本轮 `card/detail`，构建期那半件）：**正文有图版 ⇒ 一枚灯箱；零枚图版 ⇒ 一个字节都没有**。
     读的是产物、摘掉注释（同一把尺子：注释里那句说明不是节点，§14 那条假红教的正是这件事）。
     两个方向都要判——"没有图也发一块"违反整块不出现，"有图却没发"是灯箱根本不在场。 */
  const shots = (stripComments(html).match(/<figure class="shot"/g) || []).length;
  const boxes = (stripComments(html).match(/<dialog\b/g) || []).length;
  const wantBox = shots ? 1 : 0;
  if (boxes !== wantBox) problems.push(`${p.id}：正文里 ${shots} 枚图版 ⇒ 灯箱该是 ${wantBox} 枚，产物里读到 ${boxes} 枚 ⇒ "有图没灯箱"或"没图却留了一块灯箱"（后者就是 §12 那条不许预留空位）`);
  else notes.push(`灯箱在场对账 ${p.id}：图版 ${shots} 枚 ⇄ 灯箱 ${boxes} 枚（${shots ? '有载体，正合适' : '零枚 ⇒ 整块不出现，产物里一个字节都没有'}）✓`);
}
if (!HEADS.size) problems.push('目录⇄刻度对账没跑：可见稿件是 0 篇 ⇒ HEADS 是空的，那一格读不到任何对象（判据空转不算过）');

/* ---------- 1d. 目录 ⇄ 正文 id ⇄ 刻度：三排节点的两侧对账（`card/anchors` 这卡的牙）----------
   这一格回答一句 §12 死锚点禁令在"降级"这一侧的话：**HTML 里有目录、`href` 指向产物里不存在的 id**
   就是死锚点，与"关掉一档留下能访问的壳"同罪。§12 那条 404 禁令的精神同样适用——不许出现
   "看着有一块目录、点开那一条什么也没跳"的半成品。
   ⚠️ 为什么它落在**不碰浏览器**的那一段（1b 同层）：这一族的卖点正是"构建期就在盘上"，
   所以它原理上不需要运行时 DOM——读 `dist/` 的字节就够了。浏览器两档（第 6 节）读的是同一批节点
   在 DOM 里没被脚本重复追加，那是另一件事。
   断言四件，逐篇：
     ① 目录里每枚 `href="#x"`（按序）⇄ 正文 `<article class="post-body">` 里那排 `h2:not(.fn-title)/h3`
        的 `id`（按序）——**两侧集合与顺序都算**，多一枚少一枚换一枚都红；
     ② 正文每枚章的 id 非空且不重复（`id=""` 是一枚点不开的活锚，也是"两条 href 跳同一枚"的来源）；
     ③ 刻度那一排 `<span>` 枚数 ⇄ 同一批章（目录给名字、这一排给形状，窄屏没有目录时刻度还在——
        两边枚数分叉就是 §15 那条"同一枚选择器只改了一处"的产物形状）；
     ④ 上面三枚数各自 ⇄ **源码**里行首 `^## `/`^### ` 数出来的总数（同一把尺子来自 1b 的 HEADS，
        不许由渲染器自己出：渲染器塌了两边一起塌，正好互相赦免，§16 那条老账）。
   外加全站扫描：`dist/` 每一份 HTML 里任何一枚**具名**片段 `href="#x"` 必须在同一份文件里有 `id="x"`。
   ⚠️ `href="#"`（空片段）不报红、只报数：那是 `markdown.js` 消毒坏协议时正文链接的兜底形状
   （`href()` 交回字面量 `'#'`，§15「许可」那一格记过——句子里那枚坏地址仍要留在纸上），
   今天产物里读到 0 枚；把它判红会连带否决那一条已签字的兜底。具名片段缺失才是死锚点。 */
const tocHrefsOf = html => {
  const m = /<nav id="toc"[^>]*>([\s\S]*?)<\/nav>/i.exec(html);
  return m ? [...m[1].matchAll(/href="#([^"]*)"/g)].map(x => x[1]) : null;
};
/* 正文那一排章的 id：`h2:not(.fn-title), h3` 的**产物级同形读法**（文末那枚"注"不算章，口径与 site.js
   那枚 HEAD_SEL、1b 那两格计数三处同源）。⚠️ 取"第一个 `</article>` 之前"那一段：详情页正文里不许
   嵌第二枚 `<article>`（渲染器白名单没有它，§15），真嵌了就是这一格的读法要跟着改的那天。 */
const bodyHeadIdsOf = html => {
  const m = /<article class="post-body[\s\S]*?<\/article>/i.exec(html);
  if (!m) return null;
  return [...m[0].matchAll(/<h([23])\b([^>]*)>/g)]
    .filter(x => !/fn-title/.test(x[2]))
    .map(x => (/id="([^"]*)"/.exec(x[2]) || [, ''])[1]);
};
const markSpansOf = html => {
  const m = /<div id="progress-marks"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  return m ? (m[1].match(/<span\b/g) || []).length : null;
};
{
  /* 防空转的正向控制（本仓那条老判据："扫了但没匹配到"与"扫了且全过"长得一模一样）：
     两枚内置 fixture 先自证这三枚收集器还活着——一枚坏形状必须被抓，一枚好形状不许误抓。 */
  const fxBad = '<nav id="toc"><a href="#甲">甲</a><a href="#幽灵">幽灵</a></nav><article class="post-body"><h2 id="甲">甲</h2><h3 id="">坏</h3></article>';
  const fxOk = '<nav id="toc"><a href="#甲">甲</a><a href="#乙">乙</a></nav><article class="post-body"><h2 id="甲">甲</h2><h2 id="乙">乙</h2></article><div id="progress-marks"><span></span><span></span></div>';
  const badToc = tocHrefsOf(fxBad), badIds = bodyHeadIdsOf(fxBad), okToc = tocHrefsOf(fxOk), okIds = bodyHeadIdsOf(fxOk);
  if (!badToc || !badIds || !okToc || !okIds) die('1d 死锚点对账的收集器读不出内置 fixture ⇒ 这三枚收集器已经瞎了，整格不许算过');
  if (!(badToc.length === 2 && badIds.length === 2 && badIds[0] === '甲' && badIds[1] === '')) die('1d 控制样本（坏形状）收集结果与预期不符 ⇒ 收集器空转');
  if (!(okToc.join(' ') === okIds.join(' ') && markSpansOf(fxOk) === 2)) die('1d 控制样本（好形状）被误报 ⇒ 判据朝窄侧失灵');
  if (tocHrefsOf('<p>没有目录</p>') !== null || bodyHeadIdsOf('<p>没有正文</p>') !== null) die('1d 收集器在缺宿主时交回了非 null ⇒ "读不到"会被当成"读到零枚"放过');
  notes.push('1d 收集器自证：坏 fixture（目录 2 条 ⇄ 正文 2 枚、其中一枚 id 空）被如实读出、好 fixture（2⇄2⇄2）零误报');
  let asserted = 0, nonzero = 0;
  for (const p of routable) {
    const file = join(DIST, 'essays', p.id, 'index.html');
    if (!existsSync(file)) continue;                       /* 页面不存在那一支已由 1b 报红，这里不重复点名 */
    const html = stripComments(readFileSync(file, 'utf8'));  /* 注释里的地址访客走不到：口径与 1b 那三格同一条 */
    const toc = tocHrefsOf(html), ids = bodyHeadIdsOf(html), marks = markSpansOf(html);
    const want = HEADS.get(p.id) || { total: 0, h2: 0, h3: 0 };
    if (toc === null || ids === null || marks === null) { problems.push(`${p.id}：产物里找不到 #toc / <article class="post-body"> / #progress-marks 那一枚宿主 ⇒ 死锚点对账没有对象（"读不到"从来不算过）`); continue; }
    asserted++;
    if (want.total) nonzero++;
    const diff = [];
    const n = Math.max(toc.length, ids.length);
    for (let i = 0; i < n; i++) if (toc[i] !== ids[i]) diff.push(`第 ${i + 1} 枚：目录 ${toc[i] === undefined ? '∅' : `"#${toc[i]}"`} ⇄ 正文 ${ids[i] === undefined ? '∅' : `id="${ids[i]}"`}`);
    if (diff.length) {
      /* 红名要说准是哪一面：拿"集合"比而不是只比枚数，才有这一句判别。
         §16 那条残账（"对账比的是枚数，章序颠倒、标题掉了字它看不见"）在**目录⇄正文这一对**上顺手补掉了——
         两侧按序比，掉字与颠倒都红（正文⇄源码那一格的枚数账照旧，它仍然只管成形）。 */
      const ghosts = toc.filter(x => !ids.includes(x));
      const unlisted = ids.filter(x => !toc.includes(x));
      const why = ghosts.length ? `目录里有 ${ghosts.length} 枚 href 指向正文里不存在的 id（${ghosts.map(x => '#' + x).join(' ')}）⇒ §12 死锚点：关掉 JS 它也照样是一条点不开的行`
        : unlisted.length ? `正文有 ${unlisted.length} 枚章在目录里没有条目（${unlisted.map(x => '#' + x).join(' ')}）⇒ 半张地图：章在、读者拿不到入口`
        : '两侧集合相同但先后不同 ⇒ 章序被改了一遍（目录与正文各排各的）';
      /* 空串 id 单独说一句：产物里那枚章**没有 id 属性**与"id 是空串"对浏览器是同一件事（都指不到），
         但成因不同——前者是"id 又回到运行期脚本去补"（旧机制，§19.3 同族），后者是规范化退化。 */
      const noId = ids.filter(x => x === '').length;
      problems.push(`${p.id}：目录与正文的章 id 对不上（${diff.length} 处）——${diff.slice(0, 4).join('；')} ⇒ ${why}`
        + (noId && ghosts.length === 0 ? `　〔其中 ${noId} 枚章的 id 读出来是空串＝产物里根本没有 id 属性：那正是"锚点由 JS 落"的旧机制，无 JS／深链／打印三路都跳不到〕` : ''));
    }
    else if (toc.length !== want.total) problems.push(`${p.id}：目录 ⇄ 正文两侧都是 ${toc.length} 枚，源码却是 ${want.h2} 枚 "## " ＋ ${want.h3} 枚 "### " ＝ ${want.total} —— 两侧一起漏，问题在渲染器而不是对账`);
    else if (marks !== ids.length) problems.push(`${p.id}：刻度 ${marks} 枚 ≠ 正文章 ${ids.length} 枚 ⇒ 目录给名字、这一排给形状，两把尺子分叉了（§15 那条"同一枚选择器只改一处"）`);
    else {
      const empty = ids.filter(x => x === '').length;
      const dup = ids.length - new Set(ids).size;
      if (empty) problems.push(`${p.id}：正文里 ${empty} 枚章的 id 是空串 ⇒ 那是一条点不开的活锚，而且第二枚空串会与它撞车（§12）`);
      else if (dup) problems.push(`${p.id}：正文章的 id 有 ${dup} 处重值 ⇒ 目录那两条 href 会跳到同一枚元素，另一章永远跳不到`);
      else notes.push(`目录⇄正文 id⇄刻度 ${p.id}：${toc.length} 条 ⇄ ${ids.length} 枚 ⇄ ${marks} 枚 ＝ 源 ${want.h2}＋${want.h3}（两侧同值、无空 id、无重值）✓ 目录那排是 ${toc.map(x => `"#${x}"`).join(' ')}`);
    }
  }
  if (!asserted) problems.push('1d 死锚点对账一份详情页都没读到 ⇒ 这一格空转（不许算过）');
  else if (!nonzero) problems.push(`1d 死锚点对账跑了 ${asserted} 页，而每篇的章总数都是 0 ⇒ 两侧都是零的相等没有信息量（三篇稿子一枚标题都没有？去看 src/content/posts/）`);
  else console.log(`  目录⇄正文 id：${asserted} 页进入 1d，其中 ${nonzero} 页章总数非零（防空转：两侧都为零的相等不算看见）`);
}
/* 全站具名片段扫描（同一枚 §12 禁令的通用面：不止目录，正文里作者手写的那枚 `(#某节)` 也要算） */
{
  let named = 0, empty = 0; const dead = [];
  for (const { file, url } of PAGES) {
    const txt = stripComments(readFileSync(file, 'utf8'));
    const ids = new Set([...txt.matchAll(/\bid="([^"]*)"/g)].map(m => m[1]));
    for (const m of txt.matchAll(/href="#([^"]*)"/g)) {
      if (m[1] === '') { empty++; continue; }
      named++;
      if (!ids.has(m[1])) dead.push(`${url} → #${m[1]}`);
    }
  }
  if (dead.length) problems.push(`死锚点扫描：${dead.length} 枚具名片段在本页产物里找不到同值的 id —— ${dead.slice(0, 6).join('、')}`);
  else notes.push(`死锚点扫描（全站 ${PAGES.length} 份 HTML）：具名片段 ${named} 枚全部在本页找到 id ✓；空片段 href="#" ${empty} 枚（只报不判，口径见上面 1d 那段：它是消毒坏地址的正文兜底形状）`);
}

/* ---------- 1c. 不列入（unlisted）的产物级对账——本卡的心脏 ----------
   这一格只回答一句在源码上原理问不出来的话：**全站没有一处指向它**（第十五轮 `card/unlisted`）。
   ⚠️ 分层规矩（§16 签过）：读产物的判据必须在 build 之后 ⇒ 这一格在 runtime-check（`gate` 里），
      不许塞进 `npm run check`（干净检出上没有 dist/，塞进去红的是环境不是代码）。
   断言四件，名单**按盘上真值现算**（`src/content/posts/*.md` 的 front matter ＋ shipped 的 `isUnlisted()`），
   本文件里不许硬编码任何一枚 slug：
     ① 页面在：`dist/essays/<id>/index.html` 必须存在——与草稿那一族**方向相反**（那边要的是不存在）。
        漏这一条的形状＝详情页 `getStaticPaths` 吃了 `visiblePosts()`：路没建出来，"只有拿到地址的人能读"
        被做成"这条路不存在"。
     ② 那一页带 `<meta name="robots" content="noindex">`（落点在 `src/layouts/Layout.astro` 那一行条件）。
     ③ 它不在 `sitemap-0.xml`、不在 `rss.xml`／`atom.xml`、不在 `search.json`、不在 `llms.txt`。
     ④ **全站 href 扫描**：`dist/` 里除它自己那一页之外，任何一份文本产物都不许出现指向它的 `<a href>`。
        prev/next 那一格要杀的就是这条——它是唯一一处"列表干净、地址活着、build 全绿"却能把它递出去的地方。
   ⚠️ 零对象不许静默：今天 0 枚 unlisted 也照样打印"0 枚"并**当众跑三枚 needle**——
      · 形状 needle（内置 fixture，不依赖盘）：href 收集器／路径归一／noindex 判据各正反两向，坏形状必红；
      · 载体 needle（盘上正向）：**在册**稿件每一枚都能在自己那一页之外被 `<a href>` 指到；
      · 机器 needle（盘上正向）：在册稿件每一枚都在 sitemap／两枚 feed／search.json／llms.txt 里读得到。
      后两枚是"尺子还活着"的见证物——尺子瞎的时候"0 处指向／0 次出现"和"全过"长得一模一样（§14 第 14 项）。
   ⚠️ 扫 HTML 前一律摘 `<!-- -->`（口径照上面那三格）：注释里的地址访客走不到，不算指向；
      `Layout.astro` 那句 canonical 说明里就抄着 `/essays/foo/`，不摘的话在册稿件那一格会数出多余的一行。 */
{
  const textArts = [];
  (function walkUn(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { walkUn(p); continue; }
      let buf;
      try { buf = readFileSync(p); }
      catch (e) { problems.push(`不列入对账读不开 ${p}（${e.message}）⇒ 全站 href 那一半不再等于全量，这一格不许算过`); continue; }
      if (buf.includes(0)) continue;                       /* 二进制（png / woff2 / jpg）里不会有 <a href> */
      textArts.push({ rel: '/' + p.slice(DIST.length + 1).split('\\').join('/'), txt: stripComments(buf.toString('utf8')) });
    }
  })(DIST);
  if (!textArts.length) problems.push(`不列入对账：${DIST} 里一枚文本产物都没读到 ⇒ href 扫描根本没吃到东西，"零处指向"这一条不许算过`);

  /* ---- 三把尺子 ---- */
  const NOINDEX_RE = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex[^"']*["']/i;
  const hrefsOf = txt => [...txt.matchAll(/<a\b[^>]*?href=(?:"([^"]*)"|'([^']*)')/gi)].map(m => m[1] ?? m[2] ?? '');
  const pathOf = h => {
    let p = String(h).split('#')[0].split('?')[0];
    const m = /^[a-z][a-z0-9+.-]*:\/\/[^/]*(.*)$/i.exec(p);
    if (m) p = m[1];                                        /* 绝对地址：取回 path 那一段再比 */
    if (!p.startsWith('/')) p = `/${p}`;                    /* 本仓 href 一律钉到站点根（§15），这行只兜底 */
    return `${p.replace(/\/+$/, '')}/`;                      /* 归一成"恰好一枚尾斜杠"：trailingSlash 是 ignore，两种写法都回 200 */
  };
  /* ⚠️ 第十六轮 `card/feedout` 把这一枚判据从"等于/结尾那一枚目录"换成"**开头**在那一枚目录下"：
     同一篇稿子今天有两枚表示——`/essays/<slug>/`（页）与 `/essays/<slug>/index.md`（原文）。
     旧写法读不到后者，于是"给不列入的那一篇递一枚原文地址"会绿着过全站 href 扫描，
     而那正是这一族唯一要防的形状换了个文件名又来一次。`-next` 那枚反例钉住它没有放宽到"前缀像"：
     尾斜杠在比较串里是必须的，`/essays/x-next/` 落不进 `/essays/x/`。 */
  /* ⚠️ 第十七轮 `card/aliases` 再扩一次：同一篇稿子现在可能有**第三种表示**——作者声明过的那几枚旧地址
     （`/2026/foo/` 之类，`src/pages/[...alias].astro` 为它们各烘一枚跳转页）。旧地址算不算"指向这一篇"？
     算。§15 那一格签的是"它自己的地址是唯一入口"，而一枚被人链过去的旧地址就是第二枚入口——
     认不出它的那一版扫描会绿着放行"给不列入那一篇递一枚旧地址"，与上一轮那枚 `.md` 同址写法是同一族坏形状。
     名单不在这里另算：它来自同一份 front matter 与 shipped 的 `aliasesOf()`（上面 `corpus` 那一份 data 里
     带着 `aliases`），所以"哪些旧地址归谁"这一件事全站只有一处真值。第三枚参数就是那一枚名单，默认算出来是空的。 */
  const aliasesOfId = id => { const p = corpus.find(x => x.id === id); return p ? aliasesOf(p) : []; };
  const pointsTo = (h, id, alias = aliasesOfId(id)) => { const at = pathOf(h); return at.startsWith(`/essays/${id}/`) || alias.includes(at); };
  const refsFrom = id => textArts.filter(t => !t.rel.startsWith(`/essays/${id}/`)).filter(t => hrefsOf(t.txt).some(h => pointsTo(h, id))).map(t => t.rel);
  /* 机器侧那五份产物：名字＝给人看的，parts＝找文件的（口径照上面 READABLE 那格——显示名与路径名分开写，
     混成一枚串就会得到 dist/dist/... 那种"一份都不存在、被 filter 静默丢掉"的空转） */
  const MACHINE = [['sitemap-0.xml', ['sitemap-0.xml']], ['rss.xml', ['rss.xml']], ['atom.xml', ['atom.xml']], ['search.json', ['search.json']], ['llms.txt', ['llms.txt']]];

  /* ---- needle 之一：形状自证（内置 fixture，盘上零枚也照跑）---- */
  const NP = 'needle-probe';
  const broken = [];
  let tried = 0;
  /* 每枚 needle 自己计数：上面那句"8 条内置自证"曾是手抄的，加一条就得记着改一处——
     抄的枚数迟早和判据分叉（本仓为这一族写过好几次"六处复述"的账），所以这里由 `probe()` 现数。 */
  const probe = (ok, msg) => { tried++; if (!ok) broken.push(msg); };
  probe(hrefsOf(`<a class="row" href="/essays/${NP}/">标题</a>`).length === 1, 'href 收集器从一枚标准 <a href> 里读不到 1 枚 ⇒ 它已经不吃 <a> 了');
  probe(pointsTo(`/essays/${NP}/`, NP), '带尾斜杠的站内地址没被判成指向它');
  probe(pointsTo(`/essays/${NP}`, NP), '不带尾斜杠的地址没被判成指向它（trailingSlash: ignore 下两种写法都回 200，两种都算指向）');
  probe(pointsTo(`https://mistwood.example.com/essays/${NP}/`, NP), '绝对地址没被判成指向它（feed 与 JSON-LD 交的就是绝对地址）');
  /* 第十六轮 `card/feedout` 那两枚：同一篇稿子的**原文**地址算不算"指向这一篇"。
     认不出它的那一版扫描会绿着放行"给不列入的稿子递原文"，而那一族的坏形状恰恰只露在这一枚串上。 */
  probe(pointsTo(`/essays/${NP}/index.md`, NP), '原文 Markdown 那枚同址写法没被判成指向它 ⇒ 有人把不列入那一篇的 .md 链出去也不会红');
  probe(pointsTo(`https://mistwood.example.com/essays/${NP}/index.md`, NP), '绝对形式的原文地址没被判成指向它（feed 交的就是绝对地址）');
  probe(!pointsTo(`/essays/${NP}-next/`, NP), '一枚只是"前缀像"的地址被判成指向它 ⇒ 别稿的行会被数进这一枚的账，判据太宽');
  probe(!pointsTo(`/categories/${NP}/`, NP), '/categories/<同名>/ 被判成指向那一页 ⇒ 枚数会虚高');
  probe(!pointsTo(`/og/${NP}.png`, NP), '逐篇社交卡那枚文件名被判成指向这一篇 ⇒ 目录行与卡片同名的稿子会被自己那一页顶掉计数');
  /* 第十七轮 `card/aliases` 那四枚：第三枚参数（这一篇声明过的旧地址）承重吗？两侧各有。
     ⚠️ 这里喂的是 **fixture 名单**而不是按 corpus 算出来的那份：needle 那一枚 id（needle-probe）根本不是稿件，
        拿"盘上真名单"（对它就是空集合）去断言"旧地址被判成指向它"就是永远断言不到——本仓为这一族写过
        "在空集合上偷懒"那句（上面第三格的原话）。空名单那一枚钉的是反向：判据不许宽到把任何旧地址都算进来。 */
  probe(pointsTo(`/2026/${NP}-old/`, NP, [`/2026/${NP}-old/`]), '作者声明过的旧地址没被判成指向这一篇 ⇒ 有人把不列入那一篇的旧地址链出去也不会红');
  probe(pointsTo(`https://mistwood.example.com/2026/${NP}-old/`, NP, [`/2026/${NP}-old/`]), '绝对形式的旧地址没被判成指向它（feed 与 llms.txt 交的是绝对地址）');
  probe(!pointsTo(`/2026/${NP}-old/`, NP, []), '名单为空时旧地址也被判成指向这一篇 ⇒ "0 处指向"会在每一枚旧地址上假红（判据太宽）');
  probe(!pointsTo(`/2026/${NP}-old/`, 'other-post', [`/2026/other-old/`]), '另一篇的旧地址被判成指向这一篇 ⇒ 判据没有按"这一枚地址归谁"的名单比，一枚稿子的账会被别稿的旧地址撑大');
  probe(NOINDEX_RE.test('<meta name="robots" content="noindex">'), 'noindex 尺子读不到标准写法那一枚 meta');
  probe(!NOINDEX_RE.test('<meta name="description" content="noindex">'), 'noindex 尺子把别的 meta 也认了（判据太宽，会假绿在真正缺 meta 的那一页上）');
  for (const b of broken) problems.push(`不列入对账 needle：${b} ⇒ 这一族的尺子已经坏了，下面那些"0 处／0 次"从此不可信`);
  notes.push(`不列入对账 needle·形状：${tried} 条内置自证${broken.length ? `（红 ${broken.length} 条）` : '全过'}（href 收集 1、"算指向"正例 7、"不算指向"负例 5、noindex 2）；`
    + `窗口现扫 ${textArts.length} 份文本产物，在册 ${visible.length} 枚各验一次"<a href> 指得到"、机器侧 ${MACHINE.length} 份各验一次"读得到"`);

  /* ---- needle 之二／之三：盘上的正向见证物 ---- */
  if (!visible.length) problems.push('不列入对账 needle：可见稿件是 0 篇 ⇒ "在册稿件一定被指到、一定在机器侧产物里"这两枚正向见证物没有对象，href 与 substring 那两把尺子无法自证（不许算过）');
  const noAnchor = [];
  for (const p of visible) { const n = refsFrom(p.id).length; if (!n) noAnchor.push(p.id); }
  for (const id of noAnchor) problems.push(`不列入对账 needle：在册稿件 ${id} 在 dist/ 里被 <a href> 指到 0 处（自己那一页之外）⇒ 全站 href 扫描读不到"被指到"这件事本身，`
    + `那么"不列入的稿子被指到 0 处"就是一条没有信息的判据（尺子或 href 的形状变了，先看 /essays/ 那一页还在不在）`);
  const machineTxt = new Map();
  for (const [name, parts] of MACHINE) {
    const p = join(DIST, ...parts);
    if (!existsSync(p)) { problems.push(`不列入对账：${name} 不在 dist/ ⇒ 那一处"出现 0 次"没有对象（这一格在空转，不许算过）`); continue; }
    machineTxt.set(name, stripComments(readFileSync(p, 'utf8')));
  }
  for (const [name] of MACHINE) {
    const txt = machineTxt.get(name);
    if (txt === undefined) continue;
    for (const p of visible) if (!txt.includes(`/essays/${p.id}/`)) problems.push(`不列入对账 needle：在册稿件 ${p.id} 在 ${name} 里读不到 ⇒ 那一枚"0 次"的判据没有对象（产物形状变了，或尺子被换窄了）`);
  }

  /* ---- 四件断言，逐枚点名 ---- */
  notes.push(`不列入对账：按 front matter 现算出 **${unlisted.length} 枚** unlisted（名单：${unlisted.map(p => p.id).join('、') || '空 ⇒ 今天没有对象，四件断言由上面三枚 needle 当众验过；routable ${routable.length} 篇的页面全部回读过'}）`);
  const clean = [];
  for (const p of unlisted) {
    const page = join(DIST, 'essays', p.id, 'index.html');
    let ok = existsSync(page);
    if (!ok) problems.push(`${p.id}：unlisted: true 而 dist/essays/${p.id}/index.html 不在 ⇒ "只有拿到地址的人能读"被做成了"这条路不存在"：`
      + `详情页 getStaticPaths 那一处必须吃 publishedPosts()（路要建出来），把不列入一起滤掉就是这一条红`);
    else if (!NOINDEX_RE.test(stripComments(readFileSync(page, 'utf8')))) {
      ok = false;
      problems.push(`${p.id}：那一页在盘上却没有 <meta name="robots" content="noindex"> ⇒ 抓取器会把它当目录里的一篇收走`
        + `（落点是 src/layouts/Layout.astro 那一行 {noindex && <meta …>}，判据是 src/lib/taxonomy.js 的 isUnlisted()）`);
    }
    for (const [name] of MACHINE) {
      const txt = machineTxt.get(name);
      if (txt === undefined) continue;
      if (txt.includes(`/essays/${p.id}/`)) { ok = false; problems.push(`${p.id}：unlisted: true 却出现在 ${name} 里 ⇒ 那一处入口没走 visiblePosts()（或 sitemap 的 filter 名单没覆盖到它）`); }
    }
    const refs = refsFrom(p.id);
    if (refs.length) {
      ok = false;
      problems.push(`${p.id}：unlisted: true 却被 ${refs.length} 份产物的 <a href> 指到（${refs.slice(0, 6).join(' / ')}${refs.length > 6 ? ' …' : ''}）`
        + ` ⇒ "站内任何一处都不指向它"破了。最常见的形状是 prev/next 吃了 publishedPosts()——邻居只许从 visiblePosts() 算`);
    }
    if (ok) clean.push(p.id);
  }
  if (clean.length) notes.push(`不列入对账：${clean.length} 枚（${clean.join('、')}）逐枚回读——页面在、带 noindex、`
    + `${[...machineTxt.keys()].length} 份机器侧产物（${[...machineTxt.keys()].join(' / ')}）各 0 次、全站 ${textArts.length} 份文本产物里 <a href> 0 处指向 ✓`);
}

/* ---------- 2. 浏览器 ---------- */
const EDGE_CANDIDATES = [
  opt('edge'),
  process.env['PROGRAMFILES'] && join(process.env['PROGRAMFILES'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  process.env['LOCALAPPDATA'] && join(process.env['LOCALAPPDATA'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
].filter(Boolean);
const EDGE = opt('edge') ? resolve(opt('edge')) : EDGE_CANDIDATES.find(p => existsSync(p));
if (!EDGE || !existsSync(EDGE)) die(`找不到浏览器可执行文件（试过：${EDGE_CANDIDATES.join(' / ')}）`, '  换浏览器传 --edge=<路径>；这一条不降级、不跳过');

/* ---------- 3. 一次性 profile（绝不碰用户真实 Edge 配置）---------- */
function newProfile(tag) {
  let dir;
  if (opt('profile-dir')) dir = join(resolve(opt('profile-dir')), `slot${tag}`);
  else {
    try { dir = mkdtempSync(join(tmpdir(), `mistwood-runtime-check-${tag}-`)); }
    catch (e) { die(`临时 profile 目录都建不出来（${e.message}）`, `  tmpdir=${tmpdir()}；要换地方传 --profile-dir=<可写目录>`); }
  }
  try {
    mkdirSync(dir, { recursive: true });
    const probe = join(dir, `.writable-${process.pid}-${tag}`);
    writeFileSync(probe, 'x');
    rmSync(probe, { force: true });
  } catch (e) {
    die(`--user-data-dir 落点不可写/不可用（${dir}：${e.message}）`, '  浏览器根本起不来就是这条死法，不许"拿不到就跳过"');
  }
  profiles.push(dir);
  return dir;
}

/* ---------- 4. 静态服务：只听 127.0.0.1，自己起自己关 ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
let isolatePass = false;          // 真的时候对任何 .js 回 404（内联隔离档）
const served = { hit: new Set(), blocked: new Set(), js: new Set() };
server = createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  if (isolatePass && /\.(m?js)(\?|#|$)/i.test(p)) { served.blocked.add(p); res.writeHead(404, { 'content-type': 'text/plain' }); res.end('blocked by runtime-check（内联隔离档）'); return; }
  /* 只在 dist 里找文件：URL 里的 .. 一律拒（门禁不该变成任意文件读取器） */
  const file = join(DIST, ...p.split('/').filter(Boolean));
  if (file !== DIST && !file.startsWith(DIST + sep)) { res.writeHead(403, { 'content-type': 'text/plain' }); res.end('outside dist'); return; }
  let buf;
  try { buf = readFileSync(file); } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
  served.hit.add(p);
  if (/\.(m?js)$/i.test(p)) served.js.add(p);
  res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(buf);
});

await new Promise(res => {
  server.once('error', e => die(`静态服务起不来（port=${PORT || '随机'}：${e.code || e.message}）`, '  端口被占别安慰自己"那就跳过浏览器"——那是同一件事：判据没跑'));
  server.listen(PORT, '127.0.0.1', () => res());
});
const BASE = `http://127.0.0.1:${server.address().port}`;

/* 服务自检：先由 Node 自己取一次首页，确认"喂进去的确实是 dist 里的产物"，再让浏览器上场。
   这一步死＝服务侧死；后面 dump 死＝浏览器侧死。两种报错不能长得一样。 */
const self = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(8000) }).then(r => r.text().then(t => ({ ok: r.ok, status: r.status, head: t.slice(0, 200) }))).catch(e => ({ err: e.message }));
if (self.err) die(`自己连自己都连不上（${BASE}/ → ${self.err}）`, '  回环被本机防火墙/代理挡住时就这么死：服务侧死，不是浏览器侧');
if (!self.ok || !/<html/i.test(self.head || '')) die(`${BASE}/ 回的是 ${self.status}，里面没有 <html`, '  说明 dist 首页没被正确喂出去，浏览器再怎么跑也断言不到东西');

/* ---------- 5. 起浏览器取 DOM（异步！见文件头"踩过的坑"）---------- */
const FLAGS = tag => [
  '--headless=new', `--user-data-dir=${tag}`, '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking',
  '--disable-sync', '--virtual-time-budget=6000', '--dump-dom',
];
const EDGE_HOME = dirname(EDGE);
let launched = 0;

function dumpDom(url, profile) {
  launched++;
  return new Promise(res => {
    let child;
    try { child = spawn(EDGE, [...FLAGS(profile), url], { cwd: EDGE_HOME, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { return res({ fail: `spawn ${EDGE} 抛了：${e.message}` }); }
    const chunks = [];
    let size = 0, overflow = false, stderr = '', killed = false, done = false;
    child.stdout.on('data', d => { size += d.length; if (size <= MAX_DUMP) chunks.push(d); else overflow = true; });
    child.stderr.on('data', d => { stderr = (stderr + d.toString('utf8')).slice(-4000); });
    child.on('error', e => { if (!done) { done = true; res({ fail: `spawn ${EDGE}：${e.code || e.message}` }); } });
    const timer = setTimeout(() => { killed = true; try { child.kill(); } catch { /* 已经退了 */ } }, LAUNCH_TIMEOUT);
    child.on('close', (code, signal) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const stdout = Buffer.concat(chunks).toString('utf8');
      if (overflow) return res({ fail: `dump 超过 ${MAX_DUMP / 1048576}MB，判定为异常产物`, code });
      if (killed) return res({ fail: `跑了 ${LAUNCH_TIMEOUT / 1000}s 还没退出就被杀了（signal=${signal}）—— 多半是页面在等一个永远不来的响应`, code });
      res({ stdout, stderr, code, signal });
    });
  });
}

/* 只取文档那一个 <html> 标签：head 里的规范注释里就写过 `<html data-theme>`，整篇 grep 会认错。 */
function parseHtmlAttrs(html) {
  const headAt = html.search(/<head[\s>]/i);
  const region = headAt > 0 ? html.slice(0, headAt) : html.slice(0, 4000);
  const m = /<html\b([^>]*)>/i.exec(region);
  if (!m) return null;
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+)))?/g;
  let a;
  while ((a = re.exec(m[1]))) attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? '';
  return attrs;
}

const listAttrs = attrs => KEYS.map(k => `${k}=${attrs && k in attrs ? JSON.stringify(attrs[k]) : '∅'}`).join('  ');

function assertPage(label, url, r) {
  if (r.fail) die(`${label} ${url}：浏览器这一跑没交付 DOM（${r.fail}）`, '  "拿不到"从来不算通过：这就是防空转要求的那条');
  const stdout = r.stdout || '';
  if (!stdout.trim()) die(`${label} ${url}：--dump-dom 输出为空（exit=${r.code}）\n    stderr: ${tail(r.stderr)}`, '  空 dump 是典型的"长得像跑过"，必须红');
  if (!/<html/i.test(stdout)) die(`${label} ${url}：dump 里没有 <html>，拿到的不是渲染后的文档（exit=${r.code}）\n    开头: ${tail(stdout, 160)}`, '  同样算红：没走到断言环节');
  const attrs = parseHtmlAttrs(stdout);
  /* Edge 偶尔在交付了完整 DOM 之后带个非零退出码（导入器/崩溃上报那类杂音），那不该改判定；
     但要留在输出里可对账——别把"退出码不为 0"和"没拿到 DOM"混成一件事，也别反过来把它们都咽掉。 */
  if (r.code !== 0) notes.push(`${label} ${url} 浏览器退出码=${r.code}（DOM 已交付，不参与判定）`);
  if (!attrs) { problems.push(`${label} ${url}：dump 有 <html，但没解析出文档自己的 <html> 标签（属性读不到＝断言没跑）`); return null; }
  const missing = KEYS.filter(k => !(k in attrs) || attrs[k] === '');
  const illegal = REQUIRED.filter(([k, set]) => k in attrs && attrs[k] !== '' && !set.includes(attrs[k])).map(([k, set]) => `${k}=${JSON.stringify(attrs[k])}（合法集合 ${set.join('/')}）`);
  const line = listAttrs(attrs);
  if (missing.length) {
    problems.push(`${label} ${url}：少 ${missing.join('、')} —— 写这些属性的是 Layout.astro:106-119 那唯一一段 <script is:inline>（全文件另一处 is:inline 在 :91-93，是 speculationrules，不写属性）；属性不在＝那段没执行（语法合法也可能整段被丢弃，见规范 §16）`);
    console.log(`  ${label} ${url}\n      ${line}`);
  } else if (illegal.length) {
    problems.push(`${label} ${url}：取值非法 ${illegal.join('、')}`);
    console.log(`  ${label} ${url}\n      ${line}`);
  } else {
    console.log(`  ${label} ${url}\n      ${line}  ✓`);
  }
  return { attrs, stdout };
}
const tail = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(-n);

/* ---------- 6. 两档按阶段跑（这个顺序是设计，不是随手写的）---------- */
/* ⚠️ "拦 .js"是**服务端全局开关**，两档并发跑会互相污染：隔离档开着开关时，完整档的模块脚本也被一起 404，
   见证物读不到、两档退化成同一档——看着两条断言都绿，其实第二条从没验过打包脚本在不在跑。
   所以分阶段：先整批隔离档（这一阶段全站不响应 .js），再整批完整档（全站正常响应）。
   同一阶段内并发是安全的：每个槽位一套自己的一次性 profile，不抢 user-data-dir 的锁。 */
console.log(`  产物  ${DIST} —— ${PAGES.length} 份 HTML × 2 档 = ${PAGES.length * 2} 次浏览器`);
console.log(`  浏览器 ${EDGE}`);
console.log(`  服务  ${BASE}（一次性 profile ${JOBS * 2} 枚，跑完删）`);
console.log('');

const tally = { isolate: 0, full: 0 };
const witness = [];

/* 见证物用 `#clock` 的文本，不用单选钮的 checked —— ⚠️ 这里踩过一次：
   src/scripts/site.js:52 `paintSettings()` 里写的是 `i.checked = ...`，改的是 **IDL property**，不回写内容属性，
   `outerHTML` 里一个 `checked` 都不出现（实测：模块脚本确实跑了，dump 里 checked 仍是 0 枚）。
   拿 property 当判据＝一条永远断言不到的判据。而 `#clock` 在静态产物里恒为 `--:--`，
   只有 site.js 的 `tick()` 会把它写成 `HH:MM`；`tick()` 在源码里排在 `paintSettings()`（第 52 行）之后，
   所以"时钟走动了"同时证明"dataset 被 site.js 重写过"——这正是两档必须分开跑的理由。 */
function clockOf(html) {
  const m = /id="clock"[^>]*>([^<]*)</i.exec(html || '');
  return m ? m[1].trim() : null;
}

/* ---------- 目录 ⇄ 刻度：同一批标题的两个投影（`card/detail` 落下的格，`card/anchors` 换了归属） ----------
   ⚠️ **这一格的期望数在 `card/anchors` 之后真的变了**，而且是这卡的价值所在：
   原先那两排节点由 `site.js` 的 `buildToc()` 与 `markEls = headsOf().map(造 span)` 生成 ⇒
   隔离档（.js 全 404）里必须是 0 条 / 0 枚，那枚 0 当时是"静态产物里没有目录"的见证物。
   今天节点是构建期烘进 HTML 的（`[slug].astro` 吃 `renderArticle` 的章清单），脚本只剩高亮与几何 ⇒
   **两档读数必须相同、且都等于源码标题总数**。于是这一格反过来还多拦一件事：完整档里若读到 2N 枚，
   就是脚本仍在往已经存在的目录里追加节点（重复的章、重复的死锚点）。
   复制钮那一族不变：它仍是脚本挂上去的，隔离档里必须 0 枚——那一枚 0 现在才是"这一档真把 .js 拦住了"
   的唯一 DOM 见证物（`#clock` 是另一枚）。
   ⚠️ 口径与 1d 那一格同源，但对象是**运行时 DOM**：1d 判"盘上的字节对不对"，这一格判"脚本有没有把
   对的东西改坏"。两格不互相担保（⑤ 红的时候 1d 可以绿，反之亦然）。 */
function headNodes(html) {
  /* ⚠️ 目录与刻度这两枚数**不再在这里各数一遍**：直接吃 1d 那三枚收集器（`tocHrefsOf` / `markSpansOf`）。
     原先这里自己写着 `/<a\b/g` 与 `/<span\b/g`，与 1d 的"按 href／按 id 取值"是两把尺子——
     同一件事两处各数迟早分叉（本仓为 `HEAD_SEL` 那枚字面量写三遍记过同一笔账，§15）。
     现在产物级与运行期级读的是同一定义，只是对象不同：1d 读盘上的字节，这里读 dump 里的 DOM。 */
  const toc = tocHrefsOf(html || '');
  const marks = markSpansOf(html || '');
  return {
    toc: toc ? toc.length : null,
    marks,
    /* 复制钮那一族：外壳是渲染器发的静态形状，钮是 site.js 挂上去的——两枚数在完整档里必须相等，
       在隔离档里钮必须是 0（"没 JS 就没有钮"）。只数带 data-lang 的外壳：那是挂点的定义域。 */
    blocks: (html || '').match(/class="codeblock" data-lang=/g)?.length ?? 0,
    copies: (html || '').match(/class="post-act code-copy"/g)?.length ?? 0,
  };
}
let headAsserted = 0, headNonZero = 0, blockSeen = 0;      // 跑了多少页 / 其中标题总数非零的有几页 / 围栏总数 ⇒ 防空转
function assertHeads(label, url, stdout, kind) {
  const m = /^\/essays\/([a-z0-9-]+)\/$/.exec(url);
  if (!m) return;
  const want = HEADS.get(m[1]);
  if (!want) { problems.push(`${label} ${url}：这一页看着是详情页，却不在可见稿件清单里 ⇒ 目录⇄刻度读不到它的期望值（不许当成"零枚标题"放过）`); return; }
  const got = headNodes(stdout);
  if (got.toc === null || got.marks === null) { problems.push(`${label} ${url}：dump 里找不到 #toc 或 #progress-marks 那一枚宿主 ⇒ 这一格没有对象（"读不到"从来不算过）`); return; }
  headAsserted++;
  blockSeen += kind === 'full' ? got.blocks : 0;
  if (kind === 'isolate') {
    /* `card/anchors` 之后这一档的预期从"必须 0"翻成"必须等于源码总数"：节点已在构建期的 HTML 里。
       翻回 0 判据也不亏——它现在拦的是"目录又被挪回运行期"这一族倒退（§19.3 那格同族陷阱）。 */
    if (got.toc !== want.total || got.marks !== want.total) problems.push(`[内联隔离档] ${url}：无 JS 这一档读到目录 ${got.toc} 条 / 刻度 ${got.marks} 枚，源码是 ${want.total} 枚标题 ⇒ 那两排节点又不在这份 HTML 里了（目录与刻度必须由构建期烘出来：无 JS 的访客、深链、打印都读得到同一批章）`);
    else if (got.copies) problems.push(`[内联隔离档] ${url}：读到 ${got.copies} 枚代码块复制钮 ⇒ .js 其实跑了（隔离档里那枚钮一枚都不该在）`);
    else notes.push(`目录⇄刻度（隔离档）${url}：${got.toc} 条 / ${got.marks} 枚 ＝ 源码 ${want.total} 枚标题 ✓（无 JS 也在场，这是 card/anchors 要的读数）；复制钮 0 枚 ✓ —— 那一枚仍由脚本挂`);
    return;
  }
  if (got.copies !== got.blocks) problems.push(`[完整档] ${url}：带 data-lang 的代码块 ${got.blocks} 枚、复制钮却只有 ${got.copies} 枚 ⇒ 复制钮没挂上（或挂错了定义域：挂点是 .codeblock[data-lang] 那一行标签）`);
  if (want.total > 0) headNonZero++;
  if (got.toc === want.total * 2 && got.toc > 0) problems.push(`[完整档] ${url}：目录读到 ${got.toc} 条 ＝ 源码 ${want.total} 枚的两倍 ⇒ 脚本还在往构建期已经存在的目录里追加节点（旧 buildToc 那一种形状）：章名重复上屏，而且两枚 href 指着同一批 id`);
  else if (got.toc !== want.total) problems.push(`[完整档] ${url}：目录 ${got.toc} 条，而源码是 ${want.h2} 枚 H2 ＋ ${want.h3} 枚 H3 ＝ ${want.total} 枚标题 ⇒ 完整档比隔离档少/多，问题在脚本改了那批节点（构建期烘出来的那一排应当两档同值）`);
  else if (got.marks !== got.toc) problems.push(`[完整档] ${url}：刻度 ${got.marks} 枚 ≠ 目录 ${got.toc} 条 ⇒ 两把尺子分叉了：同一枚选择器只改了一处（目录与刻度必须吃同一个 HEAD_SEL，这是规范禁的那个形状）`);
  else if (got.marks !== want.total) problems.push(`[完整档] ${url}：目录与刻度各 ${got.toc} 枚，源码却是 ${want.total} 枚标题 ⇒ 两边一起漏，问题在 HEAD_SEL 或标题本身没进正文`);
  else notes.push(`目录⇄刻度 ${url}：${got.toc} 条 ⇄ ${got.marks} 枚 ＝ 源 ${want.h2} 枚 H2 + ${want.h3} 枚 H3（同一批标题的两个投影）✓${got.blocks ? `；代码块 ${got.blocks} 枚、复制钮 ${got.copies} 枚 ✓` : ''}`);
}

async function runPhase(kind, profiles) {
  const isIso = kind === 'isolate';
  isolatePass = isIso;
  const w = phaseWitness();                 /* 对账的参照：本机器钟表下的月份表预测，每档算一次 */
  if (isIso) notes.push(`内联隔离档不判 data-phase：那枚是静态 HTML 里的 ${JSON.stringify('day')}，写它的是打包脚本不是内联脚本（只报实测值）`);
  const q = PAGES.map(page => ({ page }));
  await Promise.all(profiles.map(profile => (async () => {
    for (;;) {
      const job = q.shift();
      if (!job) return;
      const r = await dumpDom(BASE + job.page.url, profile);
      if (isIso) {
        const got = assertPage('[内联隔离档]', job.page.url, r);
        tally.isolate++;
        if (got) {
          const c = clockOf(got.stdout);
          witness.push(`隔离档 ${job.page.url} 时钟=${JSON.stringify(c)}`);
          notes.push(`隔离档 ${job.page.url} data-phase=${JSON.stringify(got.attrs['data-phase'])}（这一档 .js 全被 404，只可能读到静态那一枚）`);
          assertHeads('[内联隔离档]', job.page.url, got.stdout, 'isolate');
          if (c && /\d{1,2}:\d{2}/.test(c)) problems.push(`内联隔离档 ${job.page.url}：#clock 是 ${JSON.stringify(c)} ⇒ 模块脚本压根没被拦住，这一档其实跑在完整环境里（判据空转：五枚属性可能来自 site.js 而不是内联脚本）`);
        }
      } else {
        const got = assertPage('[完整档]', job.page.url, r);
        tally.full++;
        if (got) {
          const c = clockOf(got.stdout);
          witness.push(`完整档 ${job.page.url} 时钟=${JSON.stringify(c)}`);
          if (!c || !/\d{1,2}:\d{2}/.test(c)) problems.push(`完整档 ${job.page.url}：#clock 还是 ${JSON.stringify(c)} ⇒ site.js 没跑（资源没喂到 / MIME 不对 / 模块脚本自己炸了），这一档和隔离档没区别（判据空转）`);
          assertPhase('[完整档]', job.page.url, got.attrs, w);
          assertHeads('[完整档]', job.page.url, got.stdout, 'full');
          const rv = 'data-revisit' in got.attrs ? got.attrs['data-revisit'] : null;
          notes.push(`${job.page.url} data-revisit=${rv === null ? '未写' : JSON.stringify(rv)}（只报不判，理由见文件头"故意没做"①）`);
        }
      }
    }
  })()));
  isolatePass = false;
  if (isIso && !served.blocked.size) problems.push('内联隔离档整批跑完，服务一个 .js 都没拦住 ⇒ 这一档其实跑在完整环境里，判据空转（五枚属性可能来自 site.js 而不是内联脚本）');
}

/* 每槽位一枚一次性 profile：N 个并发浏览器不能共用 user-data-dir（会互相抢锁） */
if (STATIC_ONLY) {
  console.log('\n  ⚠️ --static-only：**浏览器两档一次都没跑**（内联隔离档 / 完整档 / 五枚属性 / 运行时 DOM 那一格目录⇄刻度 / phase 对账全部未断言）。');
  console.log('     这一行不是绿，是一次部分交付——只有不碰浏览器的三段（1b 结构对账、1c 不列入、1d 死锚点两侧对账）跑完了。');
  console.log('     日常门禁 `npm run gate` 不带这一枚开关；它存在的理由见上面定义处那条环境记录。');
} else {
  await runPhase('isolate', Array.from({ length: JOBS }, (_, i) => newProfile(`iso${i}`)));
  await runPhase('full', Array.from({ length: JOBS }, (_, i) => newProfile(`full${i}`)));

  if (!tally.isolate || !tally.full) die(`断言份数不正常：隔离档 ${tally.isolate}、完整档 ${tally.full}（0 份＝没进过闸）`);
  /* 目录⇄刻度那一格的防空转（本节开头那条老判据：跑了但一页都没读 ≠ 读过且全过）：
     一份详情页都没进这一格 ⇒ 红；进了而**每一篇的标题总数都是 0** ⇒ 也红（两侧都是零的相等没有信息量）。 */
  if (!headAsserted) problems.push(`目录⇄刻度这一格一个断言都没跑（详情页一份都没读到 #toc / #progress-marks）⇒ 判据空转，不许算过`);
  else if (!headNonZero) problems.push(`目录⇄刻度跑了 ${headAsserted} 页，而每页的标题总数都是 0 ⇒ 相等是相等，判据什么也没看见（三篇稿子一枚标题都没有？去看 src/content/posts/）`);
  else console.log(`  目录⇄刻度：${headAsserted} 页读进这一格，其中 ${headNonZero} 页的标题总数非零（防空转：两侧都为零的相等不算看见）`);
  if (headAsserted && !blockSeen) notes.push('代码块复制钮：完整档里全站 0 枚带 data-lang 的围栏 ⇒ 这一格今天没有对象（读得到形状、判据仍然算跑过——口径照上面"草稿对账"那一格）');
  console.log(`\n  断言份数：内联隔离档 ${tally.isolate} / 完整档 ${tally.full}，浏览器共启动 ${launched} 次`);
  console.log(`  见证物 #clock 文本：${witness.join('，')}`);
  console.log(`  隔离档里被拦下的 .js：${served.blocked.size} 种（这一档靠它保证"五枚属性只剩内联脚本一个写者"）`);
  console.log(`  完整档里真正送出去的 .js：${served.js.size} 种（对账用：0 种就说明资源根本没喂到，见证物必然也是红的）`);
}
if (notes.length) { console.log('  顺带读到的（不参与判定）：'); for (const n of notes) console.log(`    ${n}`); }

/* ---------- 7. SITE 占位域名：默认警告 + exit 0，--strict-site 才红 ---------- */
const PLACEHOLDER = /(^|\.)(example\.com|example\.net|example\.org|example|test|invalid|localhost)$/i;
const hostHits = new Map();
const countHosts = txt => {
  /* ⚠️ 别把定界符写死成 ["'\\s<]：og:url 的值是 `https://mistwood.example.com/`，主机名后面跟的是斜杠，
     第一版那么写 ⇒ 占位域名一处都没匹配上，反而打印"SITE 看着是真域名"（防空转要求的那种假绿）。
     所以按"取 // 之后到下一个分隔符之前"的口径抓，再剥掉端口和用户信息。 */
  for (const m of txt.matchAll(/https?:\/\/([^/"'()\s<>,;]+)/gi)) {
    const host = m[1].split('@').pop().split(':')[0].toLowerCase();
    if (!host || /(?:^|\.)(?:w3\.org|schema\.org)$/i.test(host)) continue;
    hostHits.set(host, (hostHits.get(host) || 0) + 1);
  }
};
/* 普查窗口＝dist/ 里**全部文本产物**。改前这里是三枚硬编码文件名（rss.xml / sitemap-0.xml /
   sitemap-index.xml）+ 所有 HTML ⇒ atom.xml（9 处）与 robots.txt（1 处）从来没进过窗，
   打印的处数比逐份 grep 少 10 枚（2026-09-29 实测：打印 159、全量 169）。
   ⚠️ 这一格修的是**普查口径与枚数**，不是"漏了占位域名"：占位域名在 HTML 里必然出现，改前改后警告照样响。
   判"文本"用内容不用扩展名，也不用名单：读整枚文件，撞见 NUL 字节就当二进制跳过（png / jpg / woff2 全是）。
   这样 build 将来多产一种文本产物（新的 feed、新的 manifest）自动进窗——口径一旦写死在名单上，
   它就只是"上一轮数出来的那份名单"，下一轮必须有人追认才会变宽，而没人追认时它悄悄窄着。 */
const textArtifacts = [];
(function walkText(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { walkText(p); continue; }
    let buf;
    try { buf = readFileSync(p); }
    catch (e) { problems.push(`SITE 普查窗口读不开 ${p}（${e.message}）⇒ 打印的处数不再等于全量，这一格的口径不完整`); continue; }
    if (buf.includes(0)) continue;
    textArtifacts.push({ file: p, txt: buf.toString('utf8') });
  }
})(DIST);
if (!textArtifacts.length) problems.push(`SITE 普查窗口在 ${DIST} 里一枚文本产物都没找到 ⇒ 这一格根本没吃到东西，不许算"读过且没有占位"`);
for (const t of textArtifacts) countHosts(t.txt);

/* ⚠️ 名单的角色换了：它不再决定窗口（窗口照上面走盘），只断言"这些产物必须在盘上"。
   原来那句 `if (existsSync(path)) countHosts(...)` 是"缺文件就静默跳过"——本仓在 `dist/dist/...`
   那一次栽的就是同一形状（规范 §16 登记的空转判据）：文件不在 ⇒ 少读几枚 ⇒ 数字变小而一声不吭。
   现在少一枚是一条具名的红。名单本身按"谁在写绝对地址"取：两枚 feed、两枚 sitemap、robots.txt、search.json、
   llms.txt（`card/llms` 起这份写给抓取器读的站内地图整页都是绝对地址，它不在名单里就等于"少了它也照样打印全量"）。 */
const EXPECTED_TEXT = ['rss.xml', 'atom.xml', 'sitemap-index.xml', 'sitemap-0.xml', 'robots.txt', 'search.json', 'llms.txt'];
const seenText = new Set(textArtifacts.map(t => t.file.slice(DIST.length + 1).split('\\').join('/').toLowerCase()));
for (const f of EXPECTED_TEXT) {
  if (!seenText.has(f.toLowerCase())) problems.push(`SITE 普查窗口里少了名单点名的 ${f}（dist/${f} 不在盘上，或不再是文本产物）⇒ 打印的处数不是全量，这一格在空转`);
}
const hosts = [...hostHits.entries()];
if (!hosts.length) {
  console.log(`\n  ⚠️ 产物里一个绝对地址都没读到（og:url / rss / sitemap 全空？）——SITE 这条判据没吃到东西，去看产物（窗口读了 ${textArtifacts.length} 枚文本产物）`);
} else {
  const ph = hosts.filter(([h]) => PLACEHOLDER.test(h));
  if (ph.length) {
    const msg = `SITE 还是占位域名：${ph.map(([h, n]) => `${h}（产物里 ${n} 处）`).join('、')} —— 它决定 rss.xml / sitemap / og:url 的绝对地址，上线前必改（§16）。普查窗口＝${DIST} 里全部文本产物 ${textArtifacts.length} 枚（其中 HTML ${PAGES.length} 份）`;
    if (STRICT_SITE) problems.push(msg + '（--strict-site）');
    else console.log(`\n  ⚠️ ${msg}\n    默认只警告不红；要拦发布那一次就传 --strict-site。（恒红会让人绕着门禁走，那比没门禁更糟）`);
  } else {
    console.log(`\n  SITE 看着是真域名：${hosts.map(([h]) => h).join(' / ')}`);
  }
}

/* ---------- 8. 收干净 ---------- */
server.close();
cleanupProfiles();

/* ---------- 9. 结论 ---------- */
if (problems.length) {
  console.log(`\n✗ runtime-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  if (problems.some(p => p.startsWith('[内联隔离档]') || p.startsWith('[完整档]') || p.includes('判据空转'))) {
    console.log('\n  这一条抓的是"语法合法但整段不执行"：build 与 check 三类都拦不住它（规范 §16）。');
  }
  process.exit(1);
}
console.log(STATIC_ONLY
  ? `\n✓ 不碰浏览器的那三段跑完且全过（1b 结构／1c 不列入／1d 死锚点）。⚠️ 运行时五枚属性与两档 DOM **本轮没有断言**——这一行不等于"gate 过了"。`
  : `\n✓ 运行时五枚属性全部落地：${KEYS.join(' / ')}（内联脚本在跑，打包脚本也在跑）`);
process.exit(0);
