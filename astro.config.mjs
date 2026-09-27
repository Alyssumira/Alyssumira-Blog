import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/* 上线前换成自己的域名：RSS 与 sitemap 都要它才能拼绝对地址 */
const SITE = 'https://mistwood.example.com';

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
