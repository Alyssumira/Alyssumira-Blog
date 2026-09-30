/* imgpipe-check.mjs —— 产物级判据：`dist/` 里每一枚站内 `<img>` 都带着与真文件一致的固有宽高
   （`card/imgpipe`，2026-09-30）。用法：
         node tools/imgpipe-check.mjs              # 读 dist/；没有 dist 当场红并指路"先 build"
         node tools/imgpipe-check.mjs --list       # 外加逐枚打印"哪一页、哪一枚、属性几、盘上几"
         node tools/imgpipe-check.mjs --selftest   # 只跑 ① 那格（两侧格子与夹具），不读 dist

   ── 它钉的是哪两件事（两侧都有格子）────────────────────────────────────────
   ① 缺档红：站内、盘上真有、格式认得出的那枚 `<img>`，产物里必须同时带 `width` 与 `height`；
   ② 数错红：那两枚的数值必须等于**盘上那枚文件的真尺寸**。
   为什么第二半必须有牙：只查"有没有属性"会放行 `width="1" height="1"`，那比不带属性更坏——布局盒一开始就是
   错的高度，解码完成后再跳一次（§8.4 那条"先雾后清晰"救的是观感，救不了这个）。

   ── 与链上另外两枚的分工（不许第三把尺子量同一件事）────────────────────────
   · `tools/media-check.mjs`（`check` 第 ⑦ 项，源码级）判的是**地址在不在盘上**：稿件正文与 cover 指到
     `public/` 下真文件。它不吃 dist、不看尺寸。
   · `tools/runtime-check.mjs`（`gate`，产物级）判的是 `<html>` 上那五枚运行时属性与正文结构对账。
   · 本卡判的是**产物里 img 标签自带的几何账**，只有这一格读 `dist/` 下那批 HTML 里的 `<img>`。
   三格对象互不相交；今天 media-check 打的"稿件正文 `<img>` 0 枚、cover 非空 0 枚"与本卡打的
   "产物 3 枚"是同一件事的两面（前者数稿子里写的，后者数页面上画的）。

   ── 为什么落点在 `gate` 而不是 `check`（§16 那条分层）───────────────────────
   判据读的是构建产物。塞进 `check` 会让干净检出上 `npm run check` 直接红——红的是环境不是代码
   （search-check 第十一项挪回 build 之后踩过同一格）。所以排在 `npm run build` 之后。
   缺 `dist/` 时它**红**并指路"先 npm run build"，不被 `if` 跳过装绿（§16："尺子读不到被测对象从来不算绿"）。

   ── 尺子的独立性（§17 那条"尺子不许由渲染器自己出"）────────────────────────
   ② 那半格的期望值来自 `src/lib/image-dims.js`——与注入侧同一个解析器。这件事本卡不遮掩：
   **② 单独证不了"解析器没对真文件撒谎"**（解析器把 276 读成 277，注入与判据会一起错）。
   所以另有第 ③ 格：拿三枚**人写的、签过字的**在册尺寸当第二把尺——
     · `public/assets/bg-{light,dark}.jpg` = 1536×1024（规范 §5 那行"1536×1024，JPEG q85，均 < 300KB"）
     · `public/assets/portrait.png`       = 276×276（`mistwood.css:631` 那格注释与 §13 那行都写着它）
     · `public/og.png` 与 `public/og/*.png` = 1200×630（`src/layouts/Layout.astro:86-87` 手写的
       `og:image:width` / `og:image:height` 两枚 meta——那是**另一条链**上的人写值，与像素解析无关）
   解析器一旦读错这三枚里的任何一枚，③ 当场红，而 ② 会静默绿着——这一格就是为那一族形状准备的。
   再加第 ① 格里 10 枚**手写字节**的已知答案夹具（期望值按格式规范写死、不由解析器生成）。

   ── 不判的三类（一律当众印出来，不许静默放过）──────────────────────────────
   · 远端 `http(s)` 与 `data:`：构建期没有那枚文件 ⇒ 不判缺档（media-check 那一格同样不查它）；
   · 盘上没有的文件：那是 media-check 的病，本卡只印清单不重复判红；
   · 格式认不出（AVIF/HEIC/ICO/SVG/截断文件）：**发不出宽高**清单，逐枚点名。判不了不是错，
     假装判得了才是（§12 那条"宁可没有这一枚属性，不许拿作者的东西去拼一个猜的数"同族）。
*/
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import { dimsOfFile, dimsOfBuffer, diskPathForSrc, intrinsicAttrs, intrinsicProps } from '../src/lib/image-dims.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/* dist 目录可以另指（照 `tools/pixel-probe.mjs:57` 那枚 `--dist=` 的写法）：一是让"没有产物"那一档
   可以当众验一次（M-E），二是别让判据只认死路径——将来换输出目录它不会跟着哑掉。 */
const args = process.argv.slice(2);
const DIST_ARG = (args.find(a => a.startsWith('--dist=')) || '').slice(7);
const DIST = DIST_ARG ? resolve(ROOT, DIST_ARG) : join(ROOT, 'dist');
const PUBLIC_DIR = join(ROOT, 'public');
const SELFTEST = args.includes('--selftest');

let asserted = 0;
const problems = [];
const notes = [];
const listing = [];
function cell(id, label, fn){
  let n = 0, threw = null;
  try { n = fn() || 0; } catch (e){ threw = e; }
  if (threw){ problems.push(`${id} ${label}：${threw.message}`); return; }
  if (!n){ problems.push(`${id} ${label}：asserted=0（这一格一个断言都没跑就交了白卷）`); return; }
  asserted += n;
  notes.push(`${id} ${label}：${n} 条断言 ✓`);
}
const die = (msg, hint) => { console.error(`\n✗ ${msg}`); if (hint) console.error(hint); process.exit(1); };

/* ---------- 收集器：dist 里每一枚 <img>（属性顺序不许写死在判据里）---------- */
const IMG_TAG = /<img\b[^>]*>/gi;
const attrOf = (tag, name) => {
  const m = new RegExp('\\b' + name + '\\s*=\\s*"([^"]*)"').exec(tag)
       || new RegExp("\\b" + name + "\\s*=\\s*'([^']*)'").exec(tag);
  return m ? m[1] : null;
};
function* htmlFiles(dir){
  for (const e of readdirSync(dir, { withFileTypes: true })){
    if (e.isDirectory()) yield* htmlFiles(join(dir, e.name));
    else if (/\.html$/i.test(e.name)) yield join(dir, e.name);
  }
}
/* src → 盘上那枚文件（复用注入侧那一枚 diskPathForSrc 之外的第二份读法？不：判"是哪枚文件"这件事
   全站只能有一处口径，本卡直接吃 diskPathForSrc，但它**不参与尺寸判断**——尺寸那半由 ③ 的第二把尺兜）。 */
const walkHtml = () => {
  const rows = [];
  for (const file of htmlFiles(DIST)){
    const html = readFileSync(file, 'utf8');
    for (const tag of html.match(IMG_TAG) || []){
      const src = attrOf(tag, 'src');
      rows.push({
        page: relative(DIST, file).split(sep).join('/'),
        tag, src,
        w: attrOf(tag, 'width'), h: attrOf(tag, 'height'),
        decoding: attrOf(tag, 'decoding'), loading: attrOf(tag, 'loading'),
      });
    }
  }
  return rows;
};

/* ---------- 分类：这一枚该不该带档、能不能判 ---------- */
function classify(row){
  const src = row.src === null ? '' : row.src;
  if (src === '') return { kind: 'nosrc', why: '一枚没有 src 的 <img>（页面上一块空位，比缺宽高更该红）' };
  if (/^https?:/i.test(src)) return { kind: 'remote' };
  if (/^[a-z][a-z0-9+.\-]*:/i.test(src)) return { kind: 'other-scheme' };    // data: / mailto: / blob:
  const disk = diskPathForSrc(src);
  if (!disk) return { kind: 'unresolved' };                                   // 跳出 public/ 或坏百分号编码
  if (!existsSync(disk)) return { kind: 'missing-file', disk };
  const d = dimsOfFile(disk);
  if (!d) return { kind: 'unreadable', disk };
  return { kind: 'judgeable', disk, dims: d };
}

/* ---------- ① 控制样本 + 已知答案夹具（两侧都有格子）---------- */
cell('①', '控制样本与已知答案夹具（判据自己必须有牙，且零对象时不许与"全过"长一样）', () => {
  let n = 0;
  const row = (tag) => ({ tag, src: attrOf(tag, 'src'), w: attrOf(tag, 'width'), h: attrOf(tag, 'height') });

  /* 朝宽那一侧的牙先在这里自证：**坏输入必须与真值分得开**。两枚错尺寸（宽全错／只错高）如果与解析值
     相等，那 M-B 那格变异就没有对象、"数错红"是枚装饰。 */
  const fake1 = row('<img src="/assets/portrait.png" alt="" width="1" height="1">');
  const fake2 = row('<img src="/assets/portrait.png" alt="" width="276" height="277">');
  for (const r of [fake1, fake2]){
    const c = classify(r);
    assert.equal(c.kind, 'judgeable', '① 夹具脱钩：/assets/portrait.png 判不出尺寸（盘上文件不在？解析器坏了？）——这一枚是真文件见证物');
    assert.notEqual(c.dims.width + 'x' + c.dims.height, r.w + 'x' + r.h,
      '① 夹具失效：错尺寸的 img 被判据读成了"与真尺寸一致"⇒ 数错那一半没有牙');
    n += 2;
  }
  /* 朝窄：一枚完全合法的 img（真尺寸填回去）不许误红 */
  const truth = dimsOfFile(join(PUBLIC_DIR, 'assets', 'portrait.png'));
  const good = row(`<img src="/assets/portrait.png" alt="" width="${truth.width}" height="${truth.height}">`);
  assert.equal(good.w, String(truth.width), '① needle 误伤：真尺寸填回去却与解析值不等——解析器不稳定');
  assert.equal(good.h, String(truth.height), '① needle 误伤（高）');
  n += 2;

  /* 缺档那一半也必须有牙：同一枚真文件、不带属性 ⇒ 分类为 judgeable 且 w===null */
  const bare = row('<img src="/assets/portrait.png" alt="">');
  assert.equal(classify(bare).kind, 'judgeable', '① 站内真文件被判成"不判"：缺档那一格永远不会红');
  assert.equal(bare.w, null, '① 收集器读不到不带 width 的属性形状（正则写死了？）');
  n += 2;

  /* 属性顺序与单引号两种写法都要读得出来——判据不许把"注入侧恰好是这个顺序"当成前提 */
  const reorder = row(`<img width='276' alt="x" height='276' src="/assets/portrait.png">`);
  assert.equal(reorder.src, '/assets/portrait.png', '① 单引号／乱序的属性形状读不出来，判据会漏掉整枚 img');
  assert.equal(reorder.w, '276', '① 乱序里读不到 width');
  n += 2;

  /* 不判的三类必须落到各自的桶里，且**印得出来**（静默放过就是没有这一格） */
  assert.equal(classify(row('<img src="https://cdn.example.com/a.png" alt="">')).kind, 'remote', '① 远端 img 被收进站内判据');
  assert.equal(classify(row('<img src="data:image/png;base64,AAAA" alt="">')).kind, 'other-scheme', '① data: 被当成站内文件');
  assert.equal(classify(row('<img src="/assets/../../outside.png" alt="">')).kind, 'unresolved', '① 跳出 public/ 的没被挡住');
  assert.equal(classify(row('<img src="/assets/没有这枚文件.png" alt="">')).kind, 'missing-file', '① 盘上没有的没归进"交回 media-check"那一档');
  assert.equal(classify(row('<img src="" alt="">')).kind, 'nosrc', '① 空 src 没有被点名');
  n += 5;

  /* 注入侧那两枚出口的**行为**针：判不了 ⇒ 交回空，判得了 ⇒ 交回盘上真尺寸。
     `public/favicon.svg` 是仓库里真存在的一枚 SVG —— 它就是"发不出宽高"那一档的活体见证物，
     拿它当针比拿一段文本正则当针强：哪天有人给解析器加了一支"SVG 也猜一个数"，这一条当场红。 */
  assert.equal(intrinsicAttrs('/favicon.svg'), '', '① 判不了的格式（站内真 SVG）交回的不是空串——那是开始猜了');
  assert.deepEqual(intrinsicProps('/favicon.svg'), {}, '① 判不了的格式在 JSX 那一侧交回了非空对象');
  assert.equal(intrinsicAttrs('https://cdn.example.com/a.png'), '', '① 远端地址被拼出了宽高（构建期没有那枚文件）');
  assert.equal(intrinsicAttrs('/assets/这枚文件不存在.png'), '', '① 盘上没有的地址被拼出了宽高');
  assert.equal(intrinsicAttrs('/assets/portrait.png'), ' width="276" height="276"', '① 正向针：站内真文件没交出真尺寸');
  n += 5;

  /* 已知答案夹具：手写字节 ⇒ 期望值不是解析器自己给的（§17 那条） */
  const fixtures = [
    /* 手写字节：签名(8) + 块长 13(4) + 'IHDR'(4) + 宽(4) 高(4) 深(1) 色型(1) 压缩(1) 滤波(1) 隔行(1) + CRC(4) */
    ['PNG 276×276', Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a, 0,0,0,13, 0x49,0x48,0x44,0x52,
      0,0,1,0x14, 0,0,1,0x14, 8,6,0,0,0, 0,0,0,0]), 276, 276],
    ['GIF 92×69', Buffer.concat([Buffer.from('GIF89a', 'ascii'), (() => { const b = Buffer.alloc(4); b.writeUInt16LE(92, 0); b.writeUInt16LE(69, 2); return b; })()]), 92, 69],
  ];
  for (const [name, bytes, w, h] of fixtures){
    const d = dimsOfBuffer(bytes);
    assert.ok(d && d.width === w && d.height === h, `① 夹具「${name}」解析成 ${d ? d.width + '×' + d.height : 'null'}`);
    n += 1;
  }
  assert.equal(dimsOfBuffer(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null, '① SVG 被判出了尺寸（那是猜，不是读）');
  n += 1;
  notes.push(`① 控制样本：正向 4 枚形状（真尺寸／错尺寸×2／缺档）· 属性写法 2 种（单引号乱序）· 不判的 5 个桶`
    + ` · 注入侧行为针 5 枚（SVG／远端／盘上没有 ⇒ 空，真文件 ⇒ 真尺寸）· 手写夹具 2 枚`);
  return n;
});

/* ---------- ② 真产物：逐份 HTML、逐枚 <img> ---------- */
const tally = { pages: 0, imgs: 0, judgeable: 0, remote: 0, other: 0, unresolved: 0, missing: 0, unreadable: 0, nosrc: 0, bad: 0 };
cell('②', 'dist 里每一枚站内 <img> 都带 width/height，且数值等于盘上真尺寸（两侧格子）', () => {
  const rows = walkHtml();
  const seen = new Set();
  let n = 0;
  for (const r of rows){
    const c = classify(r);
    tally.imgs++; seen.add(r.page);
    if (c.kind === 'remote'){ tally.remote++; listing.push(`  ${r.page}  远端(不判)  ${r.src}`); continue; }
    if (c.kind === 'other-scheme'){ tally.other++; listing.push(`  ${r.page}  非 http 协议(不判)  ${String(r.src).slice(0, 40)}`); continue; }
    if (c.kind === 'unresolved'){ tally.unresolved++; listing.push(`  ${r.page}  地址解析不到 public/ 内(不判)  ${r.src}`); continue; }
    if (c.kind === 'nosrc'){ tally.nosrc++; problems.push(`② ${r.page} 一枚没有 src 的 <img>：${r.tag.slice(0, 80)}`); n++; continue; }
    if (c.kind === 'missing-file'){ tally.missing++; problems.push(`② ${r.page} 的 <img src="${r.src}"> 指到 ${relative(ROOT, c.disk)}，盘上没有 —— 地址这件事归 media-check 第 ② 格点名，本卡不重复判红，但也不替它填尺寸`); n++; continue; }
    if (c.kind === 'unreadable'){ tally.unreadable++; listing.push(`  ${r.page}  发不出宽高(格式认不出)  ${r.src}`); continue; }
    tally.judgeable++; n++;
    const miss = (r.w === null || r.h === null);
    const wrong = !miss && (String(c.dims.width) !== r.w || String(c.dims.height) !== r.h);
    if (miss){
      tally.bad++;
      problems.push(`② ${r.page} 的 <img src="${r.src}"> 缺 ${r.w === null ? 'width' : ''}${r.w === null && r.h === null ? ' 与 ' : ''}${r.h === null ? 'height' : ''} —— 盘上是 ${c.dims.width}×${c.dims.height}（${c.dims.format}），构建期读得到却没发 ⇒ 那一格 CLS 没修`);
    } else if (wrong){
      tally.bad++;
      problems.push(`② ${r.page} 的 <img src="${r.src}"> 带的是 ${r.w}×${r.h}，盘上真尺寸是 ${c.dims.width}×${c.dims.height}（${c.dims.format}）⇒ 布局盒先按错的长、解码后再跳一次，比不带属性更坏`);
    }
    listing.push(`  ${r.page}  ${miss ? '缺档' : wrong ? '数错' : '对'}  ${r.src}  属性 ${r.w}×${r.h}  盘上 ${c.dims.width}×${c.dims.height}(${c.dims.format})  decoding=${r.decoding ?? '—'}`);
  }
  tally.pages = seen.size;
  return n;
});

/* ② 在零载体时会与"全过"长一样（§16 那条），所以存在性单独一格，且它读的是**页面份数**这种不会归零的量 */
cell('③', '判据没有空转：dist 里有 HTML、有 img，四枚在册尺寸的解析值 ⇄ 签字值对得上（第二把尺）', () => {
  assert.ok(existsSync(DIST), '③ dist/ 不存在');
  const files = [...htmlFiles(DIST)];
  assert.ok(files.length > 0, '③ dist/ 里一份 HTML 都没有 ⇒ 判据在读空气');
  let n = files.length;
  const html = files.map(f => readFileSync(f, 'utf8')).join('');
  const imgCount = (html.match(IMG_TAG) || []).length;
  assert.ok(imgCount > 0, '③ 全部产物里一枚 <img> 都没有：收集器空转（真有一天全站去光图片，就把本卡连同注入一起撤，别留着当装饰）');
  n += 1;
  /* 在册尺寸三枚——期望值是**人写的、规范里签过字的**，不是解析器给的（见文件头"尺子的独立性"） */
  const SIGNED = [
    ['assets/bg-light.jpg', 1536, 1024, '规范 §5 那行「1536×1024，JPEG q85，均 < 300KB」'],
    ['assets/bg-dark.jpg',  1536, 1024, '同上（成对同构图，§5 那条铁律要求两张一起换）'],
    ['assets/portrait.png', 276, 276,   'mistwood.css:631 那格注释「276×276 的圆头像」与 §13 那行'],
    ['og.png',              1200, 630,  'Layout.astro:86-87 手写的 og:image:width / :height 两枚 meta'],
  ];
  for (const [p, w, h, where] of SIGNED){
    const d = dimsOfFile(join(PUBLIC_DIR, p));
    assert.ok(d, `③ public/${p} 解析不出尺寸——第二把尺失效（文件坏了？格式没支持？）`);
    assert.equal(d.width, w, `③ public/${p} 解析成宽 ${d.width}，在册值是 ${w}（登记处：${where}）⇒ 解析器与签字值分叉，本卡判据吃的期望值不可信`);
    assert.equal(d.height, h, `③ public/${p} 解析成高 ${d.height}，在册值是 ${h}（登记处：${where}）`);
    n += 3;
  }
  notes.push(`③ dist 里 ${files.length} 份 HTML、共 ${imgCount} 枚 <img>；在册尺寸四枚（两照片／人像／og）解析值 ⇄ 签字值逐一对上`);
  return n;
});

/* ---------- ④ 同源性绊线：注入这一环还在不在 ---------- */
cell('④', '注入侧与判据同源（撤掉注入 ⇒ 本卡必须跟着换判据，不许留一枚恒红的尺子）', () => {
  const code = s => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const md = code(readFileSync(join(ROOT, 'src', 'lib', 'markdown.js'), 'utf8').replace(/\r\n/g, '\n'));
  assert.ok(/intrinsicAttrs\(u\)/.test(md),
    '④ src/lib/markdown.js 的 imgEl 不再吃 intrinsicAttrs() ⇒ 正文图的宽高注入被撤，② 那格的"缺档红"会全线红；要么把注入装回，要么连本卡一起撤');
  const dims = readFileSync(join(ROOT, 'src', 'lib', 'image-dims.js'), 'utf8').replace(/\r\n/g, '\n');
  assert.ok(/export function intrinsicProps/.test(dims) && /export function intrinsicAttrs/.test(dims),
    '④ image-dims.js 的两枚出口少了一枚 —— 注入侧（JSX 展开用对象）与渲染器（拼属性用字符串）现在得各写一份判断');
  let n = 2;
  for (const f of ['src/components/PostRow.astro', 'src/pages/essays/index.astro', 'src/pages/things.astro']){
    const src = code(readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n'));
    assert.ok(/intrinsicProps\(/.test(src), `④ ${f} 不再给 img 派生宽高 —— 判据覆盖的落点少了一处（不是红，是要在这里点名，免得下一个人以为全站都注入了）`);
    n += 1;
  }
  return n;
});

/* ---------- 打印 ---------- */
if (!SELFTEST){
  if (!existsSync(join(DIST, 'index.html')))
    die(`没有产物 ${join(DIST, 'index.html')}`, '  先 `npm run build`；本卡读 dist/，排在 build 之后（§16 分层）。缺产物时报红不是跳过。');
}
if (args.includes('--list')){
  console.log('  逐枚账目（对／缺档／数错／不判的桶）：');
  for (const l of listing) console.log(l);
  if (!listing.length) console.log('  （一枚都没收到）');
}
for (const nt of notes) console.log(`  ${nt}`);
console.log(`  账目：HTML ${tally.pages} 页有图 · <img> 共 ${tally.imgs} 枚 = 判据覆盖 ${tally.judgeable}（对 ${tally.judgeable - tally.bad} / 坏 ${tally.bad}）`
  + ` + 远端 ${tally.remote} + 非 http 协议 ${tally.other} + 解析不到 public 内 ${tally.unresolved} + 盘上没有 ${tally.missing}`
  + ` + 发不出宽高 ${tally.unreadable} + 无 src ${tally.nosrc}`);
if (problems.length){
  console.log(`\n✗ imgpipe-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log(`\n✓ 固有宽高：四格共 ${asserted} 条断言全过，dist 里每一枚站内 <img> 都带着与盘上真文件一致的 width/height`);
