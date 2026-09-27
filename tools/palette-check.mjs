/* 色板反解：把 §2.4 从"每个颜色逐个实测再回填"变成"按 OKLCH 的 L 反解门槛"
   用法  node tools/palette-check.mjs              （查现有令牌达不达标，CI/发布前跑）
         node tools/palette-check.mjs --need 7     （新色该把 L 放在哪：反解 + 打印候选 hex）
   换算按 Björn Ottosson 的 OKLab 推导；对比度是 WCAG 2.1 相对亮度比。 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CSS = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles', 'mistwood.css');

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

/* ---------- 读色板 ---------- */
function tokens(){
  const src = readFileSync(CSS, 'utf8');
  const block = header => {
    const i = src.indexOf(header);
    const end = src.indexOf('\n}', i);
    const out = {};
    for (const m of src.slice(i, end).matchAll(/(--[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]] = m[2].toUpperCase();
    return out;
  };
  return { light: block(':root{'), dark: block('html[data-theme="dark"]{') };
}
/* 档位来自 §2.4：正文级 ≥7、次要 ≥4.5，其余（三级/苔/枯草/月光）属大字或装饰档，不设地板 */
const FLOOR = { '--ink': 7, '--moss-ink': 7, '--ink-2': 4.5 };
const TIERS = [7, 4.5, 3];

const args = process.argv.slice(2);
const { light, dark } = tokens();
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

if (bad){ console.log(`\n✗ ${bad} 个令牌跌破 §2.4 登记的档位`); process.exit(1); }
console.log('\n✓ 色板达标：正文级 ≥7、次要 ≥4.5 全部守住');
