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
  }),
});

export const collections = { posts };
