/* 系列那一族的**纯派生**那一半（第十五轮 `card/series`，机制学自参照站 Firefly 的 `series`／`seriesOrder`）：
   不 import 'astro:content'，所以页面与 `tools/` 里的门禁吃的是**同一份实现**——这一条口径逐字照
   `src/lib/taxonomy.js` 文件头那段（"工具里另抄一份归一化，就会出现门禁绿、页面红那种两边各自赦免同一个错"）。
   带 `getCollection` 的那一半在 `posts.js`，这一份只接数组。

   ⚠️ **只准吃唯一入口**：调用方交给它的数组必须来自 `src/lib/posts.js` 的 `visiblePosts()`。
   这里不取集合（`tools/taxonomy-check.mjs` 第①格扫 src 全量钉着"别处直接 `getCollection('posts')` 就红"，
   第②格点名每一处调用点）。草稿因此在任何一枚系列里都不存在，与列表页、详情页、两枚订阅源同一个口径。

   ⚠️ **名字到 URL 的归一化只有一份实现**：`taxonomy.js` 的 `taxSlug()`（= `safe(cleanName(name))`，
   那层 Unicode 白名单住在 `markdown.js`，它不是装饰）。这一份文件里**不许**再写一遍 `.replace(...)`。
   归一化之后是空串的名字（`series: "。"` 那种纯标点／符号）**不进清单**：没有地址的名字不配有页面，
   生成 `/series//` 就是 §12 那条死锚点禁令的直接形状。这一族与 `category` 同理，清单与地址同源。

   排序规则（本轮裁决，`docs/设计规范.md` §15 那一格登记的是同一句话）：一枚系列内
     · **整组都有 `seriesOrder` ⇒ 按它升序**（作者说了的顺序就是顺序）；
     · **只要有一枚缺 ⇒ 整组按 `date` 升序**（先写的在前）。
   ⚠️ 不许"有 order 的在前、缺的在后"那种混排：混排是**机器替作者编了一个他没说过的顺序**
   （§12 假语境的近亲）。缺一枚，就把这一组的排序权整个交回日期——那是这一族里唯一谁都不必替谁说话的尺子。
   两种落点都写在组对象上的 `by`（`'order'`／`'date'`）：排序方式本身也是**读出来的数**，
   页面只照 `seriesGroups()` 给的数组画行，不在模板里再排第二遍（两处各排迟早分叉）。

   ⚠️ **组内枚数（`共 M 篇`）是数得出的真值**，可以上屏；**序数（第 N 篇）今天不许印**——
   没有 `seriesOrder` 就没有 N，编一个就是 §12 的假数字；**整组都有 order 时也不印**，
   等真需要那一行的那天再开那一格。 */
import { cleanName, taxSlug, groupMany } from './taxonomy.js';

/* 一篇稿子属于哪一枚系列：没填 ⇒ 空串 ⇒ 这一篇不在任何一格里（清单没有它、详情页那一行也不出现）。 */
export const seriesOf = post => cleanName(post.data.series);

/* `seriesOrder` 的读法。schema 那一侧（`content.config.ts`）已经钉了 `int().positive()`，
   这里再读一次是给**没经过 zod 的对象**兜底（工具直接喂假 post，同 `taxonomy.js` 里 `isDraft` 那枚 `!!` 的理由）。
   ⚠️ `null`／`undefined`／空串／非数／非整／`0`／负数统统读成 `undefined`＝"这一枚没填"——
   读没填的落点是"整组退回按 date"，那正是上面那条规则要的表现，不是宽容。 */
export function orderOf(post){
  const v = post.data.seriesOrder;
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/* 一枚系列内部：先判"整组是不是都有 order"，再按判出来的那一档排。
   同值时按 `id`（文件名）字典序收尾：V8 的 sort 稳定也不许把**输入顺序**当第二判据，
   产物必须与 `getCollection` 的返回顺序无关（构建可复现那一族）。 */
function sortGroup(g){
  const orders = g.posts.map(orderOf);
  const by = orders.every(o => o !== undefined) ? 'order' : 'date';
  const idx = g.posts.map((_, i) => i);
  idx.sort((a, b) => {
    if (by === 'order'){
      const d = orders[a] - orders[b];
      if (d) return d;
    }
    const d = g.posts[a].data.date - g.posts[b].data.date;
    const ia = g.posts[a].id, ib = g.posts[b].id;
    return d || (ia < ib ? -1 : ia > ib ? 1 : 0);
  });
  return { ...g, by, posts: idx.map(i => g.posts[i]) };
}

/* 名字 → 分组（一枚稿子只有一个系列 ⇒ `groupMany` 的一个特例，与 `groupBy`/`tagGroups` 同一条路，
   包括那枚撞车判断：两枚不同的系列名归一化成同一枚 slug 时**构建期抛**，不许静默并成一页）。
   ⚠️ 这里**不许**替作者起系列名：front matter 没写就是没有（§12 假内容族，AI 生成内容同族）。
   索引页的排序由调用方向 `taxonomy.js` 的 `bySize()` 要（篇数多的在前、同数按名字的码位），
   与 /categories/、/tags/ 同一把尺子，不在这里发明第二种。 */
export function seriesGroups(posts){
  return groupMany(posts, p => [seriesOf(p)], '系列').map(sortGroup);
}

/* 系列内的上一篇／下一篇（第十八轮 `card/reading2`，F5；形状照 `docs/美化建议.md` §11.3 那格预签：
   "同 series 的稿子在详情页给'系列内上一篇 / 下一篇'，与按日期的全站上下篇**并存但分开**"）。
   ⚠️ **顺序只从 `seriesGroups()` 拿**，这一枚函数不重新排序、也不补第二枚判据：整组都有 `seriesOrder`
      就按它升序、缺一枚就整组退回按 `date`（文件头那条裁决），而 `/series/<slug>/` 那一页列的是
      **同一枚数组**——所以详情页的"上一篇／下一篇"与系列页从上往下数的邻居**天然是同一件事**，
      不是两处各排一遍再盼着它们对上（§15"顺序只住一处"；对账由 `tools/reading-check.mjs` 在产物上做，
      它拿系列页那排 `.row` 的顺序反查详情页这两枚链接，两页打架就红）。
   ⚠️ 与全站按日期的上下篇是**两枚不同的语义**，所以两块版面分开住：日期那一对在 `.post-nav`
      （22px 衬线、`← prev`／`next →`），这一对在 `.post-tail` 里的一行 14px 说明（`in series ·`）。
      合并成一处的代价是"同一个位置说两件事"——读者无从知道点下去会落到哪一串里。
   ⚠️ 不印序数（没有「第 N 篇」）：`seriesOrder` 可以整组都没填，编一个 N 就是 §12 的假数字（文件头那条）。
   ⚠️ 拿不到邻居的三种情形都退回"这一格不出现"，不是"出现一条空的"（§14 没填 ⇒ 不出现）：
      ① 这一篇没填 series（或名字清不成 slug ⇒ 没有地址，§12 死锚点）；
      ② 这一组只有一篇（它自己是全部）；
      ③ 这一篇**不列入**：`visiblePosts()` 那份数组里没有它 ⇒ 它在任何一格里都排不出邻居——
         与详情页 prev/next 那一格同一个口径（"不在目录里，也就没有邻居"）。
   返回值只两枚：`prev`／`next`，没有就是 `undefined`；调用方按"有没有"决定画不画。 */
export function seriesSiblings(posts, current){
  const none = { prev: undefined, next: undefined };
  if (!current || !Array.isArray(posts)) return none;
  const slug = taxSlug(seriesOf(current));
  if (!slug) return none;                                  /* 没填／没有地址：这一格整块不出现 */
  const g = seriesGroups(posts).find(x => x.slug === slug);
  if (!g) return none;                                     /* 分组里没有它（不列入的那一枚就是这一档） */
  const i = g.posts.findIndex(p => p.id === current.id);
  if (i < 0) return none;
  return { prev: g.posts[i - 1], next: g.posts[i + 1] };
}
