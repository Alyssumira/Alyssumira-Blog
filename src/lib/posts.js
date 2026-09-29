/* 全站读 posts 的**唯一入口**（第十轮 `card/taxonomy`）。
   为什么这份文件必须存在，而且必须只有一份：
   ① 草稿过滤漏一处就是最坏的假完成——列表里没有、详情页照样能访问、订阅源还带着它、关于页还在数它。
      读 posts 的地方有六处（首页 / 文章列表 / 详情页的 getStaticPaths / rss / atom / 关于页的站点档案），
      每处各写一遍 filter 迟早漏一处，所以只留这一个函数，其余人只准调它。
      这条由 `tools/taxonomy-check.mjs` 钉着：任何一处直接 `getCollection('posts')` 都红。
   ② 派生字段铁律（本项目口径）：值 = f(同一张表里的参数)，只许一个出处。
      **纯**派生那半（归一化 / slug / 分组 / 顺序 / 布尔的读法）住在 `taxonomy.js`——
      那份文件不 import 'astro:content'，所以 `tools/` 里的门禁吃的是同一个实现，
      不会出现"门禁一套算法、页面一套算法"然后两边各自赦免同一个错（§16 记过这一族）。
      这里只留"必须拿到集合本身才能做的那一步"：取集合 → 滤草稿 → 排序（→ 可见那一枚再滤不列入）。
   ⚠️ 页面请这样 import：`visiblePosts` 从这份，其余（categoryOf / tagsOf / groupBy / tagGroups /
      bySize / taxSlug）从 `taxonomy.js`——分得清哪一步需要构建期集合、哪一步是纯函数。
   ③ 第十五轮 `card/unlisted` 起这份文件有**两枚**读函数，两枚的语义必须一个字都不含糊：
      · `publishedPosts()` ＝ **只滤草稿**，含不列入的那几枚。唯一合法调用者是详情页的 `getStaticPaths`
        ——那一处要的是"哪些地址要建出来"，不是"哪些稿子要被人看见"。
      · `visiblePosts()` ＝ 滤草稿 **＋** 滤不列入。首页、`/essays/`、分类·标签·系列三族、两枚 feed、
        `search.json`、`llms.txt`、关于页那几个数**全部继续吃它**，调用点一枚都不改——这正是
        "只有拿到地址的人能读"这一族能成立的前提：入口只有一枚，所以"漏一处"的形状从一开始就画不出来。
      ⚠️ 但 **prev/next 必须从 `visiblePosts()` 算**，路从 `publishedPosts()` 建。反过来做（邻居吃整份集合）
      就是一枚不列入的稿子出现在某一篇的上一篇／下一篇里——"站内任何一处都不指向它"当场破，
      而那正是这一族唯一要防的形状。这一条由 `tools/runtime-check.mjs` 的"不列入对账"那一格在**产物**上钉
      （源码级那三类原理上看不见它：地址是活的、列表是干净的、只有 href 里露出来）。 */
import { getCollection } from 'astro:content';
import { isDraft, isUnlisted, sortPosts } from './taxonomy.js';

/* 站上架得住的那批文章（**含**不列入的）：草稿一枚都不在，顺序是"置顶在最前，其余按日期倒序"。
   ⚠️ 只有详情页 `getStaticPaths` 准调它——它回答的是"哪些地址要烘出来"。别的任何一处（列表、feed、索引、
   邻居）都要的是"哪些稿子能被指到"，那一问的答案是下面那枚 `visiblePosts()`。 */
export async function publishedPosts(){
  return sortPosts((await getCollection('posts')).filter(p => !isDraft(p)));
}

/* 能被站上读到的那批文章：草稿与不列入的一枚都不在（顺序同上面那枚，滤的只是"看得见"那一半）。
   `unlisted` 没填 ⇒ `isUnlisted` 假 ⇒ 照常被列出（schema 那枚键的默认值是 `false`，与 `draft`/`pinned` 同一条）。 */
export async function visiblePosts(){
  return (await publishedPosts()).filter(p => !isUnlisted(p));
}
