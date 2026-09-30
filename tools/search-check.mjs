/* search-check.mjs —— 站内搜索那一格的行为门禁（第十一轮 `card/search`；`npm run gate` 里 build **之后**的第一项）
   用法  npm run build && node tools/search-check.mjs
         node tools/search-check.mjs --dist=<目录>   （换产物目录；指向空目录 ⇒ 红）
         node tools/search-check.mjs --edge=<路径>   （换浏览器可执行文件；找不到 ⇒ 红，不降级不跳过）
         node tools/search-check.mjs --only=node     （只跑不碰浏览器的那四格 ①②③④）
         node tools/search-check.mjs --only=browser  （只跑浏览器那三格 ⑤⑥⑦）
         node tools/search-check.mjs --widths=300,320,340,360,720,1440   （逐档视口；少于三档 ⇒ 红）
         node tools/search-check.mjs --pages=/,/essays/,/categories/     （逐档跑哪几页；少于两页 ⇒ 红）
   ⚠️ **宿主那一格（第十一轮末，读代码之前先读这一段）**：入口不在导航胶囊里，在**内容页扉页那一行**
      （六份子页的 `.sec-label` 行 + 首页 `.hero-log` 那一行，组件是 `src/components/SearchEntry.astro`）。
      所以第 ⑦ 格现在同时判两件事，缺一件就是这一卡没跑：
        · **撤干净了没有**——`.nav-links` 里不许有 `.search`，直接子节点必须回到**七枚**
          （5 链接 + 滑杆 + 主题），胶囊那两枚内边距差回到 §11 签署的对称读数，出盒破口点回到 303.48。
          这一格逐档打印 `.nav-links` 宽 / 胶囊需要量 / `scrollWidth == innerWidth`，
          就是 §11 那一整行的口径；读数与 main 逐位不同 ⇒ 那枚按钮没摘干净或胶囊被动过。
        · **新宿主装得下没有**——入口那一行在窄屏不许从 `.wrap` 的内容盒里溢出去（nowrap 那一行
          溢出之后是被 `body{overflow-x:hidden}` 裁掉的，裁掉的就是入口本身 ⇒ 比"出玻璃"更坏：点不到），
          面板逐档必须在视口之内，且首页那一档必须**朝上开**（那行字在首屏底部，朝下就掉出那一屏）。
   ⚠️ **它读 dist/ 还起真浏览器，所以它不在 `npm run check` 里，在 `gate` 里 build 之后**（2026-09-29 合并时裁的）。
      这一格第十一轮末曾被挂到 `check` 的末项，那与 §16 早先为 `runtime-check` 签过的口径打架——"第四类（运行时 DOM）
      **不能**整个塞进 `check`：它在 build 之前跑，干净检出上会因为'没有产物'直接红——分层理由是依赖方向，不是口味"。
      挪到 build 之后**一格判据都没少**：那两种坏法（"索引在、但是空的""正文来源被摘掉"）本来就只有产物里才存在，
      而在源码级那六关里它们原理上就抓不到 ⇒ 少的是"没 build 就红"这一枚假红，不是牙。

   ── 为什么要有这一格：搜索坏掉的四种形状，前面那些尺子原理上都看不见 ──────────
     · **索引在、但只有标题（或干脆是空的）** —— `astro build` 绿（端点正常回 200 与合法 JSON）、
       前六关绿（它们不读 dist/）、`runtime-check` 绿（它断言的是 `<html>` 上那五枚属性，
       与索引无关）。只有"真往那枚框里打一遍字"能抓到 ⇒ 第 ③④⑤ 格。
     · **索引悄悄少了一篇 / 草稿进来了 / 索引里的地址跳空** —— 产物里那一页还在、列表里那一行还在，
       只有拿源码数一遍"该有几篇"再对索引的篇数、并逐枚回 dist 里点名那一页才对得出来 ⇒ 第 ② 格。
       判"什么算草稿"吃的是 shipped 的 `isDraft` / `sortPosts`（`src/lib/taxonomy.js`，那份不碰
       astro:content），与 `runtime-check` 同一把尺子，不在这里重猜一遍。
     · **无 JS 时留下一枚点了没反应的字** —— `runtime-check` 的内联隔离档只判五枚属性，
       它不看 `#search` 还在不在 ⇒ 第 ⑥ 格（.js 全 404 那一档读 dump 的 DOM）＋ 第 ⑤ 格里
       Node 直读 `dist/index.html` 字节的那一组静态形状读数。
   ⚠️ 防空转照抄 taxonomy-check / gap-check 的口径：每一格自己上报跑了几条断言，**一格 0 条就算红**，
      最后一枚总闸再判"一条都没跑过"（§14 第 14 格那条"检查静默空转、退出码 0、长得像全绿"）。
      逐格的 `asserted=0` 拦不到"所有格都被 if 跳过"那种整体空转，所以末尾那一枚不能省。
      ⚠️ 探针/语料/页面名单一律不写死（写死的那一枚在"索引压根没建成"的环境里也长绿，白拿）；
      它们全部从盘上现挑、现派生 ⇒ 挑不出对象就**红且点名**，不降级、不跳过。

   ── 命门那一格为什么"命中一篇"不够（第 ④ 格存在的全部理由）──────────────────
   语料里那枚二字窗只落在一篇，于是"命中一篇"既可能是"索引吃到了正文"，也可能是
   "索引只吃了标题、而那枚窗恰好也在标题里"，还可能是"索引里压根没这东西、比对读的是页面上
   另一枚字段"（§12:828 点名的形状）。三种坏法的读数可以完全相同——**单条命中永远只是一次读数，
   不是一张表**。所以第 ④ 格把 shipped 的 `searchDoc()` 一枚函数同时打在**三张索引**上并排出表：
     full  = dist/search.json 那份真产物
     title = 只喂标题 + 摘要切出来的 k
     trunc = 正文截到前 12 字切出来的 k
   三列 × 三枚探针（单篇窗 / 多篇窗 / 反例窗），期望读数是"非零 / 0 / 0"。
   ⚠️ 全部落在**真仓 shipped 索引本身**上，不造合成文档：合成文档没有"真实形状可失配"，
      它只能证明"我造的样例能被我造的比对挑出来"，那正是 §14:1033 / §16:1246 那条病。
      真仓语料不够造出两枚"≥2 篇正文都有、标题摘要都没有"的窗时，这一格报红并点名
      **加一篇 .md 再跑**——加完必须 PASS，这是可复跑的要求，不是待办。
      三张索引与探针全都从 **VISIBLE**（可见那批）派生，不是 CORPUS：草稿本来就不在产物索引里，
      拿含草稿的语料挑探针会让"这一枚只在一篇正文里"判到一篇根本不该被搜到的稿子上。

   ── 浏览器那一侧怎么"真打一遍字"（本机可复跑的那条路）────────────────────────
   `--dump-dom` 一次导航拍完就走，给不了输入；本工具不引任何新依赖，走 `pixel-probe.mjs`
   已经签字的那条路：**自带一枚 node:http 喂 dist/，在服务端内存里往真产物末尾追加一段驱动脚本**，
   仓库与 dist/ 一个字节都不改（§16:1243"门禁不该往构建产物里写文件"）。
   产物 HTML 与驱动脚本**同源同端口**，`#search` / `#search-results` 是 shipped `site.js`
   真长出来的节点，读数取自 shipped 代码真写进去的那块 DOM。
   驱动脚本是 `type="module"` 且追加在 `site.js` 那枚 `<script>` **之后**：内联模块脚本按文档顺序
   执行，于是它跑起来时 `searchWrap.hidden = false` 那一步**已经发生**——所以它读到的
   "有没有 hidden"是 JS 跑完之后的那一面，静态产物那一半改由 Node 直接读 `dist/index.html` 的字节
   （第一版把这两件事记在同一本账上，红了一次，红的是量具自己）。
   ⚠️ 无 JS 档的"拦 .js"是**服务端全局开关**（照抄 runtime-check 的分阶段做法）：那一阶段整批跑，
      两档交错跑会互相污染。
   ⚠️ 三个坑照抄 runtime-check / 本工具实测：① 浏览器必须 `spawn`（异步）——`spawnSync` 冻住事件循环，
      自家服务对第一个请求永远不响应，看着像浏览器坏了；② 一次性 profile 删完要等一会儿再复验；
      ③ `--dump-dom` 把布尔属性序列化成 `hidden=""` 而不是 `hidden`，写死 `hidden>` 的正则
      在这条路线上永远读不到东西（第一版就是这么把第 ⑥ 格判红的）。
   ⚠️ 本机无头环境 `visibilityState=hidden`、CSS 过渡**不走帧**（这一跑读回来是 visible，
      但判据不依赖这件事）：这一格因此只读 `classList`、`getComputedStyle` 的**计算值**与
      `getBoundingClientRect`，并且量 rect 前先 `transition:none`；从不读过渡中间态——
      "读数没变"在这里不等于"功能没跑"。
   ⚠️ 面板与胶囊几何那几档不用 `--window-size` 设视口（本机 Edge 有最小窗宽，实测 320 档回来是 504），
      用的是**同源 iframe**：见下面 FRAME_DRIVER 那段注释。
*/
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

import { splitFm, readTaxonomy } from './frontmatter.mjs';
import { isDraft, isUnlisted, sortPosts } from '../src/lib/taxonomy.js';
import { docTokens, queryTerms, searchDoc, INDEX_VERSION } from '../src/lib/search.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = n => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };
const ONLY = opt('only');
const DIST = resolve(opt('dist') || join(ROOT, 'dist'));
const WIDTHS = (opt('widths') || '300,320,340,360,720,1440').split(',').map(Number).filter(Number);
/* 逐档几何跑哪几页：两枚宿主各一枚是底线（`/` 的 hero-log 与子页的 `.sec-label`），
   `--pages=` 可以加。名单硬写在默认值里 ⇒ 被改空时下面那枚 `PAGES.length >= 2` 会红。 */
const GEOM_PAGES = (opt('pages') || '/,/essays/,/categories/').split(',').filter(Boolean);
const LAUNCH_TIMEOUT = 90_000;
/* 无 JS 档要跑的页：三页共用一份 Layout、宿主两种各占其一，所以"每一页都有这一格"至少要在两页以上拍过才算。
   名单是硬写的 ⇒ 空名单／被改空时下面那枚 `nojs.length >= 2` 会红，不会静默少跑。 */
const PAGES = ['/', '/essays/', '/about/'];

const problems = [];
const notes = [];
let asserted = 0;
function cell(id, label, fn){
  let n = 0, threw = null;
  try { n = fn() || 0; } catch (e){ threw = e; }
  if (threw){ problems.push(`${id} ${label}：${threw.message || threw}`); return; }
  if (!n){ problems.push(`${id} ${label}：asserted=0（这一格一个断言都没跑就交了白卷）`); return; }
  asserted += n;
}
/* ⚠️ 挑探针 / 读语料这类"没有对象就没法判"的关口，一律不许直接把异常抛到进程外：
   §14 第 14 格立的那条规矩是**红要有名字**，而 uncaught throw 交回去的只是一枚退出码
   （这台机器上 Node 的 throw 撞上 libuv 断言还会把 exit 改成 127 ⇒ 连退出码都不是签名）。
   所以这一族改走 hard()：记一条有名有姓的红，剩下的格照常跑完再一起印。 */
function hard(msg){ problems.push(msg); }

/* ==================== 源码侧那批稿子 ====================
   读 .md 原文只为准挑探针词与对账篇数；"哪些篇该进索引"由 shipped 的 isDraft + isUnlisted + sortPosts 判
   （第十五轮 `card/unlisted` 起那一枚 filter 与页面那侧的 `visiblePosts()` 同一条：不列入的一篇不进索引，
   正如它不进列表、不进 feed——这里少滤一道，② 那格的枚数对账就会在探针态上报一条假红）。
   ⚠️ 这一族"没有对象就没法判"的关口一律不 throw 到进程外（见上面 hard() 那段）：
      语料空 / 挑不出探针 ⇒ 记一条有名有姓的红，然后**照常走到打印那一步**。
      `readdirSync(...).filter(...)` 之后拿数组做判据的地方，紧跟着就是一枚"零枚必红"的牙。 */
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const CORPUS = (() => {
  const files = existsSync(POSTS_DIR) ? readdirSync(POSTS_DIR).filter(f => /\.md$/i.test(f)).sort() : [];
  if (!files.length){ hard(`读不到 ${POSTS_DIR} 里任何一篇 .md ⇒ 探针格与篇数格都没对象，判据正在空转`); return []; }
  const out = [];
  for (const f of files){
    const raw = readFileSync(join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const parsed = splitFm(raw);
    if (!(parsed && parsed.fm)){ hard(`${f}：front matter 不成形（new-post.mjs --check 那格本该先拦下）`); continue; }
    const tax = readTaxonomy(parsed.fmText);
    if (tax.errors.length){ hard(`${f}：${tax.errors[0]}`); continue; }
    const slug = f.replace(/\.md$/i, '');
    out.push({
      id: slug, slug,
      data: { draft: tax.draft, pinned: tax.pinned, unlisted: tax.unlisted, date: new Date(parsed.fm.date) },
      title: String(parsed.fm.title == null ? '' : parsed.fm.title),
      head: [parsed.fm.title, parsed.fm.excerpt].map(v => String(v == null ? '' : v)).join(' '),
      body: parsed.body || '',
    });
  }
  if (!out.length) hard('语料清单非空却一篇都没解出来 ⇒ 判据正在空转');
  return out;
})();
const VISIBLE = sortPosts(CORPUS.filter(p => !isDraft(p) && !isUnlisted(p)));
const DRAFTS = CORPUS.filter(p => isDraft(p));
/* 不列入的那几枚（第十五轮）：地址是活的、页面在盘上，但它不许进索引——它进了索引就等于
   搜索框替站内所有页面长出了一枚指向它的结果行，"只有拿到地址的人读得到"当场破。
   名单现算、不写死（今天 0 枚也要有这一枚数可报，见 ② 那句打印）。 */
const UNLISTED = CORPUS.filter(p => !isDraft(p) && isUnlisted(p));

/* 二字滑窗：与 `src/lib/search.js` 同一个切法（这里只用来挑词，不参与判定） */
const CJK2 = /^[\u3400-\u4dbf\u4e00-\u9fff]{2}$/;
function bigrams(s){
  const runs = String(s).toLowerCase().replace(/\s+/g, ' ').match(/[\p{L}\p{N}]+/gu) || [];
  const out = [];
  for (const r of runs) for (let i = 0; i + 1 < r.length; i++) out.push(r.slice(i, i + 2));
  return out;
}
/* ==================== 探针词与反例词：每次跑都从盘上现挑 ====================
   探针要同时满足五件事，缺一件第 ④ 那张表就退化成"搜标题"（§12:828 点名的形状）：
   ① 是中文二字窗；② 只落在一篇的**正文**里（标题、摘要、别的篇都不能有它）；③ 全站只出现一次；
   ④ 不在任何一篇正文的前 TRUNC 字里——否则它在 trunc 那一列也是非零，三张表少了一张；
   ⑤ **它所属的那一篇必须是可见稿件**——产物索引里根本没有草稿那一篇（第 ② 格正是判它不许进来），
      拿只有草稿才有的窗当探针，③④⑤ 三格会一起红在"搜不到"上，而那是**正确行为**。
      语料图仍然按**全部**稿子建（含草稿），所以"只落在一篇"判的是全仓，比只数可见那批更严。
   写死一枚会在下一篇稿子落地那天悄悄失效（那时它可能命中两篇），所以每次现挑；挑不出来就是红。
   反例词同理：由语料派生（换两头拼一枚哪儿都不在的窗），不写死 zzzz——写死那枚在
   "索引压根没建成"的环境里也一样长绿，白拿。 */
const TRUNC = 12;                       // trunc 那一列只留正文前 12 字：短到装不下任何一枚挑中的窗
const VISIBLE_SLUGS = new Set(VISIBLE.map(p => p.slug));
const PROBE = (() => {
  if (!CORPUS.length) return null;
  const seen = new Map();
  for (const p of CORPUS) for (const w of new Set(bigrams(p.body))){
    if (!seen.has(w)) seen.set(w, new Set());
    seen.get(w).add(p.slug);
  }
  const ok = [...seen.entries()]
    .filter(([w, who]) => who.size === 1 && CJK2.test(w) && !CORPUS.some(p => p.head.includes(w) || p.body.slice(0, TRUNC).includes(w)))
    .map(([w, who]) => ({ word: w, slug: [...who][0], total: CORPUS.reduce((n, p) => n + (p.body.split(w).length - 1), 0) }))
    .filter(c => c.total === 1 && VISIBLE_SLUGS.has(c.slug));
  if (!ok.length){
    hard(`${CORPUS.length} 篇稿子（可见 ${VISIBLE.length} 篇）里挑不出"只落在一篇**可见**稿子的正文里、全站只出现一次、标题与摘要都不含、且不在正文前 ${TRUNC} 字内"的中文二字窗 ⇒ 命门那一格没有对象，判据正在空转（要么改探针挑选口径，要么加一篇稿子）`);
    return null;
  }
  return ok.sort((a, b) => a.word.localeCompare(b.word))[0];
})();
const ALLTEXT = CORPUS.map(p => p.body + ' ' + p.head).join(' ');
const ABSENT = (() => {
  if (!PROBE) return null;
  const pool = [...new Set(bigrams(ALLTEXT))].filter(w => CJK2.test(w));
  if (!pool.length){ hard('语料里一枚中文二字窗都没有 ⇒ 反例词没有取值域，判据正在空转'); return null; }
  for (const a of pool) for (const b of pool){
    const w = a[0] + b[1];
    if (w === PROBE.word || !CJK2.test(w) || ALLTEXT.includes(w)) continue;
    return w;
  }
  hard('从语料的二字窗里换两头拼不出任何一枚"哪儿都不在"的窗 ⇒ 反例那一列没有对象，判据正在空转');
  return null;
})();

/* 高亮那一格的对象词：探针词按构造**只**在正文里，所以它在结果行（标题 + 摘要）上理应一枚 <mark> 都没有
   —— 拿"命中就必须有高亮"去判它，判的是不存在的那件事（第一版就是这么红的，红的是量具）。
   要验 `markRanges()` 真的落地，得另挑一枚**就在标题里**的二字窗：它必然进得了索引（标题是索引的三层之一），
   也必然在访客看得见的那两行里字面连续地出现过 ⇒ marks ≥ 1 且标出来的就是打的这两个字。 */
const TITLEWORD = (() => {
  if (!PROBE) return null;
  const p = CORPUS.find(x => x.slug === PROBE.slug);
  const m = p && /[\u3400-\u4dbf\u4e00-\u9fff]{2,}/.exec(p.title);
  return m ? m[0].slice(0, 2) : null;
})();
if (PROBE && !TITLEWORD) hard(`${PROBE.slug} 的标题「${(CORPUS.find(x => x.slug === PROBE.slug) || {}).title}」里挑不出一枚中文二字窗 ⇒ 高亮那一格没有对象，判据正在空转`);

/* ==================== ① 产物形状 ==================== */
const INDEX_PATH = join(DIST, 'search.json');
let product = null;
cell('①', 'dist/search.json 在、形状对、一个绝对地址都没有', () => {
  assert.ok(existsSync(DIST), `没有构建产物目录 ${DIST} —— 先 npm run build（本工具读 dist/，它在 gate 里排在 build 之后）`);
  assert.ok(existsSync(INDEX_PATH), 'dist/search.json 不在 ⇒ 端点没产出（没跑过 build、build 半路炸、路由改动、当成 dev-only 都长这样）');
  const raw = readFileSync(INDEX_PATH, 'utf8');
  product = JSON.parse(raw);
  assert.ok(product && product.v === INDEX_VERSION, `索引 v=${product && product.v}、代码里 INDEX_VERSION=${INDEX_VERSION} ⇒ 产物与 shipped 的切法不是同一版`);
  assert.ok(Array.isArray(product.docs) && product.docs.length, '索引里一篇文档都没有 —— 就是"搜索框在、索引是空的"那一档假绿');
  assert.equal(product.n, product.docs.length, `索引自称 n=${product.n}、docs 却有 ${product.docs.length} 枚 ⇒ 两枚数由同一处写出，不等就是中间有人动过产物`);
  for (const d of product.docs){
    assert.ok(/^\/essays\/[^/]+\/$/.test(d.u), `文档地址 ${d.u} 不是站内相对地址 ⇒ 产物里出现了别的形状（域名的温床）`);
    assert.ok(Array.isArray(d.k) && d.k.length > 20, `${d.u} 只有 ${(d.k || []).length} 枚词元，不像一篇正文切出来的东西`);
    assert.deepEqual(d.k, [...d.k].sort(), `${d.u} 的词元没排序 ⇒ 两次构建交出的 JSON 逐字节不同，对账做不了`);
    assert.ok(typeof d.t === 'string' && d.t.length, `${d.u} 没有标题：结果行会是空白，那比没有结果更难看`);
  }
  assert.ok(!/https?:\/\//.test(raw), '索引里出现了 http(s) 绝对地址 —— 搜索产物不许带域名，PUBLIC_SITE 换值时它不该跟着动');
  return 5 + product.docs.length * 4;
});

/* ==================== ② 篇数与草稿 ⇄ 源码 ==================== */
if (product) cell('②', '索引里那批 ⇄ 源码里"可见"那批（滤草稿、滤不列入），一枚不多一枚不少', () => {
  const want = VISIBLE.map(p => `/essays/${p.slug}/`);
  assert.ok(want.length, '源码里一篇可见稿件都没有 ⇒ 篇数对账与"每一篇都进得来索引"两半都没对象，判据正在空转');
  assert.equal(product.docs.length, want.length,
    `索引 ${product.docs.length} 篇、可见稿件 ${want.length} 篇 ⇒ 有一处没走 lib/posts.js 那个唯一入口（草稿进来了，或已发布的掉了）`);
  for (const u of want) assert.ok(product.docs.some(d => d.u === u),
    `${u} 在可见清单里却不在索引里 ⇒ 这一篇永远搜不到，而它在 /essays/ 上明明有一行`);
  for (const d of DRAFTS) assert.ok(!product.docs.some(x => x.u === `/essays/${d.slug}/`),
    `${d.slug} 标着 draft:true 却进了索引 ⇒ 列表里没有它、地址照样活着：草稿泄漏最新的一种形状`);
  /* 不列入那一族（第十五轮 `card/unlisted`）：与草稿那一半同一个形状，但**页面上那一页是在的**——
     所以这里不能拿"dist 里没有那一页"当判据（那是草稿的形状），只能拿"索引里没有它"当判据。
     它要是进了索引，运行时那一侧就长出真结果行、真地址，"站内任何一处都不指向它"破在搜索框里
     （上面那条 `docs.length === want.length` 的枚数对账咬得住"多了一篇"，这一条点名的是"哪一枚多了"）。
     ⚠️ 0 枚也照样打印这一枚数（口径照 runtime-check 那两格"零对象自检"的规矩）：一句"索引 3 篇"背后
        究竟是"没有不列入的稿子"还是"读不出那一枚键"，得让读数自己说清。 */
  for (const u of UNLISTED) assert.ok(!product.docs.some(x => x.u === `/essays/${u.slug}/`),
    `${u.slug} 标着 unlisted:true 却进了索引 ⇒ 搜索框里会画出它那一行、点开就是那一页：`
    + `"站内任何一处都不指向它"破在最后这一处入口上（这一格是 search.json 那一侧唯一的牙）`);
  /* ⚠️ 草稿那一半的牙不在 `DRAFTS.length` 上，在上面那条 `docs.length === want.length`：
     泄漏的形状是"产物里多出一篇源码不可见的文档"，枚数对账当场就红——源码今天没有草稿，
     这条判据照样咬得住（有草稿载体的那一跑是实测档，登记在 §9 那一格与回执里）。 */
  /* 索引里的地址必须真有一页：搜索框把访客送到 404，与"搜不到"是两种坏法，都得红。
     这一环同样是 filter 之后拿数组做判据 ⇒ 一枚都没对上的时候（paths 空 / dist 换了形状）直接红。 */
  let on_disk = 0;
  for (const d of product.docs){
    const file = join(DIST, ...String(d.u).split('/').filter(Boolean), 'index.html');
    assert.ok(existsSync(file), `${d.u} 在索引里，但 dist 里没有这一页（${file}）⇒ 结果行点进去是 404`);
    on_disk++;
  }
  assert.ok(on_disk === product.docs.length && on_disk > 0,
    `索引 ${product.docs.length} 篇、只对上了 ${on_disk} 页 ⇒ "每一篇都跳得到"这一半没跑成，判据正在空转`);
  notes.push(`② 索引 ⇄ 源码：可见 ${want.length} 篇逐枚点名（${want.map(w => w.split('/')[2]).join('、')}）且逐枚确认 dist 里有那一页；`
    + (DRAFTS.length ? `源码里草稿 ${DRAFTS.length} 篇（${DRAFTS.map(d => d.slug).join('、')}）逐个确认不在索引里`
      : '源码里今天一篇 draft 都没有 ⇒ 草稿那一半今天没有源码载体；承重的判据是上面那枚枚数对账（泄漏＝产物多一篇），它今天照样在咬')
    + `；不列入 ${UNLISTED.length} 枚`
    + (UNLISTED.length ? `（${UNLISTED.map(u => u.slug).join('、')}）逐个确认不在索引里——它们那一页在 dist 里是真的（地址能读），只是不进索引`
      : ' 枚：源码里没有一篇写着 unlisted: true ⇒ 这一半今天没有对象，而承重的判据仍是上面那枚枚数对账（多一篇就红），它照样在咬'));
  return want.length + DRAFTS.length + UNLISTED.length + on_disk + 3;
});

/* ==================== ③ shipped 那一刀命中探针词 ==================== */
if (product && PROBE) cell('③', '探针词只落在一篇正文里，searchDoc() 命中且只命中那一篇', () => {
  const hits = searchDoc(product.docs, PROBE.word);
  assert.equal(hits.length, 1, `输入「${PROBE.word}」命中 ${hits.length} 篇（应为 1）：${hits.map(h => h.u).join(' ') || '零篇'}`);
  assert.equal(hits[0].u, `/essays/${PROBE.slug}/`, `命中的是 ${hits[0].u}，而这个词写在 ${PROBE.slug} 的正文里 ⇒ 索引与稿子对不上号`);
  const doc = product.docs.find(d => d.u === `/essays/${PROBE.slug}/`);
  assert.ok(!doc.t.includes(PROBE.word) && !doc.e.includes(PROBE.word),
    `探针「${PROBE.word}」出现在标题或摘要里（t="${doc.t}"）⇒ 这一格退化成搜标题`);
  assert.equal(PROBE.total, 1, `探针在正文里出现 ${PROBE.total} 次 ⇒ "命中一篇"与"命中一处"分不开，换探针`);
  assert.ok(queryTerms(PROBE.word).want.length === 1, '探针那枚窗切不出唯一必中项 ⇒ queryTerms 的口径变了，这一格在读空气');
  if (ABSENT) assert.equal(searchDoc(product.docs, ABSENT).length, 0,
    `现拼的反例词「${ABSENT}」（语料里哪篇都没有）在真索引里报命中 ⇒ 比对松到什么都不判了`);
  notes.push(`③ 探针「${PROBE.word}」→ ${PROBE.slug} 的正文（标题/摘要不含它）；反例「${ABSENT || '（拼不出来）'}」→ 0 篇`);
  return 5 + (ABSENT ? 1 : 0);
});

/* ==================== ④ 三张索引读数并排：把"刀落在哪一层"钉死 ====================
   ⚠️ 这一格的形状是 §12:828 那条"全图相减"的搜索侧同族，不新造方法，只换个被测对象。
   为什么"命中一篇"这句读数本身不算看见刀（§12:828 点名的形状，与 §14 第 14 项同一个病）：
     ① 索引吃到了正文                                        → 命中 1
     ② 索引只吃了标题、而那枚窗恰好也在标题里                  → 命中 1
     ③ 索引里根本没这个东西、但比对读的是页面上另一枚字段        → 也可能报命中
   三档在前两格读数完全相同——单条命中永远只是一次读数，不是一张表。
   ⚠️ 表必须打在**真仓 shipped 索引本身**上，不许造合成文档：合成文档没有"真实形状可失配"，
      它证明的是"我造的样例能被我造的比对挑出来"，那正是 §14:1033/§16:1246 那条病。
      三列的区分全落在 `k` 是从哪一层文本切出来的（full = dist 里那份、title = 只喂标题+摘要、
      trunc = 正文只留前 12 字），比对函数自始至终是 shipped 的 `searchDoc()` 一枚。 */
const shapeIndex = kind => VISIBLE.map(p => ({
  u: `/essays/${p.slug}/`,
  t: p.head, e: '',
  k: docTokens(kind === 'title' ? p.head : p.head + ' ' + p.body.slice(0, kind === 'trunc' ? TRUNC : Infinity)),
}));
if (product && PROBE) cell('④', '三张索引（full / 只喂标题 / 正文截断）在同一枚 searchDoc() 上的读数表', () => {
  const TITLE = shapeIndex('title'), CUT = shapeIndex('trunc');
  assert.ok(ABSENT, '一枚哪篇都没有的窗都没拼出来 ⇒ 反例那一列没有对象（这一格不许退成写死的 zzzz）');
  /* 挑"出现在 ≥2 篇正文里"的那枚窗：这是 full 列与 title 列能差开的地方，也是"命中一篇"
     与"命中一批"分界的证据。挑不到两枚就是红——语料不够造反例时**加一篇稿子再跑**，
      不许把这一格降级成"有一枚单篇窗就算过"。 */
  const perWin = new Map();
  for (const p of VISIBLE) for (const w of new Set(bigrams(p.body))){
    if (!CJK2.test(w) || CORPUS.some(x => x.head.includes(w))) continue;   // 标题/摘要里有的窗不当探针（全仓都查）
    if (p.body.slice(0, TRUNC).includes(w)) continue;               // 落在截断窗口里的窗没有区分力
    if (!perWin.has(w)) perWin.set(w, new Set());
    perWin.get(w).add(p.slug);
  }
  const multi = [...perWin.entries()].filter(([, who]) => who.size >= 2)
    .sort((a, b) => (b[1].size - a[1].size) || a[0].localeCompare(b[0]));
  assert.ok(multi.length >= 2,
    `真仓语料里挑不出两枚"出现在 ≥2 篇正文、标题与摘要都没有、且不在任何一篇正文前 ${TRUNC} 字内"的二字窗（实测 ${multi.length} 枚）`
    + ` ⇒ 三张表的两列差不开。加一篇 .md 再跑，不许把这格降级或删掉`);
  const W2 = multi[0][0], n2 = multi[0][1].size;
  const rows = [
    ['单篇窗', PROBE.word, PROBE.slug],
    ['多篇窗', W2, `${n2} 篇`],
    ['反例窗', ABSENT, '零篇'],
  ];
  const table = [];
  let bad = 0;
  for (const [kind, w, want] of rows){
    const full = searchDoc(product.docs, w).length;
    const title = searchDoc(TITLE, w).length;
    const cut = searchDoc(CUT, w).length;
    table.push(`${kind}「${w}」 full=${full}  只喂标题=${title}  正文截断=${cut}  （期望 ${want} / 0 / 0）`);
    if (title !== 0) { problems.push(`④ ${kind}「${w}」在"只喂标题"那张索引上仍报 ${title} 命中 ⇒ 比对读的不是 k，或者标题/摘要里本来就有它（挑探针的那两条排除失效了）`); bad++; }
    if (cut !== 0){ problems.push(`④ ${kind}「${w}」把正文截到前 ${TRUNC} 字之后仍报 ${cut} 命中 ⇒ searchDoc() 在读页面上的另一枚字段，不是索引里那串词元（§12:828 点名的第三种坏法）`); bad++; }
  }
  assert.ok(!bad, `④ 三张索引的读数表没把这三档分开（上面逐条点名了）`);
  assert.ok(PROBE.total === 1, `单篇探针在正文里出现 ${PROBE.total} 次 ⇒ "命中一篇"与"命中一处"分不开，换探针`);
  notes.push('④ 三张索引（full = dist/search.json、title = 只喂标题+摘要、trunc = 正文截前 ' + TRUNC + ' 字）打在 shipped 的 searchDoc() 上：');
  for (const t of table) notes.push('    ' + t);
  notes.push(`    ⇒ full 那两枚非零、另两张全零：命中来自正文，且只来自 k（多篇窗那枚期望命中 ${n2} 篇，实测 ${searchDoc(product.docs, W2).length} 篇）`);
  return 3 + rows.length * 2;
});

/* ==================== 驱动脚本（在浏览器里跑，读数交回 dump） ==================== */
const DRIVER = `
const box = document.getElementById('__drive_out');
const P = () => document.getElementById('search-panel');
const S = () => document.getElementById('display-settings');
const R = () => document.getElementById('search-results');
const H = () => document.getElementById('search-hint');
const I = () => document.getElementById('search-input');
const T = () => document.getElementById('search-toggle');
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms){ const t0 = Date.now(); for(;;){ let v; try { v = fn(); } catch (e){ v = null; }
  if (v) return v; if (Date.now() - t0 > (ms || 8000)) return null; await wait(40); } }
function type(v){ const el = I(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
function enter(){ I().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); }
function esc(t){ t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
function r2(n){ return Math.round(n * 100) / 100; }
function rectof(el){ const r = el.getBoundingClientRect();
  return { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), left: r2(r.left), right: r2(r.right) }; }
/* ⚠️ 读 visibility 之前先把这枚元素自己的过渡掐掉：本机 visibilityState=hidden、CSS 过渡**不走帧**，
   而收起态那条 "transition: … visibility 0s .18s" 带的是一枚 **180ms 延迟**——不移除过渡去读计算值，
   收起之后它永远停在 visible（第一版实测就是这样红了）。这不是"功能没跑"，是量具读的是过渡中间态。
   口径照 §9 那枚滑杆钮签字时用的那句"关掉过渡后读计算值"。 */
function vis(p){ const old = p.style.transition; p.style.transition = 'none';
  const v = getComputedStyle(p).visibility; p.style.transition = old; return v; }
function snap(){ const p = P(); return {
  n: R().children.length, hrefs: [...R().children].map(li => { const a = li.querySelector('a'); return a && a.getAttribute('href'); }),
  marks: R().querySelectorAll('mark').length, marktxt: [...R().querySelectorAll('mark')].map(m => m.textContent).join('/'),
  hint: H().textContent, open: p.classList.contains('open'), inert: p.hasAttribute('inert'),
  vis: vis(p) }; }
const out = {};
out.probe = ${JSON.stringify(PROBE && PROBE.word)};
out.absent = ${JSON.stringify(ABSENT)};
out.titleword = ${JSON.stringify(TITLEWORD)};
/* ⚠️ 这里读到的**不是**静态产物形状：驱动脚本是 type="module"、追加在 site.js 那枚之后，
   按文档顺序它跑起来时 site.js 已经把 searchWrap.hidden 置回 false 了。
   所以这块只当"页面确实被这段脚本接管了"的旁证（rows 0 枚 = 没输入就没有结果行），
   静态产物那一半由 Node 直接读 dist/index.html 的字节（drive() 里的 static_src），
   无 JS 那一半由第 ⑥ 格在 .js 全 404 的档里读 dump。三处各读各的对象，不互相冒充。 */
out.after_js = { rows: R().children.length, hint: H().textContent, panel_open: P().classList.contains('open'),
  inert: P().hasAttribute('inert'), vis: getComputedStyle(P()).visibility,
  search_hidden: document.getElementById('search').hidden };
out.state = { theme: document.documentElement.dataset.theme, fog: document.documentElement.dataset.fog,
  grain: document.documentElement.dataset.grain, fireflies: document.documentElement.dataset.fireflies,
  enter: document.documentElement.dataset.enter, clock: (document.getElementById('clock') || {}).textContent,
  fonts: document.fonts ? document.fonts.status : 'none', vis_state: document.visibilityState };
out.revealed = !!(await until(() => !document.getElementById('search').hidden, 8000));
/* ⚠️ 宿主那一格（第十一轮末）：入口现在住在扉页/日志那一行，导航胶囊里一枚都不许有。
   这两枚读数是"那枚按钮摘干净了没有"的正面证据，第 ⑤ 格判它、第 ⑦ 格逐档再判一次。 */
out.in_nav = !!document.querySelector('.nav-links .search');
out.nav_children = (() => { const el = document.querySelector('.nav-links'); return el ? el.children.length : null; })();
out.host = (() => { const el = document.getElementById('search'); if (!el) return null;
  return { in_page_head: !!el.closest('.page-head'), in_hero_log: !!el.closest('.hero-log'),
    tag: el.tagName.toLowerCase(), text: (document.getElementById('search-toggle') || {}).textContent }; })();
if (out.revealed){
  T().click();
  out.focus_after_open = document.activeElement && document.activeElement.id;
  out.opened = snap();
  type(out.probe);
  out.probe_snap = await until(() => R().children.length > 0, 9000).then(snap);
  /* 标题里的那一枚二字窗：这一档才该有 <mark>（字面连续地出现在访客看得见的那一行上） */
  type('');                                        /* 先同步清空上一次的结果行，免得 until 读到上一轮的残留 mark */
  type(out.titleword);
  out.title_snap = await until(() => R().querySelectorAll('mark').length > 0, 9000).then(snap);
  type(out.absent || '不存在的那枚窗');
  out.absent_snap = await until(() => /没有一篇/.test(H().textContent), 9000).then(snap);
  type('！！！');
  out.punct_snap = await until(() => /没有可搜的字/.test(H().textContent), 9000).then(snap);
  type('');
  out.empty_snap = await until(() => /可搜/.test(H().textContent), 9000).then(snap);
  /* 回车：只有一条命中时它必须"去那一页"。这里先挂一道 preventDefault 把导航截下来读数，
     否则页面一换，后面的收口格就全没了。 */
  type(out.probe);
  await until(() => R().children.length > 0, 9000);
  R().addEventListener('click', e => { const a = e.target.closest('a'); if (a){ e.preventDefault(); out.enter_to = a.getAttribute('href'); } }, { once: true });
  enter();
  await wait(120);
  esc(document.body);
  await wait(120);
  out.after_esc = Object.assign(snap(), { focus: document.activeElement && document.activeElement.id });
  /* ---------- 键盘 / 全站直达（第十一轮末新增；四条读数各判一件事）----------
     ① 收起态在 body 上按 / ⇒ 面板必须开、焦点必须落进输入框（这才叫"直达"）；
     ② 事件必须被 preventDefault——那几个浏览器把裸 / 认成"快速查找"，不拦就是两条通道同时接键；
     ③ **输入框里的那个斜杠是字，不是命令**：焦点在 #search-input 里再按一次，默认行为不许被拦
        （defaultPrevented 必须还是 false），面板状态也不许被"再开一次"改动；
     ④ 带修饰键（Ctrl+/）不算这条命令。
     ⚠️ 合成 KeyboardEvent 只能证明"这段脚本没有抢键、没有拦默认行为"，证不了浏览器真会把字符插进框里
        （那是浏览器那一步的事，登记在未验到，不写成已验）。
     ⚠️ 这一段整块住在 site.js 那个 if (searchWrap && ...) 里：这一页没有那一格 ⇒ 按 / 什么都不发生。 */
  const slash = (t, mods) => { const ev = new KeyboardEvent('keydown', Object.assign({ key: '/', bubbles: true, cancelable: true }, mods || {}));
    (t || document.body).dispatchEvent(ev); return ev.defaultPrevented; };
  out.slash = { closed_before: !P().classList.contains('open'), focus_before: document.activeElement && document.activeElement.id };
  out.slash.prevented = slash(document.body);
  await wait(120);
  out.slash.open_after = P().classList.contains('open');
  out.slash.focus_after = document.activeElement && document.activeElement.id;
  out.slash.in_input_prevented = slash(I());
  out.slash.still_open = P().classList.contains('open');
  out.slash.ctrl_prevented = slash(document.body, { ctrlKey: true });
  esc(document.body);
  await wait(120);
  out.slash.esc_focus = document.activeElement && document.activeElement.id;
  out.slash.esc_open = P().classList.contains('open');
  T().click();
  await wait(120);
  out.reopened = snap();
  document.getElementById('settings-toggle').click();
  await wait(120);
  out.mutual = { search_open: P().classList.contains('open'), settings_open: S().classList.contains('open') };
  document.getElementById('settings-toggle').click();
  T().click();
  await wait(120);
  /* 两枚面板在 1440 上的几何关系（**读数**，不再当成互斥那条判据的前提）：
     宿主搬走之后它们一个挂在扉页那一行、一个挂在胶囊下的滑杆钮，是否还重叠由量说了算 ⇒ ⑤ 判
     "同开之后只剩一块"（行为），重叠只打印登记进 §11，它将来变了不会静默改掉那条判据的理由。 */
  out.stack = (() => { const a = P().getBoundingClientRect(), b = S().getBoundingClientRect();
    return { dx: r2(a.x - b.x), dy: r2(a.y - b.y), overlap: !(a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5),
      search: { left: r2(a.left), right: r2(a.right), top: r2(a.top), bottom: r2(a.bottom) },
      settings: { left: r2(b.left), right: r2(b.right), top: r2(b.top), bottom: r2(b.bottom) } }; })();
}
out.width = innerWidth;
out.nav_links = (() => { const el = document.querySelector('.nav-links'); return el ? rectof(el) : null; })();
out.panel = (() => { const el = P(); const old = el.style.transition; el.style.transition = 'none';
  el.classList.add('open'); el.removeAttribute('inert'); const r = rectof(el);
  el.classList.remove('open'); el.setAttribute('inert', ''); el.style.transition = old; return r; })();
box.textContent = 'DRIVE' + JSON.stringify(out) + 'END';
`;

/* ---- 几何读数路线：同源 iframe，不是 --window-size ----
   ⚠️ 为什么不用 `--window-size=320,900`：本机 Edge 有最小窗口宽度，实测那一档 `innerWidth` 回来是 **504**
      —— 视口根本没设上，读数会一路全绿却量的是 504px 那一档（第一版就是这么红的）。
      CDP 的 `Emulation.setDeviceMetricsOverride`（§11 那批导航读数当年走的就是它）本工具不引：
      引一次就要养一段 WebSocket 客户端，而这一格要的只是"媒体查询按这一档宽度求值之后，
      那块面的盒子落在哪儿"。同源 iframe 的视口就是一个独立视口——媒体查询、`vw`、
      `position:fixed` 全部按 iframe 的宽度算，与被嵌页面自己 resize 到那一档等价，
      而且被测对象仍然是**未改动的真产物**（只有 shipped site.js 在里面跑）。
      ⚠️ 每一档都把 `iframe.contentWindow.innerWidth` 读回来跟请求值对账（⑦ 判 `o.width === w`），
         对不上就是"这一档根本没设上"，整行读数作废而不是当成绿。
      ⚠️ iframe 高写 900（与 §11 当年那批读数的窗口高档同值）：vh 参与 `.page-head` 的开场高度，
         换高度就是换一组读数，不许在这一跑里随手改。 */
const FRAME_DRIVER = `
const box = document.getElementById('__drive_out');
const r2 = n => Math.round(n * 100) / 100;
const rectof = el => { const r = el.getBoundingClientRect();
  return { x: r2(r.x), y: r2(r.y), w: r2(r.width), h: r2(r.height), left: r2(r.left), right: r2(r.right), top: r2(r.top), bottom: r2(r.bottom) }; };
const W = ${'' /* 占位，服务端替换 */}__W__;
const PAGE = '__P__';
const f = document.createElement('iframe');
f.style.cssText = 'position:fixed;left:0;top:0;border:0;width:' + W + 'px;height:900px';
f.src = PAGE;
document.body.appendChild(f);
const out = { want: W, page: PAGE };
await new Promise(r => { f.onload = r; setTimeout(r, 12000); });
const d = f.contentDocument, w = f.contentWindow;
out.width = w.innerWidth;                                 /* 对账用的那枚：cell ⑦ 判的就是它必须等于 --widths 那一档 */
out.inner = w.innerWidth;
out.fonts = d.fonts ? d.fonts.status : 'none';            /* §11 的口径：等字体落地再量，字体是布局输入 */
out.search_hidden_at_load = !!(d.getElementById('search') || { hidden: null }).hidden;
out.mq = { narrow720: w.matchMedia('(max-width:720px)').matches, narrow340: w.matchMedia('(max-width:340px)').matches, narrow384: w.matchMedia('(max-width:384px)').matches };
/* ============ 胶囊那一排：撤掉第三枚按钮之后必须回到与 main 逐位相同的读数 ============
   ⚠️ 数的是 .nav-links 的直接子节点，不是 .nav 的：.nav 只有两枚孩子（时钟 + 那一排），
   而 ≤720 那档时钟整个 display:none，拿 .nav 量会只剩 1 枚有尺寸的节点、min/max 读的是空气。
   ⚠️ 同样必须先滤掉 display:none 的子节点——那种节点的 rect 是一整排 0，Math.min 会把 0 当成左缘。 */
const links = d.querySelector('.nav-links'), nav = d.querySelector('.nav');
out.nav = nav ? rectof(nav) : null;
out.links = links ? rectof(links) : null;
out.in_nav = !!d.querySelector('.nav-links .search');     /* 必须 false：导航里不许有第三枚按钮 */
out.nav_children = links ? links.children.length : null;  /* 必须是 7（5 链接 + 滑杆 + 主题） */
const cs = nav ? getComputedStyle(nav) : null;
out.nav_cs = cs ? { padL: +cs.paddingLeft.replace('px',''), padR: +cs.paddingRight.replace('px',''),
  borL: parseFloat(cs.borderLeftWidth) || 0, borR: parseFloat(cs.borderRightWidth) || 0,
  gap: +cs.gap.replace('px',''), wrap: getComputedStyle(links).flexWrap, maxWidth: cs.maxWidth, width: cs.width } : null;
/* §11 那一格的那笔账，用读回来的数算、不用注释里的数：
   胶囊需要量 = .nav-links 宽 + 左右 padding + 两枚 1px 描边 */
out.need = (out.links && cs) ? r2(out.links.w + out.nav_cs.padL + out.nav_cs.padR + out.nav_cs.borL + out.nav_cs.borR) : null;
const kids = links ? [...links.children].map(c => c.getBoundingClientRect()).filter(r => r.width > 0) : [];
out.nav_overflow = { scroll: d.documentElement.scrollWidth, inner: w.innerWidth, n: kids.length,
  first: kids.length ? r2(Math.min(...kids.map(r => r.left))) : null,
  last: kids.length ? r2(Math.max(...kids.map(r => r.right))) : null,
  /* 逐枚点名：换行那一档要看得见"哪几枚在第一排、哪几枚在第二排"，只有 min/max 读不出行数 */
  each: kids.map(r => r2(r.left) + '..' + r2(r.right) + '@' + r2(r.top)) };
/* ============ 入口那一行：新宿主装不装得下 ============ */
const entry = d.getElementById('search');
const row = entry ? entry.closest('.sec-label, .hero-log') : null;
out.entry = entry ? Object.assign(rectof(entry), { display: getComputedStyle(entry).display }) : null;
out.row = row ? { cls: row.className, left: r2(row.getBoundingClientRect().left), right: r2(row.getBoundingClientRect().right),
  /* nowrap 那一行放不下时**不是换行而是溢出**，而 body{overflow-x:hidden} 会把溢出的那半截裁掉——
     裁掉的正好是入口 ⇒ scrollWidth > clientWidth 就是"入口点不到"的签名，必须红。 */
  scroll_w: row.scrollWidth, client_w: row.clientWidth, white_space: getComputedStyle(row).whiteSpace,
  nowrap_overflow: row.scrollWidth - row.clientWidth } : null;
/* 真点开那一行字：面板由 shipped 的 setSearchOpen 加上 .open / 撤掉 inert，与访客点的是同一条路 */
d.getElementById('search-toggle').click();
await new Promise(r => setTimeout(r, 120));
const p = d.getElementById('search-panel');
p.style.transition = 'none';                       /* 本机不走过渡帧：读终态（§9 那枚滑杆钮同一条口径） */
out.open = p.classList.contains('open');
out.inert = p.hasAttribute('inert');
out.vis = getComputedStyle(p).visibility;
out.pos = getComputedStyle(p).position;
out.panel = rectof(p);
/* 首页那一档必须**朝上开**（那行字在首屏底部，朝下就掉出那一屏 ⇒ 开着却看不见） */
out.panel_above_entry = out.entry ? (out.panel.bottom <= out.entry.top + 1) : null;
/* 与显示设置那块面同开一次：同开之后搜索面板要已经收了（互斥那条行为） */
d.getElementById('settings-toggle').click();
await new Promise(r => setTimeout(r, 120));
const s = d.getElementById('display-settings');
s.style.transition = 'none';
out.settings = rectof(s);
out.search_open_after_settings_click = p.classList.contains('open');
out.dx = r2(out.panel.left - out.settings.left);
out.overlap = !(out.panel.right <= out.settings.left + 0.5 || out.settings.right <= out.panel.left + 0.5
  || out.panel.bottom <= out.settings.top + 0.5 || out.settings.bottom <= out.panel.top + 0.5);
box.textContent = 'DRIVE' + JSON.stringify(out) + 'END';
`;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

function dumpDom(url, profile, width, wantDrive = true){
  return new Promise(res => {
    const flags = ['--headless=new', `--user-data-dir=${profile}`, '--disable-gpu', '--hide-scrollbars',
      '--no-first-run', '--no-default-browser-check', `--window-size=${width},900`,
      '--virtual-time-budget=40000', '--dump-dom'];
    let child;
    try { child = spawn(EDGE, [...flags, url], { cwd: dirname(EDGE), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e){ return res({ fail: 'spawn ' + EDGE + ' 抛了：' + e.message }); }
    let stdout = '', stderr = '', killed = false, done = false;
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr = (stderr + d.toString('utf8')).slice(-2000); });
    child.on('error', e => { if (!done){ done = true; res({ fail: 'spawn ' + (e.code || e.message) }); } });
    const timer = setTimeout(() => { killed = true; try { child.kill(); } catch {} }, LAUNCH_TIMEOUT);
    child.on('close', () => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (killed) return res({ fail: `跑了 ${LAUNCH_TIMEOUT / 1000}s 没退出就被杀了（页面在等一个永远不来的响应）；stderr: ${stderr.slice(-160)}` });
      if (!stdout.trim()) return res({ fail: '--dump-dom 输出为空', raw: '' });
      /* 无 JS 档不装驱动脚本（那一档连 site.js 都被拦了，驱动也是 .js）：它交回的**就是 dump 本身**，
         判据读的是那段静态 HTML 里有什么、没什么。 */
      if (!wantDrive) return res({ raw: stdout });
      const m = /DRIVE([\s\S]*?)END/.exec(stdout);
      if (m){ try { return res({ json: JSON.parse(m[1]), raw: stdout }); } catch (e){ return res({ fail: '读数不是 JSON：' + e.message, raw: stdout }); } }
      const html = /<html\b[^>]*>/i.exec(stdout);
      const s = /<div class="search"[^>]*>/.exec(stdout);
      const pend = /@@PENDING@@/.test(stdout);
      return res({ fail: `驱动脚本没交回读数（dump ${stdout.length} 字节，没有 DRIVE…END 那对标记${pend ? '；输出里还留着 @@PENDING@@ ⇒ 驱动脚本自己抛了或没等到 iframe onload' : ''}）\n    <html>=${html ? html[0] : '∅'}\n    #search=${s ? s[0] : '∅'}\n    stderr: ${stderr.slice(-160)}`, raw: stdout });
    });
  });
}
function wait0(ms){ try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch {} }
function cleanup(profiles){
  wait0(600);
  for (const p of profiles) for (let i = 0; i < 5; i++){
    try { rmSync(p, { recursive: true, force: true }); } catch {}
    wait0(200 + i * 120);
    if (!existsSync(p)) break;
  }
}

const EDGE_CANDIDATES = [
  opt('edge'),
  process.env['PROGRAMFILES'] && join(process.env['PROGRAMFILES'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  process.env['LOCALAPPDATA'] && join(process.env['LOCALAPPDATA'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
].filter(Boolean);
const EDGE = opt('edge') ? resolve(opt('edge')) : EDGE_CANDIDATES.find(p => p && existsSync(p));

async function drive(){
  const file = join(DIST, 'index.html');
  assert.ok(existsSync(file), `读不到静态产物 ${file} ⇒ 第 ⑤ 格的"静态那一半"与第 ⑥ 格都没有对象（先 npm run build）`);
  const source = readFileSync(file, 'utf8');
  assert.ok(/<div class="search" id="search"[^>]*\bhidden(\s|=|>)/.test(source),
    'dist/index.html 的静态产物里找不到那枚带 hidden 的 .search ⇒ 第 ⑤⑥ 格（无 JS 不留空壳）没有对象');
  /* 静态产物形状：Node 读字节，不借浏览器 —— 浏览器交回来的永远是"site.js 跑完之后"的那一面。
     dump-dom 把布尔属性序列化成 `hidden=""`，源文件里是 `hidden`，所以两处都用同一枚宽容正则。 */
  const expM = /id="search-toggle"[^>]*aria-expanded="([^"]*)"/.exec(source);
  const hintM = /id="search-hint"[^>]*>([\s\S]*?)<\/p>/.exec(source);
  const static_src = {
    file,
    rows: (source.match(/class="search-row"/g) || []).length,
    search_hidden: /<div class="search" id="search"[^>]*\bhidden(\s|=|>)/.test(source),
    panel_inert: /<div class="settings search-panel"[^>]*\binert(\s|=|>)/.test(source),
    /* ⚠️ 宿主这一格（第十一轮末）：入口那一块必须真的住在扉页/日志那一行里，而不是仍然住在胶囊里——
       静态字节读得出宿主（`.nav-links` 里出现 `id="search"` 就是没摘干净），也不必借浏览器。
       判法是先拿 `<nav class="nav-links">` 到它自己的 `</nav>` 之间那一段，再在里面找——
       拿"整页里 nav-links 之后 4000 字符内有没有 search"当判据会跨出 `</nav>` 误报（扉页那一行本来就在导航之后）。 */
    in_nav: (() => { const at = source.indexOf('<nav class="nav-links">'); if (at < 0) return null;
      const end = source.indexOf('</nav>', at); return source.slice(at, end < 0 ? source.length : end).includes('id="search"'); })(),
    host: /class="hero-log"[^>]*>[\s\S]{0,600}?<div class="search"/.test(source),
    /* 读不到那枚节点时交回一句**不是期望值**的话，让下面的 eq 当场红——
       拿空串兜底就是把"节点没落地"读成"说明行是空的（正确）"，那一档正是假绿。 */
    toggle_expanded: expM ? expM[1] : '（入口钮不在静态产物里）',
    hint_text: (hintM ? hintM[1] : '（说明行不在静态产物里）').trim(),
  };
  const profiles = [];
  let isolate = false;                     // 服务端全局开关：true 时对任何 .js 回 404（无 JS 档）
  const served = { blocked: new Set() };
  const server = createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    const qs = new URLSearchParams((req.url || '').split('?')[1] || '');
    if (p === '/__drive'){
      /* 真产物 + 末尾追加驱动脚本：同源同端口，节点由 shipped site.js 真造，dist/ 一个字节不改 */
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(source + `<div id="__drive_out" style="position:fixed;left:-9999px;top:0"></div>\n<script type="module">\n${DRIVER}\n<\/script>`);
      return;
    }
    if (p === '/__frame'){
      /* 外壳页：不装产品内容，只按 ?w= 那一档 + ?p= 那一页开一枚同源 iframe，把**未改动的真产物**装进去量几何。
         它不需要驱动脚本之外的任何东西，也不写进 dist/。 */
      const width = Math.max(240, Math.min(1600, Number(qs.get('w')) || 1440));
      const page = (/^\//.test(qs.get('p') || '') ? qs.get('p') : '/').replace(/'/g, '');
      const driver = FRAME_DRIVER.replace('__W__', String(width)).replace('__P__', page);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>geom ${width} ${page}</title></head><body><div id="__drive_out">@@PENDING@@</div>\n<script type="module">\n${driver}\n<\/script></body></html>`);
      return;
    }
    if (isolate && /\.(m?js)(\?|$)/i.test(p)){ served.blocked.add(p); res.writeHead(404, { 'content-type': 'text/plain' }); res.end('blocked by search-check（无 JS 档）'); return; }
    if (p.endsWith('/')) p += 'index.html';
    const file = join(DIST, ...p.split('/').filter(Boolean));
    if (file !== DIST && !file.startsWith(DIST + sep)){ res.writeHead(403); res.end('outside dist'); return; }
    let buf; try { buf = readFileSync(file); } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(buf);
  });
  await new Promise((r, j) => { server.once('error', j); server.listen(0, '127.0.0.1', r); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const mkp = () => { const d = mkdtempSync(join(tmpdir(), 'mistwood-search-check-')); profiles.push(d); return d; };
  const results = { main: null, nojs: [], rects: [], blocked: 0, static_src };
  try {
    const self = await fetch(base + '/').then(r => r.status).catch(e => 'ERR ' + e.message);
    assert.equal(self, 200, `自家服务连不上（${base}/ → ${self}）：回环被挡时就这么死，是服务侧不是浏览器侧`);
    results.main = await dumpDom(base + '/__drive', mkp(), 1440);
    /* ---- 无 JS 档：整批跑，这一阶段全站 .js 一律 404（两档交错跑会互相污染，照 runtime-check 的分阶段） ---- */
    isolate = true;
    for (const page of PAGES) results.nojs.push({ page, r: await dumpDom(base + page, mkp(), 1440, false) });
    results.blocked = served.blocked.size;
    isolate = false;
    assert.ok(WIDTHS.length >= 3, `面板几何只给了 ${WIDTHS.length} 档视口（--widths=）⇒ §11 要的是逐档读数，不是抽查`);
    assert.ok(GEOM_PAGES.length >= 2, `几何那几档只跑了 ${GEOM_PAGES.length} 页（--pages=）⇒ 两枚宿主（hero-log 与 .sec-label）各一枚才算量过，抽查一页不算`);
    for (const w of WIDTHS) for (const pg of GEOM_PAGES) results.rects.push({ w, page: pg, r: await dumpDom(`${base}/__frame?w=${w}&p=${pg}`, mkp(), 1440) });
  } finally { server.close(); cleanup(profiles); }
  return results;
}

if (ONLY !== 'node'){
  if (!PROBE){
    problems.push('浏览器那三格没跑：探针词没挑出来（语料那一格已经点名了）—— 不降级、不跳过，这一格没跑就不许把"搜索可用"报成已验到');
  } else if (!EDGE || !existsSync(EDGE)){
    problems.push(`浏览器那三格没跑：找不到 msedge（试过 ${EDGE_CANDIDATES.join(' / ')}）—— 不降级、不跳过；这一格没跑就不许把"搜索可用"报成已验到`);
  } else {
    let res = null;
    try { res = await drive(); } catch (e){ problems.push(`浏览器格停在半路：${e.message || e}`); }
    if (res){
      cell('⑤', '真打一遍字：探针词命中那一篇、反例词走那句诚实的零结果、收口三对', () => {
        /* ⚠️ 断言枚数是数出来的（n++ 跟着每一枚走），不是手写的一枚字面量：
           这一格加一条判据却忘了改数，`cell` 收到的就是个虚报值——§14 第 14 格那条病的小一号版本。 */
        let n = 0;
        const eq = (a, b, m) => { n++; assert.equal(a, b, m); };
        const ok = (a, m) => { n++; assert.ok(a, m); };
        const mt = (a, re, m) => { n++; assert.match(a, re, m); };
        const d = res.main;
        ok(d && !d.fail, '浏览器那一跑没交付读数：' + (d && d.fail));
        const o = d.json;
        ok(o, '读数里没有 JSON');
        /* 静态产物那一半：Node 直接读 dist/index.html 的字节，不借浏览器（借来的读数是 JS 跑完之后的）。 */
        const s = res.static_src;
        ok(s && s.file, `读不到静态产物 ${s && s.file} ⇒ "无 JS 时页面上是什么形态"这一半没有对象，判据正在空转`);
        eq(s.rows, 0, '静态产物里结果行不是 0 枚 ⇒ 索引被烘进页面了（那才是"没点就有内容"）');
        eq(s.search_hidden, true, '静态产物里 .search 没有 hidden ⇒ 没有脚本的访客会看到一枚点了没反应的字（§12 空壳）');
        eq(s.toggle_expanded, 'false', `静态产物里入口钮自称 aria-expanded="${s.toggle_expanded}"`);
        eq(s.hint_text, '', `静态产物里说明行不是空的（"${s.hint_text}"）——烘进页面的那一句是假回执`);
        ok(s.panel_inert, '静态产物里的面板没有 inert：收起只靠 CSS，JS 没跑就等于半开');
        /* 宿主两条（第十一轮末）：静态字节里入口住在 `.hero-log` 那一行、胶囊里一枚都没有。
           这一对就是"那枚按钮真的摘掉了"的正面证据——运行时那一半由下面 o.in_nav 与第 ⑦ 格逐档再判。 */
        eq(s.in_nav, false, '静态产物的 `.nav-links` 段里还有 `id="search"` ⇒ 导航里那枚按钮没摘干净，§11 那笔"七项 296.48"的账要重开');
        ok(s.host, '静态产物首页的入口不在 `.hero-log` 那一行里 ⇒ 裁决说挂在这一行，页面没挂上去');
        /* 这段脚本接管过的证据（不是静态形状，见驱动脚本里那段注释） */
        eq(o.revealed, true, '.search 的 hidden 一直没被撤 ⇒ site.js 那段没跑，这一格读的是空气');
        eq(o.after_js.rows, 0, 'driver 起跑时结果行已有内容 ⇒ 没输入就有结果，那是把索引当公告板');
        eq(o.in_nav, false, '运行时 `.nav-links .search` 还在 ⇒ 胶囊里仍有第三枚按钮');
        eq(o.nav_children, 7, `.nav-links 的直接子节点 ${o.nav_children} 枚、§11 签署的是 7 枚（5 链接 + 滑杆 + 主题）⇒ 导航项数动了`);
        ok(o.host && o.host.in_hero_log && !o.host.in_page_head, `首页那枚入口的运行时候主是 ${JSON.stringify(o.host)}，应在 .hero-log 里、不在 .page-head 里`);
        eq(o.focus_after_open, 'search-input', `打开之后焦点在 ${o.focus_after_open}，应落在输入框里（键盘用户点开的东西要能直接打字）`);
        eq(o.opened.inert, false, '面板开着却没撤 inert');
        /* 命门 */
        ok(o.probe_snap && o.probe_snap.n === 1, `输入「${o.probe}」结果里 ${o.probe_snap && o.probe_snap.n} 行（应为 1 行）`);
        n++; assert.deepEqual(o.probe_snap.hrefs, ['/essays/' + PROBE.slug + '/'], `命中 ${o.probe_snap.hrefs.join(' ')}，应为 /essays/${PROBE.slug}/`);
        eq(o.probe_snap.open, true, '读结果的时候面板不是开着的');
        /* ⚠️ 探针那一档**不该**有高亮：探针按构造只在正文里，而结果行摆的是标题 + 摘要——
           在这里要求 marks>0 等于判一枚不存在的事（第一版就是这么红的，红的是量具自己）。
           高亮由下面那一档（标题里的二字窗）判，两档各判各的对象。 */
        eq(o.probe_snap.marks, 0, `探针「${o.probe}」只写在正文里，结果行（标题+摘要）上却标了 ${o.probe_snap.marks} 枚 <mark> ⇒ 标错了地方，那是在替访客编造"这里出现过你打的这串字"`);
        /* 高亮真落地的那一档 */
        ok(o.title_snap && o.title_snap.n >= 1, `输入标题里的二字窗「${o.titleword}」结果行是 ${o.title_snap && o.title_snap.n} 枚（应 ≥1）`);
        ok(o.title_snap.marks >= 1, `「${o.titleword}」明明字面连续地写在标题里，结果行却一枚 <mark> 都没有 ⇒ markRanges 那一刀没落地`);
        ok((o.title_snap.marktxt || '').includes(o.titleword), `标出来的字是 "${o.title_snap.marktxt}"，不含打进去的「${o.titleword}」`);
        /* 反例 */
        ok(o.absent_snap && o.absent_snap.n === 0, `反例「${o.absent}」结果里还有 ${o.absent_snap && o.absent_snap.n} 行（应为 0）`);
        mt(o.absent_snap.hint || '', /没有一篇/, `零结果那一句是 "${o.absent_snap.hint}"，没走到那句诚实的读数`);
        ok(o.absent && o.absent_snap.hint.includes(o.absent), `零结果那句没带访客刚打的那串字（"${o.absent_snap.hint}"）——不回显查询词的"没有找到"读起来像没搜`);
        /* 另两句实话 */
        mt(o.punct_snap.hint || '', /没有可搜的字/, `整串标点的读数是 "${o.punct_snap.hint}"，应走"没有可搜的字"，不是"没有一篇里出现过"（"没查"与"查了没有"是两件事）`);
        mt(o.empty_snap.hint || '', /可搜/, `清空之后的读数是 "${o.empty_snap.hint}"（应报有几篇可搜）：那一格也不许留空白`);
        eq(o.empty_snap.n, 0, '清空之后结果行没撤干净 ⇒ 拿上一次的结果冒充新输入');
        /* 回车 */
        eq(o.enter_to, '/essays/' + PROBE.slug + '/', `只有一条命中时回车应当走那一页，实测点了 "${o.enter_to === undefined ? '（什么都没发生）' : o.enter_to}"`);
        /* 收口：Esc 把焦点还给**触发它的那枚文字动作**（宿主搬走之后那枚动作换了位置、没换 id） */
        eq(o.after_esc.open, false, 'Esc 之后面板还开着');
        eq(o.after_esc.inert, true, 'Esc 之后没补回 inert（CSS 撤了而 DOM 还点得动 ⇒ 单一机制）');
        eq(o.after_esc.vis, 'hidden', `Esc 之后计算值 visibility=${o.after_esc.vis}（读的是计算值，本机不走过渡帧）`);
        eq(o.after_esc.focus, 'search-toggle', `Esc 之后焦点在 ${o.after_esc.focus}，应还给那一行字那枚入口（#search-toggle）`);
        eq(o.reopened.open, true, '再点一次入口没能重新打开');
        eq(o.reopened.inert, false, '重新打开没撤 inert');
        eq(o.reopened.vis, 'visible', `重新打开之后 visibility=${o.reopened.vis}`);
        /* ---- 键盘 `/` 四条（①直达 ②拦默认 ③输入框内不抢 ④带修饰键不算）---- */
        eq(o.slash.closed_before, true, '`/` 那一跑起跑时面板竟然是开的 ⇒ 前面那一次 Esc 没收住，这一档读的是空气');
        eq(o.slash.prevented, true, '在 `<body>` 上按 `/` 没有 preventDefault ⇒ 浏览器的"快速查找"会同时接住这一键，两条通道抢同一个键');
        eq(o.slash.open_after, true, '按 `/` 没打开面板 ⇒ 这条直达根本没跑');
        eq(o.slash.focus_after, 'search-input', `按 / 直达之后焦点在 ${o.slash.focus_after}，应当落进输入框（"达"就是达到这里）`);
        eq(o.slash.in_input_prevented, false, '焦点在输入框里时 `/` 被 preventDefault 了 ⇒ 那一枚斜杠再也打不进搜索框（"输入框内不抢键"这条坏了）');
        eq(o.slash.still_open, true, '在输入框里按 `/` 之后面板反而收起来了 ⇒ 抢键的判据没写对');
        eq(o.slash.ctrl_prevented, false, 'Ctrl+/ 被这条监听抢了 ⇒ 修饰键没排除，浏览器的帮助键没了');
        eq(o.slash.esc_open, false, '`/` 打开的那一档 Esc 收不掉 ⇒ 两条开法不是同一条收口路径');
        eq(o.slash.esc_focus, 'search-toggle', `Esc 之后焦点在 ${o.slash.esc_focus}：用 `/` 打开的面板收起时也要还回那一行字（触发物是入口，不是"上一次按键"）`);
        /* 两枚弹层：同开之后搜索那块必须已经收了（互斥那条行为判据）。
           ⚠️ 1440 上它们重不重叠**只登记不判**：宿主搬走之后"两块玻璃叠在同一片区域"这个前提
           是不是还成立，由第 ⑦ 格逐档量出来的 overlap 读数说话，不再写死在这一格里当判据。 */
        eq(o.mutual.search_open, false, '点开显示设置之后搜索面板还开着 ⇒ 全站同一时刻只许一块玻璃压在内容上，这条坏了');
        eq(o.mutual.settings_open, true, '点设置钮没开抽屉 ⇒ 这一格读的是空气');
        notes.push(`⑤ 静态产物（Node 读 ${s.file}）：结果行 ${s.rows} 枚、#search 带 hidden=${s.search_hidden}、aria-expanded="${s.toggle_expanded}"、说明行="${s.hint_text}"、面板带 inert=${s.panel_inert}；宿主：在 .nav-links 里=${s.in_nav}、在 .hero-log 那一行里=${s.host}`);
        notes.push(`⑤ 运行时项数：.nav-links 直接子节点 ${o.nav_children} 枚、胶囊里的 .search=${o.in_nav}、入口宿主=${JSON.stringify(o.host)}`);
        notes.push(`⑤ 探针「${o.probe}」→ ${o.probe_snap.n} 行 = ${o.probe_snap.hrefs[0]}、<mark> ${o.probe_snap.marks} 枚（正文词，标题/摘要里没有 ⇒ 本来就不该标色）；`
          + `反例「${o.absent}」→ 0 行 + "${o.absent_snap.hint}"`);
        notes.push(`⑤ 高亮那一档打在标题里的二字窗「${o.titleword}」→ ${o.title_snap.n} 行、<mark> ${o.title_snap.marks} 枚（"${o.title_snap.marktxt}"）`);
        notes.push(`⑤ 另两句：标点 → "${o.punct_snap.hint}"；清空 → "${o.empty_snap.hint}"；回车（唯一命中）→ ${o.enter_to}`);
        notes.push(`⑤ 收口：Esc 后 open=${o.after_esc.open} inert=${o.after_esc.inert} visibility=${o.after_esc.vis} focus=${o.after_esc.focus}；`
          + `重开 open=${o.reopened.open} inert=${o.reopened.inert} visibility=${o.reopened.vis}`);
        notes.push(`⑤ 键盘 /：body 上按 → prevented=${o.slash.prevented} open=${o.slash.open_after} focus=${o.slash.focus_after}；`
          + `输入框内按 → prevented=${o.slash.in_input_prevented} 仍开=${o.slash.still_open}；Ctrl+/ → prevented=${o.slash.ctrl_prevented}；`
          + `Esc 收 → open=${o.slash.esc_open} focus=${o.slash.esc_focus}`);
        notes.push(`⑤ 两枚弹层：同开之后搜索=${o.mutual.search_open} 设置=${o.mutual.settings_open}；1440 上重叠=${o.stack.overlap}（dx=${o.stack.dx} dy=${o.stack.dy}）`);
        notes.push(`⑤ 环境自证：state=${JSON.stringify(o.state)} width=${o.width}`);
        return n;
      });

      cell('⑥', '无 JS 档：#search 恒 hidden、结果行零枚、内联脚本那一层照常落地', () => {
        let n = 0;
        assert.ok(res.blocked > 0, '无 JS 档整批跑完，服务一个 .js 都没拦住 ⇒ 这一档其实跑在完整环境里（判据空转）');
        for (const { page, r } of res.nojs){
          assert.ok(!r.fail, `${page} 无 JS 档没交付 DOM：${r.fail}`);
          const html = r.raw || '';
          assert.ok(html.length > 200, `${page}：无 JS 档 dump 只有 ${html.length} 字节 ⇒ 拿一枚空壳当"页面在"，这一档没跑成`);
          /* ⚠️ 布尔属性在 dump 里序列化成的不是 `hidden` 而是 `hidden=""`（实测：`<div class="search" id="search" hidden="">`），
             写死 `hidden>` 的那一版判据在这台机器上永远读不到东西——它红过一次，红的是量具自己。 */
          assert.ok(/<div class="search" id="search"[^>]*\bhidden(\s|=|>)/.test(html), `${page}：无 JS 档里 #search 的 hidden 不见了 ⇒ 静态产物本身就带一枚点了没反应的入口`);
          assert.equal((html.match(/class="search-row"/g) || []).length, 0, `${page}：静态产物里出现了结果行 ⇒ 索引被烘进页面（"没点就有内容"那一档）`);
          assert.ok(!/search-toggle[^>]*aria-expanded="true"/.test(html), `${page}：静态产物里入口自称已展开`);
          assert.ok(/<html[^>]*data-fog=/.test(html), `${page}：连内联脚本那一层都没落地 ⇒ 这一档跑在了错的环境里`);
          assert.ok(/<div class="settings search-panel"[^>]*\binert(\s|=|>)/.test(html), `${page}：静态产物里的面板不是收起态（inert 没落在 HTML 上，只靠 CSS）`);
          /* 无 JS 时那一行**一个字都不出现**：入口的文字本身也在 hidden 那块里，所以整块 display:none。
             这一条只能拿"块里确实含着那枚按钮与那行字"来判——块在 `<p class="hero-log">` /
             `<span class="sec-label">` 之内、且胶囊段里没有它。 */
          assert.ok(/<div class="search"[^>]*hidden[\s\S]{0,400}?id="search-toggle"/.test(html), `${page}：hidden 那块里没有入口那枚字 ⇒ 显形之后页面上会没有可点的东西`);
          { const at = html.indexOf('<nav class="nav-links">'), end = html.indexOf('</nav>', at);
            assert.ok(at < 0 || !html.slice(at, end < 0 ? html.length : end).includes('id="search"'),
              `${page}：无 JS 档的胶囊段里仍有 #search ⇒ 导航里那枚按钮没摘干净`); }
          n += 8;
        }
        assert.ok(res.nojs.length >= 2, `无 JS 档只跑了 ${res.nojs.length} 页 ⇒ 六页共用一份 Layout，至少两页才看得见"每一页都有这一格"`);
        notes.push(`⑥ 无 JS 档 ${res.nojs.length} 页（${res.nojs.map(x => x.page).join(' / ')}），拦下的 .js 共 ${res.blocked} 种：`
          + `#search 恒 hidden、结果行 0 枚、面板恒 inert，内联脚本那五枚照常落地`);
        return n;
      });

      cell('⑦', '逐档几何：胶囊回到七项的账 + 入口那一行与面板在视口之内', () => {
        let n = 0, thin = null;
        /* §11 实测出来的**出盒破口点**（304 档 −0.52 / 303 档 +0.48 两端夹出来的那个数）。
           它住在判据里是为了让下一轮改窄屏那一档时**必须同时改这里**：上限从 `calc(100vw-20px)`
           挪走，破口点就跟着挪，那一档以下的容差就不再是 3.48。 */
        const NAV_BREAK = 303.48;
        /* ⚠️ 逐档**独立记账**，不是一枚 assert 就把整格炸掉：assert 一抛，后面几档的读数跟着丢，
           而这一格的用途恰恰是"从哪一档开始坏"（找 372 与 303.48 那两个破口点时被这个坑卡过两回）。
           判据照旧逐枚计数，只是收拢成一张表，末了统一红。 */
        const bad = [];
        const ok = (a, m) => { n++; if (!a) bad.push(m); };
        const eq = (a, b, m) => { n++; if (a !== b) bad.push(m); };
        const wSet = new Set(res.rects.map(x => x.w));
        ok(res.rects.length >= 3 * 2, `只跑了 ${res.rects.length} 档读数（= 视口档数 × 页数）⇒ §11 要的是逐档 × 逐宿主，不是抽查`);
        ok(wSet.size >= 3, `只有 ${wSet.size} 档视口 ⇒ --widths= 给少了`);
        for (const { w, page, r } of res.rects){
          n++;
          const tag = `${w}px ${page}`;
          if (r.fail){ problems.push(`⑦ ${tag} 档没交付读数：${r.fail}`); continue; }
          const o = r.json;
          if (!o || !o.panel || !o.nav || !o.links || !o.nav_overflow || !o.entry || !o.row){
            problems.push(`⑦ ${tag} 读数缺盒子（panel/nav/links/nav_overflow/entry/row 之一没交回来）⇒ 这一行作废`); continue;
          }
          const insetL = o.nav_overflow.first - o.nav.left, insetR = o.nav.right - o.nav_overflow.last;
          o.nav_overflow.insets = [+(insetL.toFixed(2)), +(insetR.toFixed(2))];
          /* 读数**先登记再判定**（见上面那条）：断言红了也要看得见每一档的数——这张表就是 §11 那一格
             要的那四列：`.nav-links` 宽 / 胶囊需要量 / 出盒破口点 / `scrollWidth == innerWidth`。 */
          notes.push(`    ${tag} → innerWidth ${o.width}｜.nav-links ${o.links.w}、胶囊需要 ${o.need}（= links + padding ${o.nav_cs.padL}/${o.nav_cs.padR} + 描边 ${o.nav_cs.borL}/${o.nav_cs.borR}）、上限 ${o.nav_cs.maxWidth}、`
            + `玻璃 ${o.nav.left}..${o.nav.right}、那一排 ${o.nav_overflow.n} 枚占 ${o.nav_overflow.first}..${o.nav_overflow.last} ⇒ 左右内边距 ${o.nav_overflow.insets.join(' / ')}、出盒 ${+(o.nav_overflow.last - o.nav.right).toFixed(2)}`
            + `｜wrap=${o.nav_cs.wrap}、项数 ${o.nav_children}、胶囊里的 .search=${o.in_nav}`
            + `｜scrollWidth ${o.nav_overflow.scroll}/${o.inner}`);
          notes.push(`    ${tag} → 入口 ${o.entry.left}..${o.entry.right}（display ${o.entry.display}、宿主 ${o.row.cls}、white-space ${o.row.white_space}、行溢出 ${o.row.nowrap_overflow}）`
            + `｜面板 ${o.panel.left}..${o.panel.right}（宽 ${o.panel.w}、y ${o.panel.top}..${o.panel.bottom}、${o.pos}、open=${o.open} inert=${o.inert} vis=${o.vis}、朝上开=${o.panel_above_entry}）`
            + `｜抽屉 ${o.settings.left}..${o.settings.right}、两枚重叠=${o.overlap}（dx ${o.dx}）｜fonts=${o.fonts}`);
          eq(o.width, w, `${tag} 实际 innerWidth=${o.width} ⇒ 视口没设上，这一行的所有读数作废`);
          /* ---- 胶囊那一排：必须与 main 逐位相同 ---- */
          eq(o.in_nav, false, `${tag} 胶囊里还有 .search ⇒ 那枚按钮没摘干净（§11 那笔"七项 296.48 / 上限 300"的账要整格重开）`);
          eq(o.nav_children, 7, `${tag} .nav-links 直接子节点 ${o.nav_children} 枚、签署的是 7 枚（5 链接 + 滑杆 + 主题）⇒ 导航项数动了`);
          eq(o.nav_cs.wrap, 'nowrap', `${tag} .nav-links 的 flex-wrap 读回 ${o.nav_cs.wrap} ⇒ §11 里"胶囊不折行"那句被改了，那是改设计不是修 bug`);
          eq(o.mq.narrow720, w <= 720, `${tag} max-width:720 求值成 ${o.mq.narrow720} ⇒ iframe 那档视口没生效，这一行读数作废`);
          eq(o.mq.narrow340, w <= 340, `${tag} max-width:340 求值成 ${o.mq.narrow340} ⇒ 那一档的 gap 8 / padding 12 与上限 20 没落地`);
          eq(o.mq.narrow384, w <= 384, `${tag} max-width:384 求值成 ${o.mq.narrow384} ⇒ 入口那一行的窄屏分支没落地`);
          ok(o.nav_overflow.n >= 2, `${tag} 只数到 ${o.nav_overflow.n} 枚有尺寸的胶囊子节点 ⇒ 量具在读空气`);
          eq(o.nav_overflow.scroll, o.nav_overflow.inner,
            `${tag} documentElement.scrollWidth=${o.nav_overflow.scroll} ≠ innerWidth=${o.nav_overflow.inner} ⇒ 整页横向溢出`);
          ok(o.nav.left >= -0.5 && o.nav.right <= o.width + 0.5, `${tag} 胶囊自己在 ${o.nav.left}..${o.nav.right}，视口只有 ${o.width} ⇒ 定位参照物就出界了`);
          /* ⚠️ "内容完整落在玻璃内"与"左右内边距对称"这两条**不能对每一档都按 0 判**。
             §11 在那一格签的是三句话：胶囊不折行、不减项（三条出路都预先否掉）、上限
             `calc(100vw-20px)`。那三句在 **303.48 以下推不出 0**——那一格的实测账（这里照抄，不是新造的数）：
             `.nav-links` 270.48、胶囊需要 296.48、破口点 303.48、**300px 档出盒 +3.48**。
             ⇒ 300 那一档的"正确读数"就是 +3.48：判它 ≤0 等于逼下一轮去动 §11 已经否掉的三条出路之一，
             而上一轮的写法确实就是这么红的——**红的是判据自己**（它比签署的规范更严，规范里那半档的账它没读进来）。
             所以破口点以下改成**钉签署值**：出盒必须恰好 3.48、左内边距必须仍是 padding+描边（右边距被那条
             恒等式 `insetL + insetR = 玻璃宽 − 内容宽` 唯一确定，不必再判一遍）。多一丝就是项数 / 字号 /
             字距动了，这一格当场红——比原来那种"按 0 判"其实咬得更紧。 */
          const over = +(o.nav_overflow.last - o.nav.right).toFixed(2);
          if (w < NAV_BREAK){
            ok(Math.abs(over - 3.48) <= 0.01, `${tag} 视口在破口点 ${NAV_BREAK} 以下，出盒却是 ${over}（§11 签署 +3.48）⇒ 那一排比 296.48 的需要量还宽：导航项数 / 字号 / 字距动了`);
            ok(Math.abs(insetL - (o.nav_cs.padL + o.nav_cs.borL)) <= 0.01, `${tag} 出盒那一档的左内边距 ${insetL.toFixed(2)} ≠ padding ${o.nav_cs.padL} + 描边 ${o.nav_cs.borL} ⇒ 连没被挤的那半边也动了，这一档的两笔账都要重开`);
          } else {
            ok(over <= 0.5, `${tag} 视口已在破口点 ${NAV_BREAK} 之上，那一排占 ${o.nav_overflow.first}..${o.nav_overflow.last} 却仍探出玻璃（玻璃 ${o.nav.left}..${o.nav.right}、出盒 ${over}）`);
            /* §11 那一格签的是**两条**判据："内容完整落在胶囊内"**且**左右内边距差 ≤1px"。
               ⚠️ 对称那一条只在 ≤720 判（那一档 `.nav-clock` 整个 display:none，那一排是胶囊里唯一的内容）；
               桌面档改判"右内边距仍是签署的 22 + 1px 描边 = 23"。 */
            if (w <= 720) ok(Math.abs(insetL - insetR) <= 1,
              `${tag} 胶囊左右内边距 ${insetL.toFixed(2)} / ${insetR.toFixed(2)}（差 ${Math.abs(insetL - insetR).toFixed(2)}px > 1）⇒ 玻璃被吃到一边，§11 那条"对称"的判据坏了`);
            else ok(Math.abs(insetR - 23) <= 1,
              `${tag} 胶囊右内边距 ${insetR.toFixed(2)}，桌面签署的是 padding 22 + 1px 描边 = 23 ⇒ 那一排与玻璃边的关系变了`);
          }
          /* ---- 入口那一行：新宿主装不装得下 ---- */
          if (o.row.white_space === 'nowrap') ok(o.row.scroll_w <= o.row.client_w + 0.5,
            `${tag} 那一行是 nowrap 却溢出内容盒 ${o.row.nowrap_overflow}px ⇒ 溢出的那半截被 body{overflow-x:hidden} 裁掉，裁的正是入口本身（点不到的入口比出玻璃的入口更坏）`);
          ok(o.entry.left >= -0.5 && o.entry.right <= o.width + 0.5,
            `${tag} 入口占 ${o.entry.left}..${o.entry.right}，视口只有 ${o.width} ⇒ 那一行字被挤出视口`);
          /* ---- 面板：逐档在视口之内，且真的是"开着"的 ---- */
          eq(o.open, true, `${tag} 真点开了那一行字，面板却没有 .open ⇒ 这一行量的是收起态的盒子，几何读数为零意义`);
          eq(o.inert, false, `${tag} 面板开着但还挂着 inert ⇒ 开着却点不动`);
          eq(o.vis, 'visible', `${tag} 面板开着但 visibility=${o.vis}（读的是掐掉过渡之后的计算值）`);
          eq(o.pos, 'absolute', `${tag} 面板 position=${o.pos} ⇒ 宿主是那一行字，absolute 才跟着文档走；写回 fixed 的话同一份 top:calc(100% + 14px) 会解成 100vh+14（掉出屏幕）`);
          ok(o.panel.left >= 0, `${tag} 面板左缘在 ${o.panel.left}（出视口左边）`);
          ok(o.panel.right <= o.width + 0.5, `${tag} 面板右缘 ${o.panel.right} > 视口宽 ${o.width}（出视口右边）`);
          ok(o.panel.w > 100, `${tag} 面板宽 ${o.panel.w} —— 这么窄放不下结果行，几何判据本身坏了`);
          /* 首屏底部那一行字必须**朝上开**（朝下就掉出那一屏：开着却看不见 = 那一格坏了）；
             子页那一行在文档上方，朝下开才不压住扉页标题——两档各判各的方向，用读回来的 rect 判。 */
          if (page === '/') eq(o.panel_above_entry, true, `${tag} 首页面板仍在那行字**下面**（面板底 ${o.panel.bottom} vs 入口顶 ${o.entry.top}）⇒ 那行字在首屏底部，朝下开就是掉出那一屏`);
          else eq(o.panel_above_entry, false, `${tag} ${page} 的面板跑到那行字上面去了（朝上开那条分支漏了宿主页）`);
          /* 面板顶端不许盖住导航胶囊那一带以外的东西？——不判：它是浮层，压内容是它的职责（与抽屉同一件事）。
             但同开一次必须只剩一块玻璃（互斥那条行为，逐档判一次）。 */
          eq(o.search_open_after_settings_click, false, `${tag} 点开显示设置之后搜索面板还开着 ⇒ 同开两条通道，Tab 与读屏会被同时带进两块玻璃`);
          ok(Math.abs(o.dx) > 0.5, `${tag} 两枚面板的 x 差是 ${o.dx} ⇒ 读的是同一枚盒子，量具坏了`);
          const slack = Math.min(o.panel.left, o.width - o.panel.right);
          if (thin === null || slack < thin.slack) thin = { tag, slack, rect: o.panel };
        }
        notes.push('⑦ 逐档（真点开拓缝、transition:none 之后读 rect；innerWidth 对账、position、三档媒体查询求值、出盒量、左右内边距对称、入口行溢出、面板朝向都逐行判过）');
        if (thin) notes.push(`⑦ 最薄的一档：${thin.tag} 上面板左右各留 ${thin.slack.toFixed(2)}px（相对视口）`);
        else problems.push('⑦ 一档都没量成交回来的数 ⇒ 这一格的判据正在空转');
        assert.ok(!bad.length, `逐档读数在上面那几行；这一格红了 ${bad.length} 条：\n        ${bad.join('\n        ')}`);
        return n;
      });
    }
  }
}

/* ==================== 打印 ==================== */
console.log('── search-check（站内搜索：产物形状 + shipped 刀口 + 真打一遍字）');
console.log(`  产物  ${DIST}` + (existsSync(INDEX_PATH) ? ` —— search.json ${(statSync(INDEX_PATH).size / 1024).toFixed(1)} KB / ${product ? product.docs.length : '?'} 篇文档` : ' —— 读不到 dist/search.json'));
console.log(`  稿件  源码 ${CORPUS.length} 篇 · 可见 ${VISIBLE.length} 篇 · 草稿 ${DRAFTS.length} 篇`);
console.log(`  探针  ${PROBE ? `「${PROBE.word}」→ 只落在 ${PROBE.slug} 的正文里（全站 ${PROBE.total} 处、标题与摘要都不含它）` : '（没挑出来 ⇒ 命门那几格没有对象，已记为红）'}；反例「${ABSENT || '（拼不出来）'}」`);
console.log(`  浏览器 ${EDGE || '（没找到 ⇒ ⑤⑥⑦ 没跑）'}`);
if (notes.length){ console.log('  读数：'); for (const x of notes) console.log(`    ${x}`); }
/* ⚠️ 最后一枚总闸：一枚断言都没跑成就等于"检查没跑"，退出码 0 是假绿（§14 第 14 格立的那条规矩：
   注册表为空⇒红、一格都没抓到⇒红并打印"判据正在空转"）。`cell` 已经逐格拦 asserted=0，
   这一枚拦的是"所有格都被 if 跳过"那种整体空转——比如 ONLY 拼错、dist 指错目录。 */
if (!asserted && !problems.length) problems.push('判据正在空转：一条断言都没跑过（所有格都被跳过了）—— 这不算绿');
if (problems.length){
  console.log(`\n✗ search-check 红了 ${problems.length} 条：`);
  for (const x of problems) console.log(`  · ${x}`);
  console.log(`  （跑过的断言：${asserted} 条 —— 红的时候也要看见数了多少条，否则分不清"判据坏掉"与"判据抓到东西"）`);
  process.exit(1);
}
console.log(`\n✓ 站内搜索：${notes.length} 组读数、${asserted} 条断言全过 —— 索引吃的是正文、草稿没进来、探针词命中那一篇、零结果走的是那句实话`);
