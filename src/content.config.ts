import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* 文章 = src/content/posts/*.md，标题/日期/摘要/封面写在 front-matter 里
   新增一篇只丢一个 md 文件——清单由构建期汇总，不再有 content.js
   ⚠️ hour 是**可选**的第五键（0–23，写这篇文章的时刻）：填了详情页才落一行"写于一个九月的傍晚"，
   空着就一个字都不显示。为什么不做成必填、也不用 date 推——`date: 2026-09-05` 里没有小时，
   猜出来的时辰是给文章编造写作时刻，那是 §12 禁假数字的近亲：假语境。
   ⚠️ 那层 preprocess 不是装饰：`z.coerce.number()` 会把 YAML 里空着的 `hour:`（null）和 `hour: ""`
   都铸成 **0**，页面于是宣称"写于一个某月的凌晨"——一个作者没写过的时刻。optional() 只放行
   undefined，不放行 null，所以空值必须在这里显式退回 undefined（实测三种输入：null→0、""→0、undefined→undefined）。 */
const hourSlot = z.preprocess(
  v => (v === null || v === '' || v === undefined) ? undefined : v,
  z.coerce.number().int().min(0).max(23).optional(),
);
/* ⚠️ 下面四枚"可空"键同一个口径，只多一道 preprocess：YAML 里空着的 `tags:`／`category:` 是 **null**，
   而 `default()` 和 optional() 一样只放行 undefined，不放行 null——不加这一层，
   作者按习惯留个空键就直接撞进 zod 的英文堆栈里（build 红，但红得没有一句话）。
   为什么默认值是 `''`／`[]`／`false` 而不是"必填"：口径和 hour 那条一模一样——
   **没填必须渲染成不出现**。空 tags 不许长出胶囊、没写 category 的稿子不许生成一枚空名字的分类页
   （那是 §12 那条死锚点禁令的直接形状：`/categories//`），draft/pinned 没填就是"不是草稿、没置顶"，
   而不是把缺省读成 true 去替作者决定一篇稿子发没发。
   ⚠️ 这四枚**一律不做 coerce**：`draft: yes` 在 YAML 1.2 核心 schema 里是字符串 "yes"，
   `z.coerce.boolean()` 会把非空字符串全铸成 true（连 `draft: "false"` 都是 true）——
   那一枚"假语境"换个键又来了：一篇作者想发布的稿子被机器判成草稿、从站上整个消失，
   而构建全绿。所以非布尔就让它红在构建期，并由 `tools/new-post.mjs --check` 提前用人话说破。 */
const blankSlot = t => z.preprocess(v => (v === null || v === '') ? undefined : v, t);
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().default(''),
    cover: z.string().default(''),
    hour: hourSlot,
    /* 分类/标签/草稿/置顶（第十轮 `card/taxonomy`）。名字到 URL 的归一化只有一份实现：
       `src/lib/taxonomy.js` 复用 `markdown.js` 导出的 `safe()`（保留 Unicode 字母数字，中文标签过得去；
       它的白名单不是装饰——清成空串的那种名字不配有页面，就是 §12 那条死锚点禁令） */
    category: blankSlot(z.string().default('')),
    tags: blankSlot(z.array(z.string()).default([])),
    draft: blankSlot(z.boolean().default(false)),
    pinned: blankSlot(z.boolean().default(false)),
    /* 稿件级转载许可族（第十五轮 `card/permit`，学自参照站 Firefly 的 `src/content.config.ts:75-78`）：
       四枚**可空**键，照 `blankSlot` 那条路子走，**非布尔一律不 coerce**——`z.coerce.string()` 会把空着的
       `author:`（YAML 落成 null）铸成字符串 "null"，`.default('')` 就再也不认得了：schema 全绿，而页面替作者
       署下一个他从来没写过的名字、或宣称这一篇有出处链接。口径与 `hour`／`blankSlot` 那两段是同一句话：
       **没填必须渲染成不出现**。
       ⚠️ **`author` 不许回落到站点作者常量**（`src/data/site.js` 的 `AUTHOR`）——本轮裁决，落点在
       `src/pages/essays/[slug].astro` 的那一行：回落会造出一枚"作者签了名但其实没写"的假语境。
       `sourceLink` 非空而 `author` 空着的那一格，正确表现是**整行不出现**，而不是替作者署上站主的名。
       少一项不是错，多一项才是。
       ⚠️ 两枚 URL 键存的是**原样字符串**，消毒只发生在消费点，而且只有一处：`src/lib/markdown.js` 导出的
       `href()`（协议白名单 `OK_LINK` 与 `HAS_SCHEME` 都住在那一份文件里）。schema 这一侧**不写协议判据**——
       同一件事在两处各算一遍，早晚有一处漏掉 `javascript:`。也不许在这里 trim 出"看起来像有值"的形状。 */
    author: blankSlot(z.string().default('')),
    sourceLink: blankSlot(z.string().default('')),
    licenseName: blankSlot(z.string().default('')),
    licenseUrl: blankSlot(z.string().default('')),
  }),
});

export const collections = { posts };
