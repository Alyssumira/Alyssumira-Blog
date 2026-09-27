import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* 文章 = src/content/posts/*.md，标题/日期/摘要/封面写在 front-matter 里
   新增一篇只丢一个 md 文件——清单由构建期汇总，不再有 content.js */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    excerpt: z.string().default(''),
    cover: z.string().default(''),
  }),
});

export const collections = { posts };
