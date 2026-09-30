import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFm, readTaxonomy } from './tools/frontmatter.mjs';
import { isUnlisted, aliasesOf } from './src/lib/taxonomy.js';   /* 两族判据都向 shipped 的纯函数要（这份文件不碰 astro:content，见下面那段注释） */

/* 上线前换成自己的域名：RSS 与 sitemap 都要它才能拼绝对地址。
   PUBLIC_SITE 是构建期开关：没给就用下面这枚占位默认值（产物与改动前逐字节相同）。 */
const PLACEHOLDER_SITE = 'https://mistwood.example.com';
const SITE = process.env.PUBLIC_SITE || PLACEHOLDER_SITE;

/* 构建期守卫：Vercel 的生产构建必须带一枚真域名，否则当场抛，不警告。
   为什么这枚牙要落在构建入口：tools/runtime-check.mjs 那关要起本机 headless Edge 去读 dist/ 的运行时 DOM，
   Vercel 的构建环境里根本跑不了它——把"没填真域名不许上线"指望在门禁上，在那儿这道闸并不存在。
   只认 VERCEL=1 与 VERCEL_ENV=production 同时成立：预览构建拿的是 Vercel 给的预览 URL，占位域名碍不着它。 */
if (process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production') {
  const given = process.env.PUBLIC_SITE;
  if (given === undefined || given === '' || given === PLACEHOLDER_SITE) {
    throw new Error(
      `astro.config.mjs 的构建期守卫：这是 Vercel 生产构建（VERCEL=1、VERCEL_ENV=production），` +
      `可 PUBLIC_SITE ${given === undefined || given === '' ? '没给' : `给的就是那枚占位值 ${PLACEHOLDER_SITE}`}。` +
      `og:url / og:image 与 twitter:image / rss.xml / sitemap 的绝对地址全由它拼一份（枚数不写在这里——它随内容涨，唯一读数记在 docs/设计规范.md §16 的 PUBLIC_SITE 那一格），` +
      `带着占位域名上线等于把订阅者的链接送到别人手里。` +
      `两条路：① 在 Vercel 的项目环境变量里填 PUBLIC_SITE=https://你的域名；` +
      `② 承认这枚就是占位域名、这次构建并不上线——那它就不该以 VERCEL_ENV=production 的身份跑，` +
      `本地 npm run build 或预览构建都不受这道闸管。`
    );
  }
}

/* ── 两族机器侧地址的负条件（第十六轮 `card/unlisted` 立、第十七轮 `card/aliases` 添第二族）：
   ① 不列入稿件的详情页 ② 旧地址（alias）那一族烘出来的跳转页 —— 两枚都不进 sitemap ──────────────
   ⚠️ 先记一条实测结论，免得下一个人再试一遍：`@astrojs/sitemap` 3.7.4 **不认 `noindex`**。
   `grep -rn noindex node_modules/@astrojs/sitemap/` 零命中；`dist/index.js` 里只有一枚用户提供的
   `filter` 与一枚 `shouldIgnoreStatus`（后者管路由交回来的状态码，与 meta 无关）。
   探针态实测（把 slow-frontend.md 标 `unlisted: true` 之后 `npm run build`）：那一页带着
   `<meta name="robots" content="noindex">` **照样**进了 `dist/sitemap-0.xml` 一枚。
   ⚠️ 同一条在 alias 那一族**又复现一次**（第十七轮实测，五枚探针页各落一枚，含两枚 `Astro.redirect()`
   烘出来的跳转页）：Astro 自己写进那枚模板里的 `noindex` 挡不住 sitemap 收录，
   所以"跳转页不进 sitemap"这一条也只能落在这里这枚 filter 上——它不是可选优化。
   ⇒ 所以下面这枚 filter 是"不在 sitemap-0.xml 里"那一条唯一的落点，两族都靠它；
     判据是产物：`tools/runtime-check.mjs` 的「不列入对账」那一格 build 之后 grep 那一枚地址的枚数，0 才算过；
     alias 那一族另有一枚尺子 `tools/alias-check.mjs` 逐枚 grep 五份机器侧产物（含这一份）。
   ⚠️ **为什么这不违反"只有一处真值"**（这条铁律的口径，别读成"配置里可以自己养一份名单"）：
     · 这里**没有第二条**"什么算不列入"、也没有第二条"什么算一枚旧地址"的判据——它 import 的就是页面与
       `tools/` 那几处吃的同一份（`tools/frontmatter.mjs` 的 `splitFm`/`readTaxonomy` ＋
       `src/lib/taxonomy.js` 的 `isUnlisted()` 与 `aliasesOf()`，两份都是不碰 'astro:content' 的纯模块，
       node 侧能直接吃）。判据仍然只有一枚，这里只是**在另一个时刻（构建入口）把同一枚 front matter 再读一遍**。
     · 它也不回答"该建哪些路"（那是 `src/lib/posts.js` 那两枚读函数与 `src/pages/[...alias].astro` 的事）。
       它只回答 sitemap 那一个问题的负半句："这一枚地址是不是某一枚不列入稿件的详情页，或者是不是某篇稿子
       声明过的一枚旧地址"。集合真值与"给一份清单加一道负条件"是两件事——两边的真值都是同一份 front matter。
     · 自检（谁怀疑这里是第二处真值，就跑这三步）：把某篇的 `unlisted: true` 改成 `false` 再 build ⇒
       它回到 sitemap 且 `src/**` 一个字都不动；写 `unlisted: yes` ⇒ `--check` 与 zod 当场红，
       这枚 filter 不会替它放行也不会悄悄把它藏掉（它读不懂的那一篇照旧交出去，红由门禁报，不由这里猜）。
   ⚠️ 读不到 front matter / 读不过预检的那一篇一律**当没填**（照旧进 sitemap）：这里宁可多列一枚地址，
      也不许因为配置读不懂盘而让一篇正常稿件从 sitemap 里静默消失——那是"作者写了却看不见"那一族的反面。
   ⚠️ alias 那一族取的是**全部声明过且形状合格的旧地址**，不再跟着 `draft`／`unlisted` 滤一遍：
      形状合格才会被 `[...alias].astro` 烘出来（草稿与不列入的那两族**根本不建路**），
      所以这里多列进黑名单的那几枚路径在 `dist/` 里并不存在——"藏掉一枚根本不存在的地址"不会让任何
      东西从地图上消失，而漏藏一枚真会。与上面那句"当没填"的方向不同，因为被这一族藏起来的对象
      不是稿件的地址，是作者已经宣布作废的地址。 */
function hiddenPaths(){
  const base = fileURLToPath(new URL('./src/content/posts/', import.meta.url));
  const out = new Set();
  const walk = (dir, rel = '') => {
    for (const e of readdirSync(dir, { withFileTypes: true })){
      const p = join(dir, e.name);
      if (e.isDirectory()){ walk(p, `${rel}${e.name}/`); continue; }
      if (!/\.md$/i.test(e.name)) continue;
      const parsed = splitFm(readFileSync(p, 'utf8'));
      if (!parsed) continue;
      const tax = readTaxonomy(parsed.fmText);
      if (tax.errors.length) continue;
      /* 判据向 shipped 的那两枚纯函数要，不在这里写 `tax.unlisted === true`／`x.replace(...)` 那种第二份读法 */
      if (isUnlisted({ data: tax })) out.add(`/essays/${rel}${e.name.replace(/\.md$/i, '')}/`);
      for (const at of aliasesOf({ data: tax })) out.add(at);
    }
  };
  try { walk(base); } catch { /* 目录不存在（干净检出还没写稿）＝没有东西要排除，不是错 */ }
  return out;
}
const HIDDEN_PATHS = hiddenPaths();

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  integrations: [sitemap({
    /* 名单现算、不硬编码（写死一串 slug 才是第二处真值）。两枚斜杠形状都比一遍：
       `trailingSlash: 'ignore'` 下路由交出来的是带尾斜杠的那一枚，而比的是 pathname 的原文。 */
    filter: page => {
      let at;
      try { at = new URL(page).pathname; }
      catch { return true; }
      const withSlash = at.endsWith('/') ? at : `${at}/`;
      return !HIDDEN_PATHS.has(withSlash) && !HIDDEN_PATHS.has(withSlash.replace(/\/$/, ''));
    },
  })],
});
