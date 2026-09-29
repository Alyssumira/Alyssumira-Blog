/* taxonomy-check.mjs —— 分类/标签/草稿/置顶这一族的**结构 + 行为**门禁（第十轮 `card/taxonomy`）
   用法  node tools/taxonomy-check.mjs            （接进 npm run check，跑在 build 之前，不需要 dist/）
         node tools/taxonomy-check.mjs --list     （外加打印当前稿件算出来的分类/标签清单）

   ── 它管哪几件事，为什么每件都得有 ──────────────────────────────────────────
   ① **唯一入口**：全站读 posts 只准走 `src/lib/posts.js` 的 `visiblePosts()`。
      要堵的是"草稿过滤漏一处"——最坏的那种假完成不是列表难看，是"列表里没有、详情页照样能访问、
      订阅源里还带着它、关于页还在数它"。漏的那一处不会自己报告，所以这里朝两个方向查：
      别处出现 `getCollection(` ⇒ 红；posts.js 里那一枚也没了 ⇒ 也红（判据不许被"删掉就绿"过关，
      同 §17 那条 palette-check 的反向牙）。
   ② **六个调用点确实在用那份**：点名 index / essays 列表 / essays 详情（getStaticPaths 那一格最容易漏）/
      rss / atom / about，每处都要出现 `visiblePosts(`。只查①的话，把某处整段删掉也算"没绕过"。
   ③ **schema 那一侧同源**：`content.config.ts` 必须声明四枚新键，且 draft/pinned **不许 coerce**、
      必须经过那层"空值退回 undefined"。判的是代码形状，不是注释——coerce 那一条是 §12"假语境"的牙
      （`z.coerce.boolean()` 把 `"false"` 也铸成 true，一篇作者要发的稿子会自己消失而构建全绿）。
   ④ **判据本身还有牙**（行为，不是文本）：拿假 post 对象喂 shipped 的那几个纯函数，
      逐条要求"该红的红"：草稿为真 ⇒ isDraft 真；置顶 ⇒ 排在最前；逗号字符串/空标签 ⇒ 不进清单；
      两个不同名字撞同一枚 slug ⇒ groupBy 抛。⚠️ 这一格存在的原因写在 §14 第 14 项：
      "判据的坑从来不是太严，是坏了也不响"——① ② ③ 都是文本判据，文本判据管不住逻辑写反。
   ⑤ **真实稿件的清单算得出**：用 shipped 的分组函数把 posts/ 过一遍，断言每组的 slug 非空且互不相同
      （空 slug ⇒ /categories// 那种死锚点；重复 ⇒ 两个名字并成一页）。零枚是合法状态（空态），
      但**一枚都没扫到**（读不到稿件文件）就是判据空转 ⇒ 红。
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

import { isDraft, sortPosts, cleanName, taxSlug, categoryOf, tagsOf, feedTerms, groupBy, tagGroups, bySize, parseFlag } from '../src/lib/taxonomy.js';
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
cell('①', '读 posts 的唯一入口（别的调用点一律红）', () => {
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
  assert.ok(bypass.length === 0, `① 有 ${bypass.length} 处绕开唯一入口（上面逐条点名了）`);
  notes.push(`① 扫了 ${SRC.length} 份源码，getCollection('posts') 共 ${hits.length} 处，全在 ${lib}`);
  return 3 + (hits.length ? 1 : 0);
});

/* ---------- ② 六个调用点点名 ---------- */
cell('②', '六个读 posts 的页面都在吃 visiblePosts()', () => {
  const CALLERS = [
    'src/pages/index.astro',
    'src/pages/essays/index.astro',
    'src/pages/essays/[slug].astro',
    'src/pages/rss.xml.js',
    'src/pages/atom.xml.js',
    'src/pages/about.astro',
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
  return n + 2;
});

/* ---------- ③ schema 那一侧同源 ---------- */
cell('③', 'content.config.ts 的四枚键（不做 coerce、空值退回 undefined）', () => {
  const src = codeOnly(readSrc(join(ROOT, 'src', 'content.config.ts')));
  /* 注释先抹掉：content.config.ts 里那段警告文字**故意**抄着 `z.coerce.boolean()` 这个坏写法（讲它为什么禁），
     不抹的话判据会被自己的例子命中——同 §9 那条"注释里别抄坏值"的教训。 */
  const KEYS = {
    category: /category:\s*blankSlot\(z\.string\(\)\.default\(''\)\)/,
    tags: /tags:\s*blankSlot\(z\.array\(z\.string\(\)\)\.default\(\[\]\)\)/,
    draft: /draft:\s*blankSlot\(z\.boolean\(\)\.default\(false\)\)/,
    pinned: /pinned:\s*blankSlot\(z\.boolean\(\)\.default\(false\)\)/,
  };
  let n = 0;
  for (const [k, re] of Object.entries(KEYS)){
    assert.ok(re.test(src), `③ schema 的 ${k} 不是"blankSlot + 空值默认"那一枚写法 —— "没填 ⇒ 不出现"这条断了（要么必填炸构建，要么默认值不是空）`);
    n++;
  }
  /* ⚠️ 这一条是本卡最像"洁癖"、也最值钱的一条：coerce 会把假语境铸出来。
     `z.coerce.boolean()` 连 `draft: "false"` 都读成 true（非空字符串全真），一篇作者要发的稿子从站上整个消失，
     而 build 一点不红——§12 禁假数字的近亲。所以查的是**代码里不许出现**那串，不是注释里写了什么。 */
  const badCoerce = /(?:draft|pinned)[^\n]*z\.coerce\.boolean\(\)/.exec(src);
  assert.ok(!badCoerce, `③ draft/pinned 用了 z.coerce.boolean()（"${badCoerce && badCoerce[0]}"）—— 那会把 "false"、"no"、"0" 全铸成 true`);
  const badString = /(?:category|tags)[^\n]*z\.coerce\./.exec(src);
  assert.ok(!badString, `③ category/tags 里出现了 z.coerce.（"${badString && badString[0]}"）—— 空着的键会被铸成 0 或 "false"，那是假语境的近亲`);
  /* 空值那一层必须在：`default()` 只放行 undefined，YAML 里空着的键交来的是 null（同 hour 那枚先例的口径） */
  assert.ok(/const blankSlot = t => z\.preprocess\(\s*v => \(v === null \|\| v === ''\) \? undefined : v\s*,\s*t\)/.test(src),
    '③ blankSlot 那层 preprocess 没了或换了口径 —— `tags:`／`category:` 空着（null）会撞进 zod 的英文堆栈');
  return n + 3;
});

/* ---------- ④ 判据自己有牙（行为） ---------- */
cell('④', 'shipped 的那几个纯函数吃反例（逻辑写反这族文本判据看不见）', () => {
  const mk = (id, data) => ({ id, data: { category: '', tags: [], draft: false, pinned: false, ...data } });
  const d = mk('drafty', { draft: true });
  assert.equal(isDraft(d), true, '④ isDraft 对 draft:true 读成假 —— 草稿过滤就是形同虚设');
  assert.equal(isDraft(mk('live', {})), false, '④ isDraft 对没填读成真 —— 所有稿子都会消失');
  assert.equal(isDraft(mk('f', { draft: false })), false, '④ isDraft 对 false 读成真');

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
  return 21;
});

/* ---------- ⑤ 真实稿件：清单算得出、slug 唯一 ---------- */
cell('⑤', 'posts/ 真实稿件过一遍 shipped 的分组函数', () => {
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
    posts.push(mkPost(f.slice(0, -3), tax));
  }
  const visible = sortPosts(posts.filter(p => !isDraft(p)));
  const cats = bySize(groupBy(visible, categoryOf));
  const tags = bySize(tagGroups(visible));
  for (const g of cats.concat(tags)){
    assert.ok(g.slug !== '', `⑤ 分组里冒出一枚空 slug —— /categories// 或 /tags// 是 §12 的死锚点`);
    assert.ok(g.posts.length > 0, `⑤ 分组 "${g.name}" 一篇稿子都不带，它不该出现在清单里`);
  }
  const slugs = cats.concat(tags).map(g => g.slug);
  assert.equal(new Set(slugs).size, slugs.length, '⑤ 分类与标签里有两枚同名 slug —— 两个页面会抢同一个地址');
  notes.push(`⑤ ${files.length} 篇（草稿 ${draft} 篇已排除）· 分类 ${cats.length} 枚 · 标签 ${tags.length} 枚`
    + `${cats.length + tags.length === 0 ? ' ⇒ /categories/ 与 /tags/ 走空态（这是今天签字的状态，不是坏了）' : ''}`);
  if (args.includes('--list')){
    console.log('  分类清单：' + (cats.map(g => `${g.name}(${g.slug})×${g.posts.length}`).join(' ') || '（一枚都没有：空态）'));
    console.log('  标签清单：' + (tags.map(g => `${g.name}(${g.slug})×${g.posts.length}`).join(' ') || '（一枚都没有：空态）'));
  }
  return files.length * 2 + slugs.length + 1;
});
function mkPost(id, tax){
  return { id, data: { category: tax.category, tags: tax.tags, draft: tax.draft, pinned: tax.pinned } };
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
console.log(`\n✓ 分类/标签/草稿/置顶：六格共 ${asserted} 条断言全过，读 posts 的唯一入口没有被绕开`);
