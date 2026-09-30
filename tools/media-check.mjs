/* media-check.mjs —— 站内媒体门禁（`card/mediacheck`，接进 `npm run check` 作**末项＝第 ⑦ 项**）
   用法  node tools/media-check.mjs
         node tools/media-check.mjs --list     （外加逐篇打印收进来的每一枚 <img src> 与它的盘上落点）

   ── 它钉住的两件事 ──────────────────────────────────────────────────────────
   ① 稿件正文里那枚**站内图片地址**必须指到 `public/` 下盘上真存在的文件；
   ② front matter 的 `cover` 非空就必须指到真文件。空着是已签字的状态（`src/content.config.ts:34` 是
      `cover: z.string().default('')`；空 ⇒ 列表页不画那个缩略位，见 `docs/设计规范.md` §13（待替换占位）里 `cover` 那一格），
      所以放行空格子不是靠 if 跳过装绿：非空那一半有牙，牙在 ① 那格当众验。
   为什么这两件非得有机器守：`public/` 是原样拷进 `dist/` 的，`<img src>` 破了 `astro build` 照样 exit 0、
   `npm run check` 照样绿——这正是 `docs/设计规范.md` §13 里 favicon 那一格点过名的那一族（静态资源也没有门禁）。

   ── 与链上第 ① 项的分工：不许有第二把尺子量同一件事 ──────────────────────────
   `tools/new-post.mjs:75 relImgs` 拦的是相对写法 `assets/...`：Astro 构建期会去解析它，找不到就 `[ImageNotFound]`
   让整个 build 失败（口径见 `docs/设计规范.md` §13 那一格，与 `tools/new-post.mjs` 里拦相对写法那两行注释）。本卡不重述那句
   少了开头的斜杠、也不自己判写法：它查剩下的那一半——写法完全合法、渲染器照原样画进 `<img src>`、
   但盘上没有那枚文件。两把尺子的对象今天不相交：相对写法在 `&&` 链上第 ① 项就停了，走不到这一格；
   单独跑这一格时它也报一句盘上没有，那是同一件事实的第二句实话，不是多出来的判决。

   ── 为什么走 renderMd 产物这一条路（从产物里的 <img src> 收），而不是复用那两枚模式 ──
   解析形状在 `src/lib/markdown.js:27-28`（`IMG_ONE`＝整段是一枚图，`IMG_LINK`＝图包在链接里），两枚都
   没有导出（导出表 `src/lib/markdown.js:277`：`renderMd, inlineMd, fmtDate, root, safe, splitBlocks, href, strictHref`——
   后两枚是第十五轮 `card/permit` 与它的补丁 `card/permitfix` 加出去的，**这一串清单数的一直是"没导出的那两枚不在其中"，
   加导出没改变那件事**）。
   另一条路要先把它们导出来，然后在工具里**重做一遍块切分**才用得动，而那两枚锚死整块的模式盖不住
   第三种形状：句子中间夹一枚图走的是 `IMG_RE`（`src/lib/markdown.js:26`，全局匹配；`renderMd` 把段里的图提到段后落图版）。
   ⇒ 只搬那两枚 const 就会**漏掉段里夹的图**，而那是稿件里最常见的一种写法。要补齐就得连 `splitBlocks`
   的围栏语义、表格格子不走图片规则、`imgSrc()` 的协议过滤一起重写第二份，工具侧与渲染器侧从此成了
   两份实现：改一边、另一边照样绿，正是 §16 记过好几次的"两边各自赦免同一个错"。
   本卡这条路吃的是同一份渲染真值，四件事白送：
     · 围栏代码块里的 `![]()` 不会成为 `<img>`（`codeMd` 只过 `esc()`）——参照站那枚
       `scripts/quarantine-bad-posts.mjs:27-48` 要手写 `stripCode()` 剥三遍才做对的事，渲染器已经做对了；
     · 段里夹的图、图包在链接里的图、整段是一枚图，三种形状都已经被 `renderMd` 收成 `<img>`；
     · `data:` 与 `javascript:` 这类协议由 `imgSrc()` 直接画成空 src（一枚 `<img>` 都不产），本卡无从查起；
     · 详情页吃的就是 `renderMd` 那一层（`card/anchors` 起页面写的是 `renderArticle(post.body)`，
       `src/pages/essays/[slug].astro:95`——它是 `renderMd` 的一层壳，同一入参同一趟，只多交回章清单），与这里同一个入参。
   代价照实登记：产物里没有行号。所以**判断只来自产物，行号只用于点名是哪一行**（拿同一枚路径字面量回
   源码行里找，找不到也照样红，只是那一行少一个坐标）。自造第三套 markdown 正则——禁止，本卡没有。

   ── 今天零对象（这一格必须跑过并且看得见 0，不许恒红，也不许跳过装绿） ──────
   三篇真稿正文一张配图都没有（`grep -c '!\[' src/content/posts/*.md` 实测 0 / 0 / 0）、`cover` 三枚全空、
   `public/assets/` 只有 `bg-dark.jpg`、`bg-light.jpg`、`portrait.png` 三枚。零对象下"扫了但没匹配到"与
   "扫了且全过"在两串输出里是同一种样子（§16 那条老判据），所以 ① 那一格带**控制样本**：同一枚收集器在
   合成样本上必须收得到三种形状各一枚（外加相对写法一枚，凑成 needle 的正面），必须收不到围栏里的、
   远端的、`data:` 的那几枚；`public/assets/portrait.png` 当见证物，钉住真文件不许误伤。
   ② ③ 两格再各印出扫了几篇、收到几枚、非空 cover 几枚——数要打得出来，不是沉默。

   ── 不碰的三处（碰了就把一条已签字的裁决改成 bug） ──────────────────────────
   · `public/og/<slug>.png` 那一族：详情页 og:image 的三档口径（`ogCard` prop → 地址 × `existsSync` →
     `/og.png`，见 `docs/设计规范.md` §13a 的 `og:image` 取值口径那一格）故意让缺图那一页与改动前逐字节相同。本卡不扫 `public/og/`、
     不读 `dist/`，那一档一个字节不动。
   · `src/layouts/Layout.astro:103-105` 与 `:106-119` 那两段 `<script is:inline>`（一枚是 speculationrules、不写属性）：另一族的病，不在这里治。
   · 稿件内容由作者写：本卡只判地址，一个字节都不改稿件，也不替谁补图。

   ── 没盖住的（别把上面读成图片已经全交给机器） ──────────────────────────────
   ① 只查 `src/content/posts/*.md` 的正文与 `cover`。`src/data/site.js` 的 `shot`、关于页那枚
      `portrait.png`、以及任何写死在模板里的地址都不在这一格——它们是模板与数据，不是稿件。
   ② 表格格子里的 `![]()` 走 `inlineMd`，那里没有图片规则 ⇒ 页面上是一行字面文本而不是破图，本卡不判它
      （那是 §15 白名单的另一族——图没被渲染成图，与本卡判的站内地址不在盘上不是一件事）。
   ③ `cover` 写成多行 YAML（`cover: |` 那种）时，工具侧那份读法（`tools/frontmatter.mjs` 的 `splitFm`，
      它文件头就明说自己不是 YAML 解析器）读回来是那枚 `|`，会被判成地址不在盘上 ⇒ 这是**假红**的一种，
      已知且留在这儿：骨架给的是 `cover: ""` 一行式，谁改成多行，这一格会红着提醒顺手改本卡。
   ④ 本卡不判素材该放哪个目录（§13 那句是放置约定，不是存在性判据），也不查 `http(s)://` 那种远端地址
      够不够得着——查不了，也不该红。
*/
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import { renderMd, root } from '../src/lib/markdown.js';
import { splitFm, readTaxonomy } from './frontmatter.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const PUBLIC_DIR = join(ROOT, 'public');
const args = process.argv.slice(2);
let asserted = 0;                       /* 每格自己上报跑了几条断言；0 ⇒ 这一格在空转（口径照 taxonomy-check） */
const problems = [];
const notes = [];
const listing = [];                     /* --list 用的逐枚账目 */
function cell(id, label, fn){
  let n = 0, threw = null;
  try { n = fn() || 0; }
  catch (e){ threw = e; }
  /* 一格死了只报一次：抛出来的那条就是原因，不再补一句 asserted=0（两条都进账单会淹掉真正那句） */
  if (threw){ problems.push(`${id} ${label}：${threw && threw.message ? threw.message : threw}`); return; }
  if (!n){ problems.push(`${id} ${label}：asserted=0（这一格一个断言都没跑就交了白卷）`); return; }
  asserted += n;
  notes.push(`${id} ${label}：${n} 条断言 ✓`);
}

/* ---------- 收集器：从**渲染产物**里收 <img src>（本卡唯一的图片来源） ---------- */
const IMG_TAG = /<img\b[^>]*?\bsrc="([^"]*)"/gi;
const REMOTE = /^https?:/i;              /* 只放过 http(s)：远端查不了，也不该红 */
/* 属性值进产物前经 attr() 把双引号换成 &quot;（src/lib/markdown.js:9），取回来要还一次原 */
const decodeAttr = s => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };   /* 坏的百分号编码按字面查，不猜 */

const srcsOf = html => [...String(html).matchAll(IMG_TAG)].map(m => decodeAttr(m[1]));

/* 一枚 <img src>（产物里那串，不是稿件里那串）→ 它对应的盘上对象。
   分四类：remote（不查）／internal（查）／empty（站内地址是空的）／escape（`..` 跳出 public/）。 */
function target(src){
  if (REMOTE.test(src)) return { kind: 'remote' };
  const cut = decodeAttr(src).split(/[?#]/)[0].trim();        /* `?v=2` 与 `#frag` 不是文件名的一部分 */
  if (cut === '') return { kind: 'empty', src };
  const abs = resolve(PUBLIC_DIR, safeDecode(cut).replace(/^\/+/, ''));
  const relToPublic = relative(PUBLIC_DIR, abs);
  if (relToPublic === '' || relToPublic === '..' || relToPublic.startsWith('..' + sep)){
    return { kind: 'escape', src, abs };
  }
  return { kind: 'internal', src, disk: abs, publicPath: 'public/' + relToPublic.split(sep).join('/') };
}

/* 判决：null＝过；字符串＝进账单的那句话（把访客会拿到什么说清，不只报一个路径不对） */
function missingWord(t){
  if (t.kind === 'internal') return existsSync(t.disk) ? null
    : `页面上画的是 <img src="${t.src}">，而盘上没有 ${t.publicPath} ⇒ 访客取到 404，astro build 照样 exit 0`;
  if (t.kind === 'empty') return `src "${t.src}" 是空的站内地址（指回本页自己），它不可能是一枚图片文件`;
  if (t.kind === 'escape') return `src "${t.src}" 里的 .. 跳出了 public/，构建不会把它拷进 dist/，访客取不到`;
  return null;
}

/* YAML 允许单引号，而 splitFm 只剥双引号那一层：不补这一层，`cover: '/assets/x.png'` 会被连引号一起去查盘
   ⇒ 假红。假阳性比漏检更糟，因为它会教人忽略门禁（tools/new-post.mjs:25 那句同一个教训）。 */
const unq = s => {
  const v = String(s).trim();
  return v.length > 1 && v[0] === "'" && v.endsWith("'") ? v.slice(1, -1) : v;
};

/* 只用于**点名行号**、不参与判断：拿路径字面量回正文行里找（绝对与相对两种写法都含这段核心）。
   整段核心找不到就退一枚文件名；再找不到就报"行号未定位"，红照旧——行号是坐标不是判据。 */
function linesWith(bodyLines, src, lineOffset){
  const core = safeDecode(decodeAttr(src).split(/[?#]/)[0].replace(/^\/+/, ''));
  const hit = pat => pat ? bodyLines.map((l, i) => (l.includes(pat) ? i + 1 + lineOffset : 0)).filter(Boolean) : [];
  const full = hit(core);
  if (full.length) return full;
  const base = core.split('/').pop();
  return base !== core ? hit(base) : full;
}
/* cover 那一行的行号：只在 front matter 那一段里找，正文里写一行 cover: 不算 */
function coverLineOf(text){
  const end = text.indexOf('\n---\n', 3);
  if (end < 0) return null;
  const m = /^cover:/m.exec(text.slice(0, end + 1));
  return m ? text.slice(0, m.index).split('\n').length : null;
}

/* ---------- ① 控制样本：这一格的存在就是为了让零对象时的绿不等于空转 ---------- */
const CTL = 'assets/posts/__media_ctl__';      /* 合成地址用的目录名：盘上没有，也不会与真素材撞车 */
cell('①', '控制样本（同一枚收集器：该收到的必须收到，不该收到的必须收不到）', () => {
  const internal = md => srcsOf(renderMd(md)).filter(s => !REMOTE.test(s));
  let n = 0;

  /* 朝宽：renderMd 画得出 <img> 的三种形状，一枚都不许漏（漏了就是收集器在空转） */
  const SHAPES = [
    ['整段是一枚图', `![测试](/${CTL}/one.png)`, `/${CTL}/one.png`],
    ['句子中间夹着图', `前面一句 ![甲](/${CTL}/two.png) 后面一句`, `/${CTL}/two.png`],
    ['图包在链接里', `[![丙](/${CTL}/three.png)](/essays/demo/)`, `/${CTL}/three.png`],
  ];
  for (const [name, md, want] of SHAPES){
    const got = internal(md);
    assert.equal(got.length, 1, `① 控制样本「${name}」：renderMd 画得出 <img>，收集器却收到 ${got.length} 枚 ⇒ 收集器空转（真稿件一张图都没有，这一格是全卡唯一分得开"空转"与"全过"的地方）`);
    assert.equal(got[0], want, `① 控制样本「${name}」收到的是 "${got[0]}"，期望 "${want}"：收进来的地址被改了，判的就不是作者写的那件事`);
    n += 2;
  }
  /* 相对写法也会经 root()（src/lib/markdown.js:14）钉到站点根：本卡照这条地址查盘，
     但少了开头的斜杠会炸 build 那句话归链上第 ① 项说，这里不重述（文件头那条分工） */
  const rel = internal(`![测试](${CTL}/rel.png)`);
  assert.equal(rel.length, 1, '① 相对写法的图在产物里也是一枚 <img>，收集器却收不到');
  assert.equal(rel[0], '/' + CTL + '/rel.png', '① 相对写法没有经 root() 钉到站点根');
  n += 2;
  const positives = 3 + 1;

  /* 朝窄：这些写法一枚都不许收进站内判据——每条都同时断言页面真的渲染了那几行，
     否则"收到 0 枚"可能来自空转而不是来自正确地不认它 */
  const fenceHtml = renderMd('```md\n![测试](/' + CTL + '/in-fence.png)\n```\n\n正文一句。');
  assert.ok(/!\[测试\]\(\/assets\/posts\/__media_ctl__\/in-fence\.png\)/.test(fenceHtml), '① 围栏样本没被渲染成代码块（那行字面文本不在产物里）——这一枚负样本的证明力是假的');
  assert.equal(internal('```md\n![测试](/' + CTL + '/in-fence.png)\n```\n\n正文一句。').length, 0, '① 围栏代码块里的 ![]() 被当成真图收了：作者举的例子会把门禁弄红，这正是参照站要手写 stripCode 才躲开的那件事');
  const unfence = renderMd('```js\nlet a = "![x](/' + CTL + '/in-fence2.png)";\n');
  assert.ok(/<pre class="code">/.test(unfence), '① 未闭合围栏样本没有落进 <pre>——负样本没跑通');
  assert.equal(srcsOf(unfence).length, 0, '① 未闭合围栏（一路吃到文末）里的 ![]() 被当成真图收了');
  const extHtml = renderMd('![外链](https://example.com/a.png)\n\n![另一枚](http://example.com/b.png)');
  assert.equal(srcsOf(extHtml).length, 2, '① 远端样本一枚 <img> 都没画出来——负样本没跑通');
  assert.equal(srcsOf(extHtml).filter(s => !REMOTE.test(s)).length, 0, '① 远端 http(s) 地址被收进站内判据：查不了的东西不该红');
  const dataHtml = renderMd('![内联](data:image/png;base64,AAAA)');
  assert.equal(srcsOf(dataHtml).length, 0, '① `data:` 那枚 imgSrc() 应当一枚 <img> 都不产，产物里却出现了 src：收集器查到的不是页面画出的东西');
  n += 8;

  /* 两种坏形状必须落在判决里，不许静默放过 */
  const emSrcs = srcsOf(renderMd('![坏写法](#x)'));
  assert.equal(emSrcs.length, 1, '① src 为 #x 的样本没画出 <img>——负样本没跑通');
  const empty = target(emSrcs[0]);
  assert.equal(empty.kind, 'empty', `① 一枚 src 为 "#x" 的图被分成了 "${empty.kind}"：空的站内地址必须点名，不能被当成远端放过`);
  assert.ok(missingWord(empty), '① 空的站内地址没有判决句子');
  const esc = target(root('/assets/../../outside.jpg'));
  assert.equal(esc.kind, 'escape', `① "/assets/../../outside.jpg" 被分成了 "${esc.kind}"：跳出 public/ 的地址根本不会被拷进 dist/，不能按路径字面去查`);
  assert.ok(missingWord(esc), '① 跳出 public/ 的地址没有判决句子');
  n += 5;

  /* cover 那一半的尺子也必须自己有牙 */
  const cv = v => target(root(unq(v)));
  assert.equal(cv('https://cdn.example.com/a.jpg').kind, 'remote', '① cover 的远端写法被当成站内文件去查盘了');
  assert.equal(cv('assets/portrait.png').kind, 'internal', '① needle：cover 的相对写法该经 root() 成站内地址');
  assert.equal(missingWord(cv('assets/portrait.png')), null, '① needle 误伤：public/assets/portrait.png 明明在盘上却被判成缺文件——这一枚是真文件不许红的见证物，它不在了请先补回文件而不是改判据');
  assert.ok(missingWord(cv('/assets/posts/__media_ctl__/nope.png')), '① cover 指到一枚盘上没有的站内地址却没有判决句子 ⇒ cover 那一半没有牙');
  assert.equal(unq("'x'"), 'x', '① 单引号那一层没剥：YAML 的单引号写法会被连引号一起去查盘（假红）');
  n += 5;

  assert.ok(existsSync(join(PUBLIC_DIR, 'assets', 'portrait.png')), '① public/assets/portrait.png 不在盘上：控制样本失去真文件不许误伤的那枚见证物');
  assert.ok(!existsSync(join(PUBLIC_DIR, CTL)), `① public/${CTL} 居然存在：控制样本用的目录名与真素材撞车了，换掉那枚字面量`);
  n += 2;
  notes.push(`① 控制样本：站内地址正向收到 ${positives} 枚（整段图／句中介图／图包链接／相对写法各一枚）`
    + `· 负向 0 枚（围栏 2 处、远端 2 枚、data: 1 枚，四处样本都先断言过页面确实渲染了那几行）`
    + `· needle public/assets/portrait.png 判为在盘上`);
  return n;
});

/* ---------- ② 真实稿件的正文图片 ---------- */
cell('②', '稿件正文里每一枚站内 <img src> 都在 public/ 下有真文件', () => {
  assert.ok(existsSync(POSTS_DIR), '② src/content/posts 不在盘上 —— 这一格在评空气');
  assert.ok(existsSync(PUBLIC_DIR), '② public/ 不在盘上 —— 站内地址的落点整个没了，判据正在空转');
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).sort();
  assert.ok(files.length > 0, '② 一篇稿件都读不到（目录空）—— 这一格在空转');
  let total = 0, inside = 0, remote = 0, good = 0, bad = 0, draft = 0, n = 0;
  for (const f of files){
    const text = readFileSync(join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const parsed = splitFm(text);
    assert.ok(parsed, `② ${f} 的 front matter 不成形（链上第 ① 项本该先拦下它）`);
    n++;
    if (readTaxonomy(parsed.fmText).draft) draft++;         /* 草稿也一律查：它迟早要发出去，第 ① 项也不分草稿 */
    const bodyLines = parsed.body.split('\n');
    const lineOffset = (text.slice(0, text.length - parsed.body.length).match(/\n/g) || []).length;
    const srcs = srcsOf(renderMd(parsed.body));             /* 与详情页同一份真值：renderMd(post.body) */
    total += srcs.length;
    for (const s of srcs){
      const t = target(s);
      if (t.kind === 'remote'){ remote++; listing.push(`  ${f}  远端（不查）  ${s}`); continue; }
      inside++;
      const word = missingWord(t);
      const at = linesWith(bodyLines, s, lineOffset);
      const where = at.length ? `:${at.join(', ')}` : '（行号未定位：产物里那串地址与源码字面量不同，只有页面画出的那串作数）';
      if (word){ bad++; problems.push(`② src/content/posts/${f}${where} 一枚正文图片 —— ${word}`); }
      else good++;
      listing.push(`  ${f}  ${word ? '缺' : '在'}  ${s}  ${t.kind === 'internal' ? t.publicPath : ''}`);
    }
  }
  assert.equal(inside + remote, total, '② 收到的 <img> 有几枚既不算站内也不算远端（分类漏了一支，漏掉的那支等于没查）');
  n++;
  notes.push(`② 稿件正文：扫了 ${files.length} 篇（其中草稿 ${draft} 篇——草稿也照查，它迟早要发出去，链上第 ① 项也不分草稿）`
    + ` · 逐篇 renderMd(body) 收到 <img> ${total} 枚 `
    + `＝站内 ${inside} 枚全查 ＋ 远端 ${remote} 枚不查 · 站内指到真文件 ${good} 枚 · 缺文件 ${bad} 枚`
    + `${total === 0 ? ' ⇒ 今天正文零配图（三篇都没写过 ![]()）：这是签字的状态而不是坏了——它与空转的区别由 ① 那格的四枚正向控制撑着' : ''}`);
  return n;
});

/* ---------- ③ front matter 的 cover ---------- */
cell('③', 'cover 非空 ⇒ 必须指到盘上真文件（空着／没写这一行＝没填＝页面不画那个缩略位）', () => {
  const files = existsSync(POSTS_DIR) ? readdirSync(POSTS_DIR).filter(f => f.endsWith('.md')).sort() : [];
  assert.ok(files.length > 0, '③ 一篇稿件都读不到 —— 这一格在空转');
  let filled = 0, remote = 0, good = 0, bad = 0, blank = 0, n = 0;
  for (const f of files){
    const text = readFileSync(join(POSTS_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const parsed = splitFm(text);
    assert.ok(parsed, `③ ${f} 的 front matter 不成形（链上第 ① 项本该先拦下它）`);
    n++;
    const v = unq(parsed.fm.cover === undefined ? '' : parsed.fm.cover);
    if (v === ''){ blank++; continue; }                     /* 空串与整行没写同解：content.config.ts:34 的 default('') */
    const t = target(root(v));
    filled++;
    if (t.kind === 'remote'){ remote++; listing.push(`  ${f}  cover 远端（不查）  ${v}`); continue; }
    const word = missingWord(t);
    const line = coverLineOf(text);
    if (word){ bad++; problems.push(`③ src/content/posts/${f}:${line === null ? '?' : line} 的 cover "${v}" —— ${word}`); }
    else good++;
    listing.push(`  ${f}  cover${word ? '缺' : '在'}  ${v}  ${t.kind === 'internal' ? t.publicPath : ''}`);
  }
  assert.equal(filled + blank, files.length, '③ cover 非空的篇数加空着的篇数对不上总篇数（有一篇被算了两次或一次都没算）');
  n++;
  notes.push(`③ front matter cover：${files.length} 篇里非空 ${filled} 枚（站内 ${filled - remote} 枚全查 ＋ 远端 ${remote} 枚不查）`
    + ` · 指到真文件 ${good} 枚 · 缺文件 ${bad} 枚 · 空着 ${blank} 枚（空＝没填＝页面不画缩略位，口径 src/content.config.ts:34）`
    + `${filled === 0 ? ' ⇒ 今天三枚 cover 全是空串：这一半的牙在 ① 那格当众验（needle 判在盘上、假地址必报缺文件）' : ''}`);
  return n;
});

/* ---------- ④ 本卡自己的前提还在不在（同源性绊线） ----------
   ② ③ 两格判的是页面画出来的那枚地址，前提有两条：详情页吃 renderMd(post.body)、cover 经 root()
   之后才进 <img src>。前提哪天变了，这两格就成了假真值，所以在这里钉住它——
   红了不是洁癖，是逼下一轮同时改本卡的判据来源（文件头那段为什么选 renderMd）。
   同一枚 hazards 也在 .astro 那三份的注释剥离上：谁往代码里写一串两星号接斜杠的 glob 字面量，
   这一格会假红——那时该修的是剥离器，不是把这格删掉。
   ⚠️ **这一格在 `card/anchors` 那天真红过一次**（不是假红）：详情页为了让目录与正文的章 id 同源，
   改吃 `renderArticle(post.body)`（`markdown.js` 里它就是 `renderMd` 的一层壳：同一入参、同一趟渲染，
   只多交回那一篇的章清单）。绊线按设计说话 ⇒ 这里把 needle 扩成 `render(Md|Article)`，
   ② 那格自己仍走 `renderMd`（它收的是 `<img>`，与章清单无关）。改的是 needle 的形状，没有放宽判据。 */
cell('④', '本卡吃的两份真值与页面同源（绊线：页面换渲染方式 ⇒ 本卡必须跟着改）', () => {
  const code = s => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const read = f => code(readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n'));   /* 注释里写一句不算数：看的是代码 */
  const detail = read('src/pages/essays/[slug].astro');
  assert.ok(/render(?:Md|Article)\s*\(\s*post\.body\s*\)/.test(detail),
    '④ 详情页不再吃 renderMd/renderArticle(post.body) —— ② 那格收的产物真值与页面上的不是同一份，整格判据的来源要换（见文件头为什么走 renderMd 这条路）');
  let n = 2;
  for (const f of ['src/pages/essays/index.astro', 'src/components/PostRow.astro']){
    const src = read(f);
    assert.ok(/\.cover\s*\?/.test(src), `④ ${f} 里 cover 那一枚三元不在了 —— ③ 那格判的落点变了`);
    assert.ok(/src=\{root\((?:p|post)\.data\.cover\)\}/.test(src), `④ ${f} 的 cover 不再经 root() 进 <img src> —— 本卡给 cover 用的那把尺子（root 之后再查盘）与页面不同源`);
    n += 2;
  }
  /* ⚠️ content.config.ts 不走上面那枚整块注释剥离器：`:29` 那串 glob 的 pattern 字面量（两星号接斜杠那种）
     里含着一枚斜杠紧跟星号，惰性匹配会把它到 `:38` 之间整段当注释抹掉，schema 那几行连带消失 ⇒ 假红
     （本卡实测踩过一次，登记在这儿）。换成行锚死的原始文本判据：注释掉的那一行不匹配，写在句中的也不匹配。 */
  const cfgRaw = readFileSync(join(ROOT, 'src/content.config.ts'), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(/^\s*cover:\s*z\.string\(\)\.default\(''\)/m.test(cfgRaw),
    '④ schema 的 cover 不再是可空、默认空串那一枚写法 —— ③ 那格放行空格子的前提变了：它要么变成必填（空格子就该红），要么换了默认值');
  return n + 1;
});

/* ---------- 打印 ---------- */
if (args.includes('--list')){
  console.log('  逐枚账目（在＝盘上有；缺＝本卡判红；本卡今天收到的枚数见 ② ③ 那两行）：');
  for (const l of listing) console.log(l);
  if (!listing.length) console.log('  （一枚都没有：三篇稿件正文零配图、cover 全空——这行是打出来的，不是沉默）');
}
if (notes.length) for (const nt of notes) console.log(`  ${nt}`);
if (problems.length){
  console.log(`\n✗ media-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log(`\n✓ 站内媒体：四格共 ${asserted} 条断言全过，稿件里每一枚站内 <img> 与每枚非空 cover 都指到 public/ 下的真文件`);
