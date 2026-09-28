/* /search.json —— 站内搜索的构建期静态索引（第十一轮 `card/search`）。
   它是**端点**，不是一页：产物里就是 dist/search.json 一枚文件，Astro 在同一个 `astro build`
   里连着各页一起烘出来 —— 没有新增构建步骤，也没有新增依赖，`npm run dev` 下它照样能取到
   （这一条是它相对"外部索引器"那族方案唯一真正买到的东西：写完稿子刷新页面就能搜，
   不必先跑一遍索引再回来试那枚框）。
   ⚠️ 铁律（照 `lib/stats.js` 文件头那句抄在这里，因为它同样管这一格）：这里只准出现
   **能从仓库里数出来的东西**。没有服务端、没有运行时打分、没有第三方统计。
   ⚠️ 稿子只从 `lib/posts.js` 那枚唯一入口取。直接 `getCollection('posts')` 会被
   `tools/taxonomy-check.mjs` 第①格当场点名——那一格防的就是"列表里没有、地址照样活着"那一族假完成，
   而"草稿没进列表却进了索引"是它最新的一种形状：索引是第七处读 posts 的地方。
   ⚠️ 地址一律站内相对（`/essays/<slug>/`，拼法住在 `lib/search.js` 那一处）：
   产物里不许出现任何域名，PUBLIC_SITE 换真值时这份 JSON 一个字节都不用改。 */
import { visiblePosts } from '../lib/posts.js';
import { renderMd } from '../lib/markdown.js';
import { buildIndex, INDEX_VERSION } from '../lib/search.js';

export const prerender = true;

/* 正文纯文本 = 渲染器输出的**去壳**。
   为什么走 renderMd 而不是自己拿正则刮一遍 Markdown：那一层已经在管"什么算标题、什么算代码块、
   脚注定义行该不该出现"，第二份刮法迟早和它分叉（同 §16 那条"两处各写一个 split 迟早对'什么算草稿'
   读成两种"）。切完 Tag 只剩实体，`esc()` 只转义 & < >（属性里多一枚 &quot;），四个都认回来。
   脚注定义行（`[^1]: …`）由渲染器收进 .footnotes 块，本来就在 body 里 ⇒ 一起进索引，
   那是作者写过的话，不藏。 */
function plainText(html){
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export async function GET(){
  const posts = await visiblePosts();
  const docs = buildIndex(posts, p => plainText(renderMd(p.body)));
  /* n 是给门禁看的"该有几篇"，v 是格式版本：两枚都是防"索引在、但是空的"那种假绿——
     单看文件存在不算看见，那一格读的是这两个数。 */
  return new Response(JSON.stringify({ v: INDEX_VERSION, n: docs.length, docs }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
