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
      这里只留"必须拿到集合本身才能做的那一步"：取集合 → 滤草稿 → 排序。
   ⚠️ 页面请这样 import：`visiblePosts` 从这份，其余（categoryOf / tagsOf / groupBy / tagGroups /
      bySize / taxSlug）从 `taxonomy.js`——分得清哪一步需要构建期集合、哪一步是纯函数。 */
import { getCollection } from 'astro:content';
import { isDraft, sortPosts } from './taxonomy.js';

/* 能被站上读到的那批文章：草稿一枚都不在，顺序是"置顶在最前，其余按日期倒序"。 */
export async function visiblePosts(){
  return sortPosts((await getCollection('posts')).filter(p => !isDraft(p)));
}
