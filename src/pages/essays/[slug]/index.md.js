/* /essays/<slug>/index.md —— 这一篇的**原文 Markdown**（第十六轮 `card/feedout`，§15「`.md` 源码端点」那一格）。
   形状：地址就贴在详情页那一层下面（`/essays/<slug>/` 的旁边一枚 `index.md`），交出的字节 = 仓库里
   `src/content/posts/<slug>.md` 那一枚文件，**含 front matter**、行尾归一成 LF。
   为什么是这个形状（三条理由，都在 §15 那一格展开）：
   ① 抓 feed 的阅读器拿不到"署名"这件事由 front matter 解决——`author` / `sourceLink` /
      `licenseName` / `licenseUrl` 四枚键本来就在稿子里，抄进协议字段等于给同一件事第二处真值；
      交原文一份，那四枚连同 `title` / `date` 一起到读者手里。
   ② "逐字节等于仓库那份"是可判的（`tools/feed-check.mjs` 第⑤格拿源文件与产物对 sha），
      所以这一格不是一句"我们提供原文"的口号，是一枚能对账的承诺。凡是往里加一句"本文由 XX 生成"
      之类的尾巴，那条判据当场作废——所以不加。
   ③ 行尾归一 LF 与 `markdown.js:228`（渲染器入口）、`new-post.mjs` 的 `read()` 是同一条口径：
      这台机器 `core.autocrlf=true`，一次 `git worktree add` 会把稿件落成 CRLF（§16 那起"整篇塌成一枚
      `<p>`"的事故根因）。发出去的那份字节不该取决于谁的工作区配置。

   ⚠️ 三条硬约束，逐条有落点，不许靠"看起来是对的"：
   ① **草稿 ⇒ 真 404**（不是 200 空壳）：`getStaticPaths` 只交 `publishedPosts()`——那一枚函数只滤草稿，
      草稿那一枚地址连路都不建，产物里查无此文件（`tools/feed-check.mjs` 第⑥格按盘点名：草稿 slug 的
      `.md` 必须不存在）。反面标本是别家那版 `conformance:disabled` 发 200 "File disabled"：
      一个 200 就是在替作者说"这篇发了"。
   ② **不列入（unlisted）的稿子照常构建这一枚**（它的 HTML 页也照常构建——第十五轮的口径是"地址是活的、
      站内没人指它"），但**任何一处目录/索引都不许带它**：feed 走 `visiblePosts()`、`llms.txt` 走
      `visiblePosts()`、sitemap 走 config 的 filter。这一族的机器牙是产物级全站 href 扫描，
      本轮把它扩到认得 `.md` 这一枚同址写法（`tools/runtime-check.mjs` 的 `pointsTo`），
      所以"给不列入的那一篇挂一枚指向它 `.md` 的链接"会当场红——而不是靠人记得。
   ③ **剖面只住一处**：这份端点不往任何索引里写自己。`src/pages/llms.txt.js` 只用一句**散文**说明
      "每篇的地址后面接 `index.md`"，不列逐篇绝对清单（那会与 feed 的条目表长成第二份"有哪些稿子"，
      而那一处真值是 `visiblePosts()`）。 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
/* ⚠️ 相对路径往上**三**层（`src/pages/essays/[slug]/` → `src/lib/`）：这一枚文件比同页那枚
   `[slug].astro` 深一层，抄它的 `../../lib/…` 会得到 `src/pages/lib/…`，Vite 报
   `UNRESOLVED_IMPORT`（本轮真撞上过一次，红在构建期，不是静默）。 */
import { publishedPosts } from '../../../lib/posts.js';
import { ROOT } from '../../../lib/stats.js';

export const prerender = true;

export async function getStaticPaths(){
  /* 「路」这一问吃 `publishedPosts()`（滤草稿、**含**不列入），与详情页 `essays/[slug].astro` 的
     `getStaticPaths` 同一枚读函数、同一条理由（§15 那两行分开写的口径）：
     这一格回答的是"哪些地址要烘出来"，不是"哪些稿子要被人看见"。 */
  const posts = await publishedPosts();
  return posts.map(p => ({ params: { slug: p.id }, props: { file: p.filePath, slug: p.id } }));
}

export async function GET(context){
  const { file, slug } = context.props;
  if (!file) throw new Error(`/essays/${slug}/index.md 生成不了：集合没交出 filePath。`
    + '不许退回"发一枚空文件"——200 空壳在抓取器眼里就是"这篇有内容"，那是替作者撒谎（§12 假语义那一族）。');
  let raw;
  try {
    raw = readFileSync(join(ROOT, file), 'utf8');
  } catch (e) {
    /* 读不到就是构建坏了，不是"这一篇没有原文"。静默跳过会给出一枚 200 空壳，
       而那正是本卡点名要避免的形状；红在这里响，红得比读者取到空文件早。 */
    throw new Error(`/essays/${slug}/index.md 生成不了：读不开 ${file}（${e.message}）。`
      + '判据在 tools/feed-check.mjs 第⑤格：产物字节必须等于仓库那枚文件（行尾归一 LF）。');
  }
  return new Response(raw.replace(/\r\n/g, '\n'), {
    /* RFC 7763 登记的类型。⚠️ 静态主机（Pages / Vercel）按**扩展名**给 content-type，
       这一枚头只在 dev/preview 与 Astro 自己的响应里说话——线上那一份到底是
       `text/markdown` 还是 `text/plain` 本机核不到，登记在 §15 那一格的"未验到"里。 */
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
}
