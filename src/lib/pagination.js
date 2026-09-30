/* 列表页分页的**纯派生**那一半（本轮 `card/pagination`，§15「文章列表页」那一格）：
   不 import 'astro:content'，所以页面与 `tools/pagination-check.mjs` 吃的是**同一份实现**——
   口径与 `src/lib/taxonomy.js` 文件头那两段一模一样："门禁一套算法、页面一套算法，然后两边各自赦免同一个错"
   是 §16 记过的那一族，这里不重犯。
   ⚠️ 这份文件只回答**"整份名单怎么切成页"**，不回答"哪些稿子算数"：后一问的唯一答案是 `src/lib/posts.js`
      的 `visiblePosts()`（`tools/taxonomy-check.mjs` 的 ①② 两格钉着"读 posts 的唯一入口"）。
      切法住在这一份、名单住在那一份，两边各一枚问题——分页不许长出第三份"有哪些稿子"。
   ⚠️ 三条形状口径钉死在这里，页面与判据都不许自己再写一遍：
      ① **一页不许是空的**（§12 那条"关掉之后不留活壳"的产物级版：能访问却没有一行的目录页
         ＝一枚读者点进去读不出东西的活锚点）。`pageRanges()` 的每个区间都满足 `to > from`，
         唯一的例外是**整站零篇**那一格（`total === 0` ⇒ 只交回第 1 页，`/essays/` 仍是那一页空态，
         与 `/categories/` 落地那天的"有设计的空态"同形；不会长出第 2 页）。
      ② **页码从 1 数起、第 1 页就是 `/essays/`**（`pageHref(1)`），所以旧地址一个字节都不动，
         翻页地址只在真的需要时才存在。
      ③ **`page` 这一段是保留字**：`src/pages/essays/page/[n].astro` 占了 `/essays/page/**` 这个命名空间，
         任何一枚稿件的 id 的**第一段**都不许等于它。名单与成因住在 `tools/new-post.mjs`
         （撞名当场红），这一份文件只交出那枚常量——两处真值的事在这里同样不许出现。
*/

/* `/essays/page/2/` 里那一段固定字面量。改它等于改全站所有翻页地址，也等于要重签保留字名单。 */
export const ESSAYS_PAGE_NS = 'page';

/* 每页容量：**3**。§1 五律第 5 条要求"数值必须故意"，所以这枚数不是框架默认值（10／15／20／30 那一族），
   它是站内**已经签过字的同一枚 3**：§15「首页下半段」那条"条数封顶 3（`posts.slice(0,3)`）——再多就不是
   附录是目录了"。目录第一页与首页递出去的那三行同长，读者从首页滚到目录看到的仍是同一份长度，
   要读第四行才翻页。第二笔账是屏高：一行的盒子由在册声明推得出（`.row` 上下内垫 26px×2 ＋ `h3`
   24px×1.45 ＋ `.row-ex` 的 `margin-top:8px` ＋ `min-height:3.4em`@15px ＝ **145.8px**，见 §4 与 §15 那两格），
   三行 ≈ 437px ＋ 年标那一行，落在子页首屏可读栏之内 ⇒ "一页"读起来是"一屏"。
   ⚠️ 它是**默认值不是死值**：`ESSAYS_PER_PAGE` 覆写（下面那枚函数），投稿量涨了不必改代码，
   判据也靠它跑小档（三篇今天装不满两页，分页这一拍读不出来，见 §15 那一格的"零对象"口径）。 */
export const ESSAYS_PER_PAGE = 3;

/* 构建期旋钮 `ESSAYS_PER_PAGE`（与 `PUBLIC_SITE`／`FONT_HOST` 同一条路：只在构建期读一次，
   产物里没有第二处读它的人）。三种输入各有说法，**坏写法一律构建期抛**，不许悄悄退回默认值——
   那会把"我明明拧了旋钮"变成产物里查不到的一件事（§16 那条"静默放过等于没有这一格"同族）。
   · 没设 / 空串 ⇒ 默认那枚 3；
   · `0`        ⇒ **关掉分页这一拍**：整份名单留在 `/essays/` 那一页，`/essays/page/**` 一枚都不生成
                   （这是"关掉之后那条路不存在"，不是"生成一份空页再藏起来"，§12 那一格）；
                   它同时是回归判据的那把尺：`ESSAYS_PER_PAGE=0 npm run build` 出来的第 1 页
                   与分页档的第 1 页必须逐字节相同（今天三篇装得下，所以两档本就同物）。
   · 负数／小数／`abc`／`3.0` ⇒ 抛。 */
export function essaysPerPage(env = process.env){
  const raw = env.ESSAYS_PER_PAGE;
  if (raw === undefined || String(raw).trim() === '') return ESSAYS_PER_PAGE;
  const s = String(raw).trim();
  if (s === '0') return 0;
  if (!/^[1-9]\d*$/.test(s)) {
    throw new Error(`ESSAYS_PER_PAGE 只吃 ≥1 的整数，或 0（＝关掉分页这一拍），收到 "${raw}"。`
      + '负数与小数会把目录切成读不出来的页；"顺手写个默认值放过它"更坏——那等于拧了旋钮而产物里没有反应。'
      + '要不分页就写 0，要每页 N 行就写 N（默认 3，理由在 src/lib/pagination.js 头上）。');
  }
  return Number(s);
}

/* 整份名单切成哪些页：交回 `[{ page, from, to }]`，`from`/`to` 是**在整份数组里的下标**（左闭右开）。
   ⚠️ 下标是全局的，页面用它算门牌起点 ⇒ `folio` 是"这份目录里第几行"而不是"这一页第几行"，
      跨页连号（01 02 03 | 04 05）与跨年分节连号是同一条口径（§15 那一格，`runtime-check` 的门牌对账钉着）。
   ⚠️ 区间长度只由 `per` 与 `total` 决定，任何一枚区间都不许空（口径 ①）；`total === 0` 只交回第 1 页。 */
export function pageRanges(total, per = essaysPerPage()){
  if (!Number.isInteger(total) || total < 0)
    throw new Error(`pageRanges：total 收到 "${total}"——整份名单的枚数不能是负数或小数。`
      + '这一枚数由 `visiblePosts().length` 交回来，读到别的东西就是有人把名单换成了别的对象。');
  if (!Number.isInteger(per) || per < 0)
    throw new Error(`pageRanges：per 收到 "${per}"——0 是"不分页"那一档，负数与小数没有意义（见 essaysPerPage）。`);
  if (per === 0 || total === 0) return [{ page: 1, from: 0, to: total }];
  const out = [];
  for (let from = 0; from < total; from += per) out.push({ page: out.length + 1, from, to: Math.min(total, from + per) });
  return out;
}

/* 第几页 → 地址。第 1 页是 `/essays/` 本身（不是 `/essays/page/1/`）：旧地址一个字节都不动，
   翻页地址只在真的翻页时才存在。页面与判据都从这里取地址，所以"页面画的那枚 href"与
   "判据期待的那枚 href"不可能各写一遍再分叉。 */
export function pageHref(page){
  if (!Number.isInteger(page) || page < 1)
    throw new Error(`pageHref：页码 "${page}" 不是 ≥1 的整数——第 1 页是 /essays/ 本身，没有第 0 页，也不许拼出 /essays/page/0/ 那种盘上不存在的地址。`);
  return page === 1 ? '/essays/' : `/essays/${ESSAYS_PAGE_NS}/${page}/`;
}

/* 这一枚地址属不属于分页命名空间（`/essays/page/<n>/`）：判据用它把翻页链接从正文链接里分出来，
   页面用它决定"末页不许有下一页"里那一枚候选是否合法。形状只在这里写一次。 */
export const isPageHref = href => new RegExp(`^/essays/${ESSAYS_PAGE_NS}/[1-9]\\d*/$`).test(String(href ?? ''));
