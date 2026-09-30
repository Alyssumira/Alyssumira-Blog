/* 分类 / 标签的**纯派生**那一半（第十轮 `card/taxonomy`）：不 import 'astro:content'，
   所以页面与 `tools/` 里的门禁吃的是同一份实现。
   ⚠️ 为什么必须能给 node 直接 import：`new-post.mjs --check` 与 `taxonomy-check.mjs` 都要算同一枚 slug——
   工具里另抄一份 trim/归一化，就会出现"门禁绿、页面红"那种两边各自赦免同一个错（§16 记过的形状）。
   带 getCollection 的那一半在 `posts.js`（这里不碰它，两者之间只有一条 re-export）。
   ⚠️ 这里**不许**替作者起分类名：front matter 没写就是没有（§12 假内容族，AI 生成内容同族）。
      "没填 ⇒ 不出现"由页面负责（空态写在 categories/ 与 tags/ 那两个索引页里）。
*/
import { safe } from './markdown.js';

/* 名字进任何一处（清单、URL、比较）之前的归一化：只 trim + 折叠内部空白。
   ⚠️ 折叠这一步不是好看：`"散文  笔记"` 与 `"散文 笔记"` 是两个写法、一枚地址，
      不折叠的话 safe() 给出 `散文--笔记` 与 `散文-笔记` 两枚 slug，同一件事开出两个分类页。 */
export const cleanName = s => String(s ?? '').trim().replace(/\s+/g, ' ');

/* URL 那一段：复用 `markdown.js` 导出的 safe()（同一把尺子，脚注锚点与分类地址不会分叉）。
   它保留 Unicode 字母数字，所以中文标签能过；标点换成 `-`、首尾去干净、限长 32。
   ⚠️ 清完可能是空串（`category: "……"` 那种纯标点）——那种名字没有地址可指，调用方必须丢掉它，
      不许生成 `/categories//`（§12 的死锚点）。safe() 注释里那句"白名单不是装饰"说的就是这一族。 */
export const taxSlug = name => safe(cleanName(name));

/* 一篇稿子的分类：没填 ⇒ 空串 ⇒ 页面上一个字都不出现（不画胶囊、不进清单） */
export function categoryOf(post){
  return cleanName(post.data.category);
}
/* 一篇稿子的标签：空串项与"清成空串的项"都丢掉（不配长胶囊），同名写法合并（`散文` 与 `散文 ` 是一个标签）。
   顺序照作者写的顺序，不排字典序——那是他列的清单，不是机器生成的。 */
export function tagsOf(post){
  const out = [];
  for (const raw of post.data.tags || []){
    const name = cleanName(raw);
    if (!name || !taxSlug(name)) continue;
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

/* 订阅源条目上的 <category>（RSS）/ <category term>（Atom）：分类在前、标签在后，空的一个不进。
   两枚 feed 共用这一行，不会出现"RSS 有分类、Atom 没有"。 */
export function feedTerms(post){
  const cat = categoryOf(post);
  return [cat ? [cat] : [], tagsOf(post)].flat();
}

/* 名字 → 分组。索引页、详情页的胶囊、feed 的 term 都从这里取，
   所以"有几个分类、每个几篇"只有一份算法。
   pickMany 返回的是**一枚稿子对应的多个名字**（标签一枚多个，分类一枚一个），
   所以 groupBy() 只是它的一个特例——两条路共用下面这段，包括那枚撞车判断。
   ⚠️ 两个**不同**的名字被 safe() 清成同一枚 slug 时直接抛，不许静默合并：
      合并等于替作者把两件事说成一件事（§12 假语境的近亲），而起名是他的活。
      构建期抛＝响得看得见；`tools/new-post.mjs --check` 用这同一份实现提前拦住并说清后果。
      写法差（多一个空格、大小写不同）也算撞——那正是该由人签字的"到底是不是同一个标签"。 */
export function groupMany(posts, pickMany, what = '分类/标签'){
  const map = new Map();
  for (const p of posts){
    for (const raw of pickMany(p)){
      const name = cleanName(raw);
      if (!name) continue;
      const slug = taxSlug(name);
      if (!slug) continue;                                  /* 没有地址的名字不进清单：见上面那条死锚点 */
      const g = map.get(slug);
      if (!g){ map.set(slug, { name, slug, posts: [p] }); continue; }
      if (g.name !== name){
        throw new Error(
          `${what}："${g.name}"（${g.posts[0].id}）与 "${name}"（${p.id}）归一化后都是 "${slug}"，` +
          `两件事会被并成同一个页面 /${slug}/。合并等于替你把两个名字说成一个——改名字，别改这里。`);
      }
      if (!g.posts.includes(p)) g.posts.push(p);             /* 同一篇里同一个标签写两遍：只算一次 */
    }
  }
  return [...map.values()];
}
/* 一枚稿子只有一个分类 ⇒ groupMany 的一个特例 */
export const groupBy = (posts, pick) => groupMany(posts, p => [pick(p)], '分类');
/* 标签是一枚稿子多个 ⇒ 摊平。/tags/ 那一页的清单用它。 */
export const tagGroups = posts => groupMany(posts, tagsOf, '标签');

/* 索引页的排序：篇数多的在前，同数按名字的码位排。
   ⚠️ 不用 localeCompare：它的中文次序由 ICU 的排序表决定，换台机器就可能换个排法，
      而构建产物应当可复现（同一份源码两次 build 逐字节相同那一族）。 */
export function bySize(groups){
  return [...groups].sort((a, b) =>
    (b.posts.length - a.posts.length) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/* 草稿的判据（页面侧只吃这一个函数，别在页面里写 `!== false` / `== 'true'` 那种半成品）。
   `!!` 是刻意的：front matter 没经过 schema 直接进来的场合（工具喂的对象）也不至于把 undefined 读成真。 */
export const isDraft = post => !!post.data.draft;

/* 不列入的判据（第十五轮 `card/unlisted`）：与上面 `isDraft` 同一条形状、同一族口径，
   所以它也住在这份**不 import 'astro:content'** 的纯文件里——`tools/` 里的门禁（`taxonomy-check` 的行为格、
   `runtime-check` 的产物格、`search-check` 的篇数格）吃的是**这一个实现**，不会出现"门禁一套读法、页面一套读法"
   然后两边各自赦免同一个错（§16 记过的那一族）。为什么这里只回答"是不是不列入"、不回答"那就意味着什么"：
   意味着什么（建路／列出／邻居／feed）住在 `src/lib/posts.js` 那两枚读函数，两处各判迟早分叉。
   ⚠️ `isDraft` 与 `isUnlisted` 是**两件事**（schema 那枚键的注释里钉着同一句话）：
   草稿那一枚地址根本不烘出来；不列入的那一枚页面在、能读，只是站内任何一处都不指向它。 */
export const isUnlisted = post => !!post.data.unlisted;

/* 列表顺序：置顶在最前，其余仍旧按日期倒序（§15 列表页那一格的旧口径一个字没动）。
   比 pinned 再比 date 是全序，V8 的 sort 稳定 ⇒ 同日期同置顶的那几篇按 getCollection 的文件名走，
   构建可复现。⚠️ 顺序变了三件事跟着变：首页那三篇（slice(0,3)）、/essays/ 的按年分节与 folio、上下篇邻居。 */
export function sortPosts(posts){
  return [...posts].sort((a, b) => {
    const pa = !!a.data.pinned, pb = !!b.data.pinned;
    return pa !== pb ? (pa ? -1 : 1) : b.data.date - a.data.date;
  });
}

/* 文本 → 布尔那一半（**工具侧**用：--check 与 runtime-check 自己读 front matter，读来的是字符串）。
   为什么放在这份纯文件里：这一族判据一旦在两个工具里各写一遍，就会出现
   "new-post 放行的写法构建期炸"或反过来——同一件事两处说了算。
   ⚠️ 认的字面量必须与 YAML 1.2 核心 schema（js-yaml 4 用的那套，gray-matter 底下就是它）一致：
      true / True / TRUE / false / False / FALSE，**没有 yes/no/on/off**。
      所以 `draft: yes` 到这里是一枚字符串，zod 的 z.boolean() 会当场抛（构建红）。
      这一条不做 coerce、也不"顺手兼容一下"：把 yes 铸成 true 等于替作者决定这篇稿子发不发，
      那是 §12 禁"假语境"的又一个形状（`z.coerce.boolean()` 更糟：`"false"` 也是 true）。
   schema 那一侧（content.config.ts 的 draft/pinned）与此是**两枚读法、一枚判据**：
   对账由 `tools/taxonomy-check.mjs` 钉（它拿这份实现去吃 content.config.ts 的声明文本）。 */
const BOOL = { true: true, True: true, TRUE: true, false: false, False: false, FALSE: false };
export function parseFlag(raw){
  /* ⚠️ 引号**不剥**：`draft: "false"` 在 YAML 里是一个字符串，zod 的 z.boolean() 会拒它。
     剥掉引号再认，就等于工具放行一种构建期会炸的写法（或者更糟：把作者明写的字符串读成布尔）。 */
  const v = String(raw ?? '').trim();
  if (v === '') return { filled: false, value: false, ok: true };      // 空着＝没填＝默认（false），与 schema 的 blankSlot 同口径
  if (Object.hasOwn(BOOL, v)) return { filled: true, value: BOOL[v], ok: true };
  return { filled: true, value: v, ok: false };
}
