/* Atom 1.0 订阅源（第十轮 `card/taxonomy`；本站原先只有 RSS 2.0，`grep atom` 零命中）。
   为什么手写而不是套 @astrojs/rss：那一层只发 `<rss version="2.0">`（它自己的 README 里 Atom 那条没实现，
   xmlns 选项只是"往 <rss> 上加命名空间"，不会换根元素）。换根元素这件事只有作者本人能签字，所以这里
   自己拼一份，字段与 rss.xml.js 同源——两枚 feed 读的是同一个 visiblePosts()、同一份 feedTerms()，
   迟早分叉的那种"RSS 有分类、Atom 没有"从结构上消失。

   口径：
   - 绝对地址一律由 `context.site` 拼（astro.config.mjs 那枚 SITE，现在是占位域名）。
     ⚠️ 不许在这里硬编码域名，也不许顺手改那枚常量——另有两张平行卡在动别的文件。
   - `<updated>` 向**最新那一篇**要（front matter 的真日期），不向构建时钟要：
     一次 `new Date()` 会让同一份源码两次 build 产出不同的 XML，而 feed 的 `<updated>` 说的是"内容什么时候变的"。
     零篇可见（草稿全开）时没有"最新一篇"可指，只能报构建这一刻——那是这一份里唯一一次取时钟，写清楚。
   - 没有 `<author>`：站上没有一枚"作者名"的单一真值可指（`Alyssumira` 现在只写在首页与关于页的图形里），
     在 feed 里再抄一遍就是给它开第二个出处（§13 那条"站名与用户名是同一个字面量，全站唯一一处"是反面镜子）；
     RSS 那一侧今天也没有 author。等 head 卡或身份卡立了那枚常量，两边一起接。 */
import { visiblePosts } from '../lib/posts.js';
import { feedTerms } from '../lib/taxonomy.js';
import { feedHtml } from '../lib/feed.js';
import { renderMd } from '../lib/markdown.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => esc(s).replace(/"/g, '&quot;');
/* RFC 3339：Atom 只要这一种日期写法，秒级足够（feed 的读数不是分钟级时钟，别拿本机时区去猜） */
const stamp = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

export async function GET(context){
  /* ⚠️ 与 `rss.xml.js` 同一条：这一枚 feed 里绝对地址的消费者从"link/id 两枚"涨成"外加整篇正文里的
     每一枚 href/src"。site 空 ⇒ 当场抛，不许静默发相对路径——订阅者拿到的会是坏图与没有 host 的链接，
     而那副样子在阅读器里读起来像"这篇稿子本来就缺图"。 */
  if (!context.site) {
    throw new Error('atom.xml 生成不了：context.site 是空的。条目正文里的每一枚 href/src 都必须是绝对地址，'
      + '而绝对地址的唯一出处是 astro.config.mjs 的 site（PUBLIC_SITE）。不许退回相对路径、也不许在这里抄一枚域名。');
  }
  const site = new URL(context.site);
  const abs = p => new URL(p, site).href;
  const posts = await visiblePosts();                 /* 草稿不进 feed：和列表页、详情页同一个 filter */
  const now = posts.length ? posts[0].data.date : new Date();

  const entries = posts.map(p => {
    const url = abs(`/essays/${p.id}/`);
    const terms = feedTerms(p);                       /* 分类在前、标签在后；一个都没写 ⇒ 零枚 <category> */
    const summary = p.data.excerpt || p.data.title;
    /* 整篇正文走 `<content type="html">`（`<summary>` 仍旧是那枚 excerpt，两枚字段两个读者：
       列表里扫一眼的人读 summary，在自己机器上读完这一篇的人读 content）。
       净化与绝对化吃 `src/lib/feed.js` 那一份，与 RSS 同一枚函数——两份 feed 各写一份白名单，
       迟早有一处漏掉 `data-*` 或忘了把图钉成绝对地址。 */
    const content = feedHtml(renderMd(p.body), { abs, page: url });
    return [
      '  <entry>',
      `    <title>${esc(p.data.title)}</title>`,
      `    <id>${esc(url)}</id>`,
      `    <link href="${attr(url)}" />`,
      /* 原文 Markdown（`/essays/<slug>/index.md`）：Atom 有正字段说"这条目的另一种表示"，
         所以 rel=alternate + 那枚 RFC 7763 的类型 `text/markdown`。RSS 侧的同一件事走 `<atom:link>`（那边没有这个字段）。 */
      `    <link rel="alternate" type="text/markdown" href="${attr(abs(`/essays/${p.id}/index.md`))}" />`,
      `    <updated>${stamp(p.data.date)}</updated>`,
      `    <published>${stamp(p.data.date)}</published>`,
      `    <summary>${esc(summary)}</summary>`,
      `    <content type="html">${esc(content)}</content>`,
      ...terms.map(t => `    <category term="${attr(t)}" />`),
      '  </entry>',
    ].join('\n');
  }).join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    '  <title>mistwood · 晨雾森林</title>',
    /* rel=self 指向这一份 atom.xml 自己——两枚 feed 各说各的地址，别把它写成 rss.xml */
    `  <link rel="self" href="${attr(abs('/atom.xml'))}" />`,
    `  <link href="${attr(abs('/'))}" />`,
    `  <id>${esc(abs('/atom.xml'))}</id>`,
    '  <subtitle>在森林与代码之间，收集微风、光影和好文章。</subtitle>',
    `  <updated>${stamp(now)}</updated>`,
    entries,
    '</feed>',
    '',
  ].join('\n');

  return new Response(xml, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
}
