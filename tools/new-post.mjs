/* 建稿脚本：一条命令生成 src/content/posts/<slug>.md（标题、日期、摘要都在文件头，不再有第二份清单）
   用法  node tools/new-post.mjs <slug> "标题" [--date 2026.09.27] [--excerpt "一句话摘要"]
   自检  node tools/new-post.mjs --check        （每篇的 front matter 是否合规矩，发布前跑）
   ⚠️ --check 认的键与 schema 同源（front matter 的读法在 tools/frontmatter.mjs，
      分类/标签的归一化与撞名判断直接 import `src/lib/taxonomy.js`——两份实现会各自赦免同一个错）。
*/
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { safe, href, strictHref } from '../src/lib/markdown.js';   /* 锚点归一化只有一份实现，检查脚本不许自己再猜一遍；
   两枚 URL 键"能不能当路用"同样只有一份：strictHref()。tools/ 这一侧**不写第二份协议正则**，
   只纯消费它和 href() 的返回值——两者的差恰好就是把两种坏形状分开点名的依据（见下面那一格） */
import { splitFm, readTaxonomy, unquote } from './frontmatter.mjs';
import { groupMany } from '../src/lib/taxonomy.js';

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

/* front matter 认 title/date/excerpt/cover 四个键，外加可选的 hour（0–23，写作时刻）；
   第十轮起再多四枚可空键：category / tags / draft / pinned（schema 在 content.config.ts）。
   骨架不写 hour：它空着比写一个 0 好——0 会被读成"凌晨写的"。要填自己加一行。
   四枚新键骨架**给空值**（`category: ""` / `tags: []` / `draft: false` / `pinned: false`）：
   空值与缺省同解（页面上不出现胶囊、不生成分类页、算已发布、不置顶），
   而"顺手编一个分类名填上"是 §12 的假内容族——建稿脚本不许替作者起名字。 */
function splitMd(raw) {
  return splitFm(raw);          /* { fm, fmText, body }；front matter 不成形就是 null */
}

async function check() {
  if (!existsSync(POSTS)) { console.log(`✗ ${POSTS} 不存在`); return 1; }
  const files = readdirSync(POSTS).filter(f => f.endsWith('.md'));
  let bad = 0;
  let urlChecked = 0;                /* 许可族两枚 URL 键里"非空而被 checked 过"的枚数——这一格的看得见数（下面那行打它） */
  const taxPosts = [];                 /* 撞名要跨篇比，所以先收齐（顺序＝文件名序，可复现） */
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
    /* 分类 / 标签 / 草稿 / 置顶（第十轮 `card/taxonomy`）。这四枚键的坏写法**都让构建炸**（zod 抛），
       但炸出来的是一段英文堆栈，不是人话——所以在这里提前拦，并把后果说清（同上面脚注那两条的口径）。
       读法不在这里重写：`tools/frontmatter.mjs` + `src/lib/taxonomy.js` 是页面用的那一份。 */
    const tax = readTaxonomy(parsed.fmText);
    for (const e of tax.errors) { console.log(`✗ ${f}：${e}`); bad++; }
    /* 撞名是跨篇的事，先收着，循环结束后拿 shipped 的 groupMany() 复算（见下面那格） */
    if (!tax.errors.length) taxPosts.push({ id: slug, data: { category: tax.category, tags: tax.tags } });
    if (tax.draft) { console.log(`· ${f}：draft: true —— 这一篇不进列表、不进首页那三篇、没有详情页地址、不进两枚订阅源，关于页那几个数也不数它`); }
    if (tax.pinned) { console.log(`· ${f}：pinned: true —— 它排在 / 与 /essays/ 的最前面（目录行的门牌 folio 跟着新顺序继续连号）`); }
    /* 稿件级转载许可族的两枚 URL 键（键是第十二轮 `card/permit` 的，这一格是补丁轮 `card/permitfix` 加的）：
       **非空**却 `strictHref()` 判成"不能当路用" ⇒ 详情页那一行里这一枚锚点根本不会出现，作者却以为写了就有。
       页面已经不许为它长出 `<a>` 了（`src/pages/essays/[slug].astro` 那段 `---` 注释钉着），所以这里必须当面说破，
       不然坏写法只剩"页面上少一行"这一种表现，build 全绿。两种坏形状**分开点名**、各带出路：
         · `href(v) === '#'` ⇒ 带了协议头而协议不被站内白名单收（javascript:/data:/vbscript: 那一族），消毒成 '#'；
         · 否则 ⇒ 没有协议头，`root()` 把它当站内相对路径钉到站点根（`example.com/x` ⇒ `/example.com/x`），
           那是一枚看着像真链接、点开 404 的活锚——比 `#` 隐蔽，所以两种都要说。
       ⚠️ 这一格里**没有第二份协议正则**：判据是 `markdown.js` 导出的 `strictHref()` / `href()` 的返回值，
       这里只把两枚结果之差翻译成人话（`OK_LINK`／`HAS_SCHEME` 若在这儿抄第三份，早晚有一处漏掉 javascript:）。 */
    for (const [key, effect] of [
      ['sourceLink', '页面上"原文 …"那一段整段不出现（"本文作者 "那一段照旧——它的主键是 author，与路无关）'],
      ['licenseUrl', '页面上许可那一段只剩没有锚点的散文（`licenseName` 仍上屏，只是没得点）'],
    ]) {
      const v = unquote(fm[key] ?? '');                  /* 单/双引号都按页面那侧的口径摘掉，免得假红；键没写 ⇒ 空串（不是 "undefined"） */
      if (!v) continue;
      urlChecked++;
      if (strictHref(v)) continue;
      const why = href(v) === '#'
        ? '协议不在站内白名单里，消毒之后是一枚 href="#" 的死锚，而这一族不许产出它'
        : `没有协议头，它会被当站内相对路径钉到站点根（${href(v)}），点开是一枚 404 的活锚`;
      console.log(`✗ ${f}：${key} "${v}" 不会出现在页面上——${why}；${effect}。要它出现就写成带协议头的 https://…，或者把这一行整条删掉（删掉＝没填＝这一项本来就不该有）`);
      bad++;
    }
  }
  /* 看得见数（上面那一格的对象枚数）：**0 也要打这一行**。三篇真稿四枚键全空 ⇒ 这里报 0 处，
     它证明这一格真的跑过每一篇，而不是一枚从没被喂过输入的保险——本仓被"空转的保险"骗过一次（§16 那一族）。 */
  console.log(`· 许可族 URL 检查 ${urlChecked} 处（posts 里 sourceLink / licenseUrl 非空的枚数；全空 ⇒ 0 处而这一行照样打出来）`);
  /* ⚠️ 用 shipped 的那个分组函数，不在工具里再猜一遍归一化：两份实现会各自赦免同一个错，
     于是"预检全绿、astro build 当场抛"（或反过来）都会发生。构建期那一侧是**抛**——
     静默合并等于替作者把两件事说成一件（§12 假语境的近亲），起名是他的活，不是机器的。 */
  for (const [what, pick] of [['分类', p => [p.data.category]], ['标签', p => p.data.tags]]) {
    try { groupMany(taxPosts, pick, what); }
    catch (e) { console.log(`✗ 撞名（跨篇）：${e.message}`); bad++; }
  }
  /* 数量直接 import 来数：site.js 是真模块，按文本猜格式会静默读成 0 */
  const { things, notes } = await import(pathToFileURL(DATA).href);
  /* /things/ 那几枚卡的名字与链接（页面侧的对应物是 `src/pages/things.astro:23 url`，产物在 `src/pages/things.astro:30 <a class="thing reveal">`）。
     这一格必须在：坏写法在页面上的表现是**整枚卡退成不可点的图鉴**（没有 href、没有悬停那一下），
     build 全绿、页面上一个字的报错都没有——作者却以为写了就能点。两种坏形状**分开点名**、各带出路（口径与上面许可族那一格同源）：
       · `href(v) === '#'` ⇒ 带了协议头而协议不被站内白名单收（javascript:／data:／vbscript: 那一族），消毒成 '#'；
       · 否则 ⇒ 没有协议头，`href` 里它就成相对路径，浏览器解成 /things/example.com/x 那样一枚点开 404 的活锚。
     ⚠️ 判据只有 `src/lib/markdown.js:21 strictHref()` 与 `:20 href()` 这两枚导出函数的返回值，
     tools/ 这一侧不写第三份协议白名单（`OK_LINK`／`HAS_SCHEME` 若在这儿抄一遍，早晚有一处漏掉 javascript:）。
     ⚠️ 这里**不用** `tools/frontmatter.mjs:30 unquote()`：site.js 是按 `import` 拿进来的真模块，
     引号早在 Node 解析源码时就摘掉了，值已经是 JS 字符串；只有按文本读的 front matter 那一侧才需要自己摘。
     ⚠️ `'#'` 是在册的**占位写法**（§12 死锚点那一族的"压根没给地址"），与空着同解 ⇒ 不算"填了一枚链接"、不进下面那个计数、不报红。 */
  let thingLinksChecked = 0;             /* 本格实际查了几枚 link（看得见数，0 也要打这一行，见下面那句） */
  things.forEach((t, i) => {
    const at = `things 第 ${i + 1} 枚卡`;
    if (!String(t.name ?? '').trim()) {
      console.log(`✗ ${at}：name 空着——图鉴上那一条只剩一枚 tag 和一片占位雾，读者叫不出它是啥，而页面照常 build 全绿。填上名字，或把这一条整条删掉（删掉＝这块不存在）`);
      bad++;
    }
    const v = String(t.link ?? '').trim();
    if (!v || v === '#') return;
    thingLinksChecked++;
    if (strictHref(v)) return;
    const why = href(v) === '#'
      ? '协议不在站内白名单里，消毒之后是一枚 href="#" 的死锚，而这一族不许产出它'
      : `没有协议头，它进了 href 就是相对路径——浏览器解成 /things/${v} 那样一枚看着像真链接、点开 404 的活锚`;
    console.log(`✗ ${at}${t.name ? ` "${t.name}"` : ''}：link "${v}" 不会让这张卡可点——${why}；页面上它退成一块没有 href、也没有悬停反馈的图鉴，而你大概以为写了就能点。要它能点就写成带协议头的 https://…，或者干脆留空——留空＝这块不可点，是设计而不是缺陷`);
    bad++;
  });
  /* 看得见数：**0 也要打这一行**。今天四条 thing 的 link 全是 `'#'` ⇒ 链接那一半查到 0 处，
     但同一行打出"检查 4 枚卡"，它证明这一格真的走到过每一条，而不是一枚从没被喂过输入的保险——
     本仓被"扫了但没匹配到"骗过两次（§16 那一族）。 */
  console.log(`· things 检查 ${things.length} 枚卡：link 查到 ${thingLinksChecked} 处非占位链接（'#' 与空都不算填过 ⇒ 全是 '#' 时这里是 0 处，它只说明没有链接可判；name 那 ${things.length} 枚每轮都判过）`);
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
     示例图用括号内空格写成"哑"的：作者没删空格前它不会变成真图，也不会让 build 因缺图失败
     ⚠️ 四枚新键给的是**空值**（`""` / `[]` / `false`），不是编好的示例：
        空值与"没写这一行"同解——不画胶囊、不生成分类页、算已发布、不置顶（§12"没填 ⇒ 不出现"那条）。
        建稿脚本替作者填一个分类名就是替他起名字，那是假内容族（AI 生成内容同族），不做。
        hour 仍旧不写：那一枚空着比写 0 好（0 会被读成"凌晨写的"）。 */
  write(md, [
    '---',
    `title: "${q(title)}"`,
    `date: ${date.replace(/\./g, '-')}`,
    `excerpt: "${q(excerpt)}"`,
    'cover: ""',
    'category: ""',
    'tags: []',
    'draft: false',
    'pinned: false',
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
  /* 四枚新键的写法与后果一次说清——`--check` 那格拦的是坏写法，这一行管的是"忘了有这四枚" */
  console.log(`  分类 category: "散文"（一篇一个，进 /categories/<名字>/）；标签 tags: [甲, 乙] 或下面几行"- 甲"（不是逗号字符串）`);
  console.log(`  draft: true ⇒ 这一篇从站上完全消失（列表／详情／订阅源／关于页那几个数）；pinned: true ⇒ 排在 / 与 /essays/ 最前面`);
  console.log(`  都空着就是"没填"：不画胶囊、不生成分类页——本站不许替作者起名字，也不许留一枚指向空页的锚点`);
  console.log(`  本地看：npm run dev → /essays/${slug}/`);
  return 0;
}

process.exitCode = process.argv[2] === '--check' ? await check() : create();
