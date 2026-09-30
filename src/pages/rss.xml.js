/* RSS 2.0 订阅源（第十轮 `card/taxonomy` 起带 `<category>`；第十六轮 `card/feedout` 起带**全文**）。
   字段口径与 `atom.xml.js` 同源：同一个 `visiblePosts()`、同一份 `feedTerms()`、同一枚 `feedHtml()`——
   两份 feed 各写一份净化迟早有一处漏掉 `data-*`，那正是这里唯一会伤到订阅者的那种分叉。

   ⚠️ 全文那一格的取舍与代价写在 §16「全文 feed 的代价」那一段，不是"以后再说"：
   `<description>` 仍旧只是 front matter 的 `excerpt`（没填 ⇒ 退回标题，两枚 feed 同一条），
   整篇正文走 `<content:encoded>`（`@astrojs/rss` 见到 item 有 `content` 就自己声明那枚命名空间）。
   两条路都有读者：只看列表的人拿 `description`，在自己机器上读完这一篇的人拿 `content:encoded`。
   原文 Markdown 的地址走 `<atom:link rel="alternate" type="text/markdown">`——
   RSS 2.0 自己没有一个字段说"这条目还有另一种表示"（`<enclosure>` 说的是附属媒体文件，
   `<source>` 说的是"这篇从哪儿转来"，两枚拿来指我们自己的 `.md` 都是撒谎），
   所以这里引 Atom 那一枚 `atom:link`，命名空间由 `xmlns` 选项声明。 */
import rss from '@astrojs/rss';
import { visiblePosts } from '../lib/posts.js';
import { feedTerms } from '../lib/taxonomy.js';
import { feedHtml } from '../lib/feed.js';
import { renderMd } from '../lib/markdown.js';

const ATOM_NS = 'http://www.w3.org/2005/Atom';

export async function GET(context){
  /* 订阅源吃的也是 visiblePosts()：草稿不许出现在 feed 里（漏这一处的形状是"作者以为没发，订阅者收到了"），
     不列入的也不许在——第十五轮那枚产物级判据（`tools/runtime-check.mjs` 的「不列入对账」）读的就是这一份字节。
     categories = front matter 里真写了的分类 + 标签，一个都没写 ⇒ 这个键就是空的，
     @astrojs/rss 对空数组不发 <category>——所以这里不会长出假分类（§12：没填 ⇒ 不出现）。 */
  const posts = await visiblePosts();
  /* 绝对地址仍旧走 context.site（astro.config.mjs 那枚 SITE），产物里不许硬编码域名。
     ⚠️ 这一轮它从"只有 link 用它"变成"正文里每一枚 href/src 都用它"，所以这里把"拿不到就抛"写明白：
     全文的图与链接若退回相对路径，订阅者看到的是一堆坏图——比占位域名更难查，因为它在正文中间。
     今天 `astro.config.mjs:11` 有占位默认值，所以这一枚守卫平时不响；它响的那一次是有人把 site 清空了。 */
  const site = context.site;
  if (!site) {
    throw new Error('rss.xml 生成不了：context.site 是空的。条目正文里的每一枚 href/src 都必须是绝对地址，'
      + '而绝对地址的唯一出处是 astro.config.mjs 的 site（PUBLIC_SITE）。不许退回相对路径、也不许在这里抄一枚域名。');
  }
  const base = new URL(site);
  const abs = p => new URL(p, base).href;

  return rss({
    title: 'mistwood · 晨雾森林',
    description: '在森林与代码之间，收集微风、光影和好文章。',
    site,
    xmlns: { atom: ATOM_NS },
    items: posts.map(p => {
      const at = `/essays/${p.id}/`;
      const page = abs(at);
      return {
        title: p.data.title,
        description: p.data.excerpt || p.data.title,
        pubDate: p.data.date,
        link: at,
        categories: feedTerms(p),
        /* 整篇正文：`renderMd(post.body)` 的构建期真值过一遍 `feedHtml()`（白名单净化＋绝对化，
           剥掉的族点名在 `src/lib/feed.js`）。`@astrojs/rss` 把这串按 XML 转义进 `<content:encoded>`——
           这与包 CDATA 在解析后是同一串字节（XML 解析器交回的都是 `<p>…`），而转义少一枚 `]]>` 的坑。 */
        content: feedHtml(renderMd(p.body), { abs, page }),
        /* 原文 Markdown：可署名的出处件（front matter 里 author／sourceLink／licenseName 都在那份字节里）。
           地址与上面那枚 `guid` 同一处派生，不在这里重拼第三份。 */
        customData: `<atom:link rel="alternate" type="text/markdown" href="${abs(at + 'index.md')}" />`,
      };
    }),
  });
}

/* ⚠️ 正文只渲染一次、就在上面那一行：`renderMd(post.body)` 是把 Markdown 变成 HTML 的**唯一**一枚函数
   （§15 那 15 项排版白名单住在它里面），`post.body` 是稿子的原始字节（与详情页、`search.json`、
   字数那几处同一份输入）。在这里再包一层 `renderBody()` 就是给同一件事第二个名字。 */
