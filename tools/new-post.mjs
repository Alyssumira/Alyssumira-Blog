/* 建稿脚本：一条命令生成 src/content/posts/<slug>.md（标题、日期、摘要都在文件头，不再有第二份清单）
   用法  node tools/new-post.mjs <slug> "标题" [--date 2026.09.27] [--excerpt "一句话摘要"]
   自检  node tools/new-post.mjs --check        （每篇的 front matter 是否合规矩，发布前跑）
*/
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { safe } from '../src/lib/markdown.js';   /* 锚点归一化只有一份实现，检查脚本不许自己再猜一遍 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const DATA = join(ROOT, 'src', 'data', 'site.js');


const today = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('.');
};
/* ⚠️ 读进来先归一成 LF：splitMd 认的是 '---\n'，而 `core.autocrlf=true` 的机器上 `git checkout`
   会把稿件重新落成 CRLF —— 那时 front matter 明明在，--check 却报"开头少了 --- front matter ---"
   （本轮实测踩到：git checkout 复原一篇稿件之后 gate ① 当场红）。假阳性比漏检更糟，因为它会教人忽略门禁。 */
const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
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

/* front matter 认 title/date/excerpt/cover 四个键，外加可选的 hour（0–23，写作时刻）。
   骨架不写 hour：它空着比写一个 0 好——0 会被读成"凌晨写的"。要填自己加一行 */
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
    /* 脚注配对：引用了没定义 ⇒ 页面上只剩一个不带链接的星号；定义了没引用 ⇒ 那条注永远不出现。
       两种都是"作者写了但读者看不见"，必须在这里说破，不能留给渲染器兜底 */
    const refs = new Set([...body.matchAll(/\[\^([^\]]+)\](?!:)/g)].map(m => m[1]));
    const defs = [...body.matchAll(/^\[\^([^\]]+)\]:/gm)].map(m => m[1]);
    for (const r of refs) if (!defs.includes(r)) { console.log(`✗ ${f}：[^${r}] 被引用了，但文末没有 [^${r}]: 定义`); bad++; }
    for (const d of defs) if (!refs.has(d)) { console.log(`✗ ${f}：[^${d}] 定义了却没被引用，这条注不会出现在页面上`); bad++; }
    /* id 会先归一化再进 href 与 id 属性：两个不同的写法撞成同一个键时，两条注会合并成一条 */
    const keyed = new Map();
    for (const d of defs) {
      const k = safe(d);
      if (keyed.has(k)) { console.log(`✗ ${f}：[^${keyed.get(k)}] 与 [^${d}] 归一化后都成 "${k}"，锚点会撞车`); bad++; }
      keyed.set(k, d);
    }
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
    '### 三级标题',
    '',
    '三级标题矮一档、不进目录。列表、引用、分隔线现在都能用了：',
    '',
    '- 苔',
    '- 雾',
    '',
    '> 引用一句。',
    '> —— 署名会渲染成小字',
    '',
    '---',
    '',
    '脚注写在这里[^1]，边注写在这里^[宽屏浮到正文左缘，窄屏就地留在句间，不会被藏起来]。',
    '',
    '[^1]: 脚注定义写在文末，一行一条；引用号按正文里第一次出现排，不按这里的顺序。',
    '',
  ].join('\n'));

  console.log(`✓ src/content/posts/${slug}.md（date ${date}）`);
  console.log(`  配图放 public/assets/posts/${slug}/，md 里写 /assets/posts/${slug}/photo.jpg（开头的斜杠不能省）`);
  console.log(`  本地看：npm run dev → /essays/${slug}/`);
  return 0;
}

process.exitCode = process.argv[2] === '--check' ? await check() : create();
