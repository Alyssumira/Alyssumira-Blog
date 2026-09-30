/* taxonomy-check.mjs —— 分类/标签/草稿/置顶（第十轮 `card/taxonomy`）＋ 系列/序数（第十五轮 `card/series`）
   ＋ 不列入（第十五轮 `card/unlisted`）
   这一族的**结构 + 行为**门禁
   用法  node tools/taxonomy-check.mjs            （接进 npm run check，跑在 build 之前，不需要 dist/）
         node tools/taxonomy-check.mjs --list     （外加打印当前稿件算出来的分类/标签/系列清单——0 枚也打）

   ── 它管哪几件事，为什么每件都得有 ──────────────────────────────────────────
   ① **唯一入口**：全站读 posts 只准走 `src/lib/posts.js` 那两枚读函数（`visiblePosts()` 与
      `publishedPosts()`，两枚的分工与两枚的 filter 都在那一格点名）。
      要堵的是"草稿过滤漏一处"——最坏的那种假完成不是列表难看，是"列表里没有、详情页照样能访问、
      订阅源里还带着它、关于页还在数它"。漏的那一处不会自己报告，所以这里朝两个方向查：
      别处出现 `getCollection(` ⇒ 红；posts.js 里那一枚也没了 ⇒ 也红（判据不许被"删掉就绿"过关，
      同 §17 那条 palette-check 的反向牙）。
   ② **八个调用点确实在用那份**：点名 index / essays 列表 / essays 详情（getStaticPaths 那一格最容易漏）/
      rss / atom / about / 系列索引 / 单枚系列页（最后两枚是第十五轮 `card/series` 添的），
      每处都要出现 `visiblePosts(`。只查①的话，把某处整段删掉也算"没绕过"。
      ⚠️ 第十五轮 `card/unlisted` 起这一格还多钉一件事：`publishedPosts()` 的**合法调用者是一枚名单**
      （第十五轮是一处：详情页 `getStaticPaths`；第十六轮 `card/feedout` 起是两处，加上同一篇的
      原文端点 `essays/[slug]/index.md.js`——两枚答的都是"哪些地址要建出来"，名单逐枚的理由在 cell ② 那一格）。
      名单是**扫 src 现算的**、不是抄的——
      谁哪天拿它去画列表或算邻居，这一格直接点名是哪个文件（邻居那一步要是吃了它，
      不列入的稿子就会出现在别人的上一篇／下一篇里，"站内任何一处都不指向它"当场破）。
   ③ **schema 那一侧同源**：`content.config.ts` 必须声明四枚 taxonomy 键 ＋ 两枚系列键（`series`／`seriesOrder`）
      ＋ 一枚 `unlisted`，且 draft/pinned/unlisted/series **不许 coerce**、必须经过那层"空值退回 undefined"。
      判的是代码形状，不是注释——coerce 那一条是 §12"假语境"的牙（`z.coerce.boolean()` 把 `"false"` 也铸成 true，
      一篇作者要发的稿子会自己消失而构建全绿；`unlisted` 那一枚换的是"稿子自己从目录里消失"，同一个形状）。
      ⚠️ `seriesOrder` 那一枚**用 coerce.number() 是合法的**（与 `hour` 同一枚形状、
      空值先退回 undefined 所以铸不出 0），这一格钉的是它的下界必须是 `positive()`、不许被换成 `min(0)`。
   ④ **判据本身还有牙**（行为，不是文本）：拿假 post 对象喂 shipped 的那几个纯函数，
      逐条要求"该红的红"：草稿为真 ⇒ isDraft 真；不列入为真 ⇒ isUnlisted 真、而 isDraft 仍旧假
      （两枚键读反／读串了就是这一格的红——两枚键长得一模一样，抄一行改一个键是最常见的坏法）；
      置顶 ⇒ 排在最前；逗号字符串/空标签 ⇒ 不进清单；
      两个不同名字撞同一枚 slug ⇒ groupBy 抛。⚠️ 这一格存在的原因写在 §14 第 14 项：
      "判据的坑从来不是太严，是坏了也不响"——① ② ③ 都是文本判据，文本判据管不住逻辑写反。
   ⑤ **真实稿件的清单算得出**：用 shipped 的分组函数把 posts/ 过一遍，断言每组的 slug 非空且互不相同
      （空 slug ⇒ /categories// 那种死锚点；重复 ⇒ 两个名字并成一页）。零枚是合法状态（空态），
      但**一枚都没扫到**（读不到稿件文件）就是判据空转 ⇒ 红。
      ⚠️ 这一格的 `visible` 从第十五轮起与页面那一侧同一条 filter（滤草稿 **＋** 滤不列入）：
      不列入的那一篇不在任何一格清单里，正如它不在 `/categories/` 的任何一行里。
      那句"0 枚不列入"同样自带一枚"填了就读得到"的内置 fixture（口径照下面第⑥格那两枚）——
      它必须是**稿子里真没填**，不是工具读不到那一枚键。
   ⑥ **剥离器自校**（`card/stripped`）：`codeOnly` 是③ ①② 都依赖的尺子，旧版正则不认字符串，
      `content.config.ts:29` 的 glob pattern 引号串里星与斜相邻、成了假块注释的开头，一路吃到 `:38` 注释的收口才停，把 `:31`–`:35` 五枚 schema 键
      整段吃掉（实测改前 title:/date:/excerpt:/cover:/hour: 全"没了"）。§16 的硬规矩：判据两侧都要有格子——
      这里用两枚内置 fixture 钉住"字符串里的假注释符不许吃代码 / 真注释里的坏写法必须照抹"，
      任何一侧红了就说明剥离器又被改坏。不需要动 src/，也不读 dist/。
*/
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import { isDraft, isUnlisted, sortPosts, cleanName, taxSlug, categoryOf, tagsOf, feedTerms, groupBy, tagGroups, bySize, parseFlag } from '../src/lib/taxonomy.js';
import { seriesOf, orderOf, seriesGroups } from '../src/lib/series.js';
import { splitFm, readTaxonomy } from './frontmatter.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let asserted = 0;                       /* 每一格自己上报跑了几条断言；0 ⇒ 这一格在空转 */
const problems = [];
const notes = [];
function cell(id, label, fn){
  let n = 0, threw = null;
  try { n = fn() || 0; }
  catch (e){ threw = e; }
  /* 一格死了只报一次：抛出来的那条就是原因，不再补一句"asserted=0"（两条都进账单会淹掉真正的那句） */
  if (threw){ problems.push(`${id} ${label}：${threw && threw.message ? threw.message : threw}`); return; }
  if (!n){ problems.push(`${id} ${label}：asserted=0（这一格一个断言都没跑就交了白卷）`); return; }
  asserted += n;
  notes.push(`${id} ${label}：${n} 条断言 ✓`);
}

/* ---------- 文件清单：src 下的 .astro / .js / .ts（源码，不看 dist，不看 node_modules） ---------- */
function walk(dir, out = []){
  for (const e of readdirSync(dir, { withFileTypes: true })){
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(astro|js|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}
const SRC = walk(join(ROOT, 'src'));
const rel = p => relative(ROOT, p).replace(/\\/g, '/');
const readSrc = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
/* 判据看的是**代码**：块注释、HTML 注释、整行 `//` 先抹掉（口径照 gap-check 的 strip，行尾 // 不剥——
   剥它会连 `https://` 那种值一起吃掉）。⚠️ 残余局限照实登记：把真调用藏进字符串里的绕过看不见，
   这一格查的是"代码形状"，兜底的那一格在 runtime-check（它拿 dist/ 产物对账，字符串骗不过它）。
   ⚠️ `card/stripped` 起这枚是**字符串感知**的逐字符扫描器。旧版三枚正则不认字符串：
   `content.config.ts:29` 的 glob pattern 引号串里星斜相邻，被旧版当成块注释开始、一路抹到 `:38` 那个注释的收口才停，
   把 `:31`–`:35` 五枚 schema 键整段吃掉——实测改前 `title:/date:/excerpt:/cover:/hour:` 过函数后全部"没了"，
   今天没假绿只因为 ③ 只断言 `:39` 之后的四枚键。往后任何落在收口之前的新键（`author`/`sourceLink`/`series`…）
   判"没出现"＝假绿、想红也红不起来。三种抹除的语义一律照旧：块注释要见到收口才算数（没有收口的不抹，
   旧版正则同样不抹）、HTML 注释必须 `-->` 才收、行注释到行尾收且不吃换行（行号口径不变）；
   新增的只有"字符串态（`'`、`"`、`` ` ``，认 `\` 转义）里的注释起始符不算注释"。
   `'`/`"`/`` ` `` 遇裸换行即退出字符串态——.astro 正文里的撇号不该把后面整页拖成字符串。两侧格子在 ⑥。
   ⚠️ 残余盲区照实登记（新旧皆盲，方向不同）：正则字面量里的反引号数不配对时（实测 markdown.js:132 的
     FENCE_IN 一枚），那一行的行尾注释会漏抹——代价至多是"注释文本多活一行"，旧版的代价则是把真代码抹没
     （Layout.astro 的 JSON 串 `"/*"` 实测吃掉后面四行）；跨行模板串同理不保。本仓 src 里两种代价今天都
     没落在任何断言上，兜底仍在 runtime-check。 */
const codeOnly = (input) => {
  const n = input.length;
  let out = '';
  let i = 0;
  let lineStart = 0;                       /* 当前行在 input 里的起点，供"整行 // "判定 */
  while (i < n){
    const c = input[i];
    if (c === "'" || c === '"' || c === '`'){
      out += c; i++;
      while (i < n){
        const d = input[i];
        if (d === '\\'){ out += d + (i + 1 < n ? input[i + 1] : ''); i += 2; continue; }
        if (d === '\n') break;             /* 裸换行即退出字符串态（' " ` 同口径）：正文里的撇号、正则字面量里的
                                               反引号都不该把后面整页拖进字符串态；跨行模板串是已知盲区、照实登记 */
        out += d; i++;
        if (d === c) break;
      }
      continue;                            /* 字符串内容原样保留——判据要能看见它 */
    }
    if (c === '/' && input[i + 1] === '*'){
      const close = input.indexOf('*/', i + 2);
      if (close !== -1){ out += ' '; i = close + 2; continue; }
    }
    if (c === '<' && input.startsWith('<!--', i)){
      const close = input.indexOf('-->', i + 4);
      if (close !== -1){ out += ' '; i = close + 3; continue; }
    }
    if (c === '/' && input[i + 1] === '/' && !/\S/.test(input.slice(lineStart, i))){
      const eol = input.indexOf('\n', i);  /* ^\s*//…$ 的既有语义：整行抹成一枚空格、保留行尾换行 */
      out += ' ';
      i = eol === -1 ? n : eol;
      continue;
    }
    if (c === '\n'){ out += c; lineStart = i + 1; i++; continue; }
    out += c; i++;
  }
  return out;
};

/* ---------- ① 唯一入口 ---------- */
cell('①', '读 posts 的唯一入口（别的调用点一律红；两枚读函数的 filter 各在其位）', () => {
  const lib = 'src/lib/posts.js';
  const hits = [];
  for (const p of SRC){
    const f = rel(p);
    const src = codeOnly(readSrc(p));
    for (const m of src.matchAll(/\bgetCollection\s*\(\s*['"]posts['"]\s*\)/g)) hits.push({ f, at: src.slice(0, m.index).split('\n').length });
    /* 别的集合名不在此列（things/notes 是 src/data/site.js，不是 content collection）；
       出现 `getCollection(变量)` 这种写法的也抓不到——照实登记在未验到，不假装它不存在 */
  }
  const bypass = hits.filter(h => h.f !== lib);
  for (const h of bypass) problems.push(`① ${h.f}:${h.at} 直接 getCollection('posts') —— 草稿过滤绕开了 lib/posts.js 那一份，`
    + `于是会出现"列表里没有、详情页照样能访问 / 订阅源里还带着它"那一族假完成：改成 await visiblePosts()`);
  const inLib = codeOnly(readFileSync(join(ROOT, 'src', 'lib', 'posts.js'), 'utf8').replace(/\r\n/g, '\n'));
  assert.ok(/getCollection\s*\(\s*['"]posts['"]\s*\)/.test(inLib), '① src/lib/posts.js 里没有 getCollection(\'posts\') —— 唯一入口自己没了，"没有第二处"是删出来的假绿');
  assert.ok(/!isDraft\(/.test(inLib), '① src/lib/posts.js 里不再滤草稿（找不到 !isDraft(）—— 入口还在，牙被拔了');
  /* 第十五轮 `card/unlisted` 那一枚牙：两枚读函数都必须在，而且**各滤各的**——
     `publishedPosts` 只滤草稿（建路用），`visiblePosts` 多滤一道不列入（列出与邻居用）。
     少了 `!isUnlisted(` ＝ 那一枚键形同虚设（稿子照常被列出来，而作者以为藏起来了）；
     把它写进 `publishedPosts` 那一行 ＝ 那一枚地址当不存在（这一条的另一半在第②格与 runtime-check 的产物格）。 */
  assert.ok(/export async function publishedPosts\(/.test(inLib), '① src/lib/posts.js 里没有 publishedPosts() —— 建路那一半的入口没了（详情页要么拿整份集合自己 filter、要么根本烘不出不列入的页）');
  assert.ok(/!isUnlisted\(/.test(inLib), '① src/lib/posts.js 里不再滤不列入（找不到 !isUnlisted(）—— unlisted 那枚键形同虚设，稿子照旧进列表与 feed');
  assert.ok(bypass.length === 0, `① 有 ${bypass.length} 处绕开唯一入口（上面逐条点名了）`);
  notes.push(`① 扫了 ${SRC.length} 份源码，getCollection('posts') 共 ${hits.length} 处，全在 ${lib}`);
  return 5 + (hits.length ? 1 : 0);
});

/* ---------- ② 八个调用点点名 ＋ publishedPosts 的调用者名单 ---------- */
cell('②', '读 posts 的页面都在吃 visiblePosts()，而 publishedPosts() 只有详情页一处', () => {
  const CALLERS = [
    'src/pages/index.astro',
    'src/pages/essays/index.astro',
    'src/pages/essays/[slug].astro',
    'src/pages/rss.xml.js',
    'src/pages/atom.xml.js',
    'src/pages/about.astro',
    /* 第十五轮 `card/series` 那两份模板：索引页与每一枚系列页都必须吃同一份草稿过滤——
       漏一处就是"列表里没有、/series/<slug>/ 的地址照样烘出来"那一族假完成。 */
    'src/pages/series/index.astro',
    'src/pages/series/[name].astro',
  ];
  let n = 0;
  for (const f of CALLERS){
    const p = join(ROOT, f);
    assert.ok(existsSync(p), `② ${f} 不在了 —— 这一格在评空气`);
    const src = codeOnly(readSrc(p));       /* 注释里写一句"用 visiblePosts()"不算数：看的是代码 */
    assert.ok(/from\s+'[^']*lib\/posts\.js'/.test(src), `② ${f} 没有 import lib/posts.js —— 那份草稿过滤不吃它`);
    assert.ok(/visiblePosts\s*\(/.test(src), `② ${f} import 了却没调用 visiblePosts() —— 名字在、活儿没干（草稿照旧会漏）`);
    n += 2;
  }
  /* 详情页那一格是最容易漏的：过滤必须落在 getStaticPaths 里，落在别处都不算 */
  const detail = codeOnly(readSrc(join(ROOT, 'src/pages/essays/[slug].astro')));
  const gsp = /export async function getStaticPaths\s*\([\s\S]*?\)\s*\{[\s\S]*?\n\}/.exec(detail);
  assert.ok(gsp, '② 详情页找不到 getStaticPaths —— 这一格的对象没了');
  assert.ok(/visiblePosts\s*\(/.test(gsp[0]), '② 详情页的 getStaticPaths 里没有 visiblePosts() —— 那就是"列表没有、地址照样烘出来"那一格，全卡最容易漏的一处');
  assert.ok(/publishedPosts\s*\(/.test(gsp[0]), '② 详情页的 getStaticPaths 里没有 publishedPosts() —— 那一枚地址建不出来（不列入＝"只有拿到地址的人能读"，不是"这条路不存在"）');
  /* ②·第二半（第十五轮 `card/unlisted`）：**`publishedPosts()` 的调用者名单现扫现算**、合法的那一个名字钉死。
     为什么这一条要在这儿：它是"含不列入"的那一枚读函数，被多一处用就破一处语义——
     拿它算邻居 ⇒ 不列入的稿子出现在别人的上一篇／下一篇里；拿它画列表 ⇒ 它整篇回到 `/essays/`；
     拿它喂 feed／索引 ⇒ 订阅者收到一封"作者说没发"的推送。名单不抄进本文件（抄了就是第二处真值，
     而且下一轮多一处合法调用者时它会先红在错误的方向上）⇒ 这里扫 src，比的是"扫到的 == 应当有的"。
     ⚠️ 空名单同样红（"删掉调用者"也算绕过），判据不许被"删了就绿"过关——同第①格那枚反向牙。
     ⚠️ 名单从第十六轮 `card/feedout` 起是**两枚**，两枚答的是同一个问题："哪些地址要烘出来"——
       · `src/pages/essays/[slug].astro`：详情页的 `getStaticPaths`（第十轮立、第十五轮改成这一枚读函数）
       · `src/pages/essays/[slug]/index.md.js`：同一篇的原文 Markdown 端点（`/essays/<slug>/index.md`）
     第二枚为什么必须吃 `publishedPosts()` 而不是 `visiblePosts()`：那一枚文件与它的 HTML 页是**同一条地址的两枚表示**，
     "页在而原文 404"就是"页面活着、原件没了"那种不对称形状，而不列入那一族的语义恰恰是"地址是活的、站内没人指它"。
     它因此不许被换成 `visiblePosts()`（换了这一格当场少一枚、红），也不许多出第三枚（多了就是有人拿"建路"当"列出"用）。 */
  const PUB_CALLERS = ['src/pages/essays/[slug].astro', 'src/pages/essays/[slug]/index.md.js'];
  const pub = [];
  for (const p of SRC){
    const f = rel(p);
    if (f === 'src/lib/posts.js') continue;            /* 定义处不算调用者 */
    if (/publishedPosts\s*\(/.test(codeOnly(readSrc(p)))) pub.push(f);
  }
  /* 两边各排一次再比：名单来自走盘顺序（`SRC` 那一份），而"谁在名单里"才是判据——
     拿顺序当判据的话，下一轮任何一次文件改名或目录调整都会红在无关的地方（假红比漏检更坏，§16 那条）。 */
  assert.deepEqual(pub.slice().sort(), PUB_CALLERS.slice().sort(),
    `② publishedPosts() 的调用者现扫到 ${pub.length ? pub.join(' / ') : '零处'}，而合法的名单是 ${PUB_CALLERS.join(' / ')}`
    + ` —— 这一枚是"只滤草稿、含不列入"的那一份，合法的用法只有一种：**回答"哪些地址要烘出来"**。`
    + `多一处用（列表／邻居／feed／索引）就多一处让不列入的稿子露头，`
    + `少一处（零处＝详情页退回自己 filter 或干脆不建路）就是把"地址是真的"那一半做没了`);
  n += 1;
  return n + 3;
});

/* ---------- ③ schema 那一侧同源 ---------- */
cell('③', 'content.config.ts 的七枚键（taxonomy 四枚 + 系列两枚 + 不列入一枚：不许 coerce 的照旧、空值退回 undefined）', () => {
  const src = codeOnly(readSrc(join(ROOT, 'src', 'content.config.ts')));
  /* 注释先抹掉：content.config.ts 里那段警告文字**故意**抄着 `z.coerce.boolean()` 这个坏写法（讲它为什么禁），
     不抹的话判据会被自己的例子命中——同 §9 那条"注释里别抄坏值"的教训。 */
  const KEYS = {
    category: /category:\s*blankSlot\(z\.string\(\)\.default\(''\)\)/,
    tags: /tags:\s*blankSlot\(z\.array\(z\.string\(\)\)\.default\(\[\]\)\)/,
    draft: /draft:\s*blankSlot\(z\.boolean\(\)\.default\(false\)\)/,
    pinned: /pinned:\s*blankSlot\(z\.boolean\(\)\.default\(false\)\)/,
    /* 不列入那一枚**必须与 draft 逐字符同形**（同一枚 blankSlot、同一个 `default(false)`）：
       两处形状一分叉，"没填 ⇒ 照常被列出"这条就变成两处各说一遍。 */
    unlisted: /unlisted:\s*blankSlot\(z\.boolean\(\)\.default\(false\)\)/,
  };
  let n = 0;
  for (const [k, re] of Object.entries(KEYS)){
    assert.ok(re.test(src), `③ schema 的 ${k} 不是"blankSlot + 空值默认"那一枚写法 —— "没填 ⇒ 不出现"这条断了（要么必填炸构建，要么默认值不是空）`);
    n++;
  }
  /* ⚠️ 这一条是本卡最像"洁癖"、也最值钱的一条：coerce 会把假语境铸出来。
     `z.coerce.boolean()` 连 `draft: "false"` 都读成 true（非空字符串全真），一篇作者要发的稿子从站上整个消失，
     而 build 一点不红——§12 禁假数字的近亲。所以查的是**代码里不许出现**那串，不是注释里写了什么。
     第十五轮 `card/unlisted` 起那一枚也在这一句的名单里：它被 coerce 铸成 true 的形状是
     "一篇作者照常发的稿子从列表／feed／搜索里消失，而构建全绿"——同一枚假语境，换了个键。 */
  const badCoerce = /(?:draft|pinned|unlisted)[^\n]*z\.coerce\.boolean\(\)/.exec(src);
  assert.ok(!badCoerce, `③ draft/pinned/unlisted 用了 z.coerce.boolean()（"${badCoerce && badCoerce[0]}"）—— 那会把 "false"、"no"、"0" 全铸成 true`);
  const badString = /(?:category|tags)[^\n]*z\.coerce\./.exec(src);
  assert.ok(!badString, `③ category/tags 里出现了 z.coerce.（"${badString && badString[0]}"）—— 空着的键会被铸成 0 或 "false"，那是假语境的近亲`);
  /* 空值那一层必须在：`default()` 只放行 undefined，YAML 里空着的键交来的是 null（同 hour 那枚先例的口径） */
  assert.ok(/const blankSlot = t => z\.preprocess\(\s*v => \(v === null \|\| v === ''\) \? undefined : v\s*,\s*t\)/.test(src),
    '③ blankSlot 那层 preprocess 没了或换了口径 —— `tags:`／`category:` 空着（null）会撞进 zod 的英文堆栈');

  /* ---- 第十五轮 `card/series` 那两枚键（同一格管，因为它们是"同一族口径"的第三次使用）----
     判的都是**代码形状**：`series` 必须吃同一枚 blankSlot（不许必填、不许 coerce），
     `seriesOrder` 必须是"空值退回 undefined ＋ coerce.number().int().positive()"那一枚形状。 */
  assert.ok(/series:\s*blankSlot\(z\.string\(\)\.default\(''\)\)/.test(src),
    '③ schema 的 series 不是"blankSlot + 空串默认"那一枚写法 —— 空着的 `series:`（YAML 落 null）会撞进 zod 的英文堆栈，'
    + '或者必填把"没填 ⇒ 不出现"这条断了（作者留个空键就该正常构建）');
  const badSeriesCoerce = /^\s*series:[^\n]*z\.coerce\./m.exec(src);
  assert.ok(!badSeriesCoerce, `③ series 用了 z.coerce.（"${badSeriesCoerce && badSeriesCoerce[0]}"）—— coerce.string() 把空着的键铸成 "null"，`
    + '`.default(\'\')` 就再也不认得：schema 全绿，而页面替作者署下一个他没写过的系列名');
  assert.ok(/seriesOrder:\s*z\.preprocess\(\s*v => \(v === null \|\| v === '' \|\| v === undefined\) \? undefined : v\s*,\s*z\.coerce\.number\(\)\.int\(\)\.positive\(\)\.optional\(\)/.test(src),
    '③ seriesOrder 不是"照 hourSlot 那枚形状（preprocess 退回 undefined ＋ coerce.number().int().positive().optional()）"—— '
    + '少了 preprocess，空着的 `seriesOrder:` 会被 coerce 铸成 0，而 0 是"第 0 篇"（编出来的序）');
  /* 这一枚是**合法**的 coerce（与 draft/pinned/category/tags 那一句相反）：正整数 + 空值先退回 undefined，
     铸不出 0。所以这里查的是"不许改成 min(0)、也不许改成必填"，不是"不许出现 coerce"。 */
  assert.ok(/z\.coerce\.number\(\)\.int\(\)\.positive\(\)/.test(src) && !/seriesOrder:[\s\S]{0,400}?\.min\(/.test(src),
    '③ seriesOrder 的下界不是 positive()（被换成 min(0) 那一类写法）—— `seriesOrder: 0` 会当成合法输入，第一篇就从"第 0 篇"数起来了');
  return n + 7;
});

/* ---------- ④ 判据自己有牙（行为） ---------- */
cell('④', 'shipped 的那几个纯函数吃反例（逻辑写反这族文本判据看不见）', () => {
  const mk = (id, data) => ({ id, data: { category: '', tags: [], draft: false, pinned: false, unlisted: false, ...data } });
  const d = mk('drafty', { draft: true });
  assert.equal(isDraft(d), true, '④ isDraft 对 draft:true 读成假 —— 草稿过滤就是形同虚设');
  assert.equal(isDraft(mk('live', {})), false, '④ isDraft 对没填读成真 —— 所有稿子都会消失');
  assert.equal(isDraft(mk('f', { draft: false })), false, '④ isDraft 对 false 读成真');

  /* ---- 不列入那一枚（第十五轮 `card/unlisted`）：三档读数 ＋ 两枚"读串键"的反例 ----
     ⚠️ 那两枚反例是这一格里唯一管得住"把上一行复制下来改一个键"的牙：`isDraft` 与 `isUnlisted` 的形状
        逐字符相同（`!!post.data.<键>`），一旦后者被写成读 `draft`，① ② ③ 三格**全绿**——
        文本判据看不见逻辑，而产物上两件事会并成一件：那一枚地址既不建、也不列入清单，
        "unlisted＝发了但只有拿到地址的人读得到"当场退化成"draft＝没发"。这一条就是它在这儿的全部理由。 */
  assert.equal(isUnlisted(mk('hid', { unlisted: true })), true, '④ isUnlisted 对 unlisted:true 读成假 —— 那一枚键形同虚设，稿子照旧进列表与 feed');
  assert.equal(isUnlisted(mk('live2', {})), false, '④ isUnlisted 对没填读成真 —— 所有稿子都会从不列入的清单里消失（默认值那条口径被改反）');
  assert.equal(isUnlisted(mk('off', { unlisted: false })), false, '④ isUnlisted 对 false 读成真');
  assert.equal(isUnlisted(mk('d2', { draft: true })), false, '④ isUnlisted 读的是 draft 那一枚键（两枚键被写串了）—— 不列入与草稿会并成一件事：地址也不建了，而"只有拿到地址的人能读"要的正是地址在');
  assert.equal(isDraft(mk('u2', { unlisted: true })), false, '④ isDraft 读的是 unlisted 那一枚键（两枚键被写串了）—— 真草稿会照样进列表、进 feed、被关于页数进去');

  const old = mk('old', { pinned: true, date: new Date('2026-01-01') });
  const nu = mk('new', { date: new Date('2026-09-01') });
  const mid = mk('mid', { date: new Date('2026-05-01') });
  const order = sortPosts([nu, mid, old]).map(p => p.id);
  assert.deepEqual(order, ['old', 'new', 'mid'], `④ sortPosts 的顺序不是"置顶最前 + 其余按日期倒序"，实测读到 ${order.join('/')}`);
  const untouched = sortPosts([nu, mid]).map(p => p.id);
  assert.deepEqual(untouched, ['new', 'mid'], `④ 没有置顶时顺序变了（读到 ${untouched.join('/')}）—— 旧口径"按日期倒序"被改了`);

  assert.equal(tagsOf(mk('t', { tags: [' 散文 ', '散文', '', '……'] })).join('|'), '散文',
    '④ tagsOf 没有做"trim／去重／丢空名／丢没有地址的名字"里的一条 —— 空胶囊或重复胶囊会长出来');
  assert.equal(categoryOf(mk('c', { category: null })), '', '④ categoryOf 把 null 读成了东西');
  assert.equal(feedTerms(mk('f2', { category: '', tags: [] })).length, 0, '④ 一枚 taxonomy 都没写却给了 feed term —— 订阅源里会长出空的 <category>');
  assert.deepEqual(feedTerms(mk('f3', { category: '散文', tags: ['甲'] })), ['散文', '甲'], '④ feedTerms 不是"分类在前、标签在后"');

  assert.equal(taxSlug('注 一'), '注-一', '④ taxSlug 没复用 safe()（中文带空格的名字被清坏了）');
  assert.equal(taxSlug('……'), '', '④ taxSlug 对纯标点名字没清成空串 —— /categories// 那种死锚点会出生');
  assert.equal(cleanName('a  b '), 'a b', '④ cleanName 不折叠内部空白：同一件事会开出两枚 slug');

  /* 撞名必须**抛**（不许静默合并） */
  let threw = false;
  try { groupBy([mk('a', { category: '散文 笔记' }), mk('b', { category: '散文-笔记' })], categoryOf); }
  catch { threw = true; }
  assert.ok(threw, '④ 两枚不同名字并成了同一个分类页却没抛 —— 合并等于替作者把两件事说成一件');
  const same = groupBy([mk('a', { category: '散文' }), mk('b', { category: ' 散文 ' })], categoryOf);
  assert.equal(same.length, 1, '④ 同一个名字的两种写法并成了两枚分类（写法差不算撞车，算同一个）');
  const empty = groupBy([mk('a', { category: '' }), mk('b', {}) ], categoryOf);
  assert.equal(empty.length, 0, '④ 没填分类的稿子被算进了清单');
  const tg = tagGroups([mk('a', { tags: ['甲', '乙'] }), mk('b', { tags: ['甲'] })]);
  assert.deepEqual(bySize(tg).map(g => `${g.slug}:${g.posts.length}`), ['甲:2', '乙:1'], '④ 标签分组或篇数排序坏了（篇数多的在前）');

  /* 布尔的读法：YAML 1.2 核心 schema 只认那六个字面量 */
  assert.equal(parseFlag('true').value, true, '④ parseFlag("true") 不是真');
  assert.equal(parseFlag('FALSE').value, false, '④ parseFlag("FALSE") 不是假');
  assert.equal(parseFlag('yes').ok, false, '④ parseFlag 把 yes 当布尔收下了 —— schema 那一侧会炸，两边不同源');
  assert.equal(parseFlag('"false"').ok, false, '④ parseFlag 把带引号的 "false" 当布尔收下了');
  assert.deepEqual([parseFlag('').filled, parseFlag('').value], [false, false], '④ 空着的 draft 该是"没填 ⇒ 默认 false"');
  assert.equal(parseFlag('constructor').ok, false, '④ parseFlag 认到了原型链上的键（`draft: constructor` 被当成布尔）—— 查表得用 hasOwn，不是 in');

  /* ---- 系列那一族的排序规则（第十五轮 `card/series` 那条裁决的牙）----
     文本判据管不住"逻辑写反"：把 `every` 写成 `some`、或把混排当成"更聪明"，① ② ③ 全都照样绿。
     所以这里直接拿 shipped 的 `seriesGroups()` 喂三组假 post，要求**两种落点各读各的顺序**。 */
  const mkS = (id, series, seriesOrder, date) => ({
    id, data: { category: '', tags: [], series, seriesOrder, date: new Date(date) },
  });
  /* 甲：整组都有 order，而 order 与 date **方向相反** ⇒ 必须按 order（作者说了的顺序就是顺序） */
  const full = seriesGroups([
    mkS('third', '雾中练习', 3, '2026-01-01'),
    mkS('first', '雾中练习', 1, '2026-09-09'),
    mkS('second', '雾中练习', 2, '2026-05-05'),
  ]);
  assert.equal(full.length, 1, '④ 同一枚名字的三篇被并成了多枚系列（或反之：分组坏了）');
  assert.equal(full[0].by, 'order', '④ 整组都有 seriesOrder 却没按 order 排 —— 作者写过的顺序被机器换掉了');
  assert.deepEqual(full[0].posts.map(p => p.id), ['first', 'second', 'third'], '④ order 升序读不出来（应该 1→2→3，与日期方向无关）');
  assert.equal(full[0].posts.length, 3, '④ 组内枚数（`共 M 篇` 那个 M）数错了 —— 那是这一族唯一能上屏的数');
  /* 乙：**缺一枚** order ⇒ 整组退回按 date，不许"有 order 的在前、缺的在后"那种混排
     （混排＝机器替作者编了一个他没说过的顺序，§12 假语境的近亲）。这一条是本卡最值钱的断言。 */
  const gap = seriesGroups([
    mkS('third', '雾中练习', 3, '2026-01-01'),
    mkS('novalue', '雾中练习', undefined, '2026-03-03'),
    mkS('first', '雾中练习', 1, '2026-09-09'),
  ]);
  assert.equal(gap[0].by, 'date', '④ 有一枚缺 seriesOrder 却让这一组仍按 order 排（或混排）—— 规则是"缺一枚就整组退回日期"');
  assert.deepEqual(gap[0].posts.map(p => p.id), ['third', 'novalue', 'first'],
    '④ 退回按 date 那一档没按日期升序（先写的在前）—— 读到的顺序不是这条规则说的那个');
  /* 序数读法的边界：`0`／负数／非整数统统＝没填（`positive()` 那一侧的同一条口径） */
  assert.equal(orderOf(mkS('a', 'x', 0, '2026-01-01')), undefined, '④ orderOf 把 seriesOrder: 0 当成了合法输入 —— "第 0 篇"是编出来的序');
  assert.equal(orderOf(mkS('a', 'x', -2, '2026-01-01')), undefined, '④ orderOf 把负数当成了合法输入');
  assert.equal(orderOf(mkS('a', 'x', null, '2026-01-01')), undefined, '④ orderOf 把空着的键读成了东西 —— 整组会错按 order 排');
  const zero = seriesGroups([mkS('a', '雾中练习', 0, '2026-01-01'), mkS('b', '雾中练习', 2, '2026-02-02')]);
  assert.equal(zero[0].by, 'date', '④ 一枚 `seriesOrder: 0` 被当成了"有 order"，于是这一组按编出来的序排起来了');
  /* 没有地址的名字不进清单（`/series//` 是 §12 的死锚点）；没填的稿子也不进任何一格 */
  assert.deepEqual(seriesGroups([mkS('a', '。', 1, '2026-01-01'), mkS('b', '', 1, '2026-02-01'), mkS('c', null, undefined, '2026-03-01')]), [],
    '④ 纯标点／空着的系列名被算进了清单 —— /series/ 那会长出一枚没有地址的条目、详情页那一行会指到 /series//');
  assert.equal(seriesOf(mkS('a', ' 雾中 练习 ', 1, '2026-01-01')), '雾中 练习', '④ seriesOf 没走 cleanName（折叠内部空白那一半丢了）');
  assert.equal(taxSlug(seriesOf(mkS('a', ' 雾中 练习 ', 1, '2026-01-01'))), '雾中-练习',
    '④ 名字进 URL 的那一步不是 taxSlug（这里不许有第二份归一化，清单与地址迟早分叉）');
  /* 两枚不同名字撞同一枚 slug ⇒ 抛（与分类同一份 groupMany，同一条牙） */
  let sThrew = false;
  try { seriesGroups([mkS('a', '雾中 练习', 1, '2026-01-01'), mkS('b', '雾中-练习', 2, '2026-02-01')]); }
  catch { sThrew = true; }
  assert.ok(sThrew, '④ 两枚不同的系列名并成同一个 /series/<slug>/ 却没抛 —— 合并等于替作者把两件事说成一件');
  /* 多枚系列并存时的清单排序仍走 bySize（篇数多的在前），与 /categories/、/tags/ 同一把尺子 */
  const multi = bySize(seriesGroups([
    mkS('a', '乙串', 1, '2026-01-01'), mkS('b', '乙串', 2, '2026-02-01'),
    mkS('c', '甲串', 1, '2026-03-01'),
  ]));
  assert.deepEqual(multi.map(g => `${g.slug}:${g.posts.length}`), ['乙串:2', '甲串:1'], '④ 系列清单的排序不是"篇数多的在前"（bySize 那一把尺子换了）');
  return 21 + 15 + 5;
});

/* ---------- ⑤ 真实稿件：清单算得出、slug 唯一 ---------- */
cell('⑤', 'posts/ 真实稿件过一遍 shipped 的分组函数（分类 / 标签 / 系列三族 ＋ 不列入那一枚 filter）', () => {
  const DIR = join(ROOT, 'src', 'content', 'posts');
  const files = existsSync(DIR) ? readdirSync(DIR).filter(f => f.endsWith('.md')) : [];
  assert.ok(files.length > 0, '⑤ 读不到任何稿件文件（src/content/posts 空/不存在）—— 这一格在空转');
  const posts = [];
  let draft = 0;
  for (const f of files){
    const raw = readFileSync(join(DIR, f), 'utf8');
    const parsed = splitFm(raw);
    assert.ok(parsed, `⑤ ${f} 的 front matter 不成形（--check 那一格应该已经拦下它了）`);
    const tax = readTaxonomy(parsed.fmText);
    assert.equal(tax.errors.length, 0, `⑤ ${f}：${tax.errors[0]}`);
    if (tax.draft) draft++;
    posts.push(mkPost(f.slice(0, -3), tax, parsed.fm.date));
  }
  /* ⚠️ 这一枚 filter 从第十五轮起与页面那一侧**同一条**（滤草稿 ＋ 滤不列入，`src/lib/posts.js` 的
     `visiblePosts()` 就是这个形状）：不列入的那一篇不该在任何一格清单里——正如它不在 `/categories/`、
     `/tags/`、`/series/` 的任何一行里。工具这里少滤一道，就会把"清单里有它、产物里没有它"报成假红。 */
  const visible = sortPosts(posts.filter(p => !isDraft(p) && !isUnlisted(p)));
  const hid = posts.filter(p => isUnlisted(p));        /* 盘上真值现算的名单：今天 0 枚也要有这一枚数可报 */
  const cats = bySize(groupBy(visible, categoryOf));
  const tags = bySize(tagGroups(visible));
  const series = bySize(seriesGroups(visible));
  for (const g of cats.concat(tags, series)){
    assert.ok(g.slug !== '', `⑤ 分组里冒出一枚空 slug —— /categories//、/tags// 或 /series// 是 §12 的死锚点`);
    assert.ok(g.posts.length > 0, `⑤ 分组 "${g.name}" 一篇稿子都不带，它不该出现在清单里`);
    /* 不列入的那一篇不许留在任何一格清单里（这一格是"filter 少写一道"的结构性牙：
       它红的时候，产物那一侧的形状是 `/categories/<那一枚>/` 里有一行指向那一页、而目录与 feed 全干净） */
    assert.ok(!g.posts.some(p => isUnlisted(p)), `⑤ "${g.name}" 这一格里还坐着不列入的那一篇（${g.posts.filter(p => isUnlisted(p)).map(p => p.id).join('、')}）`
      + ` —— 那一枚分类/标签/系列页会画出一行指向它，"站内任何一处都不指向它"当场破`);
  }
  const slugs = cats.concat(tags).map(g => g.slug);
  assert.equal(new Set(slugs).size, slugs.length, '⑤ 分类与标签里有两枚同名 slug —— 两个页面会抢同一个地址');
  const sSlugs = series.map(g => g.slug);
  assert.equal(new Set(sSlugs).size, sSlugs.length, '⑤ 两枚系列名归一化成同一枚 slug —— 两串稿子会并成同一个 /series/<slug>/');
  /* ⚠️ 防空转（这一格下面那句"系列 0 枚"的全部可信度在这儿）：0 必须是因为**稿子里真没填**，
     而不是因为工具侧读不到那一枚键。拿一枚内置 fixture 走同一份 `readTaxonomy` ＋ 同一份 shipped 的
     `seriesGroups()`，验一次"填了就读得到、也进得了清单"——两侧各有格子（口径照 ⑥ 那两枚 fixture）。 */
  const seen = readTaxonomy('title: 探针\nseries: 雾中练习\nseriesOrder: 2\n');
  assert.equal(seen.errors.length, 0, `⑤ fixture 读系列键时报了错（${seen.errors[0]}）—— 收集器本身坏了，下面那个 0 不可信`);
  assert.equal(seen.series, '雾中练习', '⑤ 工具侧读不到 series 那一行 —— 于是"系列 0 枚"是**读不出东西**，不是零对象（这一格在空转）');
  assert.equal(seen.seriesOrder, 2, '⑤ 工具侧读不到 seriesOrder —— 每一组都会永远退回按 date 排，而打印里看不出来');
  assert.equal(seriesGroups([mkPost('fixture', seen, '2026-01-01')]).length, 1,
    '⑤ 名字读到了却进不了清单（shipped 的分组函数与工具侧读法脱钩了）');
  /* 同一枚形状的**第二对**格子（第十五轮 `card/unlisted`）：下面那句"不列入 0 枚"的可信度全在这儿——
     0 必须是因为稿子里真没填那一枚键，而不是因为工具读不到它。
     "填了就读得到"与"没填就读成假"两半各一枚断言（口径照上面那对系列 fixture 与 ⑥ 那两枚）：
     只钉前一半的话，工具把 `unlisted` 恒读成 true 也照样绿，而产物那一侧看到的是"全站一篇都不列"。 */
  const seenU = readTaxonomy('title: 探针\nunlisted: true\n');
  assert.equal(seenU.errors.length, 0, `⑤ fixture 读 unlisted 那一枚键时报了错（${seenU.errors[0]}）—— 收集器本身坏了，下面那句"不列入 0 枚"不可信`);
  assert.equal(seenU.unlisted, true, '⑤ 工具侧读不到 unlisted 那一行 —— 于是"不列入 0 枚"是**读不出东西**，不是零对象（这一格在空转）');
  assert.equal(readTaxonomy('title: 探针\n').unlisted, false, '⑤ 没写 unlisted 那一行却被读成真 —— 每一篇都会被当成不列入，站上任何清单都留不住稿子（默认值那一侧的反例）');
  assert.equal(isUnlisted(mkPost('fixture-u', seenU, '2026-01-01')), true,
    '⑤ 键读到了却进不了 shipped 的判据（工具侧那一份读法与 isUnlisted() 脱钩了）');
  notes.push(`⑤ ${files.length} 篇（草稿 ${draft} 篇已排除）· 分类 ${cats.length} 枚 · 标签 ${tags.length} 枚 · 系列 ${series.length} 枚`
    + ` · 不列入 ${hid.length} 枚${hid.length ? `（${hid.map(p => p.id).join('、')}：已按 visiblePosts() 的口径从三族清单里滤掉）` : '（稿子里那一行全空着 ⇒ 三族清单用的就是整份已发布稿件）'}`
    + `${cats.length + tags.length + series.length === 0 ? ' ⇒ /categories/、/tags/ 与 /series/ 三页都走空态（这是今天签字的状态，不是坏了）' : ''}`);
  if (args.includes('--list')){
    console.log('  分类清单：' + (cats.map(g => `${g.name}(${g.slug})×${g.posts.length}`).join(' ') || '（一枚都没有：空态）'));
    console.log('  标签清单：' + (tags.map(g => `${g.name}(${g.slug})×${g.posts.length}`).join(' ') || '（一枚都没有：空态）'));
    console.log('  系列清单：' + (series.map(g => `${g.name}(${g.slug})×${g.posts.length} 按 ${g.by}`).join(' ') || '0 枚（空态：三篇稿子的 series 那一行都空着）'));
    console.log('  不列入清单：' + (hid.map(p => p.id).join(' ') || '0 枚（空态：没有一篇写着 unlisted: true）'));
  }
  return files.length * 2 + slugs.length + sSlugs.length + 5 + 4 + cats.length + tags.length + series.length;
});
function mkPost(id, tax, date){
  return { id, data: {
    category: tax.category, tags: tax.tags, draft: tax.draft, pinned: tax.pinned, unlisted: tax.unlisted,
    series: tax.series, seriesOrder: tax.seriesOrder,
    date: new Date(date || '2026-01-01'),        /* seriesGroups 的第二档排序要吃 date，缺了会比较出 NaN */
  } };
}

/* ---------- ⑥ 剥离器自校（两枚内置 fixture，不动 src/） ---------- */
cell('⑥', 'codeOnly 自己也要有尺子：字符串感知 + 真注释照抹，两侧各一枚 fixture', () => {
  /* fixture A（朝宽——剥离器必须咬住字符串里的假注释开头）：形状取自 content.config.ts:29 的真实触发点。
     glob pattern 那枚引号串里同时躺着假开头与假收口（星斜相邻），真代码行排在真注释的收口之前；旧版三枚正则会把中间那行整段吃掉
     （改前实测 title:/cover:/hour: 全"没了"），所以断言：过 codeOnly 之后那行真 schema 键必须还在。 */
  const A = [
    "  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),",
    "    cover: z.string().default(''),",
    "    /* 分类/标签（第十轮）。白名单不是装饰 */",
  ].join('\n');
  const outA = codeOnly(A);
  assert.ok(outA.includes("cover: z.string().default('')"),
    '⑥ fixture A：glob 字符串里的 /* 又把后面的真代码吃掉了 —— 剥离器退回了不认字符串的旧版，'
    + '落在收口注释之前的 schema 键会被判"没出现"＝假绿');
  assert.ok(!outA.includes('白名单不是装饰'), '⑥ fixture A：真块注释没被抹掉 —— 抹除语义被改宽了，注释里的字会冒充代码');
  /* fixture B（朝窄——它不许误放）：真块注释里**故意**抄着坏写法 z.coerce.boolean()（讲它为什么禁），
     这是 ③ 那格必须靠抹注释才不误伤自己的例子；若有人"顺手改成不抹块注释"，③ 会被自己的例子打红。
     断言：坏写法过 codeOnly 之后必须已经不在，而注释外的真代码照常留着。 */
  const B = [
    "/* ⚠️ 一律不做 coerce：z.coerce.boolean() 把 \"false\" 也铸成 true，稿子会自己消失 */",
    "const draft = blankSlot(z.boolean().default(false));",
  ].join('\n');
  const outB = codeOnly(B);
  assert.ok(!outB.includes('z.coerce.boolean()'),
    '⑥ fixture B：真块注释里的坏写法没被抹掉 —— 剥离器不吃注释了，③ 会把自己举的反例当成违规代码');
  assert.ok(outB.includes('blankSlot(z.boolean().default(false))'), '⑥ fixture B：抹注释顺手把真代码也抹了 —— 太窄，判据会瞎');
  notes.push(`⑥·A 朝宽（glob 串里的假注释开头不许吃真代码）：cover 行过 codeOnly 后${outA.includes("cover: z.string().default('')") ? '还在' : '没了'}、`
    + `尾注释抹除${outA.includes('白名单不是装饰') ? '失守' : '照常'} ✓`);
  notes.push(`⑥·B 朝窄（真块注释里的坏写法必须照抹）：z.coerce.boolean() 过 codeOnly 后${outB.includes('z.coerce.boolean()') ? '还在（失守）' : '已不在'}、`
    + `注释外真代码${outB.includes('blankSlot(z.boolean().default(false))') ? '留着' : '被误杀'} ✓`);
  return 4;
});

/* ---------- 打印 ---------- */
if (notes.length) for (const n of notes) console.log(`  ${n}`);
if (problems.length){
  console.log(`\n✗ taxonomy-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log(`\n✓ 分类/标签/草稿/置顶/系列/不列入：六格共 ${asserted} 条断言全过，读 posts 的唯一入口没有被绕开`);
