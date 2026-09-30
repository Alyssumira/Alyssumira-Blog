/* 站内导航表的**一处真值**（第六轮 `card/navcrumb`，从 `Layout.astro` 原样搬出来）。
   ⚠️ 为什么要搬进 lib：同一份"哪一栏叫什么、住哪个地址"今天有三枚消费者——
      ① `Layout` 画导航胶囊、② `Seo.astro` 拼 JSON-LD 的 BreadcrumbList、③ 详情页那行可见面包屑。
      前两枚本来就吃同一份（§13a 那一格钉的就是"中段名字不许抄第二份"），第三枚一加，
      表留在页面壳里就等于给"可见的那条链"立了第二处真值——改了导航而没人改它，屏幕上和机器读的就分叉。
      纯模块（不 import 'astro:content'）与 `taxonomy.js` 同一口径：`tools/` 里将来要数枚数也能直接 import。
   ⚠️ 三枚字段各有各的层，不许混用（§7"两层各管一种语言"）：
      `[0]` 地址、`[1]` 中文页名（**导航与 JSON-LD 用这一枚**）、`[2]` 拉丁小写键（**标签层用这一枚**，
      `.sec-label` 的 `essays — 03 →`、`.post-meta`、纸上一页脚 `mistwood · essays · 日期` 都是那一层）。
      第三枚本来就是 `here` 的取值域，可见面包屑用它不算新起一个名字——它只是同一格里已有的那一半。 */
export const NAV = [
  ['/', '首页', 'home'],
  ['/essays/', '文章', 'essays'],
  ['/things/', '小东西', 'things'],
  ['/about/', '关于', 'about'],
  ['/notes/', 'notes', 'notes'],
];

/* 面包屑的中段：首页那一节 ＋ `here` 对应的那一节。与 Seo 原先的拼法逐字同值（搬表不改链）。
   ⚠️ `here` 为空或不认识的 ⇒ 只有首页一级 ⇒ **调用方整块不画**（§13a 那条"链子太短不许硬凑"）。
   分类／标签／系列那三族本来就不传 `here`（导航里没有这一族，点亮别项就是撒谎，§9），
   所以它们在机器侧和屏幕侧拿到的是同一个答复：没有这一条链，不是漏画了一条。 */
export function crumbTrail(here){
  const out = [];
  const home = NAV.find(l => l[2] === 'home');
  if (home) out.push({ href: home[0], name: home[1], key: home[2] });
  const up = NAV.find(l => l[2] === here && l[2] !== 'home');
  if (up) out.push({ href: up[0], name: up[1], key: up[2] });
  return out;
}
