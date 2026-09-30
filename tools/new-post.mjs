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
import { groupMany, aliasSlot, aliasesOf } from '../src/lib/taxonomy.js';
import { ESSAYS_PAGE_NS } from '../src/lib/pagination.js';   /* 分页命名空间那一段（`/essays/page/<n>/`）：
   保留字名单向** shipped 的那一枚常量**要，不在这里抄一份字面量——抄的那份改了没人知道（§13a 那句话）。
   这一份文件不 import 'astro:content'，所以 node 侧吃得动它（口径同 taxonomy.js 头上那两段）。 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const DATA = join(ROOT, 'src', 'data', 'site.js');

/* 稿件 id 的**第一段**不许是这些字面量（本轮 `card/pagination` 立这一格）。
   ⚠️ 名单只加不减：将来 `/essays/` 底下再多一枚静态命名空间（例如 `/essays/tag/<x>/` 那种写法），
      新第一段先进这一格、再动路由——反过来做就是"页面先建出来、保留字名单补漏"，
      那一族"作者写了稿子而它的地址被机制吃掉"是 §12 那条"写了却看不见"的近亲。 */
const RESERVED_FIRST_SEG = [ESSAYS_PAGE_NS];

/* 递归收全部稿件 id（相对 posts/、不带 .md、子目录用 `/` 连着）。
   ⚠️ 为什么这里要递归而上面那圈主循环只扫平铺的 `*.md`：集合那一侧是 `content.config.ts` 里那枚 glob loader，
   它的 pattern 是 `**` 打头的那一种——**它认子目录**。判据只扫平铺就会漏掉恰好最危险那一种 id
   （`page/2.md` ⇒ `/essays/page/2/`，与分页第 2 页同一枚地址）。与 `astro.config.mjs` 的
   `unlistedPaths()` 同一条理由：读不到盘就不许判。 */
function postIds(dir, rel = ''){
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })){
    if (e.isDirectory()){ out.push(...postIds(join(dir, e.name), `${rel}${e.name}/`)); continue; }
    if (/\.md$/i.test(e.name)) out.push(`${rel}${e.name.replace(/\.md$/i, '')}`);
  }
  return out.sort();
}


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
   第十轮起再多四枚可空键：category / tags / draft / pinned（schema 在 content.config.ts）；
   第十五轮起再多一枚布尔键 `unlisted`（不列入：页面在、地址能读、站内没有一处指向它）——
   骨架**不写**这一行（没写＝没填＝照常被列出），要的人自己加；--check 那格逐篇读它并打印"扫了几篇、几枚是 true"。
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
  let unlistedSeen = 0;              /* 写着 unlisted: true 的篇数——同一族看得见数，0 枚也要打（见下面那行） */
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
    /* 分类 / 标签 / 草稿 / 置顶（第十轮 `card/taxonomy`）＋ 系列 / 序数（第十五轮 `card/series`）：这六枚键的坏写法**都让构建炸**（zod 抛），
       但炸出来的是一段英文堆栈，不是人话——所以在这里提前拦，并把后果说清（同上面脚注那两条的口径）。
       读法不在这里重写：`tools/frontmatter.mjs` + `src/lib/taxonomy.js` ＋ `src/lib/series.js` 是页面用的那一份。 */
    const tax = readTaxonomy(parsed.fmText);
    for (const e of tax.errors) { console.log(`✗ ${f}：${e}`); bad++; }
    /* 撞名是跨篇的事，先收着，循环结束后拿 shipped 的 groupMany() 复算（见下面那格） */
    if (!tax.errors.length) taxPosts.push({ id: slug, data: { category: tax.category, tags: tax.tags, series: tax.series } });
    if (tax.draft) { console.log(`· ${f}：draft: true —— 这一篇不进列表、不进首页那三篇、没有详情页地址、不进两枚订阅源，关于页那几个数也不数它`); }
    if (tax.pinned) { console.log(`· ${f}：pinned: true —— 它排在 / 与 /essays/ 的最前面（目录行的门牌 folio 跟着新顺序继续连号）`); }
    /* 不列入（第十五轮 `card/unlisted`）：与上面 `draft` 那一行**同形状、同一种语气**，但后果要说全——
       这一枚最容易被读错成"跟草稿一样"，而它是反的：**页面在、地址是真的、能读**，只是站内没有一处指过去。
       一处一处点名比一句"不进列表"有用，因为作者记住的是"我藏起来了"，读者找的是"我搜不到它"。 */
    if (tax.unlisted) { unlistedSeen++; console.log(`· ${f}：unlisted: true —— 这一篇**发了**，但它自己的地址是唯一入口：不进列表、不进首页那三篇、`
      + `不进分类/标签/系列任何一格目录、不进两枚订阅源、不进 search.json 那份索引、不进 llms.txt、也不进 sitemap-0.xml，`
      + `详情页的上一篇/下一篇里也没有它；而它的页面照常构建（/essays/${slug}/ 在 dist/ 里就有，拿到地址的人读得到），那一页带 noindex。`
      + `⚠️ 它不是密码：静态站没有服务端，产物到了谁手里谁就能离线读——这一枚挡的是"被目录与抓取器收走"，不是"被人读到"（§12）。`); }
    /* 稿件级转载许可族的两枚 URL 键（键是第十五轮 `card/permit` 的，这一格是补丁轮 `card/permitfix` 加的）：
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
  /* ⚠️ 不列入那一枚的**零对象看得见数**：今天一篇都没标 ⇒ 这里仍旧打印"扫了 N 篇、其中 0 篇"。
     这一行存在的理由与上面那枚一模一样（§16 那一族："扫了但没匹配到"与"扫了且全过"长得一样）：
     它证明这一格真的逐篇读过那一枚键，而不是一枚从没被喂过输入的保险。 */
  console.log(`· 不列入检查 ${files.length} 篇：其中 ${unlistedSeen} 篇写着 unlisted: true${unlistedSeen ? '' : '（0 篇是今天签字的状态，不是这一格没跑——每一篇的 front matter 都被读过）'}`);
  /* ⚠️ 分页命名空间（本轮 `card/pagination` ①）：`/essays/page/<n>/` 那一段 `page` 由目录的分页路由占用
     （`src/pages/essays/page/[n].astro`），而详情页那一族是 `src/pages/essays/[slug].astro` ＋ 同址的
     `src/pages/essays/[slug]/index.md.js`——**同一个层级、同一个源**。撞车的成因两枚，都在本机实测过：
       · `src/content/posts/page.md`（平铺）⇒ id `page` ⇒ `/essays/page/`。build **全绿**（实测 14 页），
         产物里 `dist/essays/page/index.html` 是一篇稿子、`dist/essays/page/2/index.html` 是目录的第 2 页，
         两件事叠在同一棵目录下、没有一句话报错。坏在判据侧：任何按**路径形状**数"哪几页是目录页"的产物级尺子
         （`tools/pagination-check.mjs` 第②格就是这么枚举的）从此读不出谁是谁——两侧格子的"朝窄不误红"就失效了。
       · `src/content/posts/page/2.md`（子目录）⇒ id `page/2` ⇒ 与第 2 页**同一枚地址**，而且 `[slug]` 那一枚
         参数填不进带斜杠的 id：实测 build 当场 `[ERROR] TypeError: Missing parameter: slug`
         （栈在 `/essays/page/2/index.md` 那一格），exit 码还不稳（本机读到 127，§16 记过"throw 那两跑的 exit 码不稳定"）。
     ⇒ 结论是**必须挡**，落点就在这一格（构建期红、用人话说破），不是运行时兜底——运行时兜底意味着
        "作者写了稿子而它的地址被机制吃掉"，那一族 §12 管着。
     ⚠️ 顺带把"稿件放子目录"整族挡掉：上面第二枚成因与保留字无关也一样炸（集合那一侧的 glob pattern 是 `**` 打头那一种、认子目录，
        而两枚 `[slug]` 路由不认），今天 0 枚，所以这一格是拦未来的，不是修今天的。 */
  const ids = postIds(POSTS);
  let reservedHits = 0;
  let nestedHits = 0;
  for (const id of ids){
    const head = id.split('/')[0];
    if (RESERVED_FIRST_SEG.includes(head)){
      reservedHits++;
      console.log(`✗ ${id}.md：id 的第一段 "${head}" 是 /essays/ 的**保留字**（名单：${RESERVED_FIRST_SEG.join(' / ')}，住在 tools/new-post.mjs 顶上那一格，值向 src/lib/pagination.js 的 ESSAYS_PAGE_NS 要）。`
        + `那一整段命名空间归目录的分页路由：/essays/${head}/<页码>/ 是"第 <页码> 页"，不是稿件地址。`
        + (id.includes('/')
            ? `这一枚还是子目录写法，实测构建当场炸（[ERROR] TypeError: Missing parameter: slug），炸在 /essays/${id}/index.md 那一格。`
            : `实测这一枚**不炸**：build 全绿，而 dist/essays/${head}/index.html（这一篇）与 dist/essays/${head}/2/index.html（目录第 2 页）叠在同一棵目录里——绿着的撞车比红着的更难发现。`)
        + `出路：改名字（node tools/new-post.mjs <slug> 只准小写字母、数字、连字符，且不许等于 ${RESERVED_FIRST_SEG.join(' / ')}），稿子内容一个字不用动。`);
      bad++;
    } else if (id.includes('/')){
      nestedHits++;
      console.log(`✗ ${id}.md：稿件放在子目录里 ⇒ id 带斜杠（"${id}"），而详情页那两枚路由都是单段的 [slug]：实测 build 报 [ERROR] TypeError: Missing parameter: slug（集合那一侧 glob 是 **/*.md，认子目录，两处不认）。`
        + `出路：把文件挪回 src/content/posts/ 平铺（站内没有任何一处支持"目录式稿件"，slug 里那枚连字符是给你分段用的）。`);
      bad++;
    }
  }
  /* 看得见数：**0 也要打这一行**（§16 那一族："扫了但没匹配到"与"扫了且全过"在两串输出里是同一种样子）。
     这一格读的是**盘上的文件树**，不是集合，所以它必须报出扫了几枚 id——一枚都没扫到就是判据空转，当场红。 */
  if (!ids.length) { console.log('✗ 分页命名空间检查：一枚稿件 id 都没扫到（posts/ 读不到？）——这一格在空转，不许算过'); bad++; }
  else console.log(`· 分页命名空间检查 ${ids.length} 枚 id：保留字撞名 ${reservedHits} 处 · 子目录写法 ${nestedHits} 处（都是 0 才是今天签字的状态；名单＝${RESERVED_FIRST_SEG.join(' / ')}，只扫 id 的第一段）`);

  /* ⚠️ 用 shipped 的那个分组函数，不在工具里再猜一遍归一化：两份实现会各自赦免同一个错，
     于是"预检全绿、astro build 当场抛"（或反过来）都会发生。构建期那一侧是**抛**——
     静默合并等于替作者把两件事说成一件（§12 假语境的近亲），起名是他的活，不是机器的。 */
  for (const [what, pick] of [['分类', p => [p.data.category]], ['标签', p => p.data.tags], ['系列', p => [p.data.series]]]) {
    try { groupMany(taxPosts, pick, what); }
    catch (e) { console.log(`✗ 撞名（跨篇）：${e.message}`); bad++; }
  }

  /* ── 旧地址那一族（第十七轮 `card/aliases`）：形状、撞名、跨篇重复，三样都在源码级拦 ──────────
     为什么这一格必须住在 `--check`（源码级、build 之前）而不是只住在产物级的 `tools/alias-check.mjs`：
     撞名那一族在构建侧**根本不红**——`astro build` 只打印一行
     `[WARN] Could not render \`/about\` from route \`/[...alias]\` as it conflicts with higher priority route \`/about\``
     就把那枚跳转页静默丢掉，退出码仍是 0、"N page(s) built" 照报（2026-09-30 实测）。
     也就是说：作者写完 `aliases` 之后，站上是"旧地址仍然死着"，而门禁全绿。红必须响在人动手的那一刻。
     ⚠️ 判据不在这里重写：形状归 `src/lib/taxonomy.js` 的 `aliasSlot()`（页面与门禁同一份），
        名单归 `aliasesOf()`；本格只回答"这枚地址是不是已经被别人占着了"，答案从**路由表本身**现扫，
        不抄一份固定路由名单——抄的那份迟早和 `src/pages/` 分叉（§16 记过这一族）。 */
  {
    const ROUTES = [];                                    /* src/pages 里每一枚路由的字面段形状 */
    (function w(dir, rel = ''){
      if (!existsSync(dir)) return;
      for (const e of readdirSync(dir, { withFileTypes: true })){
        const p = join(dir, e.name);
        if (e.isDirectory()){ w(p, `${rel}${e.name}/`); continue; }
        if (!/\.(astro|js|ts|mdx?)$/i.test(e.name)) continue;
        /* 路由的字面段：去掉扩展名，末段**恰好是 `index`** 才算"这一层的目录页"（丢掉那一段）。
           ⚠️ 不是"任何以 index 开头的都丢"：`essays/[slug]/index.md.js` 交出来的是 `/essays/<slug>/index.md`
              那一枚**原文端点**（第三段是字面量 `index.md`），把它当成 `/essays/<slug>/` 会让撞名那一格
              指错本家——红话指错文件比不红更坏（假阳性教人忽略门禁，本仓 §16 记过）。 */
        const segs0 = (rel + e.name).replace(/\.(astro|js|ts|mdx?)$/i, '').split('/');
        if (segs0[segs0.length - 1] === 'index') segs0.pop();
        const stem = segs0.join('/');
        const parts = stem.split('/').filter(x => x !== '');
        ROUTES.push({
          file: `src/pages/${rel}${e.name}`,
          parts: parts.map(x => {
            const r = /^\[\.\.\.(.+)\]$/.exec(x), m = /^\[(.+)\]$/.exec(x);
            if (r) return { rest: true, name: r[1] };
            if (m) return { param: true, name: m[1] };
            return { lit: x };
          }),
          dynamic: false,
        });
        const last = ROUTES[ROUTES.length - 1];
        last.dynamic = last.parts.some(x => x.param || x.rest);
        last.static = '/' + last.parts.map(x => x.lit ?? '*').join('/') + (last.parts.length ? '/' : '');
      }
    })(join(ROOT, 'src', 'pages'));
    /* 这一枚文件自己不算"别人" */
    const isAliasRoute = r => r.parts.some(x => x.rest && /alias/i.test(x.name));
    const matches = (r, segs) => {
      for (let i = 0; i < r.parts.length; i++){
        const x = r.parts[i];
        if (x.rest) return true;                                    /* rest 吃掉后面所有段 */
        if (i >= segs.length) return false;
        if (x.lit !== undefined){ if (x.lit !== segs[i]) return false; continue; }
      }
      return r.parts.length === segs.length;
    };
    /* 「认得出的那一层」：一枚参数段的值能从盘上算出来，才许用"真值相等"当撞名判据。
       essays/[slug] ⇄ 稿件文件名；categories|tags|series/[name] ⇄ 现算的分类·标签·系列清单。
       认不出来的那些（下一轮 `card/pagination` 正在加的 essays/page/[n] 就是第一个）一律按**整层**算占着：
       它生成的值由那一页自己的算术决定，我在这儿猜一个"不会撞"就是假绿。 */
    const postIds = new Set(files.map(f => f.slice(0, -3)));
    const taxAddrs = { categories: new Set(), tags: new Set(), series: new Set() };
    for (const [what, pick, dir] of [['分类', p => [p.data.category], 'categories'], ['标签', p => p.data.tags, 'tags'], ['系列', p => [p.data.series], 'series']])
      try { for (const g of groupMany(taxPosts, pick, what)) taxAddrs[dir].add(`/${dir}/${g.slug}/`); }
      catch { /* 撞名上面那一格已经点名过，这里不再重复报 */ }
    const ENUM = { essays: new Set([...postIds].map(x => `/essays/${x}/`)), ...taxAddrs };
    const PUBLIC_TOP = existsSync(join(ROOT, 'public'))
      ? new Set(readdirSync(join(ROOT, 'public')).map(x => `/${x.toLowerCase()}`)) : new Set();
    const seen = new Map();                                  /* 旧地址 → 第一篇声明它的稿子 */
    let aliasChecked = 0;
    for (const f of files){
      const slug = f.slice(0, -3);
      const parsed = splitMd(read(join(POSTS, f)));
      if (!parsed) continue;
      const tax = readTaxonomy(parsed.fmText);
      if (tax.errors.length) continue;                        /* 坏写法上面已经红过了 */
      for (const raw of (tax.aliases ?? [])){
        aliasChecked++;
        const s0 = aliasSlot(raw);
        if (!s0.path){ console.log(`✗ ${f}：aliases 里有一项钉不成站内地址——${s0.bad}`); bad++; continue; }
        for (const other of tax.aliases ?? []){
          if (other !== raw && String(other) > String(raw) && aliasSlot(other).path === s0.path){ console.log(`· ${f}：aliases 里 "${raw}" 与 "${other}" 是同一枚地址 ${s0.path}（去掉首尾斜杠是同一种写法）——按一枚算`); break; }
        }
        const segs = s0.path.replace(/^\/|\/$/g, '').split('/');
        const prev = seen.get(s0.path);
        if (prev && prev !== slug){ console.log(`✗ 旧地址撞名（跨篇）：${s0.path} 同时被 ${prev} 与 ${slug} 声明——路由只会留名单里第一枚，另一篇的访客被悄悄改道。给其中一篇换一个旧地址`); bad++; }
        else if (!prev) seen.set(s0.path, slug);
        /* 静态资源那一层：public/ 顶层叫什么，那枚前缀就被谁占着——文件本身永远排在跳转页前面 */
        if (PUBLIC_TOP.has(`/${segs[0].toLowerCase()}`)){
          console.log(`✗ ${f}：aliases 里的 ${s0.path} 落在 public/${segs[0]}/ 那一层——托管先按文件找这一枚路径，跳转页永远轮不到被读到。换一个不属于静态资源目录的旧地址`);
          bad++;
        }
        for (const r of ROUTES){
          if (isAliasRoute(r) || !matches(r, segs)) continue;
          if (!r.dynamic){ console.log(`✗ ${f}：aliases 里的 ${s0.path} 与站内固定路由撞上（${r.file} 就是那一枚地址的本家）——旧地址不许盖在 about / notes / essays 目录 / feed 这些页面上，那一页会整枚消失`); bad++; break; }
          /* 「认得出的那一层」＝恰成 `essays/[slug]` 与 `categories|tags|series/[name]` 那一种形状（一枚字面段＋一枚参数段，
             而参数段的值能从盘上现数出来）。别的那种动态路由——`card/pagination` 正在排的 `essays/page/[n]` 是第一个——
             它生成的地址（分页码、将来的归档月页……）由那一页自己的算术决定，我在源码侧数不出来 ⇒ **整层都算被占着**：
             这里宁可红一次让作者换个写法，也不留"看着不撞、下一轮那一张卡落地才撞"的假绿。 */
          const enumerable = r.parts.length === 2 && r.parts[0].lit !== undefined && r.parts[1].param === true && ENUM[r.parts[0].lit];
          if (!enumerable){ console.log(`✗ ${f}：aliases 里的 ${s0.path} 落在 ${r.file} 那一层——那一层生成哪些地址由它自己算（分页码那一类），我在源码侧数不出来；旧地址写到里面去，早晚与那一页抢同一枚地址`); bad++; break; }
          if (!ENUM[r.parts[0].lit].has(s0.path)) continue;                     /* 这一层的其它地址（比如改名后的旧 slug）正是这一族要接的对象 */
          if (s0.path === `/essays/${slug}/`){ console.log(`✗ ${f}：aliases 里的 ${s0.path} 就是这一篇自己的详情页——旧地址与真地址同名，跳转页会被详情页静默吃掉（实测 build 只 WARN 不红），而那枚旧地址本来要指的是"改名之前的那一枚"。删掉这一项，或者写成它真正替换掉的那枚旧路径`); bad++; break; }
          console.log(`✗ ${f}：aliases 里的 ${s0.path} 已经是站上一枚真产物（${r.file} 会为它烘出页面）——两枚路由抢同一枚地址时 Astro 只打一行 WARN 就把跳转页丢了，build 与 check 之外没人知道旧地址没生效`); bad++; break;
        }
      }
    }
    console.log(`· 旧地址检查 ${aliasChecked} 项（${[...new Set([...seen.keys()])].length} 枚在册）：与固定路由／详情页／分类三族／静态资源层逐枚比过（0 项是今天签字的状态，不是这一格没跑——每一篇的 front matter 都被读过）`);
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
  /* 保留字（本轮 `card/pagination` ①，与上面 --check 那一格同一份名单、同一枚常量）：
     建稿当场拦比构建期红好——`--check` 那一格管的是"已经丢进 posts/ 的稿子"（作者可能直接拷文件），
     这一格管的是"正用这条命令起名"，两处的判据必须同值所以都读 RESERVED_FIRST_SEG。 */
  if (RESERVED_FIRST_SEG.includes(slug.split('/')[0])) {
    console.log(`✗ slug "${slug}" 不能用："${slug.split('/')[0]}" 是 /essays/ 的保留字（名单：${RESERVED_FIRST_SEG.join(' / ')}）——/essays/${slug.split('/')[0]}/<数字>/ 是目录的第几页，不是稿件地址（成因与实测在 --check 那一格与规范 §15）。换个名字，标题与内容都不用动。`);
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
  /* 第三枚布尔键（第十五轮 `card/unlisted`）：这一行管的是"忘了有这四枚之外的这一枚"——
     骨架**故意不写** `unlisted:` 那一行（没写＝没填＝照常被列出，与写 `false` 同解），要的人自己加一行。 */
  console.log(`  unlisted: true ⇒ 第三枚布尔键，与 draft **反着**：页面照常构建、那个地址照常读得到，只是站内任何一处都不指向它`);
  console.log(`    （列表／首页那三篇／分类·标签·系列三族／两枚订阅源／search.json／llms.txt／sitemap-0.xml／上下篇全没有它）。它不是密码——静态站没有服务端（§12）`);
  console.log(`  都空着就是"没填"：不画胶囊、不生成分类页——本站不许替作者起名字，也不许留一枚指向空页的锚点`);
  console.log(`  本地看：npm run dev → /essays/${slug}/`);
  return 0;
}

process.exitCode = process.argv[2] === '--check' ? await check() : create();
