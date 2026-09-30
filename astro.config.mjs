import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFm, readTaxonomy } from './tools/frontmatter.mjs';
import { isUnlisted } from './src/lib/taxonomy.js';

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

/* ── 不列入那一枚的机器侧后果（第十六轮 `card/unlisted`）：这一枚地址不进 sitemap ──────────────
   ⚠️ 先记一条实测结论，免得下一个人再试一遍：`@astrojs/sitemap` 3.7.4 **不认 `noindex`**。
   `grep -rn noindex node_modules/@astrojs/sitemap/` 零命中；`dist/index.js` 里只有一枚用户提供的
   `filter` 与一枚 `shouldIgnoreStatus`（后者管路由交回来的状态码，与 meta 无关）。
   探针态实测（把 slow-frontend.md 标 `unlisted: true` 之后 `npm run build`）：那一页带着
   `<meta name="robots" content="noindex">` **照样**进了 `dist/sitemap-0.xml` 一枚。
   ⇒ 所以下面这枚 filter 不是可选优化，它是"不在 sitemap-0.xml 里"那一条唯一的落点；
     判据是产物：`tools/runtime-check.mjs` 的「不列入对账」那一格 build 之后 grep 那一枚地址的枚数，0 才算过。
   ⚠️ **为什么这不违反"只有一处真值"**（这条铁律的口径，别读成"配置里可以自己养一份名单"）：
     · 这里**没有第二条**"什么算不列入"的判据——它 import 的就是页面与 `tools/` 那三处吃的同一份
       （`tools/frontmatter.mjs` 的 `splitFm`/`readTaxonomy` ＋ `src/lib/taxonomy.js` 的 `isUnlisted()`，
       两份都是不碰 'astro:content' 的纯模块，node 侧能直接吃）。判据仍然只有一枚，这里只是
       **在另一个时刻（构建入口）把同一枚 front matter 再读一遍**。
     · 它也不回答"该建哪些路"（那是 `src/lib/posts.js` 那两枚读函数，走 schema 的集合）。它只回答
       sitemap 那一个问题的负半句："这一枚地址是不是某一枚不列入稿件的详情页"。
       集合真值与"给一份清单加一道负条件"是两件事——两边的真值都是同一份 front matter。
     · 自检（谁怀疑这里是第二处真值，就跑这三步）：把某篇的 `unlisted: true` 改成 `false` 再 build ⇒
       它回到 sitemap 且 `src/**` 一个字都不动；写 `unlisted: yes` ⇒ `--check` 与 zod 当场红，
       这枚 filter 不会替它放行也不会悄悄把它藏掉（它读不懂的那一篇照旧交出去，红由门禁报，不由这里猜）。
   ⚠️ 读不到 front matter / 读不过预检的那一篇一律**当没填**（照旧进 sitemap）：这里宁可多列一枚地址，
      也不许因为配置读不懂盘而让一篇正常稿件从 sitemap 里静默消失——那是"作者写了却看不见"那一族的反面。 */
function unlistedPaths(){
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
      /* 判据向 shipped 的那一枚纯函数要，不在这里写 `tax.unlisted === true` 那种第二份读法 */
      if (isUnlisted({ data: tax })) out.add(`/essays/${rel}${e.name.replace(/\.md$/i, '')}/`);
    }
  };
  try { walk(base); } catch { /* 目录不存在（干净检出还没写稿）＝没有东西要排除，不是错 */ }
  return out;
}
const UNLISTED_PATHS = unlistedPaths();

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
      return !UNLISTED_PATHS.has(withSlash) && !UNLISTED_PATHS.has(withSlash.replace(/\/$/, ''));
    },
  })],
});
