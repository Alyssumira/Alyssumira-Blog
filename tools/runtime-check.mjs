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
   第一版只跑"完整档"，看着全绿，其实是**假门禁**：`src/scripts/site.js:37` 把 dataset 当唯一真相源读回来
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
   词汇表三处对齐：`src/scripts/site.js:37` 的 `disp` 对象（同样四个默认值）、`Layout.astro` 里那排
   `<input type=radio>` 的 value（fog：thin/normal/thick，grain：on/off，fireflies：on/off，enter：auto/full）、
   `src/styles/mistwood.css:223-225` 真正生效的 `html[data-fog="thin"]` / `[data-fog="thick"]` / `[data-grain="off"]`
   （normal 与 on 是 CSS 默认分支所以不出现，但仍是合法值）。theme 的 light/dark 见 `home.css`/`mistwood.css` 的
   `html[data-theme="dark"]` 与静态 `<html data-theme="light">`。
   空串与集合外的值一律算红——"属性在但值是垃圾"和"属性不在"是同一件事。

   ── 防空转（规范 §16 那条"检查静默空转、退出码 0，长得像全绿"教的）──────────────
   每一处"拿不到"都是 exit 1，并点名是哪一步死的：没有 dist / dist 里没有 HTML / 找不到 msedge /
   临时 profile 建不出来或不可写 / 服务 listen 失败 / Node 自己都连不上 / dump 为空 / dump 里没有 `<html` /
   解析不出文档标签 / 浏览器 spawn 报错或超时 / 断言份数为 0。
   每页**打印实际读到的五枚属性清单**（缺的显示 ∅），不只打印 ✓。

   ── 故意没做的三条（报告里登记为"未验到"，不假装它们在里面）───────────────────
   ① `data-revisit`：只在 `sessionStorage.getItem('mistwood-seen')` 已存在时才写（Layout.astro:65），
      而 sessionStorage 是标签页级的 ⇒ 要同一浏览器**进程内两次导航**。`--dump-dom` 只有一次导航，
      给不出真判据；写一条永远断言不到的判据就是造假门禁。所以只**打印**、不判定。
   ② 暗色下 `meta[name="theme-color"]` 改成 #0E130D（Layout.astro:57）：这版 Edge 不认
      `--force-prefers-color-scheme`（§16 ②），暗色只能靠 profile 预置 `localStorage.mistwood-theme=dark`，
      上一轮的做法是往 `dist/` 写一枚一次性种子页——门禁不该往构建产物里写文件（那会让 dist 的内容
      取决于门禁跑没跑过）。要做得先验证"预置 profile 可复跑"，本轮没验 ⇒ 不进自动化。
   ③ `SITE` 占位域名：默认**警告 + exit 0**，只有 `--strict-site` 才红。理由：现在恒红会让这枚门禁
      一进门就挡掉所有工作，而逼人绕过门禁比没有门禁更糟。判法从**产物**里读绝对地址（og:url / rss /
      sitemap），不正则去抠 astro.config.mjs 的写法——配置将来改成 `process.env.SITE ?? '…'` 也不会瞎。
      一个绝对地址都读不到会打印一条"判据没吃到东西"的提示，不静默。

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
import { isDraft, sortPosts, categoryOf, tagGroups, bySize, groupBy } from '../src/lib/taxonomy.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- 参数 ---------- */
const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const opt = n => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };

const DIST = resolve(opt('dist') || join(ROOT, 'dist'));
const PORT = opt('port') ? Number(opt('port')) : 0;
const JOBS = Math.max(1, Number(opt('jobs') || 4));
const STRICT_SITE = flag('--strict-site');
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
   而 data-phase 的写者是打包脚本（首帧那枚 day 是静态 HTML 里的，见 Layout.astro:21），
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
   ⚠️ 产物侧要摘掉脚注那枚标题：footnotes() 发的是 '<h2 class="fn-title">注</h2>'（markdown.js:85），
   今天三篇都没写脚注所以朴素计数恰好相等——但有人加一枚 [^1] 的那天，不摘的尺子就会假红。

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
   `src/layouts/Layout.astro:44` 那段规范链接的注释里原话写着"同一篇稿子的 /essays/foo 与 /essays/foo/
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
  corpus.push({ id: slug, body: raw, data: { category: tax.category, tags: tax.tags, draft: tax.draft, pinned: tax.pinned, date: new Date(parsed.fm.date) } });
}
const visible = sortPosts(corpus.filter(p => !isDraft(p)));
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
for (const p of visible) {
  const out = join(DIST, 'essays', p.id, 'index.html');
  if (!existsSync(out)) { problems.push(`${p.id}：源码有稿而 dist/essays/${p.id}/index.html 不在 ⇒ 这一页根本没构建出来，结构对账无从谈起`); continue; }
  const want = (p.body.match(/^## /gm) || []).length;
  const got = (readFileSync(out, 'utf8').match(/<h2\b[^>]*>/g) || []).filter(t => !/fn-title/.test(t)).length;
  if (got !== want) problems.push(`${p.id}：源码有 ${want} 枚行首 "## "，产物里只有 ${got} 个 <h2> ⇒ 块级结构在渲染器里塌了（切块口径见 markdown.js:121；成段塌成一枚 <p> 是最常见的形状）`);
  else notes.push(`结构对账 ${p.id}：源 ${want} 枚 "## " ＝ 产物 ${got} 个 <h2> ✓（fn-title 那枚已摘除；全绿时也要看得见这两枚数，否则"没匹配到"与"全过"长得一样）`);
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
    problems.push(`${label} ${url}：少 ${missing.join('、')} —— 写这些属性的是 Layout.astro:56-68 的 <script is:inline>；属性不在＝那段没执行（语法合法也可能整段被丢弃，见规范 §16）`);
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
   site.js:44 写的是 `i.checked = ...`，改的是 **IDL property**，不回写内容属性，
   `outerHTML` 里一个 `checked` 都不出现（实测：模块脚本确实跑了，dump 里 checked 仍是 0 枚）。
   拿 property 当判据＝一条永远断言不到的判据。而 `#clock` 在静态产物里恒为 `--:--`，
   只有 site.js 的 `tick()` 会把它写成 `HH:MM`；`tick()` 在源码里排在 `paintSettings()`（第 52 行）之后，
   所以"时钟走动了"同时证明"dataset 被 site.js 重写过"——这正是两档必须分开跑的理由。 */
function clockOf(html) {
  const m = /id="clock"[^>]*>([^<]*)</i.exec(html || '');
  return m ? m[1].trim() : null;
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
await runPhase('isolate', Array.from({ length: JOBS }, (_, i) => newProfile(`iso${i}`)));
await runPhase('full', Array.from({ length: JOBS }, (_, i) => newProfile(`full${i}`)));

if (!tally.isolate || !tally.full) die(`断言份数不正常：隔离档 ${tally.isolate}、完整档 ${tally.full}（0 份＝没进过闸）`);
console.log(`\n  断言份数：内联隔离档 ${tally.isolate} / 完整档 ${tally.full}，浏览器共启动 ${launched} 次`);
console.log(`  见证物 #clock 文本：${witness.join('，')}`);
console.log(`  隔离档里被拦下的 .js：${served.blocked.size} 种（这一档靠它保证"五枚属性只剩内联脚本一个写者"）`);
console.log(`  完整档里真正送出去的 .js：${served.js.size} 种（对账用：0 种就说明资源根本没喂到，见证物必然也是红的）`);
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
for (const p of PAGES) countHosts(readFileSync(p.file, 'utf8'));
for (const f of ['rss.xml', 'sitemap-0.xml', 'sitemap-index.xml']) {
  const path = join(DIST, f);
  if (existsSync(path)) countHosts(readFileSync(path, 'utf8'));
}
const hosts = [...hostHits.entries()];
if (!hosts.length) {
  console.log('\n  ⚠️ 产物里一个绝对地址都没读到（og:url / rss / sitemap 全空？）——SITE 这条判据没吃到东西，去看产物');
} else {
  const ph = hosts.filter(([h]) => PLACEHOLDER.test(h));
  if (ph.length) {
    const msg = `SITE 还是占位域名：${ph.map(([h, n]) => `${h}（产物里 ${n} 处）`).join('、')} —— 它决定 rss.xml / sitemap / og:url 的绝对地址，上线前必改（§16）`;
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
console.log(`\n✓ 运行时五枚属性全部落地：${KEYS.join(' / ')}（内联脚本在跑，打包脚本也在跑）`);
process.exit(0);
