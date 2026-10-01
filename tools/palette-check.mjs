/* 色板反解：把 §2.4 从"每个颜色逐个实测再回填"变成"按 OKLCH 的 L 反解门槛"
   用法  node tools/palette-check.mjs              （查现有令牌达不达标，CI/发布前跑）
         node tools/palette-check.mjs --need 7     （新色该把 L 放在哪：反解 + 打印候选 hex）
   换算按 Björn Ottosson 的 OKLab 推导；对比度是 WCAG 2.1 相对亮度比。

   ⚠️ 第四轮扩了两件事，因为规范开始引入"随时间变的材质"（§2.3 换季、§6 月相）：
   ① 不只读 `:root{}` 与 `html[data-theme="dark"]{}` ——**所有带 `data-phase` / `data-moon` 的块都过闸**，
      按"主题底 + 该时段覆盖"合成有效色板再算对比度。以前时段块里的色板是完全没扫过的。
   ② 两份样式表（mistwood.css / home.css）里的**同名 hex 令牌必须逐字符相同**——不同就红。
      §16 记的那条隐患（"改一处忘另一处就静默分叉，而工具只读 mistwood.css"）从今天起由机器守，不靠记性。
   ⚠️ 2026-09-28 加第三件：**方向光**（§2.1，子页背景上那盏随时段转的灯）。判法是"最坏假设"——
      不量半径也不量方位，直接把 `--lit` 合成进有效底顶、当作铺满整页，再复算一遍地板。
      这样几何只管"在哪儿看得见"，而"哪怕它铺满全页也不许破可读性地板"由这一条兜住。
      ⚠️ 它自带防空转：`--lit` 缺失或 α=0 直接红，并且末尾打印"复算 N 档"——N=0 就是这盏灯根本没进过闸。
      （§16 那条"rgba 漂移检查静默空转、退出码 0、长得像全绿"就是这么被抓出来的，新判据一律先学它。）
   ⚠️ 同一天 base.css 归并之后，②「双表漂移」换了语义（§16）。旧判据是"同一个 (选择器,令牌) 键
      在两份表里都出现**且取值不同**才红"——归并做完的那一刻两份表的交集掉到 0，它会照样打印
      `✓ … 0 个 … 取值一致` 并 exit 0，正是上面那句点名的形状。所以先加防空转闸，再把判据换成
      归并之后该说的话：**色板令牌只许有一处真值（base.css），同名键出现在第二份表里就红**，
      外加一条"§2 那批基础令牌必须确实在 base.css 里"的完备性——两个方向都不许它空转。 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/* 读色板：base.css 是真值所在，mistwood / home 只留各自那一层的专属令牌（--lit 族 / --scrim-* 族） */
const SHEETS = ['base.css', 'mistwood.css', 'home.css'].map(f => join(ROOT, 'src', 'styles', f));
/* "一处真值"这条判据扫的是全部入口样式表：别处再多一份同名声明就是分叉的起点 */
const ALL_SHEETS = [...SHEETS, join(ROOT, 'src', 'styles', 'essay.css')];

/* ---------- 色彩数学 ---------- */
const toLin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) };
const fromLin = v => { const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, s)) * 255) };
const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] };
const lum = hex => { const [r, g, b] = hexToRgb(hex).map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) };
function toOklch(hex){
  const [r, g, b] = hexToRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}
function toHex(L, C, H){
  const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
               -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
               -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  if (lin.some(v => v < -0.002 || v > 1.002)) return null;      /* 出 sRGB 色域：这个 LCH 落不进屏幕色 */
  return '#' + lin.map(v => fromLin(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}
/* 沿 L 二分，找"仍然达标"的最亮（亮底）/ 最暗（暗底）那一端 */
function ladder(bgHex, target, C, H){
  const bgL = lum(bgHex), darker = bgL > 0.5;
  let lo = 0, hi = 1;
  for (let i = 0; i < 44; i++){
    const mid = (lo + hi) / 2, hex = toHex(mid, C, H);
    const ok = hex !== null && ratio(hex, bgHex) >= target;
    if (darker) ok ? lo = mid : hi = mid; else ok ? hi = mid : lo = mid;
  }
  return +lo.toFixed(3);
}

/* ---------- 读色板：三份表 × 所有条件块 ---------- */
const HEX = /(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\b/g;
/* rgba()/rgb() 令牌（--shadow / --glass / --scrim-* / --line 这一族）：算不进对比度（它们是面与影，
   不是压在底上的字），但**一处真值**这条判据认它们——§2.3 那四条时段投影就是 rgba，
   只查 hex 的话"改一处忘另一处"这条老路照样走得通。 */
/* ⚠️ 匹配的是"值里含 rgba()/rgb()"的令牌，不是"值以 rgba( 开头"——`--shadow:0 12px 24px -8px rgba(…)`
   这种一长串偏移打头的写法，用 `:\s*(rgba?\(` 去抠会一个字都不中，漂移检查当场变成摆设（实测踩过）。
   新写的"色板令牌只许一处"判据照抄这条口径，别退回那个抠法。 */
const FN = /(--[a-z0-9-]+):([^;]*rgba?\([^)]*\)[^;]*)/g;
/* ⚠️ 2026-09-29 加这一条：正文脚下那层地面光（§15）不是一枚 rgba 字面量，是从 `--lit` 按比例解出来的
   `color-mix(in srgb, var(--lit) 30%, transparent)`——**零新色**那条纪律（§12 第五色 / 上面那格）
   唯一的写法就是派生，而派生写法只在 FN 那条里活不下来（它要求值里含 `rgba(`）。
   不认它 = 第二层光的判据从源码里就读不到东西 = §16 点名的那个"扫了但一个字都没匹配到"的形状。 */
const CMIX = /(--[a-z0-9-]+):\s*(color-mix\([^;]*\))/g;
/* ⚠️ 2026-09-30（`card/pairedtokens`）加第四种读法：`light-dark(A,B)`——一枚声明里写着两档。
   为什么这一关**必须**自己拆它，三条实测（都在这一轮跑过，见 §17 那一格）：
   ① HEX 读不到它（要求冒号后紧跟 `#rrggbb`，先撞上 `light-dark` 那个 `l`）；
   ② 把 `home.css` 夜档的纱罩写坏成 `light-dark(rgba(242,244,239,.36), rgba(222,17,122,.9))`
      并删掉暗档那一行 ⇒ palette / gap / media / phase **四把尺子全 exit 0**——暗档那一枚从来不进读数；
   ③ `--lit` 更坏：FN（"值里含 rgba()"）会把整条 `light-dark(…)` 吞进 value，而 `parsePaint`
      只取**第一枚** rgba ⇒ 暗色档拿着亮色的灯复算 §2.4，把一处**本来正确**的改动报成
      `光 α0.1 → --ink-2 4.25 ✗` 的假红。绿会漏、红会冤枉，两边都不是判据。
   ⇒ 口径：成对声明先拆回两档（A 进 `:root`、B 进同 ctx 的 `html[data-theme="dark"]`），
     再让上面三条正则去读拆出来的字面量；拆不动、落点不对、或残留没拆干净的，一律**红**，
     不许退化成"读不到＝没有"（§16 那条"扫了但没匹配到和扫了且全长一个样"）。 */
const LD_HEAD = /^\s*light-dark\s*\(/i;
const LD_EVERYWHERE = /light-dark\s*\(/gi;
const LD_ANY = /light-dark/i;
const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const RGBLIT = /^rgba?\([^()]*\)$/;
const LD_OK_SHAPE = v => HEX6.test(v) || RGBLIT.test(v);
/* 按括号深度切顶层逗号：`light-dark(rgba(35,43,37,.07), rgba(227,232,224,.08))` 里那两个
   逗号是参数内的，不能当分隔。切不出正好两段就返回 null（交上去判红，不猜）。 */
function splitLightDark(value){
  const open = value.indexOf('(');
  if (open < 0 || !/\)\s*$/.test(value)) return null;
  const inner = value.slice(open + 1, value.lastIndexOf(')'));
  const out = []; let depth = 0, start = 0;
  for (let i = 0; i < inner.length; i++){
    const c = inner[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0){ out.push(inner.slice(start, i).trim()); start = i + 1; }
  }
  out.push(inner.slice(start).trim());
  return out.length === 2 ? out : null;
}
/* 一枚拆出来的色该进哪张表——沿用 FN 那条一贯的口径（hex 进 toks、值里含 rgb()/rgba() 进 fn），
   拆出来的两支与两档表里写着的字面量在表里长得**一模一样**，这是"改前改后打印的表逐字节相同"
   那笔验收的前提。 */
function routeColor(into, name, raw){
  const v = raw.replace(/\s+/g, '');
  if (HEX6.test(raw)) into.toks[name] = raw.toUpperCase();
  else into.fn[name] = /^rgba?\(/i.test(v) ? v : raw;
  return into;
}
const mkBoard = () => ({ toks: {}, fn: {} });
/* 退路镜像那一个 ctx 的样子：`@supports not (color: light-dark(…))`——去空白再比，
   因为盘上可以写 `light-dark(#fff, #000)` 而 allBlocks 把空白压成一个空格 */
const MIRROR_CTX = s => /^@supportsnot\(color:light-dark\(/i.test(String(s).replace(/\s+/g, ''));
/* 扫描期间累计的三样东西：拆出来的成对声明、拆不动/落点不对的、每份表里 `light-dark(` 出现了几枚 */
const ldPairs = [], ldBad = [], ldRaw = new Map();
/* 按大括号深度切，带 @media / @supports 的上下文——归并之后同一个选择器文本可以合法地出现在
   两份表里（各自声明自己那一层的令牌），所以键必须是"上下文 + 选择器 + 令牌名"，
   只看选择器文本会把 `@media (max-width:720px)` 里那条当成顶层那条的副本。 */
function allBlocks(src, file = '?'){
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const out = []; const stack = []; let start = 0;
  const lineOf = p => clean.slice(0, p).split('\n').length;
  /* 这一份表里 `light-dark(` 一共出现几枚（注释已抹掉），与"被拆掉的成对声明＋镜像那行的条件"
     对账；对不上就是有枚这一关没读到——读不到不许当没有（② 那格的实测就是这一条的来历）。 */
  let ldSeen = 0;
  for (const m of clean.matchAll(LD_EVERYWHERE)) ldSeen++;
  for (let i = 0; i < clean.length; i++){
    const c = clean[i];
    if (c === '{'){ stack.push({ pre: clean.slice(start, i).trim().replace(/\s+/g, ' '), start }); start = i + 1; }
    else if (c === '}'){
      const body = clean.slice(start, i), top = stack.pop(); start = i + 1;
      if (!top || /^@/.test(top.pre)) continue;         /* at-rule 本体（@media/@keyframes）不是声明块 */
      if (/^(from|to|[0-9.]+%)$/.test(top.pre)) continue; /* @keyframes 里的帧：不含令牌，跳过 */
      const ctx = stack.map(s => s.pre).join(' / ');
      const attrs = {};
      for (const a of top.pre.matchAll(/\[data-([a-z-]+)="([a-z0-9-]+)"\]/g)) attrs[a[1]] = a[2];
      /* ---- 先拆 light-dark()，再让三条正则去读拆出来的两档 ---- */
      const line = lineOf(top.start);
      const ldSkip = new Set(), board = mkBoard();
      let ldDark = null;
      if (LD_ANY.test(body)){
        for (const decl of body.split(';')){
          const dm = /^\s*(--[a-z0-9-]+)\s*:\s*(.*\S)\s*$/.exec(decl);
          if (!dm || !LD_HEAD.test(dm[2])) continue;
          ldSkip.add(dm[1]);
          const at = { file, sel: top.pre, ctx, line, name: dm[1], raw: dm[2].replace(/\s+/g, '') };
          const args = splitLightDark(dm[2]);
          if (!args){ ldBad.push({ ...at, why: '切不出正好两个顶层参数' }); continue; }
          if (!args.every(LD_OK_SHAPE)){
            ldBad.push({ ...at, why: `参数不是一枚这一关读得到的色字面量（只许 #rrggbb 或 rgb()/rgba()；box-shadow / filter / gradient 这类**复合值不许塞进 light-dark()**，它只吃 <color>）` });
            continue;
          }
          /* 落点：只许顶层 `:root`。写在暗表里、写在 @media / @supports 里、写在时段块里，
             这一关就无法说清 B 那一支该归哪一档——宁可红，不许猜一档。 */
          if (ctx !== '' || top.pre !== ':root'){ ldBad.push({ ...at, why: '落点不是顶层 :root（这一关只认"顶层 :root 里的一处两档"）' }); continue; }
          routeColor(board, dm[1], args[0]);
          ldPairs.push({ file, name: dm[1], line, a: args[0].replace(/\s+/g, ''), b: args[1].replace(/\s+/g, '') });
          ldDark = ldDark || mkBoard();
          routeColor(ldDark, dm[1], args[1]);
        }
      }
      const { toks, fn } = board;
      for (const t of body.matchAll(HEX)) if (!ldSkip.has(t[1])) toks[t[1]] = t[2].toUpperCase();
      for (const t of body.matchAll(FN)) if (!ldSkip.has(t[1])) fn[t[1]] = t[2].replace(/\s+/g, '');
      /* 派生色（color-mix）也算"色板令牌"：同一个键在第二份表里再声明一次就是第二处真值，
         上面那条"一处真值"判据必须看得见它，所以它走进同一张 `fn` 表。 */
      for (const t of body.matchAll(CMIX)) if (!ldSkip.has(t[1])) fn[t[1]] = t[2].replace(/\s+/g, '');
      out.push({ ctx, sel: top.pre, attrs, toks, fn, line });
      /* 暗档那一支回到它与 `html[data-theme="dark"]` 同形的键上：表里的形状与两档表写出来的
         一模一样，所以 §2.4 的读数、完备性那 42 枚、方向光的复算全都照旧吃得动它。 */
      if (ldDark) out.push({ ctx, sel: 'html[data-theme="dark"]', attrs: { theme: 'dark' }, toks: ldDark.toks, fn: ldDark.fn, line, fromLd: true });
    }
    else if (c === ';' && !stack.length) start = i + 1;
  }
  ldRaw.set(file, (ldRaw.get(file) || 0) + ldSeen);
  return out;
}
function readSheets(){
  const per = ALL_SHEETS.filter(f => existsSync(f))
    .map(f => { const file = f.split(/[\\/]/).pop(); return { file, blocks: allBlocks(readFileSync(f, 'utf8'), file) }; });
  /* 基准板 = 三份表里 ctx 为空的那两条，按 base → mistwood → home 合并。
     归并之后同一键只会出现在一份里（这正是判据①守的事），所以合并顺序不影响读数；
     还按"取第一条命中"写的话，base.css 之外的令牌（--surface / --firefly）就会从这张表里消失——
     少扫几枚色板 = 判据静默变窄，那是 §16 记过的同一个形状。 */
  const base = {}, baseFn = {}, dark = {}, darkFn = {};
  for (const p of per) for (const b of p.blocks){
    if (b.ctx !== '') continue;                        /* 只认顶层那两条基准板 */
    if (b.sel === ':root'){ Object.assign(base, b.toks); Object.assign(baseFn, b.fn); }
    if (b.sel === 'html[data-theme="dark"]'){ Object.assign(dark, b.toks); Object.assign(darkFn, b.fn); }
  }
  return { per, light: base, dark, lightFn: baseFn, darkFn };
}
/* 条件块 = 顶层选择器里带 data-phase / data-moon 的那些（data-theme 单独出现不算，那是基础板） */
function variants(per){
  const out = [];
  for (const { file, blocks } of per)
    for (const b of blocks)
      if (b.ctx === '' && ('phase' in b.attrs || 'moon' in b.attrs)) out.push({ file, ...b });
  return out;
}
/* 档位来自 §2.4：正文级 ≥7、次要 ≥4.5，其余（三级/苔/枯草/月光）属大字或装饰档，不设地板
   ⚠️ `--ink-visited` 也钉在 ≥7：它是"读过的那一行"的正文级墨（24px/600 目录行标题按 §2.4 尺寸档本来只要 3:1，
   这一档**主动按正文档签**，因为"深一档"如果被压到读不出来，那这一枚改动就只剩代码没有读者）。 */
const FLOOR = { '--ink': 7, '--moss-ink': 7, '--ink-2': 4.5, '--ink-visited': 7 };
const TIERS = [7, 4.5, 3];
const PHASES = ['dawn', 'day', 'dusk', 'night'], MOONS = ['*', 'full'];

const args = process.argv.slice(2);
const { per, light, dark, lightFn, darkFn } = readSheets();
/* 防空转闸（放在所有表之前，免得"没扫到东西"长得像"扫过且全绿"）：
   ① 基准板读不到底 —— 后面每一格都是 NaN；
   ② base.css 里一枚色板令牌都没扫到 —— 这一关没东西可比。
      注意它和 ① 是两件事：把色板搬回 mistwood.css 也能过 ①（基准板是三份表合并读的），
      所以必须有这一条守着"真值确实在 base.css"。 */
if (per.length < 2){ console.log(`✗ 只扫到 ${per.length} 份样式表，"一处真值"这条判据正在空转`); process.exit(1); }
{
  let n = 0;
  for (const p of per) if (p.file === 'base.css') for (const b of p.blocks) n += Object.keys(b.toks).length + Object.keys(b.fn).length;
  if (!n){ console.log('✗ base.css 里一枚色板令牌都没扫到 —— 双表漂移判据正在空转'); process.exit(1); }
}
for (const [n, t] of [[':root', light], ['html[data-theme="dark"]', dark]])
  if (!t['--bg-base'] || !t['--bg-top']){ console.log(`✗ 读不到 ${n} 的 --bg-base / --bg-top —— 色板闸正在空转（base.css 是不是没被扫到？）`); process.exit(1); }
const themes = [['亮色', light], ['暗色', dark]];

if (args[0] === '--need'){
  const target = Number(args[1] || 7), C = Number(args[2] || 0.02), H = Number(args[3] || 152);
  console.log(`反解 ≥${target}:1（色相 ${H}°、彩度 ${C}）：`);
  for (const [name, t] of themes){
    for (const bg of ['--bg-base', '--bg-top']){
      const lighter = lum(t[bg]) > 0.5;                 /* 亮底要往暗里走，暗底要往亮里走 */
      let L = ladder(t[bg], target, C, H), hex = toHex(L, C, H);
      /* 落到 8bit 网格上会掉一点，往达标方向逐步修到真过线为止 */
      for (let i = 0; i < 12 && (hex === null || ratio(hex, t[bg]) < target); i++){
        L = +(L + (lighter ? -0.002 : 0.002)).toFixed(4);
        hex = toHex(L, C, H);
      }
      console.log(`  ${name} 压在 ${bg} ${t[bg]} 上 → L ${lighter ? '≤' : '≥'} ${L.toFixed(3)}${hex ? '  例如 ' + hex + '（实测 ' + ratio(hex, t[bg]).toFixed(2) + ':1）' : '  出界，降彩度再试'}`);
    }
  }
  process.exit(0);
}

let bad = 0;
for (const [name, t] of themes){
  console.log(`\n=== ${name}（底 ${t['--bg-base']} / 顶 ${t['--bg-top']}）===`);
  console.log('  档位反解（彩度 .02、色相 152°）：' + TIERS.map(g => `≥${g}:1 → L ${ladder(t['--bg-base'], g, .02, 152)} / L ${ladder(t['--bg-top'], g, .02, 152)}`).join('   '));
  console.log('  令牌          hex       L      C      H      压底    压顶    档');
  for (const [k, v] of Object.entries(t)){
    const c = toOkLchSafe(v);
    const a = ratio(v, t['--bg-base']), b = ratio(v, t['--bg-top']);
    const worst = Math.min(a, b), floor = FLOOR[k];
    const ok = floor === undefined || worst >= floor;
    if (!ok) bad++;
    console.log(`  ${k.padEnd(15)}${v}  ${c.L.toFixed(3)}  ${c.C.toFixed(3)}  ${c.H.toFixed(1).padStart(5)}  ${a.toFixed(2).padStart(6)}  ${b.toFixed(2).padStart(6)}  ${floor ? (ok ? '✓' : '✗ 应 ≥' + floor) : '—'}`);
  }
  const hues = Object.values(t).map(v => toOkLchSafe(v).H);
  console.log(`  色相散布 ${Math.min(...hues).toFixed(1)}°…${Math.max(...hues).toFixed(1)}（跨度 ${(Math.max(...hues) - Math.min(...hues)).toFixed(1)}°）——§1.1 说的是"不撞色"，不是"只有一个色相"，这里只报不判`);
}
function toOkLchSafe(hex){ try { return toOklch(hex) } catch (e) { return { L: 0, C: 0, H: 0 } } }

/* ---------- ① 色板只许有一处真值（base.css 归并之后）---------- */
/* 键 = "上下文 + 选择器 + 令牌名"，值 = 声明了它的文件清单。
   旧语义：同一个键在两份表里出现**且取值不同**才红 ⇒ 归并做完后交集掉到 0，它照样打 ✓ 并 exit 0。
   新语义：同一个键出现在两份表里就红（取值一样也红——两份"一样的"声明正是下一次分叉的起点），
   再加两条闸：① base.css 里一枚色板令牌都没有 ⇒ 判据空转，红；
              ② §2 那批基础令牌必须确实在 base.css 里各声明一次 ⇒ 缺一枚就红，
                 否则"把色板全删掉"反而能让这一关变绿（越少越绿＝另一个形状的空转）。 */
const BASE_SET = {
  ':root': ['--bg-base', '--bg-top', '--ink', '--ink-visited', '--ink-2', '--ink-3', '--moss', '--moss-deep', '--moss-ink', '--moss-solid',
            '--straw', '--moon', '--line', '--glass', '--glass-border', '--mist', '--halo',
            '--shadow', '--shadow-contact', '--glass-edge'],
  'html[data-theme="dark"]': ['--bg-base', '--bg-top', '--ink', '--ink-visited', '--ink-2', '--ink-3', '--moss', '--moss-deep',
            '--moss-ink', '--moss-solid', '--line', '--glass', '--glass-border', '--mist', '--halo',
            '--shadow', '--shadow-contact', '--glass-edge'],
  'html[data-phase="dawn"][data-theme="light"]': ['--bg-top', '--shadow'],
  'html[data-phase="dusk"][data-theme="light"]': ['--bg-top', '--shadow'],
  'html[data-phase="night"][data-theme="light"]': ['--bg-base', '--bg-top', '--shadow'],
  'html[data-theme="dark"][data-moon="full"]': ['--shadow'],
};
/* ⚠️ 这枚登记值是 §17 那"三处同源"的第三处：规范句子（§2 那批基础令牌）/ 上面那份清单 /
   `src/styles/base.css` 的实际声明。三处一起动，动一处就红——所以清单不是注释，是判据。
   46 = hex 26 + rgba 20（第十一轮 `card/visited-ink` 从 42 抬到 44：`:root` 与 dark 各多一枚
   `--ink-visited`，共 +2；rgba 那一族一枚没动。C1（`v1/palette`，2026-10-02）再从 44 抬到 46＝
   `--moss-solid` 在 `:root` 与 dark 各一枚，两枚都是 hex；夜林那五处只是把三元组字面量
   `(14,19,13)` 换成 `(11,16,10)`，枚数不变，所以 rgba 那一半仍旧 20）。
   下面两条牙：① 清单里的必须在 base.css 里（旧那条，防"删光就绿"）；
   ② base.css 里的必须都在清单里（第九轮新加，防"加完令牌忘了登记"——旧判据对多出来的一枚是瞎的）。 */
const REGISTERED = 46;
let drift = 0, basePalette = 0, baseHex = 0, baseRgba = 0, dupKeys = 0, missingKeys = 0, needTotal = 0, orphans = 0;
{
  const table = new Map();
  for (const { file, blocks } of per)
    for (const b of blocks)
      for (const [kind, map] of [['hex', b.toks], ['rgba', b.fn]])
        for (const [k, v] of Object.entries(map)){
          const id = `${b.ctx ? b.ctx + ' / ' : ''}${b.sel} ${k}`;
          if (!table.has(id)) table.set(id, []);
          table.get(id).push({ file, v, kind, mirror: MIRROR_CTX(b.ctx) });
          if (file === 'base.css'){ basePalette++; kind === 'hex' ? baseHex++ : baseRgba++; }
        }
  /* 一处真值：同一个键跨文件重复 ⇒ 红 */
  for (const [id, hits] of table){
    const files = [...new Set(hits.map(h => h.file))];
    if (files.length < 2) continue;
    dupKeys++;
    console.log(`  ✗ ${id} 在 ${files.length} 份表里各声明了一次：` + hits.map(h => `${h.file} ${h.v}`).join(' vs '));
    drift++;
  }
  /* 完备性：§2 那批基础令牌必须住在 base.css，一枚都不许少。
     ⚠️ 退路镜像（`@supports not (color: light-dark(…))` 里那两支）不进这张账——它是**退路**，
     不是第二处真值，由下面 ①b 那一关逐字符管着它和合并态一不一致；在这里数它会把"镜像"读成"分叉"。 */
  const inBase = new Map();
  for (const [id, hits] of table) for (const h of hits) if (h.file === 'base.css' && !h.mirror) inBase.set(id, h);
  const listed = new Set();
  let regHex = 0, regRgba = 0;      /* 登记值里 hex 与 rgba 各占几枚——**从盘上的 kind 现算**，不抄字面量 */
  for (const [sel, list] of Object.entries(BASE_SET)) for (const k of list){
    needTotal++;
    const id = `${sel} ${k}`;
    listed.add(id);
    const hit = inBase.get(id);
    if (hit) hit.kind === 'hex' ? regHex++ : regRgba++;
    if (!inBase.has(id)){ missingKeys++; console.log(`  ✗ base.css 里没有 ${sel} 的 ${k} —— 基础色板缺了一枚（判据不许靠"删掉就绿"过关）`); drift++; }
  }
  /* 反向那条（第九轮）：base.css 里冒出一枚清单没登记的色板令牌也算红。
     旧判据只朝一个方向查（清单→文件），所以"加了令牌忘了登记 §2"这件事在两串输出里都是绿的——
     那正是"扫了但没匹配到"与"扫了且全过"长得一样的同一个形状。 */
  for (const id of inBase.keys()) if (!listed.has(id)){ orphans++; console.log(`  ✗ base.css 里声明了 ${id} —— §2 那份清单没有它，"三处同源"断了第三处`); drift++; }
  if (needTotal !== REGISTERED){ console.log(`  ✗ 清单实际 ${needTotal} 枚、规范登记值 ${REGISTERED} 枚 —— §17 那句计数与这份判据对不上了（三处同源）`); drift++; }
  console.log('\n=== 一处真值（base.css ← mistwood.css / home.css / essay.css）===');
  console.log(`  ${drift ? '✗ 这一关没过' : '✓'} base.css 集中了 ${baseHex} 枚 hex + ${baseRgba} 枚含 rgba() 的色板令牌（面/影/纱）；` +
    `扫了 ${per.length} 份表共 ${table.size} 个 (选择器,令牌) 键，跨文件重复 ${dupKeys} 处、基础板 ${needTotal - missingKeys}/${needTotal} 枚在位（登记值 ${REGISTERED}＝清单里 hex ${regHex} 枚 + rgba ${regRgba} 枚，这两串是现算不是抄的）、未登记的反向多枚 ${orphans} 处`);
}

/* ---------- ①b 成对声明（`light-dark()` 一处写两档）与它的退路镜像 ----------
   这一关存在的唯一理由：第 0 问实测过，`light-dark()` 的第二参数在本仓的四把尺子里**原理性失明**
   （坏值写进暗档：palette / gap / media / phase 全 exit 0）。把两档并到一行之前，先让这一关读得到两档。
   三条牙：
   ① **拆**——A 进 `:root`、B 进同 ctx 的 `html[data-theme="dark"]`（上面 allBlocks 已经做完了，
      这里只查"拆不动的"与"落点不对的"，两者都红，不许静默少扫一枚）；
   ② **枚数三方向对账**——规范登记值 ⇄ 拆出来的对数 ⇄ 盘上 `light-dark(` 出现的次数（第三种是
      "这一关没读到却写在盘上"那一族：inline 规则里、@media 里、拆失败的都算，对不上就红）；
   ③ **退路镜像逐字符**——认不出 `light-dark()` 的引擎会把这条声明原样存下再代入，实测结果是
      **面退成透明、字退到继承色**（`.search-input`/玻璃/纱罩那一族全在面），不是"淡一点"而是"没了"，
      所以退路是硬要求；而退路本身正是本卡要治的那个病（一处改了另一处忘），于是由这一关比对
      「合并态的 A/B」⇄「镜像里的 `:root` / `html[data-theme="dark"]`」两侧**逐字符相同**。 */
const LD_REGISTERED = 6;   /* 三处同源的第三处：§17 那句话 / 这一枚字面量 / 样式表里的成对声明枚数 */
const LD_NEEDLE = ['home.css', '--scrim-top', 'rgba(242,244,239,.36)', 'rgba(14,19,13,.60)'];
const nrm = v => String(v).replace(/\s+/g, '').toUpperCase();
let ldDrift = 0;
{
  const mirror = new Map();                     /* `${file}|${令牌}` → {a,b}（退路两支） */
  const pairIds = new Set();
  for (const { file, blocks } of per){
    for (const b of blocks){
      if (!MIRROR_CTX(b.ctx)) continue;
      const side = b.sel === ':root' ? 'a' : b.sel === 'html[data-theme="dark"]' ? 'b' : null;
      if (!side){ ldDrift++; console.log(`  ✗ ${file}:${b.line} 退路镜像里冒出没认得的选择器 ${b.sel} —— 镜像只管 :root 与 html[data-theme="dark"] 那两支`); continue; }
      for (const [k, v] of [...Object.entries(b.toks), ...Object.entries(b.fn)]){
        const id = `${file}|${k}`;
        if (!mirror.has(id)) mirror.set(id, {});
        mirror.get(id)[side] = v;
      }
    }
  }
  for (const p of ldPairs) pairIds.add(`${p.file}|${p.name}`);
  for (const b of ldBad){
    ldDrift++;
    console.log(`  ✗ ${b.file}:${b.line} ${b.sel} ${b.name}：${b.raw}\n    —— ${b.why}`);
  }
  if (ldPairs.length !== LD_REGISTERED){
    ldDrift++;
    console.log(`  ✗ 拆出来的成对声明 ${ldPairs.length} 对、规范登记值 ${LD_REGISTERED} 对 —— §17 那句计数与这份判据对不上了（"把 light-dark() 全删掉"不许变成绿）`);
  }
  const needle = ldPairs.find(p => p.file === LD_NEEDLE[0] && p.name === LD_NEEDLE[1] &&
    nrm(p.a) === nrm(LD_NEEDLE[2]) && nrm(p.b) === nrm(LD_NEEDLE[3]));
  if (!needle){
    ldDrift++;
    console.log(`  ✗ 盘上没有 needle 那一枚成对声明（${LD_NEEDLE[0]} 的 ${LD_NEEDLE[1]}：${LD_NEEDLE[2]} ⇄ ${LD_NEEDLE[3]}）` +
      ` —— "拆两档再进表"这一关此刻正在空转：它没在读任何一行真实的成对声明`);
  }
  /* 盘上出现次数 ⇄ 这一关读到的次数 */
  let rawTotal = 0, accounted = 0;
  for (const { file, blocks } of per){
    const seen = ldRaw.get(file) || 0;
    const pairs = ldPairs.filter(p => p.file === file).length;
    const heads = new Set(blocks.filter(b => MIRROR_CTX(b.ctx)).map(b => b.ctx)).size;
    const bad = ldBad.filter(b => b.file === file).length;
    rawTotal += seen; accounted += pairs + heads + bad;
    if (seen !== pairs + heads + bad){
      ldDrift++;
      console.log(`  ✗ ${file} 盘上有 ${seen} 枚 light-dark()，这一关只读到 ${pairs + heads + bad} 枚` +
        `（成对 ${pairs} + 镜像条件 ${heads} + 拆不动已点名的 ${bad}）—— 剩下的那些没人读：` +
        `要么改成这一关认得的成对声明，要么在这一关里点名它，不许让它匿名通过（§16"扫了但没匹配到"同族）`);
    }
  }
  for (const p of ldPairs){
    const m = mirror.get(`${p.file}|${p.name}`) || {};
    if (m.a === undefined || nrm(m.a) !== nrm(p.a)){
      ldDrift++;
      console.log(`  ✗ ${p.file}:${p.line} ${p.name} 的**亮档**没有退路或与合并态不一致（镜像读到 ${m.a === undefined ? '∅' : m.a}，成对声明写的是 ${p.a}）`);
    }
    if (m.b === undefined || nrm(m.b) !== nrm(p.b)){
      ldDrift++;
      console.log(`  ✗ ${p.file}:${p.line} ${p.name} 的**暗档**没有退路或与合并态不一致（镜像读到 ${m.b === undefined ? '∅' : m.b}，成对声明写的是 ${p.b}）`);
    }
  }
  for (const [id, m] of mirror) if (!pairIds.has(id)){
    ldDrift++;
    console.log(`  ✗ ${id.replace('|', ' 的 ')} 只住在退路镜像里（亮 ${m.a ?? '∅'} / 暗 ${m.b ?? '∅'}）、上面没有对应的成对声明 —— 镜像是退路，不是第二处真值`);
  }
  console.log('\n=== 成对声明（light-dark 一处写两档）与退路镜像 ===');
  console.log(`  ${ldDrift ? '✗ 这一关没过' : '✓'} 拆回两档 ${ldPairs.length} 对（A 进 :root、B 进 html[data-theme="dark"]）、` +
    `退路镜像在册 ${mirror.size} 枚、盘上 light-dark() 共 ${rawTotal} 枚 / 这一关读到 ${accounted} 枚、` +
    `needle ${needle ? '在位' : '✗ 不在位'}（登记值 ${LD_REGISTERED} 对＝§17 那句计数）`);
}

/* ---------- ② 时段 / 月相块 + ③ 方向光：随时间变的色板与照度也要过闸 ---------- */
/* 方向光（§2.1）判的是**最坏假设**：不量半径、不量方位，直接假设整页都泡在这一档光里最亮的那一点上，
   把 --lit 合成进有效底再复算一次档位。几何只决定"你在哪儿看得见它"，不决定安全——
   安全由这一条兜住：**哪怕它铺满全页，正文与次要档仍然在地板上**。
   ⚠️ 判据不许空转：--lit 缺失或 α 为 0 都算红。§16 那条"rgba 漂移检查静默空转、长得像全绿"就是前车之鉴。 */
const RGBA_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/;
const parsePaint = v => { const m = v && RGBA_RE.exec(v); return m ? { r:+m[1], g:+m[2], b:+m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
const overHex = (bg, p) => { const [r, g, b] = hexToRgb(bg); const mix = (d, s) => Math.round(d * (1 - p.a) + s * p.a);
  return '#' + [mix(r, p.r), mix(g, p.g), mix(b, p.b)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase(); };
/* 把一枚令牌解成"可以合成进底"的实体漆：两种合法写法
   ① 字面 `rgba(…)` / `rgb(…)`（`--lit` 走这条）；
   ② `color-mix(in srgb, var(--某枚漆) P%, transparent)`（正文脚下那层 `--ground` 走这条）——
      sRGB 插值是按**预乘 alpha** 算的（CSS Color 4），与 `transparent`（α=0）混之后 RGB 不变、
      α 乘 P/100，所以这一支的解就是"母漆的 RGB + α × P%"。⚠️ 母漆**按当档的有效值**取：
      傍晚的 `--lit` 是 .15，那么 `--ground` 就是 .045——时段一转两盏灯一起转，这里不抄第二份数。
   解不动的写法回 'unparsed'（**不是 null**）：null＝"这一档没声明这一枚"，'unparsed'＝"声明了但
   这一关读不懂它"，两种都当场红，不许退化成"没这东西 ⇒ 不用算"。 */
const CMIX_RE = /^color-mix\(insrgb,var\((--[a-z0-9-]+)\),?([0-9.]+)%,transparent\)$/;
function paintOf(name, effFn){
  const raw = effFn[name];
  if (raw === undefined) return null;
  /* 拆干净的 light-dark() 不该出现在这张表里（allBlocks 早就把它拆成两支了）；
     真出现在这儿＝这一关漏了一处写法。这里**绝不退回 parsePaint**——那正是实测过的
     "只取第一枚 rgba、暗档拿亮色灯复算"那个假红的入口。读不懂就红，不猜。 */
  if (LD_ANY.test(String(raw))) return 'unparsed';
  const direct = parsePaint(raw);
  if (direct) return direct;
  const m = CMIX_RE.exec(String(raw).replace(/\s+/g, ''));
  if (!m) return 'unparsed';
  const src = paintOf(m[1], effFn);
  if (!src || src === 'unparsed') return src === 'unparsed' ? 'unparsed' : null;
  return { ...src, a: src.a * Number(m[2]) / 100 };
}

const vs = variants(per);
console.log('\n=== 条件块（data-phase / data-moon）过闸 ===');
if (!vs.length) console.log('  （没有条件块，跳过）');
let bad2 = 0, litChecked = 0, groundChecked = 0;
function stateLine(label, eff, effFn, coverNote){
  const bgB = eff['--bg-base'], bgT = eff['--bg-top'];
  let line = `  ${label}：底 ${bgB} 顶 ${bgT}${coverNote ? `（覆盖 ${coverNote}）` : ''}`;
  let ok = true;
  for (const [k, floor] of Object.entries(FLOOR)){
    const w = Math.min(ratio(eff[k], bgB), ratio(eff[k], bgT));
    if (w < floor){ ok = false; bad2++; line += `\n    ✗ ${k} ${eff[k]} 只剩 ${w.toFixed(2)}:1，应 ≥${floor}`; }
    else line += `  ${k} ${w.toFixed(2)}✓`;
  }
  /* 方向光那一档：把 --lit 当"整页最亮处"合成进底，再复算一次同样的地板 */
  if (LD_ANY.test(String(effFn['--lit'] || ''))){
    bad2++; console.log(line + `\n    ✗ ${label} 的 --lit 里还留着 light-dark() —— 这一关没把它拆成两档。` +
      `这里不许"取第一枚 rgba"：那等于暗色档拿亮色的灯复算 §2.4（2026-09-30 实测过这一格假红）`); return;
  }
  const lit = parsePaint(effFn['--lit']);
  if (!lit){ bad2++; console.log(line + `\n    ✗ ${label} 没有 --lit —— 方向光的判据正在空转`); return; }
  if (lit.a === 0){ bad2++; console.log(line + `\n    ✗ ${label} 的 --lit α=0 —— 这盏灯根本没亮，判据空转`); return; }
  litChecked++;
  const litB = overHex(bgB, lit), litT = overHex(bgT, lit);
  /* 同一把尺子复用一个函数：单盏灯与两层合成跑的是**同一批地板**，两套判据不许长歪 */
  const worstOn = (bHex, tHex) => {
    let tight = Infinity, wk = '', wok = true;
    for (const [k, floor] of Object.entries(FLOOR)){
      const w = Math.min(ratio(eff[k], bHex), ratio(eff[k], tHex));
      if (w < floor) wok = false;
      if (w - floor < tight){ tight = w - floor; wk = `${k} ${w.toFixed(2)}（地板 ${floor}）`; }
    }
    return { tight, wk, wok };
  };
  const one = worstOn(litB, litT);
  if (!one.wok){ bad2++; line += `  光 α${lit.a} → ✗ 铺满全页时有档位跌破地板，最紧一档 ${one.wk}`; }
  else line += `  光 α${lit.a} → 底${litB} 顶${litT}，最紧一档 ${one.wk}✓`;
  /* 第二层光（正文脚下那层地面光，§15 详情页那一格）：**两层合成**再复算一遍同一批地板。
     判法照上面那条最坏假设——不量半径、不量方位、不量两盏灯重不重叠，当作两盏都铺满全页。
     合成次序按真实层序：底 → 方向光（`.wrap::before`，z-index:-1，画在内容之下）→
     地面光（`.post-body` 自己的背景，坐在方向光之上、字之下）。
     ⚠️ 这一档不是"α 很小所以不用进账"：第二层光落在文字底下（量过，见 §15 那一格的逐像素读数），
     而 §2.4 那笔地板账是按**有效底**算的 ⇒ 它必须进这 12 档 × 两盏灯的合算里。 */
  const ground = paintOf('--ground', effFn);
  if (!ground){ bad2++; console.log(line + `\n    ✗ ${label} 读不到 --ground —— 第二层光的判据正在空转`); return; }
  if (ground === 'unparsed'){ bad2++; console.log(line + `\n    ✗ ${label} 的 --ground 这一关读不懂（合法写法只有 rgba() 与 color-mix(in srgb, var(…) P%, transparent)）——判据不许靠"读不懂"变绿`); return; }
  if (ground.a === 0){ bad2++; console.log(line + `\n    ✗ ${label} 的 --ground α=0 —— 这层光根本没亮，判据空转`); return; }
  groundChecked++;
  const gB = overHex(litB, ground), gT = overHex(litT, ground);
  const two = worstOn(gB, gT);
  if (!two.wok){ bad2++; line += `  两层 α${lit.a}+${ground.a.toFixed(3).replace(/0+$/, '')} → ✗ 铺满全页时有档位跌破地板，最紧一档 ${two.wk}`; }
  else line += `  两层 α${lit.a}+${ground.a.toFixed(3).replace(/0+$/, '')} → 底${gB} 顶${gT}，最紧一档 ${two.wk}✓`;
  console.log(line + (ok && one.wok && two.wok ? '  ⇒ 全过' : ''));
}
for (const [tName, tBase, tFn] of [['light', light, lightFn], ['dark', dark, darkFn]]){
  /* ⚠️ 暗色档的**函数色板**要从基准板起算再盖暗色那份，不是只拿暗色块自己那一份：
     CSS 级联里"只在 `:root` 声明过的令牌"在夜林照样在场（`--ground` 就是这种只声明一次的派生量），
     而它内部的 `var(--lit)` 取的是**当档有效值** ⇒ 暗色档解出来的 `--ground` 自动是月雾那枚的三成。
     这一句不是给工具开后门：`--lit` 这类在暗色块里重声明过的键由 spread 顺序自然盖掉基准值。 */
  const fnBase = { ...lightFn, ...tFn };
  /* 基准档 = :root / [data-theme=dark] 自己：亮色的 day、两主题的无月之夜 */
  stateLine(`${tName} day（基准）`, { ...tBase }, { ...fnBase }, null);
  for (const phase of PHASES) for (const moon of MOONS){
    /* 没点名 data-theme 的块按"亮色专用"处理——§2.3 明写暗色不随时段变色，
       所以一条裸 [data-phase] 规则套到夜林头上同样算分叉 */
    const usable = vs.filter(v => (v.attrs.theme || 'light') === tName)
                     .filter(v => (!v.attrs.phase || v.attrs.phase === phase) && (!v.attrs.moon || v.attrs.moon === moon));
    const eff = { ...tBase }, effFn = { ...fnBase }, from = [];
    for (const v of usable) for (const [k, val] of Object.entries(v.toks)){ if (eff[k] !== val) from.push(`${k}←${v.file}`); eff[k] = val; }
    for (const v of usable) for (const [k, val] of Object.entries(v.fn)){ if (effFn[k] !== val) from.push(`${k}←${v.file}`); effFn[k] = val; }
    if (!from.length) continue;                       // 这个组合一个令牌都不覆盖，不必报
    stateLine(`${tName} ${phase}${moon === 'full' ? '+满月' : ''}`, eff, effFn, from.join('、'));
  }
}
console.log(`  方向光复算 ${litChecked} 档（0 档＝这盏灯没进过闸）`);
console.log(`  两层光（方向光 + 正文脚下地面光）复算 ${groundChecked} 档（0 档＝第二层光没进过闸；` +
  `${groundChecked < litChecked ? `少于方向光的 ${litChecked} 档＝有档位被第二层漏掉了` : '与方向光同档数＝两盏灯跑的是同一批档'}）`);
if (!bad2 && !drift) console.log('\n✓ 条件块达标：时段、月相、方向光与两层光的合成都没有把任何一档推下它的地板');

if (bad || bad2 || drift || ldDrift){ console.log(`\n✗ ${bad} 个基础令牌、${bad2} 处时段/月相/方向光读数、${drift} 处"色板有两处真值"跌破登记值、${ldDrift} 处成对声明/退路镜像没过对账`); process.exit(1); }
console.log('\n✓ 色板达标：正文级 ≥7、次要 ≥4.5 全部守住');
