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
/* 按大括号深度切，带 @media / @supports 的上下文——归并之后同一个选择器文本可以合法地出现在
   两份表里（各自声明自己那一层的令牌），所以键必须是"上下文 + 选择器 + 令牌名"，
   只看选择器文本会把 `@media (max-width:720px)` 里那条当成顶层那条的副本。 */
function allBlocks(src){
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const out = []; const stack = []; let start = 0;
  const lineOf = p => clean.slice(0, p).split('\n').length;
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
      const toks = {}, fn = {};
      for (const t of body.matchAll(HEX)) toks[t[1]] = t[2].toUpperCase();
      for (const t of body.matchAll(FN)) fn[t[1]] = t[2].replace(/\s+/g, '');
      out.push({ ctx, sel: top.pre, attrs, toks, fn, line: lineOf(top.start) });
    }
    else if (c === ';' && !stack.length) start = i + 1;
  }
  return out;
}
function readSheets(){
  const per = ALL_SHEETS.filter(f => existsSync(f))
    .map(f => ({ file: f.split(/[\\/]/).pop(), blocks: allBlocks(readFileSync(f, 'utf8')) }));
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
/* 档位来自 §2.4：正文级 ≥7、次要 ≥4.5，其余（三级/苔/枯草/月光）属大字或装饰档，不设地板 */
const FLOOR = { '--ink': 7, '--moss-ink': 7, '--ink-2': 4.5 };
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
    console.log(`  ${k.padEnd(13)}${v}  ${c.L.toFixed(3)}  ${c.C.toFixed(3)}  ${c.H.toFixed(1).padStart(5)}  ${a.toFixed(2).padStart(6)}  ${b.toFixed(2).padStart(6)}  ${floor ? (ok ? '✓' : '✗ 应 ≥' + floor) : '—'}`);
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
  ':root': ['--bg-base', '--bg-top', '--ink', '--ink-2', '--ink-3', '--moss', '--moss-deep', '--moss-ink',
            '--straw', '--moon', '--line', '--glass', '--glass-border', '--mist', '--halo',
            '--shadow', '--shadow-contact', '--glass-edge'],
  'html[data-theme="dark"]': ['--bg-base', '--bg-top', '--ink', '--ink-2', '--ink-3', '--moss', '--moss-deep',
            '--moss-ink', '--line', '--glass', '--glass-border', '--mist', '--halo',
            '--shadow', '--shadow-contact', '--glass-edge'],
  'html[data-phase="dawn"][data-theme="light"]': ['--bg-top', '--shadow'],
  'html[data-phase="dusk"][data-theme="light"]': ['--bg-top', '--shadow'],
  'html[data-phase="night"][data-theme="light"]': ['--bg-base', '--bg-top', '--shadow'],
  'html[data-theme="dark"][data-moon="full"]': ['--shadow'],
};
/* ⚠️ 这枚登记值是 §17 那"三处同源"的第三处：规范句子（§2 那批基础令牌）/ 上面那份清单 /
   `src/styles/base.css` 的实际声明。三处一起动，动一处就红——所以清单不是注释，是判据。
   42 = hex 22 + 值里含 rgba() 20（第九轮 `card/glass` 从 38 抬上来：`:root` 与 dark 各多一枚
   `--shadow-contact` 与一枚 `--glass-edge`，共 +4）。
   下面两条牙：① 清单里的必须在 base.css 里（旧那条，防"删光就绿"）；
   ② base.css 里的必须都在清单里（第九轮新加，防"加完令牌忘了登记"——旧判据对多出来的一枚是瞎的）。 */
const REGISTERED = 42;
let drift = 0, basePalette = 0, baseHex = 0, baseRgba = 0, dupKeys = 0, missingKeys = 0, needTotal = 0, orphans = 0;
{
  const table = new Map();
  for (const { file, blocks } of per)
    for (const b of blocks)
      for (const [kind, map] of [['hex', b.toks], ['rgba', b.fn]])
        for (const [k, v] of Object.entries(map)){
          const id = `${b.ctx ? b.ctx + ' / ' : ''}${b.sel} ${k}`;
          if (!table.has(id)) table.set(id, []);
          table.get(id).push({ file, v, kind });
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
  /* 完备性：§2 那批基础令牌必须住在 base.css，一枚都不许少 */
  const inBase = new Map();
  for (const [id, hits] of table) for (const h of hits) if (h.file === 'base.css') inBase.set(id, h);
  const listed = new Set();
  for (const [sel, list] of Object.entries(BASE_SET)) for (const k of list){
    needTotal++;
    const id = `${sel} ${k}`;
    listed.add(id);
    if (!inBase.has(id)){ missingKeys++; console.log(`  ✗ base.css 里没有 ${sel} 的 ${k} —— 基础色板缺了一枚（判据不许靠"删掉就绿"过关）`); drift++; }
  }
  /* 反向那条（第九轮）：base.css 里冒出一枚清单没登记的色板令牌也算红。
     旧判据只朝一个方向查（清单→文件），所以"加了令牌忘了登记 §2"这件事在两串输出里都是绿的——
     那正是"扫了但没匹配到"与"扫了且全过"长得一样的同一个形状。 */
  for (const id of inBase.keys()) if (!listed.has(id)){ orphans++; console.log(`  ✗ base.css 里声明了 ${id} —— §2 那份清单没有它，"三处同源"断了第三处`); drift++; }
  if (needTotal !== REGISTERED){ console.log(`  ✗ 清单实际 ${needTotal} 枚、规范登记值 ${REGISTERED} 枚 —— §17 那句计数与这份判据对不上了（三处同源）`); drift++; }
  console.log('\n=== 一处真值（base.css ← mistwood.css / home.css / essay.css）===');
  console.log(`  ${drift ? '✗ 这一关没过' : '✓'} base.css 集中了 ${baseHex} 枚 hex + ${baseRgba} 枚含 rgba() 的色板令牌（面/影/纱）；` +
    `扫了 ${per.length} 份表共 ${table.size} 个 (选择器,令牌) 键，跨文件重复 ${dupKeys} 处、基础板 ${needTotal - missingKeys}/${needTotal} 枚在位（登记值 ${REGISTERED}＝hex 22 + rgba 20）、未登记的反向多枚 ${orphans} 处`);
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

const vs = variants(per);
console.log('\n=== 条件块（data-phase / data-moon）过闸 ===');
if (!vs.length) console.log('  （没有条件块，跳过）');
let bad2 = 0, litChecked = 0;
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
  const lit = parsePaint(effFn['--lit']);
  if (!lit){ bad2++; console.log(line + `\n    ✗ ${label} 没有 --lit —— 方向光的判据正在空转`); return; }
  if (lit.a === 0){ bad2++; console.log(line + `\n    ✗ ${label} 的 --lit α=0 —— 这盏灯根本没亮，判据空转`); return; }
  litChecked++;
  const litB = overHex(bgB, lit), litT = overHex(bgT, lit);
  let tight = Infinity, wk = '', wok = true;
  for (const [k, floor] of Object.entries(FLOOR)){
    const w = Math.min(ratio(eff[k], litB), ratio(eff[k], litT));
    if (w < floor) wok = false;
    if (w - floor < tight){ tight = w - floor; wk = `${k} ${w.toFixed(2)}（地板 ${floor}）`; }
  }
  if (!wok){ bad2++; line += `  光 α${lit.a} → ✗ 铺满全页时有档位跌破地板，最紧一档 ${wk}`; }
  else line += `  光 α${lit.a} → 底${litB} 顶${litT}，最紧一档 ${wk}✓`;
  console.log(line + (ok && wok ? '  ⇒ 全过' : ''));
}
for (const [tName, tBase, tFn] of [['light', light, lightFn], ['dark', dark, darkFn]]){
  /* 基准档 = :root / [data-theme=dark] 自己：亮色的 day、两主题的无月之夜 */
  stateLine(`${tName} day（基准）`, { ...tBase }, { ...tFn }, null);
  for (const phase of PHASES) for (const moon of MOONS){
    /* 没点名 data-theme 的块按"亮色专用"处理——§2.3 明写暗色不随时段变色，
       所以一条裸 [data-phase] 规则套到夜林头上同样算分叉 */
    const usable = vs.filter(v => (v.attrs.theme || 'light') === tName)
                     .filter(v => (!v.attrs.phase || v.attrs.phase === phase) && (!v.attrs.moon || v.attrs.moon === moon));
    const eff = { ...tBase }, effFn = { ...tFn }, from = [];
    for (const v of usable) for (const [k, val] of Object.entries(v.toks)){ if (eff[k] !== val) from.push(`${k}←${v.file}`); eff[k] = val; }
    for (const v of usable) for (const [k, val] of Object.entries(v.fn)){ if (effFn[k] !== val) from.push(`${k}←${v.file}`); effFn[k] = val; }
    if (!from.length) continue;                       // 这个组合一个令牌都不覆盖，不必报
    stateLine(`${tName} ${phase}${moon === 'full' ? '+满月' : ''}`, eff, effFn, from.join('、'));
  }
}
console.log(`  方向光复算 ${litChecked} 档（0 档＝这盏灯没进过闸）`);
if (!bad2 && !drift) console.log('\n✓ 条件块达标：时段、月相与方向光都没有把任何一档推下它的地板');

if (bad || bad2 || drift){ console.log(`\n✗ ${bad} 个基础令牌、${bad2} 处时段/月相/方向光读数、${drift} 处"色板有两处真值"跌破登记值`); process.exit(1); }
console.log('\n✓ 色板达标：正文级 ≥7、次要 ≥4.5 全部守住');
