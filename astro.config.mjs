import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/* 上线前换成自己的域名：RSS 与 sitemap 都要它才能拼绝对地址。
   PUBLIC_SITE 是构建期开关：没给就用下面这枚占位默认值（产物与改动前逐字节相同）。 */
const PLACEHOLDER_SITE = 'https://mistwood.example.com';
const SITE = process.env.PUBLIC_SITE || PLACEHOLDER_SITE;

/* 构建期守卫：Vercel 的生产构建必须带一枚真域名，否则当场抛，不警告。
   为什么这枚牙要落在构建入口：tools/runtime-check.mjs 那关要起本机 headless Edge 去读 dist/ 的运行时 DOM，
   Vercel 的构建环境里根本跑不了它——把"没填真域名不许上线"指望在门禁上，在那儿这道闸并不存在。
   只认 VERCEL=1 与 VERCEL_ENV=production 同时成立：预览构建拿的是 Vercel 给的预览 URL，占位域名碍不着它。 */
if (process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production') {
  const given = process.env.PUBLIC_SITE;
  if (given === undefined || given === '' || given === PLACEHOLDER_SITE) {
    throw new Error(
      `astro.config.mjs 的构建期守卫：这是 Vercel 生产构建（VERCEL=1、VERCEL_ENV=production），` +
      `可 PUBLIC_SITE ${given === undefined || given === '' ? '没给' : `给的就是那枚占位值 ${PLACEHOLDER_SITE}`}。` +
      `canonical / og:url / rss.xml / sitemap 的绝对地址全由它拼一份，带着占位域名上线等于把订阅者的链接送到别人手里。` +
      `两条路：① 在 Vercel 的项目环境变量里填 PUBLIC_SITE=https://你的域名；` +
      `② 承认这枚就是占位域名、这次构建并不上线——那它就不该以 VERCEL_ENV=production 的身份跑，` +
      `本地 npm run build 或预览构建都不受这道闸管。`
    );
  }
}

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
