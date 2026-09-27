/* 色板反解：把 §2.4 从"每个颜色逐个实测再回填"变成"按 OKLCH 的 L 反解门槛"
   用法  node tools/palette-check.mjs              （查现有令牌达不达标，CI/发布前跑）
         node tools/palette-check.mjs --need 7     （新色该把 L 放在哪：反解 + 打印候选 hex）
   换算按 Björn Ottosson 的 OKLab 推导；对比度是 WCAG 2.1 相对亮度比。

   ⚠️ 第四轮扩了两件事，因为规范开始引入"随时间变的材质"（§2.3 换季、§6 月相）：
   ① 不只读 `:root{}` 与 `html[data-theme="dark"]{}` ——**所有带 `data-phase` / `data-moon` 的块都过闸**，
      按"主题底 + 该时段覆盖"合成有效色板再算对比度。以前时段块里的色板是完全没扫过的。
   ② 两份样式表（mistwood.css / home.css）里的**同名 hex 令牌必须逐字符相同**——不同就红。
      §16 记的那条隐患（"改一处忘另一处就静默分叉，而工具只读 mistwood.css"）从今天起由机器守，不靠记性。 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEETS = ['mistwood.css', 'home.css'].map(f => join(ROOT, 'src', 'styles', f));

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

/* ---------- 读色板：两份表 × 所有条件块 ---------- */
const HEX = /(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\b/g;
/* rgba()/rgb() 令牌（--shadow / --glass / --scrim-* / --line 这一族）：算不进对比度（它们是面与影，
   不是压在底上的字），但**两份表里必须逐字符一样**——§2.3 那四条时段投影就是 rgba，
   只查 hex 的话"改一处忘另一处"这条老路照样走得通。 */
/* ⚠️ 匹配的是"值里含 rgba()/rgb()"的令牌，不是"值以 rgba( 开头"——`--shadow:0 12px 24px -8px rgba(…)`
   这种一长串偏移打头的写法，用 `:\s*(rgba?\(` 去抠会一个字都不中，漂移检查当场变成摆设（实测踩过）。 */
const FN = /(--[a-z0-9-]+):([^;]*rgba?\([^)]*\)[^;]*)/g;
/* 按"选择器 { 体 }"粗切：CSS 里没有嵌套规则（@media 里那几块不含 hex 令牌，扫到也不匹配） */
function allBlocks(src){
  const out = [];
  const re = /(^|\n)([^\n{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(src))){
    const sel = m[2].trim(), body = m[3];
    if (!sel.includes('html') && sel !== ':root') continue;
    const attrs = {};
    for (const a of sel.matchAll(/\[data-([a-z-]+)="([a-z0-9-]+)"\]/g)) attrs[a[1]] = a[2];
    const toks = {}, fn = {};
    for (const t of body.matchAll(HEX)) toks[t[1]] = t[2].toUpperCase();
    for (const t of body.matchAll(FN)) fn[t[1]] = t[2].replace(/\s+/g, '');
    if (!Object.keys(toks).length && !Object.keys(fn).length) continue;
    out.push({ sel, attrs, toks, fn });
  }
  return out;
}
function readSheets(){
  const per = SHEETS.map(f => ({ file: f.split(/[\\/]/).pop(), blocks: allBlocks(readFileSync(f, 'utf8')) }));
  const base = name => { const b = per.flatMap(p => p.blocks).find(x => x.sel === name); return b ? b.toks : {}; };
  return { per, light: base(':root'), dark: base('html[data-theme="dark"]') };
}
/* 条件块 = 选择器里带 data-phase / data-moon 的那些（data-theme 单独出现不算，那是基础板） */
function variants(per){
  const out = [];
  for (const { file, blocks } of per)
    for (const b of blocks)
      if ('phase' in b.attrs || 'moon' in b.attrs) out.push({ file, ...b });
  return out;
}
/* 档位来自 §2.4：正文级 ≥7、次要 ≥4.5，其余（三级/苔/枯草/月光）属大字或装饰档，不设地板 */
const FLOOR = { '--ink': 7, '--moss-ink': 7, '--ink-2': 4.5 };
const TIERS = [7, 4.5, 3];
const PHASES = ['dawn', 'day', 'dusk', 'night'], MOONS = ['*', 'full'];

const args = process.argv.slice(2);
const { per, light, dark } = readSheets();
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

/* ---------- ① 两份表不许各说各话 ---------- */
let drift = 0;
{
  /* 键 = "选择器 + 令牌名"，值 = 各文件里给出的 hex。同一个键在两份表里出现而取值不同 ⇒ 分叉，红。 */
  const table = new Map();
  for (const { file, blocks } of per)
    for (const b of blocks)
      for (const [kind, map] of [['hex', b.toks], ['rgba', b.fn]])
        for (const [k, v] of Object.entries(map)){
          const id = `${b.sel} ${k}`;
          if (!table.has(id)) table.set(id, new Map());
          table.get(id).set(file, { v, kind });
        }
  let shared = 0, sharedFn = 0;
  for (const [id, byFile] of table){
    if (byFile.size < 2) continue;
    const vals = [...byFile.values()];
    if (vals[0].kind === 'rgba') sharedFn++; else shared++;
    for (const x of vals) if (x.v !== vals[0].v){
      console.log(`  ✗ ${id} 在两份表里取值不同：` + [...byFile].map(([f, o]) => `${f} ${o.v}`).join(' vs '));
      drift++;
    }
  }
  console.log('\n=== 双表漂移（mistwood.css vs home.css）===');
  console.log(`  ${drift ? '✗ ' + drift + ' 处分叉' : '✓'} 两份表同时声明的 ${shared} 个色板令牌 + ${sharedFn} 个 rgba 令牌（面/影/纱）取值一致`);
}

/* ---------- ② 时段 / 月相块：随时间变的色板也要过闸 ---------- */
const vs = variants(per);
console.log('\n=== 条件块（data-phase / data-moon）过闸 ===');
if (!vs.length) console.log('  （没有条件块，跳过）');
let bad2 = 0;
for (const [tName, tBase] of [['light', light], ['dark', dark]]){
  for (const phase of PHASES) for (const moon of MOONS){
    /* 没点名 data-theme 的块按"亮色专用"处理——§2.3 明写暗色不随时段变色，
       所以一条裸 [data-phase] 规则套到夜林头上同样算分叉 */
    const usable = vs.filter(v => (v.attrs.theme || 'light') === tName)
                     .filter(v => (!v.attrs.phase || v.attrs.phase === phase) && (!v.attrs.moon || v.attrs.moon === moon));
    const eff = { ...tBase };
    const from = [];
    for (const v of usable) for (const [k, val] of Object.entries(v.toks)){ if (eff[k] !== val) from.push(`${k}←${v.file}`); eff[k] = val; }
    if (!from.length) continue;                       // 这个组合不覆盖任何色板令牌，不必报
    const bgB = eff['--bg-base'], bgT = eff['--bg-top'];
    let line = `  ${tName} ${phase}${moon === 'full' ? '+满月' : ''}：底 ${bgB} 顶 ${bgT}（覆盖 ${from.join('、')}）`;
    let ok = true;
    for (const [k, floor] of Object.entries(FLOOR)){
      const w = Math.min(ratio(eff[k], bgB), ratio(eff[k], bgT));
      if (w < floor){ ok = false; bad2++; line += `\n    ✗ ${k} ${eff[k]} 只剩 ${w.toFixed(2)}:1，应 ≥${floor}`; }
      else line += `  ${k} ${w.toFixed(2)}✓`;
    }
    console.log(line + (ok ? '  ⇒ 全过' : ''));
  }
}
if (!bad2 && !drift) console.log('\n✓ 条件块达标：时段与月相没有把任何一档推下它的地板');

if (bad || bad2 || drift){ console.log(`\n✗ ${bad} 个基础令牌、${bad2} 处时段/月相读数、${drift} 处双表漂移跌破登记值`); process.exit(1); }
console.log('\n✓ 色板达标：正文级 ≥7、次要 ≥4.5 全部守住');
