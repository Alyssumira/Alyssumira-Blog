import rss from '@astrojs/rss';
import { visiblePosts } from '../lib/posts.js';
import { feedTerms } from '../lib/taxonomy.js';

export async function GET(context){
  /* 订阅源吃的也是 visiblePosts()：草稿不许出现在 feed 里（漏这一处的形状是"作者以为没发，订阅者收到了"）。
     categories = front matter 里真写了的分类 + 标签，一个都没写 ⇒ 这个键就是空的，
     @astrojs/rss 对空数组不发 <category>——所以这里不会长出假分类（§12：没填 ⇒ 不出现）。
     绝对地址仍旧走 context.site（astro.config.mjs 那枚 SITE），产物里不许硬编码域名。 */
  const posts = await visiblePosts();
  return rss({
    title: 'mistwood · 晨雾森林',
    description: '在森林与代码之间，收集微风、光影和好文章。',
    site: context.site,
    items: posts.map(p => ({
      title: p.data.title,
      description: p.data.excerpt || p.data.title,
      pubDate: p.data.date,
      link: `/essays/${p.id}/`,
      categories: feedTerms(p),
    })),
  });
}
