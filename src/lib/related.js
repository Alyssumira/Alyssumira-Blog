/* 相关阅读那一族的**纯派生**那一半（第十八轮 `card/reading2`，F4；形状是 `docs/美化建议.md` §11.3
   那格预签的："详情页文末（上下篇附近）挂 1–3 篇共享 tags/category 最多的已发布稿；全空整块不出现；
   顺序只住 lib/posts.js；草稿不得漏进"）。
   不 import 'astro:content'，所以页面与 `tools/reading-check.mjs` 吃的是**同一份实现**——口径逐字照
   `src/lib/taxonomy.js` 与 `src/lib/series.js` 的文件头：工具里另抄一份打分，就会出现"门禁绿、页面红"
   那种两边各自赦免同一个错的形状（§16 记过这一族）。带 `getCollection` 的那一半在 `posts.js`，这一份只接数组。

   ⚠️ **只准吃唯一入口**：调用方交给它的数组必须来自 `src/lib/posts.js` 的 `visiblePosts()`。
      这里不取集合（`tools/taxonomy-check.mjs` 第①格扫 src 全量钉着"别处直接 `getCollection('posts')` 就红"）。
      ⇒ 草稿与不列入的那几枚**天然不可能出现**：它们不在那份数组里（`isDraft`／`isUnlisted` 的判据住在
      `taxonomy.js`，"谁吃这份判据"住在 `posts.js` 那两枚读函数），这一份文件**不重写第三份 filter**——
      同一件事在两处各滤一遍，迟早有一处漏掉一个键。不列入的那一篇自己那一页仍然可以读 related，
      而它指向的稿子全是看得见的：入口只有一枚，所以"漏一处"的形状从一开始就画不出来。

   ── 这一格签字的五条规则（逐条都有名字，改任何一条都要回来改这一段）────────────────────
   ① **共享的真 token 枚数是唯一的排序信号**。没有相似度模型、没有"编辑精选"、没有手写推荐位、
      没有"看了这篇的人还看了"——那些都是本站拿不到的数（§12「编一个访问量」那一族：拿不到的东西
      不许写成拿到的）。token 只有两族：`categoryOf()` 那一枚分类与 `tagsOf()` 那几枚标签，
      都从 `src/lib/taxonomy.js` 要，不在这里再读一遍 front matter。
   ② **平票保持输入数组的顺序**，不发明第二枚排序键（§15 那句"顺序只住一处"管到这一格：
      输入数组的顺序＝`sortPosts()` 给的"置顶在最前、其余按日期倒序"，那一处已经为列表页、两枚 feed
      与上下篇定了序；这里再按标题、按字数、按 id 补一刀，就是给同一件事立第二处真值——
      而那第二处永远不会出现在规范里）。
   ③ **上限 3 枚**（`RELATED_MAX`，预签的"1–3 篇"里那一档上限）。它不是性能参数而是版面的：
      再多就不是"附录"是"第二个目录"，而目录已经有它自己的一页（§15 首页那三篇同一条理由）。
   ④ **零 token 的两侧都不画**：这一篇自己没填分类也没填标签 ⇒ 返回空数组 ⇒ 页面上那一整块**不出现**
      （不是"出现一条空的"、也不是留一行"还没有相关推荐"——§14 那句"没填 ⇒ 不出现"，与 `hour`／
      `series`／`aliases` 同一条路）；候选那一篇零 token ⇒ 共享枚数必然是 0，同样不进结果，
      **共享 0 枚不叫相关**，把它排进来就是拿"另一篇也在这个站里"当理由，那是整份目录的说法。
   ⑤ **分类与标签是两个维度，不同名相通撞不记分**：token 带命名空间前缀（`c:` / `t:`），
      所以 A 的分类「雾」与 B 的标签「雾」算**两件事**、不共享。这是本卡做的判断，不是抄来的规则，
      理由钉在这儿：本站的清单本来就是两族页面（`/categories/<slug>/` 与 `/tags/<slug>/`），
      一处把它们当同一枚 token、另一处当两枚，就是"分类与标签到底是不是一回事"有了两处真值。
      同一枚 token 在一篇稿子里只会数一次（`tagsOf()` 自己已去重，分类与标签又分属两个前缀）。

   ⚠️ **进打分的 token 必须是有地址的那一枚**：清不成 slug 的名字（`category: "。"` 那种纯标点）在
      `groupMany()` 那一侧根本不进清单（`/categories//` 是 §12 的死锚点），这里也不让它记分——
      否则会出现"这一篇与那一篇因为一枚谁也都打不开的名字被算成相关"。口径与 `tagsOf()` 现成的那道
      `!taxSlug(name) continue` 同一条，不在这里新开第二条边界。
*/
import { categoryOf, tagsOf, taxSlug } from './taxonomy.js';

/* 上限是一枚**故意的数**（§1 五律第 5 条），不是框架气质：1–3 是预签的那一档，3 是它的上限。 */
export const RELATED_MAX = 3;

/* 一枚名字配不配被记分：清不成 slug（`"。"` 那种纯标点）就没有地址，也就没有"这一族"可共享。
   判据只有 `taxSlug()` 那一枚，**不在这里写第二份归一化**；它与 `tagsOf()` 里那句
   `!taxSlug(name) continue`、与 `groupMany()` 里那句"没有地址的名字不进清单"是同一条边界。 */
const hasAddress = name => taxSlug(name) !== '';

/* 一篇稿子的"真 token"清单：分类一枚（可有可无）＋ 标签若干，各带自己的命名空间。
   两族都向 taxonomy.js 要——它已经做过 trim／折叠内部空白／合并同名写法／丢掉清不成 slug 的那几枚，
   这一处再写一遍归一化就是第二份真值（而那第二份永远比第一份宽松）。 */
export function tokensOf(post){
  const out = [];
  const cat = categoryOf(post);
  if (cat && hasAddress(cat)) out.push('c:' + cat);
  for (const t of tagsOf(post)) out.push('t:' + t);
  return out;
}

/* 相关清单：给（有序池子，当前篇）拿回至多 RELATED_MAX 枚别的稿子。
   · 返回值**照池子的类型**交回原对象（不包壳），页面拿它就能直接画标题与地址。
   · 平票按池子顺序（规则②），共享多的在前（规则①），上限 RELATED_MAX（规则③）。
   · `limit` 只准往下调（工具与页面都该拿到同一默认值；传 0／负数／非数 ⇒ 空，那是"关掉这一格"，
     不是"退回不限枚数"——宁可少画，不许多画）。 */
export function relatedPosts(posts, current, limit = RELATED_MAX){
  if (!current || !Array.isArray(posts)) return [];
  const mine = new Set(tokensOf(current));
  if (mine.size === 0) return [];                          /* 规则④：这一侧零 token ⇒ 整块不出现 */
  const take = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 0), RELATED_MAX) : 0;
  if (take === 0) return [];
  const scored = [];
  for (let i = 0; i < posts.length; i++){
    const p = posts[i];
    if (!p || p.id === current.id) continue;               /* 自己永远不进（不是"分数低"，是不进） */
    let shared = 0;
    for (const t of tokensOf(p)) if (mine.has(t)) shared++;
    if (shared === 0) continue;                            /* 规则④：共享 0 枚不叫相关 */
    scored.push({ p, shared, i });
  }
  scored.sort((a, b) => (b.shared - a.shared) || (a.i - b.i));   /* 规则① ＋ 规则② */
  return scored.slice(0, take).map(x => x.p);
}
