/* 建稿脚本：一条命令把 posts/<slug>.md 和 assets/content.js 的清单同时补齐
   用法  node tools/new-post.mjs <slug> "标题" [--date 2026.09.27] [--excerpt "一句话摘要"]
   自检  node tools/new-post.mjs --check        （清单与 md 文件是否一一对应，CI/发布前跑）
*/
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'posts');
const DATA = join(ROOT, 'assets', 'content.js');

const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('.');
};
const read = p => readFileSync(p, 'utf8');
/* 站点用 LF，Windows 上写文件别让 Node 换行 */
const write = (p, s) => writeFileSync(p, s.replace(/\r\n/g, '\n'));
const q = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

function argList(argv) {
  const out = { slug: '', title: '', date: today(), excerpt: '' };
  for (let i = 0; i < argv.length; i++){
    const a = argv[i];
    if (a === '--date') out.date = argv[++i];
    else if (a === '--excerpt') out.excerpt = argv[++i];
    else if (!out.slug) out.slug = a;
    else if (!out.title) out.title = a;
  }
  return out;
}

/* 清单里的 slug 列表：content.js 是浏览器全局脚本，不是模块，只能按文本读 */
const slugsIn = (src, arrayName) => {
  const start = src.indexOf(`  ${arrayName}: [`);
  if (start < 0) return null;
  const end = src.indexOf('\n  ]', start);
  return [...src.slice(start, end).matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1]);
};

function check(){
  const src = read(DATA);
  const slugs = slugsIn(src, 'essays') || [];
  const files = readdirSync(POSTS).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
  const missMd = slugs.filter(s => !files.includes(s));
  const orphan = files.filter(f => !slugs.includes(f));
  const counts = { essays: slugs.length, things: (src.match(/name:\s*'/g) || []).length, notes: (src.match(/weather:\s*'/g) || []).length };
  if (missMd.length || orphan.length){
    missMd.forEach(s => console.log(`✗ 清单有 ${s}，但 posts/${s}.md 不存在 —— 详情页会落到"这篇文章还在路上"`));
    orphan.forEach(f => console.log(`✗ posts/${f}.md 存在，但清单里没有 —— 列表、上下篇和首页数字都看不见它`));
    return 1;
  }
  console.log(`✓ essays ${counts.essays} · things ${counts.things} · notes ${counts.notes}，清单与 posts/ 一一对应`);
  return 0;
}

function create(){
  const { slug, title, date, excerpt } = argList(process.argv.slice(2));
  if (!slug || !title){
    console.log('用法：node tools/new-post.mjs <slug> "标题" [--date 2026.09.27] [--excerpt "一句话摘要"]');
    console.log('自检：node tools/new-post.mjs --check');
    return 1;
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)){
    console.log(`✗ slug "${slug}" 不合规矩：只用小写字母、数字、连字符（它要进 URL）`);
    return 1;
  }
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(date)){
    console.log(`✗ date "${date}" 不合规矩：要 YYYY.MM.DD`);
    return 1;
  }
  const md = join(POSTS, slug + '.md');
  if (existsSync(md)){ console.log(`✗ posts/${slug}.md 已存在，不覆盖`); return 1; }
  const src = read(DATA);
  if ((slugsIn(src, 'essays') || []).includes(slug)){ console.log(`✗ 清单里已有 slug "${slug}"，换个名字或先删掉旧条目`); return 1; }

  mkdirSync(POSTS, { recursive: true });
  /* 标题在清单里，md 里不要再写 # 一级标题——渲染器只认 ## ，写了会变成一行带井号的正文 */
  write(md, `正文从这里开始。可以写 *斜体词*、\`code\`、[链接](essays.html)，也可以放图：\n\n![图注位置说明](assets/posts/${slug}/photo.jpg "这张图在讲什么")\n\n## 二级标题\n\n二级标题会进右侧目录（>1240px 时）。\n`);

  const entry = `    {\n      slug: '${q(slug)}',\n      title: '${q(title)}',\n      date: '${q(date)}',\n      excerpt: '${q(excerpt)}',\n      cover: ''\n    },\n`;
  const anchor = '  essays: [\n';
  if (!src.includes(anchor)){ console.log('✗ content.js 结构变了（找不到 essays 数组锚点），脚本不敢乱改，请手工加'); return 1; }
  write(DATA, src.replace(anchor, anchor + entry));

  console.log(`✓ posts/${slug}.md`);
  console.log(`✓ content.js essays 已插到最前（${date}）`);
  console.log(`  配图建议放 assets/posts/${slug}/，md 里写相对站点根的路径`);
  console.log(`  本地看：python -m http.server 8000 → /essay.html?p=${slug}`);
  return 0;
}

process.exitCode = process.argv[2] === '--check' ? check() : create();
