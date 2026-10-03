/* image-dims.js —— 构建期从**真文件头**读图片固有宽高（`card/imgpipe`，2026-09-30）。
   零依赖、只读、只碰 `public/`：Node 24 自己解得开 PNG/JPEG/GIF/WebP 的四枚头部，不需要任何系统图像库。

   ── 为什么这件事必须在构建期做，而不是让 CSS 顶 ──────────────────────────
   `src/styles/essay.css` 给正文图版写的那一条是 `.post-body figure.shot img{ display:block; width:100%; height:auto }`。
   `height:auto` 在没有固有尺寸的那一枚 `<img>` 上，取图之前量不出高度 ⇒ 那一块在解码完成的一瞬间从 0 高长到
   几百 px 高，正是 CLS 的教科书形状（§8.4 那条"先铺雾再散开"管的是**观感**，管不到布局盒什么时候长出来）。
   有了 `width`/`height` 两枚属性，布局盒在取图之前就是对的（UA 样式表给 img 的 `aspect-ratio: attr(w)/attr(h)`）。

   ── 判不了就**原样发**，绝不猜数 ────────────────────────────────────────
   返回空串的四种情况，每一种都是"这一枚我们真的不知道"：
     ① 远端地址（`http(s):`）与 `data:`／`#`／空 —— 构建期没有那枚文件；
     ② `..` 跳出 `public/` —— 与 `tools/media-check.mjs` 同一口径（那种地址根本不会被拷进 dist）；
     ③ 盘上没有该文件 —— 交给 media-check 那格点名，这里不重复判、也不发明数；
     ④ 文件头认不出来（AVIF/HEIC/ICO/SVG/BMP、截断的文件、扩展名与内容不符）—— 登记在
        「发不出宽高」的清单里（`tools/imgpipe-check.mjs` 会把它当众打出来），而不是发一枚错数。
   ⚠️ 第 ④ 条是本文件全部判据的来源：**错数比缺档更贵**——缺数只是那一格 CLS 没修，错数会让布局盒一开始就
   是错的高度、解码完成后再跳一次，那比不加属性更糟，而且 `imgpipe-check` 那把尺也只会跟着一起错
   （它读的是同一份头部）。所以两侧格子之外还带**已知答案夹具**（`--selftest`）：期望值是我按格式规范手写的
   字节，不是拿本文件再解一遍——§17 那条"尺子不许由渲染器自己出"。

   ── 已签条款的边界（本文件一个字都不越）────────────────────────────────
   · §5 照片铁律：不改 `public/assets/bg-*.jpg` 的成对换与引用方式，只往已有的 `<img>` 上补两枚**被 CSS 完全
     覆写**的属性（`.bg-photo img` 与 `.cover img` 都写着 `position:absolute; inset:0; width:100%; height:100%`，
     `mistwood.css` 的 `.cover img,.thing .shot,.portrait img,.post-body img`／`home.css` 的 `.bg-photo img` ⇒ 属性不参与最终盒尺寸，实测见 §8.4 那一格）。
   · §12「占位提示压真图」：占位那格判据是 `.portrait:not(:has(img))::after`（`mistwood.css` 里 `content:"人像 → 褪色处理后放入"` 那一条），看的是**有没有 img 子节点**，
     与 img 带不带属性无关 ⇒ 零牵连。
   · §8.4 入场虚焦：`filter: … blur(10px)` → `.in` 由 `load` 事件驱动（`src/scripts/site.js`），属性补齐不动这条链。
*/
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
/* 仓库根**不在这里重新猜一遍**（`src/lib/stats.js:16` 那份注释就是这条规矩的出处：Astro 打包 frontmatter
   模块时会把它搬进 dist/.prerender/chunks/，拿 import.meta.url 往上数会数到 dist 里，本卡实测踩过一次——
   属性静默消失、build 全绿）。`ROOT` 从 stats.js import 回来，与 `revised.js:16` 同一口径。 */
import { ROOT } from './stats.js';

const PUBLIC_DIR = join(ROOT, 'public');
const REMOTE = /^https?:/i;

/* 只读文件头这么多字节：四枚格式的尺寸信息全在前部（JPEG 的 SOF 在 APP 段之后，但 64KB 装不下的是
   极端 IPTC/EXIF 情形，那种文件下面按"整文件"再读一次；PNG/GIF/WebP 是定长头，一次就够）。 */
const HEAD_BYTES = 65536;

const u8 = b => (b instanceof Uint8Array ? b : new Uint8Array(b));
const be16 = (b, i) => (b[i] << 8) | b[i + 1];
const be32 = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const le16 = (b, i) => b[i] | (b[i + 1] << 8);
const le24 = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const fourcc = (b, i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
const ok = (w, h, format) => (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 && w <= 65535 && h <= 65535
  ? { width: w, height: h, format } : null);

/* ---------- PNG：8 字节签名 + 第一枚块必须是 IHDR（宽高在它里面，4 字节大端各一枚） ---------- */
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function pngDims(b){
  if (b.length < 29 || PNG_SIG.some((v, i) => b[i] !== v)) return null;
  if (be32(b, 8) < 13 || fourcc(b, 12) !== 'IHDR') return null;      // 块长不足 13 或第一枚不是 IHDR ⇒ 不是合法 PNG 流
  const interlace = b[28];                                           // IHDR 数据区第 13 枚字节（签名 8 + 块长 4 + 类型 4 + 宽 4 + 高 4 + 深 1 + 色型 1 + 压缩 1 + 滤波 1）
  if (interlace !== 0 && interlace !== 1) return null;               // Adam7 的 IHDR 存的是整图尺寸，仍可用；别的一律不认
  return ok(be32(b, 16), be32(b, 20), 'png');
}

/* ---------- JPEG：走 SOF（Start Of Frame）—— 段长字段让我们不会掉进 EXIF 缩略图的那枚 SOF ---------- */
const SOF = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
function jpegDims(b){
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < b.length){
    if (b[i] !== 0xff){ i++; continue; }                             // 填充字节 0x00 与噪声：逐字节找下一个标记
    let m = b[i + 1];
    while (m === 0xff && i + 2 < b.length){ i++; m = b[i + 1]; }      // 连续 FF 填充（规范要求）
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)){ i += 2; continue; }  // 无长度字段的独立标记
    if (m === 0xd9) return null;                                      // EOI：整帧扫完还没见到 SOF ⇒ 不猜
    const len = be16(b, i + 2);
    if (len < 2) return null;                                         // 坏段长：往前跳就是读噪声
    if (SOF.has(m)) return ok(be16(b, i + 7), be16(b, i + 5), 'jpeg'); // SOF: 长度(2) 精度(1) 高(2) 宽(2)
    i += 2 + len;
  }
  return null;
}

/* ---------- GIF：逻辑屏幕描述符（6~10 字节，小端） ---------- */
function gifDims(b){
  if (b.length < 10) return null;
  if (fourcc(b, 0) !== 'GIF8') return null;                           // 'GIF87a' / 'GIF89a'：版本号那两字节不判
  return ok(le16(b, 6), le16(b, 8), 'gif');
}

/* ---------- WebP：RIFF 包三种子格式，尺寸各自住在不同偏移上 ---------- */
function webpDims(b){
  if (b.length < 16 || fourcc(b, 0) !== 'RIFF' || fourcc(b, 8) !== 'WEBP') return null;
  const fmt = fourcc(b, 12);
  if (fmt === 'VP8X'){                                                 // 扩展头：24 位小端「宽-1 / 高-1」
    if (b.length < 30) return null;
    return ok(le24(b, 24) + 1, le24(b, 27) + 1, 'webp');
  }
  if (fmt === 'VP8 '){                                                 // 有损：帧标签 3 字节 + 同步码 9D 01 2A + 宽高各 16 位小端取低 14 位
    if (b.length < 30 || b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return ok(le16(b, 26) & 0x3fff, le16(b, 28) & 0x3fff, 'webp');
  }
  if (fmt === 'VP8L'){                                                 // 无损：块数据第一字节签名 0x2f，随后 32 位里 14 位「宽-1」+14 位「高-1」
    if (b.length < 25 || b[20] !== 0x2f) return null;
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return ok((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1, 'webp');
  }
  return null;                                                         // 'ALPH'/'ICCP'/其它一律不认
}

/* ---------- 唯一入口（字节 → 尺寸）：按文件头判格式，不信扩展名 ---------- */
export function dimsOfBuffer(input){
  const b = u8(input);
  return pngDims(b) || jpegDims(b) || gifDims(b) || webpDims(b);
}

/* 盘上对象 → 尺寸；读不到（缺文件/认不出）一律 null，不抛。带一次缓存：构建期同一枚文件会被多篇稿件读到。 */
const cache = new Map();
export function dimsOfFile(absPath){
  if (cache.has(absPath)) return cache.get(absPath);
  let out = null;
  try {
    if (existsSync(absPath) && statSync(absPath).isFile()){
      const fd = readFileSync(absPath);
      out = dimsOfBuffer(fd.subarray(0, Math.min(fd.length, HEAD_BYTES)));
      if (!out && fd.length > HEAD_BYTES) out = dimsOfBuffer(fd);       // JPEG 的 SOF 在 64KB 之后：整文件再试一次
    }
  } catch { out = null; }
  cache.set(absPath, out);
  return out;
}

/* 产物里那串 src（`/assets/x.png`，root() 已经钉到站点根）→ 盘上对象。
   返回 null 表示"构建期读不到"——远端／跳出 public／坏百分号编码，全走这一支。 */
export function diskPathForSrc(src){
  const s = String(src || '').trim();
  if (!s || REMOTE.test(s) || /^[a-z][a-z0-9+.\-]*:/i.test(s)) return null;   // data:/mailto:/javascript: 一律不是站内文件
  const cut = s.split(/[?#]/)[0];
  let decoded = cut;
  try { decoded = decodeURIComponent(cut); } catch { return null; }            // 坏百分号编码：不猜
  const abs = resolve(PUBLIC_DIR, decoded.replace(/^\/+/, ''));
  const rel = relative(PUBLIC_DIR, abs);
  if (rel === '' || rel === '..' || rel.startsWith('..' + sep)) return null;   // 与 media-check 同一口径
  return abs;
}

/* ---------- 两枚出口共用一份判断：对象给 JSX 展开，字符串给模板拼属性 ----------
   ⚠️ 只许有一处真值：`intrinsicAttrs()` 是 `intrinsicProps()` 的**格式化**，不是第二条判据。
   写成两条各查一遍盘，就是 §16 那种"同一句话写在两个地方"的起点。 */
export function intrinsicProps(src){
  const p = diskPathForSrc(src);
  if (!p) return {};
  const d = dimsOfFile(p);
  return d ? { width: d.width, height: d.height } : {};
}
export function intrinsicAttrs(src){
  const d = intrinsicProps(src);
  return d.width ? ` width="${d.width}" height="${d.height}"` : '';
}

/* ---------- 已知答案夹具（`--selftest`）：期望值手写自各格式的规范，不由本文件生成 ---------- */
const crc = (() => { let T = null; return buf => {
  if (!T){ T = new Int32Array(256); for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c; } }
  let c = ~0; for (const x of buf) c = T[(c ^ x) & 0xff] ^ (c >>> 8); return ~c >>> 0;
}; })();
const pngChunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcIn = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc(crcIn), 0);
  return Buffer.concat([len, crcIn, crcBuf]);
};
const ihdrPng = (w, h) => {
  const d = Buffer.alloc(13); d.writeUInt32BE(w, 0); d.writeUInt32BE(h, 4); d[8] = 8; d[9] = 6;
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), pngChunk('IHDR', d), pngChunk('IDAT', Buffer.from([0x78,0x9c,0x03,0x00,0x00,0x00,0x01])), pngChunk('IEND', Buffer.alloc(0))]);
};
/* 一枚结构合法的 SOF 段（单分量 ⇒ 段长 11）；pre 是它前面那些段的原文字节 */
function sofSegment(sof, w, h, pre){
  const body = Buffer.alloc(9);
  body.writeUInt16BE(11, 0);            // 段长 = 2 + 1(精度) + 2(高) + 2(宽) + 1(分量数) + 3(那一个分量)
  body[2] = 8;                          // 精度 8bit
  body.writeUInt16BE(h, 3); body.writeUInt16BE(w, 5);
  body[7] = 1;                          // 分量数
  return Buffer.concat([Buffer.from([0xff,0xd8]), ...pre, Buffer.from([0xff, sof]), body]);
}
/* 带 EXIF（APP1 内嵌一枚 32×24 的缩略图 SOF）的一帧：正身 40×30 —— 这一枚专门钉"不许读到缩略图" */
function jpegWithExif(w, h, tw, th){
  const app = Buffer.alloc(20);                                 // 一段无意义但长度合法的 APP1 载荷
  app.write('Exif\0\0', 0, 'ascii');
  const thumb = Buffer.concat([
    Buffer.from([0xff, 0xc0]), Buffer.from([0x00, 0x11]), Buffer.from([8]),
    (() => { const H = Buffer.alloc(2); H.writeUInt16BE(th, 0); return H; })(),
    (() => { const W = Buffer.alloc(2); W.writeUInt16BE(tw, 0); return W; })(), Buffer.from([1, 0x11, 0]),
  ]);
  const appLen = Buffer.alloc(2); appLen.writeUInt16BE(app.length + thumb.length + 2, 0);
  const mainLen = Buffer.alloc(2); mainLen.writeUInt16BE(11, 0);
  return Buffer.concat([
    Buffer.from([0xff,0xd8, 0xff,0xe1]), appLen, app, thumb,
    Buffer.from([0xff,0xc0]), mainLen, Buffer.from([8]),
    (() => { const H = Buffer.alloc(2); H.writeUInt16BE(h, 0); return H; })(),
    (() => { const W = Buffer.alloc(2); W.writeUInt16BE(w, 0); return W; })(), Buffer.from([1, 0x11, 0]),
    Buffer.from([0xff,0xd9]),
  ]);
}
function gifBytes(w, h){
  const b = Buffer.alloc(13);
  b.write('GIF89a', 0, 'ascii'); b.writeUInt16LE(w, 6); b.writeUInt16LE(h, 8);
  return b;
}
function webpLossy(w, h){
  const body = Buffer.alloc(20);
  body[0] = 0x30; body[1] = 0x00; body[2] = 0x00;                 // 帧标签 3 字节（关键帧）
  body[3] = 0x9d; body[4] = 0x01; body[5] = 0x2a;                 // 同步码
  body.writeUInt16LE(w & 0x3fff, 6); body.writeUInt16LE(h & 0x3fff, 8);
  return riff('VP8 ', body);
}
function webpLossless(w, h){
  const bits = ((h - 1) & 0x3fff) << 14 | ((w - 1) & 0x3fff);
  const b = Buffer.alloc(6); b[0] = 0x2f;
  b[1] = bits & 0xff; b[2] = (bits >> 8) & 0xff; b[3] = (bits >> 16) & 0xff; b[4] = (bits >> 24) & 0xff;
  return riff('VP8L', b);
}
function webpExtended(w, h){
  const b = Buffer.alloc(14);
  b.writeUIntLE(w - 1, 4, 3); b.writeUIntLE(h - 1, 7, 3);
  return riff('VP8X', b);
}
function riff(fourccName, body){
  const head = Buffer.alloc(12);
  head.write('RIFF', 0, 'ascii'); head.writeUInt32LE(4 + 8 + body.length, 4); head.write('WEBP', 8, 'ascii');
  const ch = Buffer.alloc(8); ch.write(fourccName, 0, 'ascii'); ch.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, ch, body]);
}

export function selftest(){
  const cases = [
    ['PNG 276×276（与 public/assets/portrait.png 同形状）', ihdrPng(276, 276), 276, 276],
    ['PNG 1×1（最小合法值）', ihdrPng(1, 1), 1, 1],
    ['PNG 65535×3（IHDR 上限一侧）', ihdrPng(65535, 3), 65535, 3],
    ['JPEG 40×30 + EXIF 缩略图 32×24（不许读到缩略图）', jpegWithExif(40, 30, 32, 24), 40, 30],
    ['JPEG 渐进式 SOF2 1536×1024', sofSegment(0xc2, 1536, 1024, []), 1536, 1024],
    ['JPEG SOF3(无损) 200×100，前面还压着 DHT/DQT', sofSegment(0xc3, 200, 100, [Buffer.from([0xff,0xdb,0x00,0x02]), Buffer.from([0xff,0xc4,0x00,0x02])]), 200, 100],
    ['GIF 92×69（.cover 那一格的在册读数）', gifBytes(92, 69), 92, 69],
    ['WebP 有损 768×512', webpLossy(768, 512), 768, 512],
    ['WebP 无损 333×777', webpLossless(333, 777), 333, 777],
    ['WebP 扩展（含动画）1200×630', webpExtended(1200, 630), 1200, 630],
  ];
  /* 朝窄：认不出的一律 null，不许蒙一枚数 */
  const negatives = [
    ['SVG（文本，不是位图头）', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"></svg>')],
    ['AVIF/HEIC（ispe 箱未实现，判不了就是判不了）', Buffer.concat([Buffer.from([0,0,0,0x18]), Buffer.from('ftypavif', 'ascii'), Buffer.alloc(16)])],
    ['截断的 PNG（签名齐、IHDR 没读完）', Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a, 0,0,0,4, 0x49,0x48,0x44,0x52, 0,0])],
    ['零宽度的 IHDR（w=0 不是合法尺寸）', ihdrPng(0, 10)],
    ['JPEG 只有 SOI 与 EOI（整帧没有 SOF）', Buffer.from([0xff,0xd8,0xff,0xd9])],
    ['WebP 未知子格式 ALPH', riff('ALPH', Buffer.alloc(4))],
    ['空字节串', Buffer.alloc(0)],
  ];
  let pass = 0, fail = 0;
  for (const [name, bytes, w, h] of cases){
    const d = dimsOfBuffer(bytes);
    const good = d && d.width === w && d.height === h;
    console.log(`  ${good ? '✓' : '✗'} ${name} → ${d ? d.width + '×' + d.height + ' ' + d.format : 'null'}`);
    good ? pass++ : fail++;
  }
  for (const [name, bytes] of negatives){
    const d = dimsOfBuffer(bytes);
    const good = d === null;
    console.log(`  ${good ? '✓' : '✗'} 朝窄 ${name} → ${d ? '居然解出 ' + d.width + '×' + d.height : 'null（不猜）'}`);
    good ? pass++ : fail++;
  }
  console.log(`  已知答案夹具：正向 ${cases.length} 枚 ＋ 反向 ${negatives.length} 枚 ⇒ ${pass} 过 / ${fail} 红`);
  return fail === 0;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').includes('image-dims')){
  if (process.argv.includes('--selftest')) process.exit(selftest() ? 0 : 1);
}
