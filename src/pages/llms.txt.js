/* /llms.txt —— 一份写给抓取器读的站内地图。
   它和 robots.txt 是同族：读者不是浏览器里的人，是替人跑腿的程序。robots 说的是"怎么进来"，
   这一份说的是"进来之后有什么"。学习参照站 Firefly 的同名端点，**内容与枚数都不照抄**——
   这份只写我们这一站今天成立的话。
   三条纪律，每条都有先例：
   ① 稿件只从 `lib/posts.js` 的 `visiblePosts()` 取。`tools/taxonomy-check.mjs` 第①格盯着这一族：
      任何一处绕开唯一入口直接取集合都当场红。草稿不进这份清单，和它们不进首页、列表、feed 是同一个口径。
   ② 绝对地址只从 `context.site` 派生（取址口径照 `robots.txt.js` 与 `atom.xml.js` 的先例），
      本文件里不出现任何域名字面量；site 为空当场抛，不退回相对地址——读这份地图的人站在站外，
      相对路径到他手里什么都不是。
   ③ §12（假数字）在这一份上管得最直接：这里只放构建期数得出的东西——篇数是 `visiblePosts()` 的长度、
      日期是 front matter 的 `date`（走全站那一个 `fmtDate`）、分钟数是列表页同一把 `readMinutes`。
      这一站没有服务端也没有统计，"访客 N 人"那种数在盘上不存在，所以这里连出现的位置都没有。
   ⚠️ 列进来的每一条地址都必须是构建后真存在的产物（§12 死锚点那条）：PLACES 那几枚页面、逐篇详情页、
   两枚 feed、sitemap-index.xml、search.json。排着队还没落地的页一个字都不许提前写进来——提前写就是给它造一枚
   死锚点。（`card/llms` 那张卡落地时这里点的名正是 `/series/`；第十五轮 `card/series` 它落地了、也就进了下面的 PLACES，
   所以**那句例子作废、这条规则照旧**——它防的从来是"将来时"，不是某一枚具体的地址。）
   ⚠️ 本轮明说两件不做（登记，不是忘了）：robots.txt 里不添一句指向这份的说明（那是另一张卡的事）；
   这份也不进站内搜索的索引——它自己就是清单，把自己列进检索结果是绕圈。 */
import { visiblePosts } from '../lib/posts.js';
import { fmtDate } from '../lib/markdown.js';
import { readMinutes } from '../lib/stats.js';

/* 与 `search.json.js` 里那一行同样的选择：这枚产物是构建期烤出来的静态文件，不挂运行时。 */
export const prerender = true;

/* 站内的去处：地址、名字、一句"这是什么"。每一句只对着盘上那页自己成立的事，不写模板腔。 */
const PLACES = [
  ['/', '首页', '站名与三枚计数（长文、小东西、手记各有几条），下面挂着最近三篇长文和最新一条手记。'],
  ['/essays/', '长文目录', '全部长文按年份分节的目录；一行一篇，标题、摘要、日期、读完要几分钟，都在那一行里。'],
  ['/notes/', '手记', '观察日志：一枚日期、当天的天气、看见的一句话。'],
  ['/things/', '小东西', '几件自己玩出来的小工具的图鉴；还没填外链的条目画成不可点的卡片，不让死地址长出来。'],
  ['/about/', '关于', '写这站的人是谁、怎么联系；下面那份站点档案里每个数都是从仓库里当场数的，拿不到访客数，所以那一栏不存在。'],
  ['/categories/', '分类', '长文按主题分组，名字是作者写完回头起的；稿子没写主题，这一页就明说还没有，不替作者编。'],
  ['/tags/', '标签', '和分类同一套规矩，粒度轻一档：写稿时随手贴的记号。'],
  ['/series/', '系列', '把同一件事写成的那几篇串成一串，名字与篇数都来自作者自己填的 front matter；稿子没写系列，这一页就明说还没有，不替作者编系列名。'],
];

/* 给机器的四件：两枚订阅源、sitemap 的索引、搜索的静态索引。
   ⚠️ 第十六轮 `card/feedout` 起两枚 feed 带**整篇正文**（`<content:encoded>` / `<content type="html">`），
   这两句因此从"清单"改成"清单＋正文在里头"——读这份地图的人有权知道自己取回去的是多大一份东西；
   代价那一句（转载方可整篇拿走）写在 docs/设计规范.md §16「全文 feed 的代价」那一格，不在这里重复。 */
const FEEDS = [
  ['/rss.xml', 'RSS 2.0', '订阅源，条目带整篇正文（content:encoded）；所有站上架得出的文章都在，草稿一枚不进——和列表页吃同一个入口。'],
  ['/atom.xml', 'Atom 1.0', '同一批文章的另一种 feed 格式，正文在 content 那一格；字段与上面那枚同源（同一份净化函数），两份不会各说各话。'],
  ['/sitemap-index.xml', 'Sitemap 索引', '构建期由 @astrojs/sitemap 生成的页面地址清单；逐份分页在它指向的文件里。'],
  ['/search.json', '搜索索引', '站内搜索的构建期全文索引：每条带地址、标题、摘要与词元（中文按二字滑窗切的，没有分词器那种猜）。'],
];

export async function GET(context) {
  const site = context.site;
  /* 没有 site 就一句真话都写不出：这份清单整页都是绝对地址，而地址的唯一出处是 astro.config.mjs
     的 site（PUBLIC_SITE）。当场抛（理由与 robots.txt.js 里那三行同族）——悄悄退回相对地址或抄一枚
     占位域名，产出会看着正常，实际是给站外的人一张没法走的地图。 */
  if (!site) {
    throw new Error(
      'llms.txt 生成不了：context.site 是空的。这份清单里每一条地址都必须是绝对地址，' +
      '而绝对地址的唯一出处是 astro.config.mjs 的 site（PUBLIC_SITE）。不许退回相对路径、也不许在这里抄一枚域名。',
    );
  }
  const abs = p => new URL(p, site).href;
  const line = ([path, name, what]) => `- [${name}](${abs(path)}): ${what}`;
  const posts = await visiblePosts();

  /* 逐篇一行：日期走 `fmtDate`（首页、列表、详情页指名的那一个），分钟走 `readMinutes`
     （与列表页 `.row-min` 同一把尺子，不在这里另算一遍）。摘要没填就停在分钟——
     feed 那两枚拿标题兜底是它们字段的规矩，一份给人读的地图没得编就不编（§12：没填 ⇒ 不出现）。 */
  const essays = posts.map(p => {
    const meta = `发布于 ${fmtDate(p.data.date)}，读完 ${readMinutes(p.body)} min`;
    const ex = String(p.data.excerpt || '').trim();
    return `- [${p.data.title}](${abs(`/essays/${p.id}/`)}): ${meta}${ex ? `。${ex}` : ''}`;
  });

  const body = [
    '# mistwood · 晨雾森林',
    '',
    '> 一个人的站：写长文，记观察，做小东西。纯静态——没有服务器、没有账号、没有统计，' +
    '所以这里出现的每一个数都数得出出处。',
    '',
    '下面每一条地址都是构建之后真实存在的产物，点开就有东西；这份清单里没有将来时。',
    '它由 src/pages/llms.txt.js 在构建期生成：作者发一篇，这里多一行；删一篇，这里少一行。',
    /* 原文 Markdown 的取址约定只用一句**散文**说破，不逐篇列清单（第十六轮 `card/feedout`）：
       列一份 `/essays/<slug>/index.md` 的逐篇表就是给"站上有哪些稿子"造第二处真值——那一处真值是
       `lib/posts.js` 的 `visiblePosts()`，本页上面那段长文清单已经是它的投影。约定写清楚，
       拿得到这一页的抓取器自己会拼：每篇长文的地址后面接 `index.md`。
       ⚠️ 这一句里不许出现绝对地址：它讲的是**形状**（一枚规则），不是某一枚产物；
       写成 `- [原文](https://…/index.md)` 就既多一处 SITE 消费者、又只指到其中一篇。 */
    '每篇长文的原文 Markdown（含 front matter 里的标题、日期、作者、出处与许可那一行）就在它的地址后面接 index.md，例如 /essays/<slug>/ 旁边那一份；那份字节与仓库里的稿子逐字相同（行尾归一成 LF）。',
    '',
    '## 站内的去处',
    ...PLACES.map(line),
    '',
    `## 长文（站上架得出的 ${posts.length} 篇）`,
    ...essays,
    '',
    '## 订阅与索引',
    ...FEEDS.map(line),
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
