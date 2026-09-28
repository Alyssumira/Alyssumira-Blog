/* search-check.mjs —— 站内搜索那一格的行为门禁（第十一轮 `card/search`）
   用法  npm run build && node tools/search-check.mjs
         node tools/search-check.mjs --dist=<目录>   （换产物目录；指向空目录 ⇒ 红）
         node tools/search-check.mjs --edge=<路径>   （换浏览器可执行文件；找不到 ⇒ 红，不降级不跳过）
         node tools/search-check.mjs --only=node     （只跑不碰浏览器的那几格）
         node tools/search-check.mjs --only=browser  （只跑浏览器那几格）
         node tools/search-check.mjs --widths=320,375,430,1440   （换面板几何那几档）

   ── 为什么要有第五类门禁：搜索坏掉的四种形状，前四类原理上都看不见 ──────────
     · **索引在、但只有标题（或干脆是空的）** —— `astro build` 绿（端点正常回 200 与合法 JSON）、
       `npm run check` 六关绿（它不看 dist/）、`runtime-check` 绿（它断言的是 `<html>` 上那五枚属性，
       与索引无关）。只有"真往那枚框里打一遍字"能抓到 ⇒ 第 ③④⑤ 格。
     · **索引悄悄少了一篇 / 草稿进来了** —— 产物里那一页还在、列表里那一行还在，
       只有拿源码数一遍"该有几篇"再对索引的篇数才对得出来 ⇒ 第 ② 格。
       判"什么算草稿"吃的是 shipped 的 `isDraft` / `sortPosts`（`src/lib/taxonomy.js`，那份不碰
       astro:content），与 `runtime-check` 同一把尺子，不在这里重猜一遍。
     · **无 JS 时留下一枚点了没反应的放大镜** —— `runtime-check` 的内联隔离档只判五枚属性，
       它不看 `#search` 还在不在 ⇒ 第 ⑥ 格（.js 全 404 那一档读产物 DOM）。
   ⚠️ 防空转照抄 taxonomy-check 的口径：每一格自己上报跑了几条断言，**一格 0 条就算红**
      （§16 那条"检查静默空转、退出码 0、长得像全绿"）。

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

   ── 浏览器那一侧怎么"真打一遍字"（本机可复跑的那条路）────────────────────────
   `--dump-dom` 一次导航拍完就走，给不了输入；本工具不引任何新依赖，走 `pixel-probe.mjs`
   已经签字的那条路：**自带一枚 node:http 喂 dist/，在服务端内存里往真产物末尾追加一段驱动脚本**，
   仓库与 dist/ 一个字节都不改（§16:1243"门禁不该往构建产物里写文件"）。
   产物 HTML 与驱动脚本**同源同端口**，`#search` / `#search-results` 是 shipped `site.js`
   真长出来的节点，读数取自 shipped 代码真写进去的那块 DOM。
   驱动脚本是 `type="module"` 且追加在 `site.js` 那枚 `<script>` **之后**：内联模块脚本按文档顺序
   执行，于是它跑起来时 `searchWrap.hidden = false` 那一步已经发生；外面再套一道轮询等显形。
   ⚠️ 无 JS 档的"拦 .js"是**服务端全局开关**（照抄 runtime-check 的分阶段做法）：那一阶段整批跑，
      两档交错跑会互相污染。
   ⚠️ 两个坑照抄 runtime-check：① 浏览器必须 `spawn`（异步）——`spawnSync` 冻住事件循环，
      自家服务对第一个请求永远不响应，看着像浏览器坏了；② 一次性 profile 删完要等一会儿再复验。
   ⚠️ 本机无头环境 `visibilityState=hidden`、CSS 过渡**不走帧**：这一格因此只读 `classList`、
      `getComputedStyle` 的**计算值**与 `getBoundingClientRect`，并且量 rect 前先 `transition:none`；
      从不读过渡中间态——"读数没变"在这里不等于"功能没跑"。
*/
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

import { splitFm, readTaxonomy } from './frontmatter.mjs';
import { isDraft, sortPosts } from '../src/lib/taxonomy.js';
import { docTokens, queryTerms, searchDoc, INDEX_VERSION } from '../src/lib/search.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = n => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };
const ONLY = opt('only');
const DIST = resolve(opt('dist') || join(ROOT, 'dist'));
const WIDTHS = (opt('widths') || '320,375,430,1440').split(',').map(Number).filter(Number);
const LAUNCH_TIMEOUT = 90_000;

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

/* ==================== 源码侧那批稿子 ====================
   读 .md 原文只为准挑探针词与对账篇数；"哪些篇该进索引"由 shipped 的 isDraft + sortPosts 判。 */
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const CORPUS = (() => {
  const files = existsSync(POSTS_DIR) ? readdirSync(POSTS_DIR).filter(f => /\.md$/i.test(f)).sort() : [];
  assert.ok(files.length, `读不到 ${POSTS_DIR} 里任何一篇 .md ⇒ 探针格与篇数格都没对象，判据空转`);
  return files.map(f => {
    const raw = readFileSync(join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const parsed = splitFm(raw);
    assert.ok(parsed && parsed.fm, `${f}：front matter 不成形（new-post.mjs --check 那格本该先拦下）`);
    const tax = readTaxonomy(parsed.fmText);
    assert.equal(tax.errors.length, 0, `${f}：${tax.errors[0]}`);
    const slug = f.replace(/\.md$/i, '');
    return {
      id: slug, slug,
      data: { draft: tax.draft, pinned: tax.pinned, date: new Date(parsed.fm.date) },
      head: [parsed.fm.title, parsed.fm.excerpt].map(v => String(v == null ? '' : v)).join(' '),
      body: parsed.body || '',
    };
  });
})();
const VISIBLE = sortPosts(CORPUS.filter(p => !isDraft(p)));
const DRAFTS = CORPUS.filter(p => isDraft(p));

/* 二字滑窗：与 `src/lib/search.js` 同一个切法（这里只用来挑词，不参与判定） */
const CJK2 = /^[\u3400-\u4dbf\u4e00-\u9fff]{2}$/;
function bigrams(s){
  const runs = String(s).toLowerCase().replace(/\s+/g, ' ').match(/[\p{L}\p{N}]+/gu) || [];
  const out = [];
  for (const r of runs) for (let i = 0; i + 1 < r.length; i++) out.push(r.slice(i, i + 2));
  return out;
}
/* ==================== 探针词与反例词：每次跑都从盘上现挑 ====================
   探针要同时满足四件事，缺一件第 ④ 那张表就退化成"搜标题"（§12:828 点名的形状）：
   ① 是中文二字窗；② 只落在一篇的**正文**里（标题、摘要、别的篇都不能有它）；③ 全站只出现一次；
   ④ 不在任何一篇正文的前 TRUNC 字里——否则它在 trunc 那一列也是非零，三张表少了一张。
   写死一枚会在下一篇稿子落地那天悄悄失效（那时它可能命中两篇），所以每次现挑；挑不出来就是红。
   反例词同理：由语料派生（换两头拼一枚哪儿都不在的窗），不写死 zzzz——写死那枚在
   "索引压根没建成"的环境里也一样长绿，白拿。 */
const TRUNC = 12;                       // trunc 那一列只留正文前 12 字：短到装不下任何一枚挑中的窗
const PROBE = (() => {
  const seen = new Map();
  for (const p of CORPUS) for (const w of new Set(bigrams(p.body))){
    if (!seen.has(w)) seen.set(w, new Set());
    seen.get(w).add(p.slug);
  }
  const ok = [...seen.entries()]
    .filter(([w, who]) => who.size === 1 && CJK2.test(w) && !CORPUS.some(p => p.head.includes(w) || p.body.slice(0, TRUNC).includes(w)))
    .map(([w, who]) => ({ word: w, slug: [...who][0], total: CORPUS.reduce((n, p) => n + (p.body.split(w).length - 1), 0) }))
    .filter(c => c.total === 1);
  assert.ok(ok.length, `${CORPUS.length} 篇稿子里挑不出"只落在一篇正文里、全站只出现一次、标题与摘要都不含、且不在正文前 ${TRUNC} 字内"的中文二字窗 ⇒ 命门那一格没有对象`);
  return ok.sort((a, b) => a.word.localeCompare(b.word))[0];
})();
const ALLTEXT = CORPUS.map(p => p.body + ' ' + p.head).join(' ');
const ABSENT = (() => {
  const pool = [...new Set(bigrams(ALLTEXT))].filter(w => CJK2.test(w));
  for (const a of pool) for (const b of pool){
    const w = a[0] + b[1];
    if (w === PROBE.word || !CJK2.test(w) || ALLTEXT.includes(w)) continue;
    return w;
  }
  return null;
})();

/* ==================== ① 产物形状 ==================== */
const INDEX_PATH = join(DIST, 'search.json');
let product = null;
cell('①', 'dist/search.json 在、形状对、一个绝对地址都没有', () => {
  assert.ok(existsSync(DIST), `没有构建产物目录 ${DIST} —— 先 npm run build（本工具读 dist/，落点在 gate 不在 check）`);
  assert.ok(existsSync(INDEX_PATH), 'dist/search.json 不在 ⇒ 端点没产出（build 半路炸、路由改动、当成 dev-only 都长这样）');
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
if (product) cell('②', '索引里那批 ⇄ 源码里"可见"那批，一枚不多一枚不少', () => {
  const want = VISIBLE.map(p => `/essays/${p.slug}/`);
  assert.equal(product.docs.length, want.length,
    `索引 ${product.docs.length} 篇、可见稿件 ${want.length} 篇 ⇒ 有一处没走 lib/posts.js 那个唯一入口（草稿进来了，或已发布的掉了）`);
  for (const u of want) assert.ok(product.docs.some(d => d.u === u),
    `${u} 在可见清单里却不在索引里 ⇒ 这一篇永远搜不到，而它在 /essays/ 上明明有一行`);
  for (const d of DRAFTS) assert.ok(!product.docs.some(x => x.u === `/essays/${d.slug}/`),
    `${d.slug} 标着 draft:true 却进了索引 ⇒ 列表里没有它、搜索里却有它：草稿泄漏最新的一种形状`);
  notes.push(`② 索引 ⇄ 源码：可见 ${want.length} 篇逐枚点名（${want.map(w => w.split('/')[2]).join('、') || '零篇'}）；`
    + (DRAFTS.length ? `源码里草稿 ${DRAFTS.length} 篇（${DRAFTS.map(d => d.slug).join('、')}）逐个确认不在索引里`
      : '源码里今天一篇 draft 都没有 ⇒ 草稿那一半今天没有对象（稿子逐枚读了，判据仍算跑过；有载体的一跑登记在回执的变异档）'));
  return want.length + DRAFTS.length + 2;
});

/* ==================== ③ shipped 那一刀命中探针词 ==================== */
if (product) cell('③', '探针词只落在一篇正文里，searchDoc() 命中且只命中那一篇', () => {
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
const shapeIndex = kind => CORPUS.map(p => ({
  u: `/essays/${p.slug}/`,
  t: p.head, e: '',
  k: docTokens(kind === 'title' ? p.head : p.head + ' ' + p.body.slice(0, kind === 'trunc' ? TRUNC : Infinity)),
}));
if (product) cell('④', '三张索引（full / 只喂标题 / 正文截断）在同一枚 searchDoc() 上的读数表', () => {
  const TITLE = shapeIndex('title'), CUT = shapeIndex('trunc');
  assert.ok(ABSENT, '一枚哪篇都没有的窗都没拼出来 ⇒ 反例那一列没有对象（这一格不许退成写死的 zzzz）');
  /* 挑"出现在 ≥2 篇正文里"的那枚窗：这是 full 列与 title 列能差开的地方，也是"命中一篇"
     与"命中一批"分界的证据。挑不到两枚就是红——语料不够造反例时**加一篇稿子再跑**，
      不许把这一格降级成"有一枚单篇窗就算过"。 */
  const perWin = new Map();
  for (const p of CORPUS) for (const w of new Set(bigrams(p.body))){
    if (!CJK2.test(w) || p.head.includes(w)) continue;              // 标题/摘要里有的窗不当探针
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
out.probe = ${JSON.stringify(PROBE.word)};
out.absent = ${JSON.stringify(ABSENT)};
out.static_html = { rows: R().children.length, hint: H().textContent, panel_open: P().classList.contains('open'),
  inert: P().hasAttribute('inert'), vis: getComputedStyle(P()).visibility,
  search_hidden: document.getElementById('search').hidden };
out.state = { theme: document.documentElement.dataset.theme, fog: document.documentElement.dataset.fog,
  grain: document.documentElement.dataset.grain, fireflies: document.documentElement.dataset.fireflies,
  enter: document.documentElement.dataset.enter, clock: (document.getElementById('clock') || {}).textContent,
  fonts: document.fonts ? document.fonts.status : 'none', vis_state: document.visibilityState };
out.revealed = !!(await until(() => !document.getElementById('search').hidden, 8000));
if (out.revealed){
  T().click();
  out.focus_after_open = document.activeElement && document.activeElement.id;
  out.opened = snap();
  type(out.probe);
  out.probe_snap = await until(() => R().children.length > 0, 9000).then(snap);
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
  T().click();
  await wait(120);
  out.reopened = snap();
  document.getElementById('settings-toggle').click();
  await wait(120);
  out.mutual = { search_open: P().classList.contains('open'), settings_open: S().classList.contains('open') };
  document.getElementById('settings-toggle').click();
  T().click();
  await wait(120);
  out.stack = (() => { const a = P().getBoundingClientRect(), b = S().getBoundingClientRect();
    return { dx: r2(a.x - b.x), overlap: !(a.right <= b.left + 0.5 || b.right <= a.left + 0.5) }; })();
}
out.width = innerWidth;
out.nav_links = (() => { const el = document.querySelector('.nav-links'); return el ? rectof(el) : null; })();
out.panel = (() => { const el = P(); const old = el.style.transition; el.style.transition = 'none';
  el.classList.add('open'); el.removeAttribute('inert'); const r = rectof(el);
  el.classList.remove('open'); el.setAttribute('inert', ''); el.style.transition = old; return r; })();
box.textContent = 'DRIVE' + JSON.stringify(out) + 'END';
`;

/* ---- 面板几何的读数路线：同源 iframe，不是 --window-size ----
   ⚠️ 为什么不用 `--window-size=320,900`：本机 Edge 有最小窗口宽度，实测那一档 `innerWidth` 回来是 **504**
      —— 视口根本没设上，读数会一路全绿却量的是 504px 那一档（第一版就是这么红的）。
      CDP 的 `Emulation.setDeviceMetricsOverride`（§11 那批导航读数当年走的就是它）本工具不引：
      引一次就要养一段 WebSocket 客户端，而这一格要的只是"媒体查询按这一档宽度求值之后，
      那块面的盒子落在哪儿"。同源 iframe 的视口就是一个独立视口——媒体查询、`vw`、
      `position:fixed` 全部按 iframe 的宽度算，与被嵌页面自己 resize 到那一档等价，
      而且被测对象仍然是**未改动的真产物**（只有 shipped site.js 在里面跑）。 */
const FRAME_DRIVER = `
const box = document.getElementById('__drive_out');
const r2 = n => Math.round(n * 100) / 100;
const W = ${'' /* 占位，服务端替换 */}__W__;
const f = document.createElement('iframe');
f.style.cssText = 'position:fixed;left:0;top:0;border:0;width:' + W + 'px;height:900px';
f.src = '/';
document.body.appendChild(f);
const out = { want: W };
await new Promise(r => { f.onload = r; setTimeout(r, 12000); });
const d = f.contentDocument, w = f.contentWindow;
out.inner = w.innerWidth;
out.search_hidden_at_load = !!(d.getElementById('search') || { hidden: null }).hidden;
out.mq = { narrow720: w.matchMedia('(max-width:720px)').matches, narrow340: w.matchMedia('(max-width:340px)').matches };
const links = d.querySelector('.nav-links'), nav = d.querySelector('.nav');
out.nav = nav ? { left: r2(nav.getBoundingClientRect().left), right: r2(nav.getBoundingClientRect().right), w: r2(nav.getBoundingClientRect().width) } : null;
out.links = links ? { left: r2(links.getBoundingClientRect().left), right: r2(links.getBoundingClientRect().right), w: r2(links.getBoundingClientRect().width) } : null;
/* 真点开那枚钮：面板由 shipped 的 setOpen 加上 .open / 撤掉 inert，与访客点的是同一条路 */
d.getElementById('search-toggle').click();
await new Promise(r => setTimeout(r, 120));
const p = d.getElementById('search-panel');
p.style.transition = 'none';                       /* 本机不走过渡帧：读终态（§9 那枚滑杆钮同一条口径） */
const pr = p.getBoundingClientRect();
out.open = p.classList.contains('open');
out.inert = p.hasAttribute('inert');
out.vis = getComputedStyle(p).visibility;
out.panel = { left: r2(pr.left), right: r2(pr.right), w: r2(pr.width), y: r2(pr.top) };
out.pos = getComputedStyle(p).position;
/* 显示设置那一枚抽屉同档读数：两枚面板的 x 差与是否重叠 */
d.getElementById('settings-toggle').click();
await new Promise(r => setTimeout(r, 120));
const s = d.getElementById('display-settings');
s.style.transition = 'none';
const sr = s.getBoundingClientRect();
out.settings = { left: r2(sr.left), right: r2(sr.right), w: r2(sr.width) };
out.dx = r2(pr.left - sr.left);
out.overlap = !(pr.right <= sr.left + 0.5 || sr.right <= pr.left + 0.5);
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
      return res({ fail: `驱动脚本没交回读数（dump ${stdout.length} 字节，没有 DRIVE…END 那对标记）\n    <html>=${html ? html[0] : '∅'}\n    #search=${s ? s[0] : '∅'}\n    stderr: ${stderr.slice(-160)}`, raw: stdout });
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
  const source = readFileSync(join(DIST, 'index.html'), 'utf8');
  assert.ok(/<div class="search" id="search" hidden>/.test(source),
    'dist/index.html 的静态产物里找不到那枚带 hidden 的 .search ⇒ 第 ⑥ 格（无 JS 不留空壳）没有对象');
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
      /* 外壳页：不装产品内容，只按 ?w= 那一档开一枚同源 iframe 把**未改动的真产物**装进去量几何。
         它不需要驱动脚本之外的任何东西，也不写进 dist/。 */
      const width = Math.max(240, Math.min(1600, Number(qs.get('w')) || 1440));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>geom ${width}</title></head><body><div id="__drive_out">@@PENDING@@</div>\n<script type="module">\n${FRAME_DRIVER.replace('__W__', String(width))}\n<\/script></body></html>`);
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
  const results = { main: null, nojs: [], rects: [], blocked: 0 };
  try {
    const self = await fetch(base + '/').then(r => r.status).catch(e => 'ERR ' + e.message);
    assert.equal(self, 200, `自家服务连不上（${base}/ → ${self}）：回环被挡时就这么死，是服务侧不是浏览器侧`);
    results.main = await dumpDom(base + '/__drive', mkp(), 1440);
    /* ---- 无 JS 档：整批跑，这一阶段全站 .js 一律 404（两档交错跑会互相污染，照 runtime-check 的分阶段） ---- */
    isolate = true;
    for (const page of ['/', '/essays/', '/about/']) results.nojs.push({ page, r: await dumpDom(base + page, mkp(), 1440, false) });
    results.blocked = served.blocked.size;
    isolate = false;
    for (const w of WIDTHS) results.rects.push({ w, r: await dumpDom(`${base}/__frame?w=${w}`, mkp(), 1440) });
  } finally { server.close(); cleanup(profiles); }
  return results;
}

if (ONLY !== 'node'){
  if (!EDGE || !existsSync(EDGE)){
    problems.push(`浏览器那三格没跑：找不到 msedge（试过 ${EDGE_CANDIDATES.join(' / ')}）—— 不降级、不跳过；这一格没跑就不许把"搜索可用"报成已验到`);
  } else {
    let res = null;
    try { res = await drive(); } catch (e){ problems.push(`浏览器格停在半路：${e.message || e}`); }
    if (res){
      cell('⑤', '真打一遍字：探针词命中那一篇、反例词走那句诚实的零结果、收口三对', () => {
        const d = res.main;
        assert.ok(d && !d.fail, '浏览器那一跑没交付读数：' + (d && d.fail));
        const o = d.json;
        assert.ok(o, '读数里没有 JSON');
        assert.equal(o.revealed, true, '.search 的 hidden 一直没被撤 ⇒ site.js 那段没跑，这一格读的是空气');
        assert.equal(o.focus_after_open, 'search-input', `打开之后焦点在 ${o.focus_after_open}，应落在输入框里（键盘用户点开的东西要能直接打字）`);
        assert.equal(o.opened.inert, false, '面板开着却没撤 inert');
        /* 命门 */
        assert.ok(o.probe_snap && o.probe_snap.n === 1, `输入「${o.probe}」结果里 ${o.probe_snap && o.probe_snap.n} 行（应为 1 行）`);
        assert.deepEqual(o.probe_snap.hrefs, ['/essays/' + PROBE.slug + '/'], `命中 ${o.probe_snap.hrefs.join(' ')}，应为 /essays/${PROBE.slug}/`);
        assert.equal(o.probe_snap.open, true, '读结果的时候面板不是开着的');
        /* 反例 */
        assert.ok(o.absent_snap && o.absent_snap.n === 0, `反例「${o.absent}」结果里还有 ${o.absent_snap && o.absent_snap.n} 行（应为 0）`);
        assert.match(o.absent_snap.hint || '', /没有一篇/, `零结果那一句是 "${o.absent_snap.hint}"，没走到那句诚实的读数`);
        assert.ok(o.absent && o.absent_snap.hint.includes(o.absent), `零结果那句没带访客刚打的那串字（"${o.absent_snap.hint}"）——不回显查询词的"没有找到"读起来像没搜`);
        /* 另两句实话 */
        assert.match(o.punct_snap.hint || '', /没有可搜的字/, `整串标点的读数是 "${o.punct_snap.hint}"，应走"没有可搜的字"，不是"没有一篇里出现过"（"没查"与"查了没有"是两件事）`);
        assert.match(o.empty_snap.hint || '', /可搜/, `清空之后的读数是 "${o.empty_snap.hint}"（应报有几篇可搜）：那一格也不许留空白`);
        assert.equal(o.empty_snap.n, 0, '清空之后结果行没撤干净 ⇒ 拿上一次的结果冒充新输入');
        /* 回车 */
        assert.equal(o.enter_to, '/essays/' + PROBE.slug + '/', `只有一条命中时回车应当走那一页，实测点了 "${o.enter_to === undefined ? '（什么都没发生）' : o.enter_to}"`);
        /* 收口 */
        assert.equal(o.after_esc.open, false, 'Esc 之后面板还开着');
        assert.equal(o.after_esc.inert, true, 'Esc 之后没补回 inert（CSS 撤了而 DOM 还点得动 ⇒ 单一机制）');
        assert.equal(o.after_esc.vis, 'hidden', `Esc 之后计算值 visibility=${o.after_esc.vis}（读的是计算值，本机不走过渡帧）`);
        assert.equal(o.after_esc.focus, 'search-toggle', `Esc 之后焦点在 ${o.after_esc.focus}，应还给那枚入口钮`);
        assert.equal(o.reopened.open, true, '再点一次入口没能重新打开');
        assert.equal(o.reopened.inert, false, '重新打开没撤 inert');
        assert.equal(o.reopened.vis, 'visible', `重新打开之后 visibility=${o.reopened.vis}`);
        /* 两枚弹层：先看它们在几何上本来会重叠（这就是下面那条互斥判据为什么是承重的，不是装饰） */
        assert.equal(o.stack.overlap, true, `两枚面板在 x 上居然不重叠（dx=${o.stack.dx}）⇒ "同开只会叠在一起"那句前提变了，互斥那一条判据要重新判`);
        assert.equal(o.mutual.search_open, false, '点开显示设置之后搜索面板还开着 ⇒ 两块 236px 的玻璃在同一片区域里叠在一起（上面刚量过它们确实重叠）');
        assert.equal(o.mutual.settings_open, true, '点设置钮没开抽屉 ⇒ 这一格读的是空气');
        assert.ok(o.stack.dx > 0, `两枚面板的 x 差 ${o.stack.dx}：搜索面板应挂在设置抽屉右边的另一枚钮下面`);
        /* 静态形状 */
        assert.equal(o.static_html.rows, 0, '静态产物里结果行不是 0 ⇒ 索引被烘进页面了（那才是"没点就有内容"）');
        assert.equal(o.static_html.search_hidden, true, '静态产物里 .search 的 hidden 在 JS 跑之前必须是 true');
        notes.push(`⑤ 探针「${o.probe}」→ ${o.probe_snap.n} 行 = ${o.probe_snap.hrefs[0]}、<mark> ${o.probe_snap.marks} 枚（"${o.probe_snap.marktxt}"）；`
          + `反例「${o.absent}」→ 0 行 + "${o.absent_snap.hint}"`);
        notes.push(`⑤ 另两句：标点 → "${o.punct_snap.hint}"；清空 → "${o.empty_snap.hint}"；回车（唯一命中）→ ${o.enter_to}`);
        notes.push(`⑤ 收口：Esc 后 open=${o.after_esc.open} inert=${o.after_esc.inert} visibility=${o.after_esc.vis} focus=${o.after_esc.focus}；`
          + `重开 open=${o.reopened.open} inert=${o.reopened.inert} visibility=${o.reopened.vis}；两枚面板 x 差 ${o.stack.dx}px、重叠=${o.stack.overlap}`);
        notes.push(`⑤ 环境自证：state=${JSON.stringify(o.state)} width=${o.width}`);
        return 22;
      });

      cell('⑥', '无 JS 档：#search 恒 hidden、结果行零枚、内联脚本那一层照常落地', () => {
        let n = 0;
        assert.ok(res.blocked > 0, '无 JS 档整批跑完，服务一个 .js 都没拦住 ⇒ 这一档其实跑在完整环境里（判据空转）');
        for (const { page, r } of res.nojs){
          assert.ok(!r.fail, `${page} 无 JS 档没交付 DOM：${r.fail}`);
          const html = r.raw || '';
          assert.ok(/<div class="search" id="search" hidden>/.test(html), `${page}：无 JS 档里 #search 的 hidden 不见了 ⇒ 静态产物本身就带一枚点了没反应的入口`);
          assert.equal((html.match(/class="search-row"/g) || []).length, 0, `${page}：静态产物里出现了结果行 ⇒ 索引被烘进页面（"没点就有内容"那一档）`);
          assert.ok(!/search-toggle[^>]*aria-expanded="true"/.test(html), `${page}：静态产物里入口自称已展开`);
          assert.ok(/<html[^>]*data-fog=/.test(html), `${page}：连内联脚本那一层都没落地 ⇒ 这一档跑在了错的环境里`);
          assert.ok(/<div class="settings search-panel"[^>]*inert/.test(html), `${page}：静态产物里的面板不是收起态（inert 没落在 HTML 上，只靠 CSS）`);
          n += 5;
        }
        assert.ok(res.nojs.length >= 2, `无 JS 档只跑了 ${res.nojs.length} 页 ⇒ 六页共用一份 Layout，至少两页才看得见"每一页都有这一格"`);
        notes.push(`⑥ 无 JS 档 ${res.nojs.length} 页（${res.nojs.map(x => x.page).join(' / ')}），拦下的 .js 共 ${res.blocked} 种：`
          + `#search 恒 hidden、结果行 0 枚、面板恒 inert，内联脚本那五枚照常落地`);
        return n;
      });

      cell('⑦', '面板几何：逐档视口下面板整块在视口内', () => {
        let n = 0, thin = null;
        for (const { w, r } of res.rects){
          assert.ok(!r.fail, `${w}px 档没交付读数：${r.fail}`);
          const o = r.json;
          assert.ok(o && o.panel, `${w}px 档读不到面板 rect`);
          assert.equal(o.width, w, `${w}px 档实际 innerWidth=${o.width} ⇒ 视口没设上，这一档不算`);
          assert.ok(o.panel.left >= 0, `${w}px 档面板左缘在 ${o.panel.left}（出视口左边）`);
          assert.ok(o.panel.right <= o.width + 0.5, `${w}px 档面板右缘 ${o.panel.right} > 视口宽 ${o.width}（出视口右边）`);
          assert.ok(o.panel.w > 100, `${w}px 档面板宽 ${o.panel.w} —— 这么窄放不下结果行，几何判据本身坏了`);
          const slack = Math.min(o.panel.left, o.width - o.panel.right);
          if (thin === null || slack < thin.slack) thin = { w, slack, rect: o.panel };
          n += 4;
        }
        assert.ok(res.rects.length >= 3, `只跑了 ${res.rects.length} 档视口 ⇒ §11 那一格要的是逐档读数，不是抽查`);
        notes.push(`⑦ 面板逐档（真展开、transition:none 之后读 rect）：` + res.rects.map(x =>
          `${x.w}px → x=${x.r.json && x.r.json.panel.left}..${x.r.json && x.r.json.panel.right}（宽 ${x.r.json && x.r.json.panel.w}）`).join('  '));
        notes.push(`⑦ 最薄的一档：${thin.w}px 上左右各留 ${thin.slack.toFixed(2)}px`);
        return n;
      });
    }
  }
}

/* ==================== 打印 ==================== */
console.log('── search-check（站内搜索：产物形状 + shipped 刀口 + 真打一遍字）');
console.log(`  产物  ${DIST}` + (existsSync(INDEX_PATH) ? ` —— search.json ${(statSync(INDEX_PATH).size / 1024).toFixed(1)} KB / ${product ? product.docs.length : '?'} 篇文档` : ' —— 读不到 dist/search.json'));
console.log(`  稿件  源码 ${CORPUS.length} 篇 · 可见 ${VISIBLE.length} 篇 · 草稿 ${DRAFTS.length} 篇`);
console.log(`  探针  「${PROBE.word}」→ 只落在 ${PROBE.slug} 的正文里（全站 ${PROBE.total} 处、标题与摘要都不含它）；反例「${ABSENT || '（拼不出来）'}」`);
console.log(`  浏览器 ${EDGE || '（没找到 ⇒ ⑤⑥⑦ 没跑）'}`);
if (notes.length){ console.log('  读数：'); for (const x of notes) console.log(`    ${x}`); }
if (problems.length){
  console.log(`\n✗ search-check 红了 ${problems.length} 条：`);
  for (const x of problems) console.log(`  · ${x}`);
  process.exit(1);
}
console.log(`\n✓ 站内搜索：${notes.length} 组读数、${asserted} 条断言全过 —— 索引吃的是正文、草稿没进来、探针词命中那一篇、零结果走的是那句实话`);
