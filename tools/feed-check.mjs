/* feed-check.mjs —— 「全文 feed」与「`.md` 原文端点」的**产物级**对账（第十六轮 `card/feedout`）
   用法  node tools/feed-check.mjs            （接进 `npm run gate`，跑在 build 之后）
         node tools/feed-check.mjs --list     （外加逐篇的净化前/后字节与两枚 feed 的大小）

   ── 它管哪几件事 ────────────────────────────────────────────────────────────
   ① **篇数 ⇄ 条目数**：名单按 `src/content/posts/*.md` 的 front matter **现算**
      （`tools/frontmatter.mjs` ＋ `src/lib/taxonomy.js`，两枚都不碰 `astro:content`——页面与门禁吃
      同一份判据，§16 那条"门禁一套算法、页面一套算法，然后两边各自赦免同一个错"就是它防的），
      再数 `dist/rss.xml` 的 `<item>` 与 `dist/atom.xml` 的 `<entry>`，枚数与**顺序**都要对上。
   ② **每枚 guid ⇄ canonical**：feed 里的 `guid`/`<id>` 拿**详情页产物里那枚 `<link rel=canonical>`**
      来对，不是拿本工具自己拼的串对。两处字节出自两条不同的构建路径（一枚是 Astro 的 Layout，
      一枚是 feed 端点），对上了才叫"订阅者点进去与访客看到地址栏是同一枚地址"。
   ③ **全文 ⇄ 页面**（这一格是"全文"那两枚字的验收，不是"feed 里有点东西"）：逐篇比
      页面 `.post-body` 与 feed 条目的**标签直方图**与**去壳文字**。净化只许动外壳与地址，
      少一段、吞一章、把边注连字一起吃掉，都在这里红。同一格还点名"剥掉的族"：
      feed 正文里 `id=`／`data-`／`<span`／`<div`／`class=`（`language-` 之外）／`loading=`／`target=`
      各必须 0 枚，`href="#"` 0 枚，站内相对地址 0 枚。
   ④ **`.md` ⇄ 已发布稿**：逐枚 sha256 对源文件（行尾归一 LF）；枚数对 `publishedPosts()` 那一问
      （只滤草稿、**含**不列入），并且 `index.md` 与 `index.html` 必须**同生同死**——
      页在而原文 404、或原文在而页没了，都是本卡点名的坏形状。
      ⚠️ 反面标本是别家那版 `conformance:disabled` 发 200 "File disabled"：一个 200 就在替作者说"这篇发了"。
      所以这里查的不只是"草稿的 `.md` 不在盘上"，还查"草稿那一族**根本不在**名单里"（名单与盘两向都比）。
   ⑤ **两枚 feed 同源**：同一篇在 RSS 的 `content:encoded` 与 Atom 的 `<content type="html">`
      里必须是**同一串字节**（各自解完 XML 转义之后逐字符相同）。两份净化各写一遍迟早有一处漏
      `data-*`——`atom.xml.js` 头上那句"两枚 feed 读同一个 visiblePosts()"今天扩到字段。
      原文那枚地址也在这一格对：RSS 的 `<atom:link rel="alternate" type="text/markdown">` 与
      Atom 的 `<link rel="alternate" type="text/markdown">` 都必须等于 `<guid>index.md`。
   ⑥ **不列入那一族在 `.md` 侧的算术**：`index.md` 的总数 == 已发布（含不列入）的篇数，
      而 feed 里出现的 `.md` 地址枚数 == **可见**篇数（草稿与不列入的一枚都不在）。
      ⚠️ "站内没人指向不列入的那一篇"那一枚全站 href 扫描住在 `tools/runtime-check.mjs`
      （本卡把它的 `pointsTo` 扩到认得 `<page>index.md` 这枚同址写法）——**这里不重做一遍**，
      两处各扫一遍就是两把尺子比谁更宽。

   ── 分层与落点（§16 那条口径）────────────────────────────────────────────────
   这一格读 `dist/` ⇒ 只能在 build 之后 ⇒ 它在 `gate` 里、**排在 `font-subset --check` 之后、
   `search-check` 之前**：它是纯产物对账，不起浏览器，红得最快；把它排在两枚浏览器尺子后面，
   等于每次坏掉都要先白等几十秒。塞进 `npm run check` 是禁止的（干净检出没有 `dist/`，
   红的是环境不是代码——§16 为 `search-check` 记过同一次挪法）。

   ── 为什么它不许 import `src/lib/feed.js` 来算期望值 ─────────────────────────
   `runtime-check` 那条老规矩（"尺子不许由被检物自己出：拿 renderMd 的输出去对 renderMd 的输出，
   渲染器塌了两边一起塌"）同样管这里。所以：
   · ③ 那格的期望值来自**另一条构建路径**（详情页产物），不是本工具重跑一遍净化；
   · ⓪ 那格的内置 fixture 期望串是**手写字面量**，不由 `feedHtml()` 派生；
   · ①④⑥ 的期望值来自 front matter 与盘上文件，与两枚端点无关。
   唯一被 import 的 shipped 代码是 `src/lib/taxonomy.js` 的纯布尔读法（`isDraft`/`isUnlisted`），
   与 `runtime-check` 吃的是同一份。 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFm, readTaxonomy } from './frontmatter.mjs';
import { isDraft, isUnlisted, sortPosts } from '../src/lib/taxonomy.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const args = process.argv.slice(2);
const LIST = args.includes('--list');

const problems = [];
const notes = [];
const red = m => problems.push(m);
const die = (m, hint = '') => { console.error(`\n✗ feed-check 出不了结论：${m}${hint ? `\n  ${hint}` : ''}`); process.exit(1); };

/* ---------- 读盘（缺产物就点名，不许静默跳过——§16 那条 dist/dist 同族的坑） ---------- */
if (!existsSync(DIST)) die('没有 dist/ —— 这一格读的是构建产物，必须在 npm run build 之后跑（npm run gate 里就在 build 之后）');
const readDist = rel => {
  const p = join(DIST, ...rel.split('/'));
  if (!existsSync(p)) return null;
  try { return readFileSync(p, 'utf8'); } catch { return null; }
};
const RSS = readDist('rss.xml');
const ATOM = readDist('atom.xml');
if (RSS === null) die('dist/rss.xml 不在盘上', '⇒ 那一枚端点没烘出来（或改了名字），①②③⑤ 都没有对象');
if (ATOM === null) die('dist/atom.xml 不在盘上', '同上');

/* ---------- 名单：按 front matter 现算，不吃 astro:content、不抄硬编码 ---------- */
const POST_DIR = join(ROOT, 'src', 'content', 'posts');
const all = [];
(function walk(dir, rel = ''){
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })){
    const p = join(dir, e.name);
    if (e.isDirectory()){ walk(p, `${rel}${e.name}/`); continue; }
    if (!/\.md$/i.test(e.name)) continue;
    const raw = readFileSync(p, 'utf8');
    const parsed = splitFm(raw);
    if (!parsed) continue;                        /* 读不到 front matter 的不进名单（照 astro.config.mjs 那一格的口径：宁可不判，不许猜） */
    const tax = readTaxonomy(parsed.fmText);
    if (tax.errors.length) continue;              /* 预检会红在这一篇上（new-post --check），这里不重复报，也不替它放行 */
    const id = `${rel}${e.name.replace(/\.md$/i, '')}`;
    /* 形状照集合那一枚的最小复制：`{ id, data }`——`sortPosts()`／`isDraft()`／`isUnlisted()` 吃的都是
       `.data`，工具里造一个 `{ tax }` 再传给它们就是"页面一套、门禁一套"那族（§16 记过）。
       `date` 走 `new Date(fm.date)`，与 `runtime-check.mjs:250` 同一枚读法（YAML 的 `2026-09-20`
       落成 UTC 零点，全站按 getUTC* 读，见 `markdown.js` 的 `fmtDate`）。 */
    all.push({
      id, body: parsed.body,
      data: { category: tax.category, tags: tax.tags, draft: tax.draft, pinned: tax.pinned,
              unlisted: tax.unlisted, date: new Date(parsed.fm.date) },
    });
  }
})(POST_DIR);
const isD = p => isDraft(p);
const isU = p => isUnlisted(p);
const ordered = sortPosts(all.filter(p => !isD(p)));          /* publishedPosts() 那一问：只滤草稿 */
const visible = ordered.filter(p => !isU(p));                 /* visiblePosts() 那一问：再多滤一道不列入 */
const drafts = all.filter(isD);

/* ---------- XML / HTML 的小读法（本工具自己那一族：只解这一份文档用得上的那几枚实体） ---------- */
/* ⚠️ **单趟**替换，不是逐种实体各 replace 一遍：两趟写法会把 `&amp;lt;`（字面的 "&lt;"）解成 `<`，
   也就是多解一层——而 ③⑤ 比的正是"解一层之后逐字符相同"，多解一层会让两边**一起**错、互相赦免。
   这条自证就钉在 cases 里（`&amp;lt;` 必须交回 `&lt;`）。 */
const xmlUn = s => String(s).replace(/&(quot|lt|gt|apos|amp|#(?:\d+|[xX][0-9a-fA-F]+));/g, (m, k) => {
  if (k === 'quot') return '"';
  if (k === 'lt') return '<';
  if (k === 'gt') return '>';
  if (k === 'apos') return "'";
  if (k === 'amp') return '&';
  const code = k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : Number(k.slice(1));
  return Number.isFinite(code) ? String.fromCodePoint(code) : m;      /* 认不出的形状原样留着，不猜 */
});
const htmlUn = xmlUn;                                         /* 我们只发 & < > " ' 与数字实体这一族（markdown.js 的 esc() 就这几枚），两枚同名是因为两处读的是同一件事 */
const stripTags = s => String(s).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
/* 去壳文字比的是"作者写的话"：全角括号是本卡给边注挑的读法（§11 那一档），空白是排版，都不许进账 */
const norm = s => s.replace(/[\s（）]/g, '');
const textOf = s => norm(htmlUn(stripTags(s)));
const stripComments = s => String(s).replace(/<!--[\s\S]*?-->/g, ' ');
const TAGS = ['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'footer', 'em', 'strong',
              'pre', 'code', 'a', 'img', 'figure', 'figcaption', 'hr',
              'sup', 'section', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
              /* 双语注那一族（四轮 §2-1）：这三枚必须进直方图，否则 ③ 那一格对"feed 把 ruby 拆了壳"是**瞎的**——
                 拆壳只丢外壳、字全留，去壳文字因此两侧仍相等，唯一读得出这件事的就是枚数。
                 登记值（`v11c2/ruby` 复算）：`src/lib/feed.js` 的 ALLOW **28 枚** ⇄ 这一串 **28 枚**，两处等值 → 见 ③ 那格打印
                 （上一版把这笔写成 25——那是加这一族之前的枚数，"两处等值"成立而数字是旧的，没人量过）。
                 ⚠️ 这一格的行程**吃载体**：三篇跟踪样例今天全 `draft: true` ⇒ 出厂态 dist 里 0 枚 ruby ⇒ 同一枚变异
                 （把 `rt` 从 ALLOW 摘掉）在没载体时 rc=0、有载体时 rc=1（红话「③ …rt：页面 10 枚 ⇄ feed 0 枚」），两读数都实测过。
                 `tools/check-markdown.mjs` 那一族 83 行读不到这里——它只 import `markdown.js`，所以"未登记＝拆壳"这一课
                 今天的牙只住在本工具，而本工具的对象是 `dist/`。 */
              'ruby', 'rt', 'rp'];
const histOf = frag => TAGS.map(t => [t, (frag.match(new RegExp(`<${t}(?=[\\s/>])`, 'g')) || []).length]);
const histDiff = (a, b) => {
  const x = Object.fromEntries(a), y = Object.fromEntries(b);
  return TAGS.filter(t => x[t] !== y[t]).map(t => `${t}：页面 ${x[t]} 枚 ⇄ feed ${y[t]} 枚`);
};

/* ---------- 两枚 feed 的条目切分（各自按各自的语法读，不互相顶替） ---------- */
const attr = (tag, name) => { const m = new RegExp(`${name}="([^"]*)"`).exec(tag); return m ? m[1] : ''; };
function readRss(xml){
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const it = m[1];
    const g = /<guid[^>]*>([\s\S]*?)<\/guid>/.exec(it);
    const c = /<content:encoded>([\s\S]*?)<\/content:encoded>/.exec(it);
    const l = /<link>([\s\S]*?)<\/link>/.exec(it);
    const t = /<title>([\s\S]*?)<\/title>/.exec(it);
    const md = /<atom:link\b[^>]*rel="alternate"[^>]*type="text\/markdown"[^>]*href="([^"]*)"/.exec(it)
            || /<atom:link\b[^>]*href="([^"]*)"[^>]*type="text\/markdown"/.exec(it);
    return { guid: xmlUn(g ? g[1] : ''), link: xmlUn(l ? l[1] : ''), title: xmlUn(t ? t[1] : ''),
             content: c ? xmlUn(c[1]) : null, md: md ? xmlUn(md[1]) : null };
  });
}
function readAtom(xml){
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const en = m[1];
    const id = /<id>([\s\S]*?)<\/id>/.exec(en);
    const c = /<content(?:\s+type="html")?>([\s\S]*?)<\/content>/.exec(en);
    const md = /<link\b[^>]*rel="alternate"[^>]*type="text\/markdown"[^>]*href="([^"]*)"/.exec(en)
            || /<link\b[^>]*type="text\/markdown"[^>]*href="([^"]*)"/.exec(en);
    const title = /<title>([\s\S]*?)<\/title>/.exec(en);
    return { guid: xmlUn(id ? id[1] : ''), title: xmlUn(title ? title[1] : ''),
             content: c ? xmlUn(c[1]) : null, md: md ? xmlUn(md[1]) : null };
  });
}

/* ---------- ⓪ 自证：内置 fixture，盘上零枚也照跑（§16 那条"扫了但没匹配到"与"全过"长得一样） ---------- */
/* ⚠️ 期望串是**手写的字面量**，不由 `src/lib/feed.js` 派生——拿被检物自己算期望，
   它坏的时候判据会跟着一起坏（runtime-check 那条"尺子不许由渲染器自己出"的同一族）。 */
const FX_IN = '<p>甲段 <em>斜</em> 与 <code>c</code>，边注<span class="sidenote"><span class="sn-mark">1</span>注文</span>'
  + '一枚注<sup class="fnref" id="fnref-a"><a href="#fn-a">1</a></sup>。</p>'
  + '<div class="codeblock" data-lang="js"><pre class="code"><code>let x = 1; // &lt;b&gt;</code></pre></div>'
  + '<figure class="shot"><span class="frame"><img src="/assets/a.png" alt="图" loading="lazy"></span><figcaption>题</figcaption></figure>'
  + '<div class="tablewrap"><table><thead><tr><th class="al-c">甲</th></tr></thead><tbody><tr><td>乙</td></tr></tbody></table></div>'
  + '<p>链接 <a href="/essays/">站内</a> · <a href="#">坏</a> · <a href="mailto:x@y.test">信</a> · <a href="/things/">旧站</a></p>'
  + '<custom-widget x="1">里面的字要留着</custom-widget>'
  + '<section class="footnotes"><h2 class="fn-title">注</h2><ol><li id="fn-a">注的正文 <a class="backref" href="#fnref-a" aria-label="回到正文第 1 处">&#8617;</a></li></ol></section>';
const FX_KEEP = ['甲段', '斜', '注文', '一枚注', 'let x = 1; // <b>', '题', '甲', '乙',
                 '里面的字要留着', '注的正文', '站内', '坏', '信', '旧站'];
/* ⚠️ `FX_KEEP` 里没有 "图"：那是 `<img alt>`，**属性**不是文字，去壳之后它在两边都不存在。
   alt 那一族由 ③ 单独对（逐张比 alt 串），因为它是作者写的替文而不是排版接线。
   `里面的字要留着` 钉的是本工具那把 `stripTags` 的读法：未登记的标签只丢外壳、字必须留住——
   `src/lib/feed.js` 那条"未登记 ⇒ 拆壳留字"的裁决要在判据侧也成立一次，否则两边一起吞字没人响。 */
function cell0(){
  /* 这一格不 import 净化器——它判的是**产物**是不是那个形状。今天它没有对象时（feed 坏了、
     或产物里根本没有 content）下面的 ③⑤ 会红，所以这里只钉一件只有这里能钉的事：
     **XML 解得开**。③⑤ 都拿 `xmlUn` 解 feed 里的正文，如果解法错了（比如漏了 &quot;），
     下面那几条会在"文字对不上"上红，而红话会让人以为是净化器坏了。这里先给一把独立的尺子。 */
  const cases = [
    ['&lt;p&gt;x&lt;/p&gt;', '<p>x</p>'],
    ['a &amp;amp; b', 'a &amp; b'],                    /* XML 层解一次：`&amp;amp;` → `&amp;`（HTML 层的字面 &amp; 还在） */
    ['&amp;lt;', '&lt;'],                              /* 单趟的凭据：这一串说的是"字面的 &lt;"，不是 `<`。
                                                           两趟写法（先解 &lt; 再解 &amp;）会在这里多解一层，
                                                           而 ③⑤ 的"逐字符相同"就跟着一起错——两边一起错是赦免，不是判据 */
    ['&quot;&lt;&gt;&amp;', '"<>&'],
    ['&#8617;', '↩'],
    ['&#x4e2d;', '中'],
  ];
  let n = 0;
  for (const [src, want] of cases){
    const got = xmlUn(src);
    if (got !== want) red(`⓪ XML 解法自证：xmlUn(${src}) 读出 ${JSON.stringify(got)}，期望 ${JSON.stringify(want)} ⇒ ③⑤ 那些"文字/字节对不上"的红从此不可信`);
    n++;
  }
  /* stripTags 与 textOf 的自证：喂一段**手写**的、已知文本的 HTML，去壳文字必须等于那串字面量。
     少了这一格，"页面与 feed 的去壳文字相同"可能是**两边都被读成空串**的相等（空⇌空也是相等）。 */
  const t1 = textOf('<p>甲段 <em>斜</em></p><figure class="shot"><span class="frame"><img src="/a.png" alt="图"></span><figcaption>题</figcaption></figure>');
  if (t1 !== '甲段斜题') red(`⓪ 去壳自证：textOf(内置片段) 读出 ${JSON.stringify(t1)}，期望 "甲段斜题"（全角括号与空白按本卡口径不进账）⇒ ③ 那一格比的是两个空串`);
  const t2 = textOf(FX_IN);
  for (const w of FX_KEEP) if (!t2.includes(norm(htmlUn(w)))) red(`⓪ 去壳自证：内置 fixture 里去壳读不到 "${w}" ⇒ stripTags 正在吃内容而不只是吃标签，③ 的文字对账不可信`);
  const h = Object.fromEntries(histOf('<ul><li><p>x</p><img src="/a.png" alt=""></li><p>y</p></ul>'));
  if (!(h.ul === 1 && h.li === 1 && h.p === 2 && h.img === 1)) red(`⓪ 直方图自证：内置片段读出 ${JSON.stringify(h)}，期望 ul 1 / li 1 / p 2 / img 1 ⇒ ③ 的枚数对账不可信`);
  /* 产物侧的最小见证：两枚 feed 至少各自读得出**一枚**条目，且那枚条目解得出 title——
     解不出就是正则坏了，此时"篇数 0 ⇄ 0"那种绿毫无意义。 */
  if (!RSS_ITEMS.length && !ATOM_ENTRIES.length && visible.length) {
    red(`⓪ 判据空转：可见稿件 ${visible.length} 篇，两枚 feed 却各读出 0 条（RSS ${RSS_ITEMS.length}／Atom ${ATOM_ENTRIES.length}）`
      + ` ⇒ 要么 feed 端点没发条目，要么本工具的正则读不到它们——两种都不许以"枚数相等"过关`);
  }
  if (RSS_ITEMS.length && !RSS_ITEMS.every(x => x.title)) red('⓪ 判据空转：RSS 条目解出来了却读不到 title ⇒ 条目切分器只抓住了空壳');
  if (ATOM_ENTRIES.length && !ATOM_ENTRIES.every(x => x.title)) red('⓪ 判据空转：Atom 条目解出来了却读不到 title ⇒ 同上');
  notes.push(`⓪ 自证 ${cases.length} 条 XML 解法 ＋ 2 条去壳 ＋ ${FX_KEEP.length} 条 fixture 留存 ＋ 1 条直方图 ＋ 2 条产物可读；`
    + `feed 解析器读到 RSS ${RSS_ITEMS.length} 条／Atom ${ATOM_ENTRIES.length} 条`);
  return 0;
}

const RSS_ITEMS = readRss(RSS);
const ATOM_ENTRIES = readAtom(ATOM);

/* ---------- ① 篇数 ⇄ 条目数 ⇄ 顺序 ---------- */
function cell1(){
  const slugOf = u => { const m = /^https?:\/\/[^/]+\/essays\/([^/]+)\/(?:index\.md)?$/.exec(String(u)); return m ? m[1] : null; };
  for (const [name, items] of [['rss.xml', RSS_ITEMS], ['atom.xml', ATOM_ENTRIES]]){
    if (items.length !== visible.length){
      red(`① ${name} 有 ${items.length} 条，而按 front matter 现算的可见稿件是 ${visible.length} 篇`
        + `（滤草稿 ＋ 滤不列入；草稿 ${drafts.length} 枚、不列入 ${ordered.length - visible.length} 枚）`
        + ` ⇒ feed 那侧的名单与列表页/详情页不再是同一个 filter，"作者以为没发、订阅者收到了"那一族`);
    }
    const got = items.map(x => slugOf(x.guid));
    const want = visible.map(p => p.id);
    for (let i = 0; i < Math.max(got.length, want.length); i++){
      if (got[i] !== want[i]){
        red(`① ${name} 第 ${i + 1} 条是 ${got[i] ?? '（没有这一条）'}，而 visiblePosts() 那一位是 ${want[i] ?? '（名单到这儿就完了）'}`
          + ` ⇒ 条目顺序（置顶在前、其余日期倒序）与列表页/详情页上下篇不是同一份数组，两处各排迟早分叉`);
        break;
      }
    }
    /* guid 必须是 isPermaLink 的那枚页面地址（② 拿它去对 canonical，形状不对就没法对） */
    for (const x of items){
      if (!x.guid || !/^https?:\/\/[^/]+\/essays\/[^/]+\/$/.test(x.guid)) red(`① ${name} 有一枚 guid/id 不是"绝对地址＋一枚尾斜杠"那个形状：${JSON.stringify(x.guid)}`);
      if (name === 'rss.xml' && x.link !== x.guid) red(`① rss.xml 里 ${x.guid} 的 <link> 与 <guid> 不一致（${JSON.stringify(x.link)}）⇒ 阅读器按哪一枚去重都会得到两种答案`);
    }
  }
  notes.push(`① 名单 ${visible.length} 篇（已发布含不列入 ${ordered.length}、草稿 ${drafts.length}）⇄ RSS ${RSS_ITEMS.length} 条 ⇄ Atom ${ATOM_ENTRIES.length} 条，逐位同序`);
  return 1;
}

/* ---------- ② 每枚 guid ⇄ 详情页产物里的 canonical ---------- */
function cell2(){
  let n = 0;
  const canon = new Map();
  for (const p of visible){
    const page = readDist(`essays/${p.id}/index.html`);
    if (page === null){ red(`② dist/essays/${p.id}/index.html 不在（可见稿件的详情页）`); continue; }
    const m = /<link rel="canonical" href="([^"]*)"/.exec(stripComments(page));
    if (!m){ red(`② ${p.id} 那一页没有 <link rel="canonical"> ⇒ guid 无从对账（Layout.astro 那一枚条件节点少了）`); continue; }
    canon.set(p.id, htmlUn(m[1]));
    n++;
  }
  const feedGuids = new Map([['rss.xml', RSS_ITEMS.map(x => x.guid)], ['atom.xml', ATOM_ENTRIES.map(x => x.guid)]]);
  for (const [name, gs] of feedGuids){
    for (const g of gs){
      const id = (/^https?:\/\/[^/]+\/essays\/([^/]+)\/$/.exec(g) || [])[1];
      if (!id) continue;                                   /* ① 已经点过名 */
      if (canon.get(id) !== g) red(`② ${name} 的 guid ${g} 与详情页产物里的 canonical ${JSON.stringify(canon.get(id))} 不是同一枚串`
        + ` ⇒ 订阅者回站的地址与访客地址栏不同（两枚都由 PUBLIC_SITE 拼，但拼法有两处）`);
    }
    /* 反向：每篇可见稿的 canonical 都必须在这两枚 feed 里出现一次 */
    for (const [pid, c] of canon){
      const k = gs.filter(x => x === c).length;
      if (k !== 1) red(`② ${pid} 的 canonical 在 ${name} 里出现 ${k} 次（期望 1）⇒ 条目少了它、或者同一篇被发了两遍`);
    }
  }
  notes.push(`② guid ⇄ canonical：${canon.size} 枚逐一对过（RSS/Atom 各一遍正向、各一遍反向）`);
  return n;
}

/* ---------- ③ 全文 ⇄ 页面：直方图 ＋ 去壳文字 ＋ 剥掉的族 ＋ 每张图 ⇄ 绝对 URL ---------- */
function hostOf(u){ try { return new URL(u).host; } catch { return null; } }
function siteHostOf(){
  const m = /<link>(https?:\/\/[^/]+)\/<\/link>/.exec(RSS);
  return m ? hostOf(m[1]) : null;
}
function cell3(){
  const siteHost = siteHostOf();
  if (!siteHost) red('③ 读不出 feed 的 host（rss.xml 的 <channel><link>）⇒ "每张图都绝对化"那一半没有基准，这一格不许算过');
  let pairs = 0, imgs = 0, before = 0, after = 0;
  for (const p of visible){
    const page = readDist(`essays/${p.id}/index.html`);
    if (page === null) continue;
    const art = /<article class="post-body[^"]*"[^>]*>([\s\S]*?)<\/article>/.exec(stripComments(page));
    if (!art){ red(`③ ${p.id} 那一页里没有 <article class="post-body"> ⇒ 正文的对账没有对象`); continue; }
    const rss = RSS_ITEMS.find(x => x.guid && x.guid.endsWith(`/essays/${p.id}/`));
    const atom = ATOM_ENTRIES.find(x => x.guid && x.guid.endsWith(`/essays/${p.id}/`));
    for (const [name, it] of [['rss.xml', rss], ['atom.xml', atom]]){
      if (!it){ continue; }                              /* ① 已经点过名 */
      if (it.content === null){ red(`③ ${name} 的 ${p.id} 没有正文那一格（content:encoded / content）⇒ "全文 feed"退回了摘要档`); continue; }
      pairs++;
      before += art[1].length; after += it.content.length;
      const dh = histDiff(histOf(art[1]), histOf(it.content));
      if (dh.length) red(`③ ${p.id} 在 ${name} 里的结构与详情页不等：${dh.join('；')}`
        + ` ⇒ 净化器多吃了一枚标签，或 feed 少发了一段（直方图比的是页面 ⇄ feed 两条构建路径）`);
      const pt = textOf(art[1]), ft = textOf(it.content);
      if (pt !== ft) red(`③ ${p.id} 在 ${name} 里的文字与详情页不等长（页面 ${pt.length} 字 ⇄ feed ${ft.length} 字）`
        + ` ⇒ 全文不是全文：净化只许动外壳与地址，不许动作者写的字（差异样例：页面 "${pt.slice(0, 40)}…" ⇄ feed "${ft.slice(0, 40)}…"）`);
      /* alt 是作者写的替文（不是排版接线），所以它单独对一遍：逐张、按出现顺序、整串比。
         少了这一格，"白名单里 img 只留 src 与 alt"这句话可以悄悄退化成"只留 src"而 ③ 全绿——
         图取不到时阅读器念的就是这一串。 */
      const alts = frag => [...frag.matchAll(/<img\b[^>]*?\balt="([^"]*)"/g)].map(m => htmlUn(m[1]));
      const pa = alts(art[1]), fa = alts(it.content);
      if (pa.join('\u0000') !== fa.join('\u0000')) red(`③ ${p.id} 在 ${name} 里的 alt 与详情页不同（页面 ${JSON.stringify(pa)} ⇄ feed ${JSON.stringify(fa)}）`);
      /* 剥掉的族：一枚都不许在 feed 正文里（名单与理由住在 `src/lib/feed.js` 那一段注释）。
         ⚠️ `width=`／`height=`／`srcset=`／`decoding=` 也在被剥的那一族里，这是**裁决不是漏做**：
         那几枚管的是"这一页在我这一屏上不跳动"，而 feed 的那一屏由阅读器排——它自己的图幅策略比我们的
         原图尺寸更知道该留多大（`card/imgdims` 那一族落在页面上，不落到协议里）。
         若哪天要把它们请进 feed，先撤这一行再改白名单，别让它悄悄从判据里消失。 */
      const banned = [
        [' id=', /\bid=/g], [' data-', /\bdata-/g], [' class="（language- 之外）', /class="(?!language-)/g],
        [' <span', /<span\b/g], [' <div', /<div\b/g], [' loading=', /loading=/g], [' target=', /target=/g],
        [' rel=', /\brel=/g], [' href="#"', /href="#"/g], [' aria-hidden', /aria-hidden/g],
        [' width=', /\bwidth=/g], [' height=', /\bheight=/g], [' srcset=', /\bsrcset=/g], [' decoding=', /\bdecoding=/g],
      ];
      for (const [label, re] of banned){
        const k = (it.content.match(re) || []).length;
        if (k) red(`③ ${p.id} 在 ${name} 的正文里还剩 ${k} 枚 ${label} ⇒ 那一族是"只有 essay.css 或 site.js 才成立"的东西，发进订阅协议就是给读者一枚点了没反应的壳`);
      }
      /* 每一枚 href/src 都必须带协议（`http(s)`／`mailto:`）。
         外链不查 host——它本来就该是别人的域名；站内地址才是"必须绝对"的那一半，
         而它的绝对化判据就是"没有相对写法残留"这一条（相对写法在阅读器里没有 host，等于坏图死链）。 */
      const urls = [...it.content.matchAll(/<(?:a|img)\b[^>]*?\bhref="([^"]*)"|<(?:a|img)\b[^>]*?\bsrc="([^"]*)"/g)].map(m => m[1] ?? m[2] ?? '');
      for (const u of urls){
        if (!u){ red(`③ ${p.id} 在 ${name} 里有一枚 <a>/<img> 不带 href/src（本卡允许的唯一形状是"坏协议那枚兜底撤掉 href"；除此之外不许出现空地址）`); continue; }
        if (!/^(?:https?:|mailto:)/i.test(u)) red(`③ ${p.id} 在 ${name} 里有一枚没有协议的地址 ${JSON.stringify(u)} ⇒ 订阅者拿到的 href/src 没有 host，那在阅读器里等于坏图与死链（§12 死锚点的协议版）`);
      }
      /* 每张站内图 ⇄ dist/ 里真存在的那枚文件（feed 里指到盘上没有的图 = 破图，而 build 全绿，
         media-check 那一格管的是 public/ 侧，这里管的是"进 feed 的那一枚字节"确实是绝对地址＋有产物） */
      for (const src of [...it.content.matchAll(/<img\b[^>]*?\bsrc="([^"]*)"/g)].map(m => m[1])){
        imgs++;
        if (!/^https?:/i.test(src) || hostOf(src) !== siteHost) continue;   /* 上面已经红过；这里不重复报，也不去猜它是哪枚文件 */
        let relPath;
        try { relPath = decodeURIComponent(new URL(src).pathname).replace(/^\/+/, ''); }
        catch { red(`③ ${p.id} 在 ${name} 里有一枚解不开的 img src：${src}`); continue; }
        if (!existsSync(join(DIST, ...relPath.split('/')))) {
          red(`③ ${p.id} 在 ${name} 里那张图 ${src} 在 dist/ 里查无此文件（${relPath}）⇒ feed 发给订阅者的是一枚破图`);
        }
      }
    }
  }
  notes.push(`③ 全文 ⇄ 页面：对过 ${pairs} 组（逐篇 × 两枚 feed）· 直方图 ${TAGS.length} 枚标签 × 每组 · 去壳文字逐字符 · 站内图 ${imgs} 枚全部绝对且落得在盘上`
    + ` · 净化前 ${before} 字节 → 净化后 ${after} 字节（feed 里那一串的长度，XML 解回之后）`);
  if (!pairs && visible.length) red(`③ 判据空转：可见 ${visible.length} 篇，一组页面⇄feed 都没配上（正则或产物形状变了）`);
  return 1;
}

/* ---------- ④ `.md` ⇄ 已发布稿：逐枚 sha256 对源文件，枚数对名单 ---------- */
function mdFiles(){
  const out = [];
  (function walk(dir, rel = ''){
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })){
      const p = join(dir, e.name);
      if (e.isDirectory()){ walk(p, `${rel}${e.name}/`); continue; }
      if (e.name === 'index.md' && /^essays\/[^/]+\/$/.test(rel)) out.push({ rel: `${rel}${e.name}`, p });
    }
  })(join(DIST, 'essays'), 'essays/');
  return out;
}
function cell4(){
  const found = mdFiles();
  const want = ordered.map(p => ({ id: p.id, src: join(ROOT, 'src', 'content', 'posts', `${p.id}.md`) }));
  const gotIds = found.map(f => f.rel.split('/')[1]);
  /* 枚数与名字：两向都比（少了＝那一篇没有原文，多了＝有人给没发布的东西发了原文） */
  for (const w of want){
    if (!gotIds.includes(w.id)) red(`④ 已发布稿件 ${w.id} 在 dist/ 里没有 essays/${w.id}/index.md ⇒ 页面活着、原文没了（那一枚 .md 端点的 getStaticPaths 少了一处，或它换了 filter）`);
  }
  for (const g of gotIds){
    if (!want.some(w => w.id === g)) red(`④ dist/essays/${g}/index.md 在盘上，而 ${g} 不在已发布名单里（名单按 front matter 现算：草稿 ${drafts.length} 枚）`
      + ` ⇒ 关掉的稿子有了原文，抓取器拿到的是 200 而不是 404——本卡点名的反面标本形状`);
  }
  /* 逐枚字节：产物 == 源文件（行尾归一 LF） */
  let bytes = 0;
  for (const w of want){
    const f = found.find(x => x.rel.split('/')[1] === w.id);
    if (!f) continue;
    if (!existsSync(w.src)){ red(`④ 读不到源文件 src/content/posts/${w.id}.md（名单是从这一族文件算出来的，这里却要不到）`); continue; }
    const expect = readFileSync(w.src, 'utf8').replace(/\r\n/g, '\n');
    const got = readFileSync(f.p, 'utf8');
    bytes += Buffer.byteLength(got);
    if (got !== expect){
      red(`④ dist/essays/${w.id}/index.md 与仓库那枚文件不是同一串字节（${Buffer.byteLength(got)} ⇄ ${Buffer.byteLength(expect)} 字节）`
        + ` ⇒ "原文 Markdown"这句话不再可判：端点该交 readFileSync(filePath) 归一 LF，不加尾巴、不改一字`);
    }
    if (/\r/.test(got)) red(`④ dist/essays/${w.id}/index.md 里还剩 \\r ⇒ 发出去的字节取决于谁的工作区是 CRLF（这台机器 core.autocrlf=true），与 markdown.js:228 / new-post 的 read() 不再是同一条口径`);
  }
  /* 同生同死：index.md 与 index.html 必须成对（不列入那族的两枚表示都在，草稿两枚都不在） */
  for (const p of ordered){
    const h = existsSync(join(DIST, 'essays', p.id, 'index.html'));
    const m = existsSync(join(DIST, 'essays', p.id, 'index.md'));
    if (h !== m) red(`④ ${p.id}：index.html ${h ? '在' : '不在'} ⇄ index.md ${m ? '在' : '不在'} ⇒ 同一条地址的两枚表示不同生同死`
      + `（端点那侧的 getStaticPaths 必须吃 publishedPosts()，与详情页同一枚读函数）`);
  }
  for (const p of drafts){
    for (const f of ['index.html', 'index.md']){
      if (existsSync(join(DIST, 'essays', p.id, f))) red(`④ 草稿 ${p.id} 的 ${f} 在 dist/ 里 ⇒ 那一枚地址会以 200 交东西出去，而作者标的是"没发"`);
    }
  }
  notes.push(`④ .md ⇄ 已发布：名单 ${want.length} 枚（含不列入 ${ordered.length - visible.length} 枚）、盘上 index.md ${found.length} 枚、合计 ${bytes} 字节；逐枚字节与源文件对过、\\r 0 处`);
  return 1;
}

/* ---------- ⑤ 两枚 feed 同源 ＋ 原文地址 ⇄ guid ---------- */
function cell5(){
  let n = 0;
  for (const p of visible){
    const r = RSS_ITEMS.find(x => x.guid === `https://${siteHostOf()}/essays/${p.id}/`);
    const a = ATOM_ENTRIES.find(x => x.guid === `https://${siteHostOf()}/essays/${p.id}/`);
    if (!r || !a) continue;                                   /* ①② 已经点过名 */
    if (r.content === null || a.content === null){ red(`⑤ ${p.id}：${r.content === null ? 'rss.xml' : 'atom.xml'} 没有正文那一格 ⇒ 两份 feed 一份全文一份摘要，那正是 atom.xml.js 头上警告过的分叉`); continue; }
    if (r.content !== a.content){
      red(`⑤ ${p.id} 的正文在两枚 feed 里不是同一串（RSS ${r.content.length} 字符 ⇄ Atom ${a.content.length} 字符）`
        + ` ⇒ 两枚端点各写了一份净化，迟早有一处漏掉 data-* 或忘了把图钉成绝对地址`);
    }
    const want = `https://${siteHostOf()}/essays/${p.id}/index.md`;
    for (const [name, it] of [['rss.xml', r], ['atom.xml', a]]){
      if (!it.md) red(`⑤ ${name} 的 ${p.id} 没有"原文 Markdown"那枚链接 ⇒ 抓取器/模型拿到全文却回不到可署名的原文`);
      else if (it.md !== want) red(`⑤ ${name} 的 ${p.id} 原文地址是 ${it.md}，期望 ${want}（必须是 guid + index.md，同处派生）`);
      else if (!existsSync(join(DIST, 'essays', p.id, 'index.md'))) red(`⑤ ${name} 说 ${p.id} 的原文在 ${it.md}，而 dist/ 里没有那枚文件 ⇒ §12 死锚点`);
    }
    n++;
  }
  const mdCount = t => (t.match(/text\/markdown/g) || []).length;
  notes.push(`⑤ 同源：${n} 篇逐一对过（正文逐字符 ⇄、原文地址 ⇄ guid + index.md ⇄ 盘上文件）；`
    + `feed 里 text/markdown 那枚类型出现 RSS ${mdCount(RSS)} / Atom ${mdCount(ATOM)} 次（期望各 ${visible.length}）`);
  for (const [name, k] of [['rss.xml', mdCount(RSS)], ['atom.xml', mdCount(ATOM)]]){
    if (k !== visible.length) red(`⑤ ${name} 里有 ${k} 枚 type="text/markdown"，而可见稿件 ${visible.length} 篇 ⇒ 有人给不列入/草稿发了原文地址，或漏了一枚`);
  }
  return 1;
}

/* ---------- ⑥ 不列入那一族在 `.md` 侧的算术 ---------- */
function cell6(){
  const un = ordered.filter(isU);
  const host = siteHostOf();
  for (const p of un){
    /* 原文在盘上（与它的页面同一条命），但任何一处**索引**都不许出现它那一枚 .md 地址 */
    if (!existsSync(join(DIST, 'essays', p.id, 'index.md'))) {
      red(`⑥ 不列入的 ${p.id} 没有 index.md ⇒ "地址是活的"那一半被做窄了：HTML 页在而原文 404，等于替读者分了两等（口径见 §15 那一格）`);
    }
    for (const [name, txt] of [['rss.xml', RSS], ['atom.xml', ATOM], ['llms.txt', readDist('llms.txt') ?? ''], ['search.json', readDist('search.json') ?? ''], ['sitemap-0.xml', readDist('sitemap-0.xml') ?? '']]){
      if (txt.includes(`/essays/${p.id}/index.md`)) red(`⑥ 不列入的 ${p.id} 的原文地址出现在 ${name} 里 ⇒ 目录/索引把原文递出去了（§15 那一格：unlisted 要的是"找不到"，不是"读不到"）`);
    }
    /* 正文里链到别篇原文那一路也归 unlisted 那一族管，但扫描住在 runtime-check（本卡扩了它的 pointsTo），这里不重做 */
  }
  /* 逐篇可见稿在 feed 里都带着自己的原文地址（⑤ 已经逐枚验过），此处只把两族枚数关系钉成一式：
     index.md 总数 == 已发布篇数，feed 里的原文地址枚数 == 可见篇数 ⇒ 差额恰好等于不列入＋草稿那几枚 */
  const mds = mdFiles().length;
  if (mds !== ordered.length) red(`⑥ dist/ 里 index.md ${mds} 枚 ⇄ 已发布（含不列入）${ordered.length} 篇 不等 ⇒ ④ 那格之外再钉这一式：原文端点的名单必须恰好是 publishedPosts()`);
  notes.push(`⑥ 不列入 ${un.length} 枚（${un.map(p => p.id).join('、') || '今天没有对象，上面那三条由 ④⑤ 的算术与 ⓪ 的自证兜住'}）·`
    + ` index.md ${mds} 枚 == 已发布 ${ordered.length} 篇 · feed 里原文地址 ${visible.length} 枚 == 可见篇数`
    + ` ⇒ 差额 ${mds - visible.length} 枚正是"不列入 ${un.length} ＋ 草稿 ${drafts.length}"那一族`);
  return 1;
}

/* ---------- 跑 ---------- */
const counts = [];
for (const [label, fn] of [['⓪', cell0], ['①', cell1], ['②', cell2], ['③', cell3], ['④', cell4], ['⑤', cell5], ['⑥', cell6]]){
  try { counts.push(fn()); }
  catch (e){ red(`${label} 判据自己炸了：${e && e.message ? e.message : String(e)} ⇒ 这一格的读数不作数，别把"没打印"当"没红"`); counts.push(0); }
}

if (LIST){
  console.log('\n逐篇字节（净化前 = 详情页 .post-body 的 HTML；净化后 = feed 正文，XML 解回之后）：');
  for (const p of ordered){
    const page = readDist(`essays/${p.id}/index.html`) || '';
    const art = /<article class="post-body[^"]*"[^>]*>([\s\S]*?)<\/article>/.exec(stripComments(page));
    const it = RSS_ITEMS.find(x => x.guid && x.guid.endsWith(`/essays/${p.id}/`));
    const md = join(DIST, 'essays', p.id, 'index.md');
    console.log(`  ${p.id.padEnd(16)} 页面正文 ${(art ? art[1].length : 0)} · feed 正文 ${(it && it.content ? it.content.length : 0)} · index.md ${existsSync(md) ? Buffer.byteLength(readFileSync(md)) : '∅'} 字节 · 摘要档 ${p.body.length} 字节源`);
  }
  console.log(`  rss.xml ${Buffer.byteLength(RSS)} 字节 · atom.xml ${Buffer.byteLength(ATOM)} 字节（改前那版只放摘要：1299 / 1609）`);
}

for (const n of notes) console.log('  ' + n);
if (problems.length){
  console.error(`\n✗ feed-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.error('  · ' + p);
  process.exit(1);
}
console.log(`✓ 订阅源与原文端点：${counts.filter(Boolean).length} 格判据全过（可见 ${visible.length} 篇 ⇄ RSS ${RSS_ITEMS.length} 条 ⇄ Atom ${ATOM_ENTRIES.length} 条；index.md ${mdFiles().length} 枚 ⇄ 已发布 ${ordered.length} 篇）`);
