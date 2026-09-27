/* 建稿脚本：一条命令生成 src/content/posts/<slug>.md（标题、日期、摘要都在文件头，不再有第二份清单）
   用法  node tools/new-post.mjs <slug> "标题" [--date 2026.09.27] [--excerpt "一句话摘要"]
   自检  node tools/new-post.mjs --check        （每篇的 front matter 是否合规矩，发布前跑）
*/
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const DATA = join(ROOT, 'src', 'data', 'site.js');


const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('.');
};
const read = p => readFileSync(p, 'utf8');
/* 站点用 LF，Windows 上写文件别让 Node 换行 */
const write = (p, s) => writeFileSync(p, s.replace(/\r\n/g, '\n'));
const q = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

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

/* front matter 只要 title/date/excerpt/cover 四个键，多了 schema 不认 */
function splitMd(raw) {
  if (!raw.startsWith('---\n')) return null;
  const end = raw.indexOf('\n---\n', 3);
  if (end < 0) return null;
  const fm = {};
  for (const line of raw.slice(4, end + 1).split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    fm[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return { fm, body: raw.slice(end + 5).replace(/^\r?\n/, '') };
}

async function check() {
  if (!existsSync(POSTS)) { console.log(`✗ ${POSTS} 不存在`); return 1; }
  const files = readdirSync(POSTS).filter(f => f.endsWith('.md'));
  let bad = 0;
  for (const f of files) {
    const slug = f.slice(0, -3);
    const parsed = splitMd(read(join(POSTS, f)));
    if (!parsed) { console.log(`✗ ${f}：开头少了 --- front matter ---，页面会没有标题和日期`); bad++; continue; }
    const { fm, body } = parsed;
    if (!fm.title) { console.log(`✗ ${f}：title 空着，列表和 <title> 都会是空的`); bad++; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.date || '')) { console.log(`✗ ${f}：date "${fm.date || ''}" 不是 YYYY-MM-DD，getCollection 会直接报错`); bad++; }
    else if (isNaN(Date.parse(fm.date))) { console.log(`✗ ${f}：date "${fm.date}" 是个不存在的日子`); bad++; }
    if (/^# /m.test(body)) { console.log(`✗ ${f}：正文里写了 # 一级标题 —— 标题在 front matter，渲染器只认 ##，这行会原样显示成带井号的正文`); bad++; }
    /* Astro 会在构建期解析 markdown 里的相对图片路径，找不到就 [ImageNotFound] 让整个 build 失败——
       所以这条必须在 build 之前拦住，而不是等渲染器（渲染器会把相对路径钉到根，但那时已经太晚） */
    const relImgs = [...body.matchAll(/!\[[^\]]*\]\((?!\/|\s)(?![a-z][a-z0-9+.\-]*:)([^)\s]*)/gi)].map(m => m[1]);
    if (relImgs.length) { console.log(`✗ ${f}：图片路径少了开头的斜杠，build 会失败：${relImgs.slice(0, 3).map(p => `(${p})`).join(' ')}`); bad++; }
    if (!body.trim()) { console.log(`· ${f}：正文还是空的（骨架状态，能构建，但列表里的摘要会是 front matter 那句）`); }
  }
  /* 数量直接 import 来数：site.js 是真模块，按文本猜格式会静默读成 0 */
  const { things, notes } = await import(pathToFileURL(DATA).href);
  if (bad) { console.log(`✗ ${bad} 处问题 / 共 ${files.length} 篇`); return 1; }
  console.log(`✓ posts ${files.length} · things ${things.length} · notes ${notes.length}，front matter 全部合规矩`);
  return 0;
}

function create() {
  const { slug, title, date, excerpt } = argList(process.argv.slice(2));
  if (!slug || !title) {
    console.log('用法：node tools/new-post.mjs <slug> "标题" [--date 2026.09.27] [--excerpt "一句话摘要"]');
    console.log('自检：node tools/new-post.mjs --check');
    return 1;
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    console.log(`✗ slug "${slug}" 不合规矩：只用小写字母、数字、连字符（它要进 URL）`);
    return 1;
  }
  if (!/^\d{4}[.]\d{2}[.]\d{2}$/.test(date)) {
    console.log(`✗ date "${date}" 不合规矩：要 YYYY.MM.DD`);
    return 1;
  }
  mkdirSync(POSTS, { recursive: true });
  const md = join(POSTS, slug + '.md');
  if (existsSync(md)) { console.log(`✗ src/content/posts/${slug}.md 已存在，不覆盖`); return 1; }

  /* 标题在 front matter，正文不要再写 # 一级标题——渲染器只认 ## ，写了会变成一行带井号的正文
     示例图用括号内空格写成"哑"的：作者没删空格前它不会变成真图，也不会让 build 因缺图失败 */
  write(md, [
    '---',
    `title: "${q(title)}"`,
    `date: ${date.replace(/\./g, '-')}`,
    `excerpt: "${q(excerpt)}"`,
    'cover: ""',
    '---',
    '',
    '正文从这里开始。可以写 *斜体词*、`code`、[链接](/things/)。',
    '',
    `放图先把文件丢进 public/assets/posts/${slug}/，再写下面这行——把括号里的空格删掉才生效：`,
    '',
    `![alt]( /assets/posts/${slug}/photo.jpg "图注" )`,
    '',
    '路径要带开头的斜杠：写成 assets/... 这种相对形式，astro build 会报 ImageNotFound 直接失败。',
    '',
    '## 二级标题',
    '',
    '二级标题会进右侧目录（>1240px 时）。',
    '',
  ].join('\n'));

  console.log(`✓ src/content/posts/${slug}.md（date ${date}）`);
  console.log(`  配图放 public/assets/posts/${slug}/，md 里写 /assets/posts/${slug}/photo.jpg（开头的斜杠不能省）`);
  console.log(`  本地看：npm run dev → /essays/${slug}/`);
  return 0;
}

process.exitCode = process.argv[2] === '--check' ? await check() : create();
