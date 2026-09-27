import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context){
  const posts = (await getCollection('posts')).sort((a, b) => b.data.date - a.data.date);
  return rss({
    title: 'mistwood · 晨雾森林',
    description: '在森林与代码之间，收集微风、光影和好文章。',
    site: context.site,
    items: posts.map(p => ({
      title: p.data.title,
      description: p.data.excerpt || p.data.title,
      pubDate: p.data.date,
      link: `/essays/${p.id}/`,
    })),
  });
}
