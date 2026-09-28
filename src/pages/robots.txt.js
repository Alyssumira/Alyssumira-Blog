/* robots.txt 是构建期生成的，不是 public/ 里的一份手抄件——这一条就是这一整个文件存在的理由。
   为什么要过一道构建：`Sitemap:` 那一行要的是**绝对地址**，而绝对地址在这站上只有一枚出处 = `Astro.site`
   （`astro.config.mjs` 里那枚 SITE，占位与真域名由 PUBLIC_SITE 这一枚开关决定）。`public/` 下的静态文件
   在构建期**根本不经过 Astro**，把域名写进 `public/robots.txt` 等于给同一件事立第二处真值：换域名那天
   rss.xml / sitemap-index.xml / og:url 全跟着 SITE 变了，只有这一行没变——而它恰好是爬虫唯一会读的那一行。
   同一族账见 §16"一个页面只许有一个构建时刻"与 src/lib/stats.js:10-12 那句"两处各算一遍，迟早有一处先改"。
   ⚠️ 代价登记在这儿：这枚产物不在 `public/` 里，`ls public/` 看不到它，要看就读 `dist/robots.txt`；
   而它跟着 SITE 走，就意味着 §16 那笔"产物里占位域名 N 处"的账从此多一处消费者（本轮已复算，见 §13a 末格）。
   取址口径照 src/pages/rss.xml.js:9 那一行：从 context 里的 site 拿，不 import astro.config.mjs、不读 process.env。 */

const LINES = [
  '# 这一份由 src/pages/robots.txt.js 在构建期生成：Sitemap 那行是从 Astro.site 派生的。',
  '# 别在 public/ 下再手抄一枚同名的文件——静态文件不过 Astro，抄的那份换域名时不会跟着变。',
  '',
  'User-agent: *',
  'Allow: /',
  '',
];

export function GET(context) {
  const site = context.site;
  /* 没有 site 就生成不出一句真话：`Sitemap:` 只能写绝对地址，相对地址在 robots.txt 里不成立。
     这里当场抛，不静默少写那一行——少一行是"这份 robots 没说全"，悄悄少一行更是"看着正常其实没指路" */
  if (!site) {
    throw new Error(
      'robots.txt 生成不了：context.site 是空的。Sitemap 那一行必须要绝对地址，' +
      '而它的唯一出处是 astro.config.mjs 的 site（PUBLIC_SITE）。不许退回相对路径、也不许在这里抄一枚域名。',
    );
  }
  /* 指向 sitemap-index.xml 而不是 sitemap-0.xml：索引才是那份清单，编号那枚是它的分页，将来分片了也不用改这里 */
  const body = [...LINES, `Sitemap: ${new URL('/sitemap-index.xml', site).href}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
