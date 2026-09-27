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
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().default(''),
    cover: z.string().default(''),
    hour: hourSlot,
  }),
});

export const collections = { posts };
