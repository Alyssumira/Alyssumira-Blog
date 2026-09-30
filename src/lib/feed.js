/* feed 正文的净化与绝对化（第十六轮 `card/feedout`，§15「订阅源」那一格 / §16「全文 feed 的代价」那一格）。
   这份文件是**纯模块**：不 import `astro:content`、不读 `process.env`、不碰 `astro.config.mjs`——
   所以 `tools/feed-check.mjs` 吃的是同一份实现（§16 那条"门禁一套算法、页面一套算法，然后两边各自赦免
   同一个错"就是它要防的）。取集合的那一步留在两枚 feed 里。

   它只回答一个问题：**`renderMd()` 交出来的那串 HTML，哪些构造能进订阅协议，进来之后长什么样。**
   判据不是"安全与否"（正文里的原始 HTML 早就被 `markdown.js` 的 `esc()` 转义成字面文字，
   围栏里的 `<script>` 也一样按字面出现——§15 那条写死了），而是**语义**：
   页面上那些构造是靠 `essay.css` 与 `site.js` 才成立的，feed 里两份都不在。
   把"只有运行期 JS 才画得出来的东西"发进订阅协议，读者拿到的是一枚点了没反应的壳——
   所以剥与留各有名字、有理由，逐条写在下面 `ALLOW` 之后那一段，别以为"剥属性"是随手清洁。

   ⚠️ 白名单是**写死的**，不是从盘上读的、也不是"遇到未知就放行"：
   未登记的标签一律**拆壳留字**（`<unknown>x</unknown>` → `x`），未登记的属性一律丢。
   方向必须是"留内容、丢外壳"——反过来（丢内容）就是把作者写过的话删掉，
   §11 那条"不许 `display:none` 藏边注"在 feed 侧的同族。 */

/* 页面自己造的那些壳，先按形状拆掉（顺序要紧：都在通用重建之前，那时 class/data-* 还在，
   拆得准；等到通用那一步 class 已经被丢了，形状就认不出来）。 */
function unwrapPageShells(html){
  return String(html)
    /* 代码块：`<div class="codeblock" data-lang="x"><pre class="code"><code>` 是页面那枚复制钮的宿主
       （`site.js` 读 `data-lang` 挂钮），feed 里没有脚本 ⇒ div 与 `data-lang` 都不成立。
       但语言标识是作者写的信息，所以它换个协议认得的写法留下：`<code class="language-x">`
       （阅读器/highlighter 那一族的通用约定）。闭合那半跟着收壳。 */
    .replace(/<div class="codeblock"(?: data-lang="([a-z0-9._+\-]{1,24})")?><pre class="code"><code>/g,
      (m, lang) => '<pre><code' + (lang ? ` class="language-${lang}"` : '') + '>')
    .replace(/<\/code><\/pre><\/div>/g, '</code></pre>')
    /* 表格：`.tablewrap` 是 `overflow-x:auto` 那一格（§11 窄屏整块横向走），feed 里没有滚动容器这回事 */
    .replace(/<div class="tablewrap"><table>/g, '<table>')
    .replace(/<\/table><\/div>/g, '</table>')
    /* 图版：`.frame` 那枚 span 只是 `aspect-ratio` + `overflow:hidden` 的裁切盒（§8.4），
       `<img>` 被绝对定位抱在里头——feed 里没有这张盒子，留一枚空 span 只会让人以为图被包住了 */
    .replace(/<span class="frame">(<img\b[^>]*>)<\/span>/g, '$1')
    /* 边注 `^[文字]`：页面上宽屏浮左缘、窄屏就地用全角括号（¹……）——§11 那条已签的读法。
       feed 里没有边注栏，所以走**窄屏那一档**，字面复用那对全角括号，不新造第三种形状。
       认不出这个形状（渲染器将来改了）也不吞内容：通用那一步会把 span 拆壳、字留下，
       只是少那对括号——宁可形状差一档，不许少字。 */
    .replace(/<span class="sidenote"><span class="sn-mark">(\d+)<\/span>([\s\S]*?)<\/span>/g,
      (m, n, body) => `（<sup>${n}</sup> ${body}）`);
}

/* 留下来的构造（写死；"进 feed 后阅读器里长什么样"的逐条判断在 §15 那一格）。
   值 = 该标签在白名单里允许的**属性**；名单外的属性一律丢。`href`／`src` 另走一路（下面 rebuild），
   因为它们要经过绝对化，不能和别的属性一起落。 */
const ALLOW = {
  p: [], hr: [], h2: [], h3: [],
  ul: [], ol: ['start'], li: [],
  blockquote: [], footer: [],
  em: [], strong: [], sup: [],
  pre: [], code: ['class'],
  figure: [], figcaption: [], img: ['alt'],
  table: [], thead: [], tbody: [], tr: [], th: [], td: [],
  section: [],                     /* 文末那块 `<section class="footnotes">`：留壳不留 class，
                                      它带着 `<h2>注</h2>`，阅读器里就是一节带标题的注 */
  a: ['aria-label'],
};
const VOID = new Set(['img', 'hr', 'br', 'wbr', 'source']);

/* 剥掉的族（点名，写给下一张卡，也写给想"顺手加回来"的人）：
   ① `id` —— 页内锚点的坐标系。一条 feed 住在阅读器自己的文档里，我们的 `fn-注一` / `fnref-注一`
      与它自己的 id 落在同一枚命名空间 ⇒ 撞了就是把阅读器的东西指到我们的注上。
      正文里所有片段 href 都在下面绝对化成"这一篇的页面地址 + 片段"，所以 id 在 feed 里没有一处被引用，
      留着只有撞的风险（真页上那些 id 是构建期发的，指过去一定在）。
   ② 全部 `class` —— 那是 `essay.css` 的词表，feed 里没有那张表。唯一例外是 `code` 上的
      `language-*`：它不是一张待匹配的样式表，而是给阅读器/highlighter 的**数据**。
   ③ 全部 `data-*` —— `data-lang` 之外今天正文里没有第二枚；这一族的存在理由都是"给脚本看"。
   ④ `loading="lazy"` —— 懒加载是"这一页很长"的那笔账，阅读器自己决定何时取图。
   ⑤ `target` / `rel` —— 开不开新窗口是宿主的事，正文 HTML 不该替阅读器决定。
   ⑥ `aria-*`（只留 `a` 上的 `aria-label`）—— 留下的那一枚管的是"↩"这种光看符号读不出意思的回链，
      标签就是它要说的那句话，那是**内容**而不是页面的无障碍接线。
   ⑦ `<span>` / `<div>` 整族 —— 见上面 `unwrapPageShells`：今天它们在正文里只承担盒子。
   ⑧ 目录（`#toc`）、复制钮、灯箱（`<dialog>`）、进度线那一些压根不在 `renderMd()` 的输出里——
      它们是页面模板与脚本画的，不是正文的构造。所以"目录不许进 feed"这一条**不需要**在这里写判据：
      喂进来的那串里没有它。⚠️ 这句是可判的而不是乐观的：`tools/feed-check.mjs` 第③格拿真稿 fixture
      断言 feed 正文里 `id=`／`data-`／`class=`（除 `language-`）／`<dialog`／`<button` 各 0 枚。 */

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const HAS_SCHEME = /^[a-z][a-z0-9+.\-]*:/i;   /* 与 markdown.js:11 同一枚形状：这里只用来分流"要不要补 host"，
                                                 不是第二份协议白名单——合格性早就在 href() 那一关过掉了 */

const attrv = s => String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* 一处地址进 feed 之前的最终形状。
   `abs(p)` 由 feed 那侧给（"站内相对路径 → 绝对地址"，真值只有 `context.site` 一枚），
   `page` 是这一篇自己的绝对地址（`#片段` 的家）。 */
function feedUrl(raw, { abs, page }){
  const v = String(raw).trim();
  if (v === '#') return '';                    /* 渲染器对不合格协议路的兜底（markdown.js:20）：页面上它是
                                                  "字还留在纸上、路没了"，在 feed 里它是 §12 那条死锚点的
                                                  canonical 形状 ⇒ 这枚 <a> 不留 href，字照旧 */
  if (v.startsWith('#')) return page + v;      /* 页内片段（`#fn-x`／`#fnref-x`／作者写的 `#小节`）：
                                                  绝对化成"这一篇的页面 + 片段"。阅读器里就地跳没有落点
                                                  （id 刚被剥掉），所以这条路一律指向真页 */
  if (HAS_SCHEME.test(v)) return v;            /* `http(s)`／`mailto:`：`markdown.js` 的白名单过过了，这里不改写 */
  return abs(v);                               /* 站内路径：不绝对化就是给站外的人一条没有 host 的路（坏图、坏链接） */
}

function rebuild(html, urls){
  return String(html).replace(TAG_RE, (m, slash, name, rawAttrs) => {
    const tag = name.toLowerCase();
    /* 结束标签：留下来的原样留，没留的整个丢——补一枚 `</unknown>` 就是 XML 里没有开标签的孤儿 */
    if (slash) return ALLOW[tag] ? `</${tag}>` : '';
    if (!ALLOW[tag]) return '';                /* 未登记的开标签：只丢标签本身，内容继续被扫 ⇒ 拆壳留字 */
    const attrs = [];
    let href = null, src = null;
    for (const a of String(rawAttrs).matchAll(ATTR_RE)){
      const key = a[1].toLowerCase();
      const val = a[2] ?? a[3] ?? a[4] ?? '';
      if (key === 'href'){ href = val; continue; }
      if (key === 'src'){ src = val; continue; }
      if (!ALLOW[tag].includes(key)) continue;
      attrs.push(`${key}="${attrv(val)}"`);
    }
    if (tag === 'img'){
      const to = src ? feedUrl(src, urls) : '';
      if (!to) return '';                      /* 一枚没有地址的 <img> 就是一块空面（§12 假位置），宁可不画 */
      return `<img src="${attrv(to)}"${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
    }
    if (tag === 'a' && href !== null){
      const to = feedUrl(href, urls);
      if (to) attrs.unshift(`href="${attrv(to)}"`);   /* 空串 ⇒ 这枚 <a> 不带 href，读起来就是一行字 */
    }
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  });
}

/* 一整串 `renderMd()` 的结果 → 能进订阅协议的那串 HTML。
   两枚 feed 吃同一枚函数、同一份白名单（`atom.xml.js` 头上那条"两枚 feed 读同一个 visiblePosts()"
   的口径同样管字段：RSS 有全文、Atom 没有，就是那里警告过的分叉）。
   ⚠️ 传进来的必须是**构建期渲染真值**（`renderMd(post.body)`），不许在这里第二次渲染——
   渲染两遍就是给"什么算一段"两处答案。 */
export function feedHtml(html, { abs, page }){
  if (typeof abs !== 'function' || typeof page !== 'string' || !page) {
    throw new Error('feedHtml 要 { abs, page }：abs 是"站内相对路径→绝对地址"那枚函数，page 是这一篇的绝对地址。'
      + '缺任何一枚都不许发——静默发相对地址在阅读器里等于坏图与死链（§12 死锚点那一族的协议版）。');
  }
  return rebuild(unwrapPageShells(html), { abs, page });
}

/* 白名单本体（给门禁点名"留了哪些构造"用；⚠️ 门禁**不许**用它来重做净化——
   净化由这份模块跑一次、产物落盘，门禁只读产物的字节。导出它只为把名单说清楚，
   由 ALLOW 派生而不是手抄第二份：手抄的清单迟早和实现分叉，而分叉处正好是判据的盲区）。 */
export const FEED_TAGS = Object.keys(ALLOW);
