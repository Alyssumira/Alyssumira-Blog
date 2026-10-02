/* 色板反解：把 §2.4 从"每个颜色逐个实测再回填"变成"按 OKLCH 的 L 反解门槛"
   用法  node tools/palette-check.mjs              （查现有令牌达不达标，CI/发布前跑）
         node tools/palette-check.mjs --need 7     （新色该把 L 放在哪：反解 + 打印候选 hex）
         node tools/palette-check.mjs --selftest   （④「雾当明暗」那一格逐枚吃自己的反例：朝宽必须红、
                                                    朝窄不许误红；照 phase-check --selftest 同一条口径，
                                                    它故意让判据吃坏数据，所以不接进 npm run check 的默认链。
                                                    日常链里那几枚反例照样每跑都吃，只是不逐枚印；
                                                    2026-10-03 起它还逐枚印牙⑤「单调上界」那四枚自证 fixture，
                                                    与那 8 枚常驻反例分账——两族的计数不合并）
         PALETTE_FOG_ROWS=1 node tools/palette-check.mjs   （把 ④ 那张 (主题×档×目标色×前景×α) 全表逐枚印出来）
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
      外加一条"§2 那批基础令牌必须确实在 base.css 里"的完备性——两个方向都不许它空转。
   ⚠️ 2026-10-02（二轮 §7.2 落款那一卡）加第五件：**①d 枯草金配额**——`--straw` 的"每屏 ≤2 / 唯一当主角的
      时段是傍晚"这两句从前是**纯人工账**（一轮 A2 年标记号算过一次、本卡又算一次，两份账都没上盘）。
      这一关把可静态核的那一半搬上机器：在册消费者**枚数**与登记值对账（多一枚红、少到 0 也红），
      并且每一枚都必须带「data-phase="dusk"」＋「data-theme="light"」双闸。口径与三枚 fixture 在 ①d 那一格。
   ⚠️ 2026-10-03（`v12p/fogscale`，W2-P 那张卡的后续卡）换掉的是 ④「雾当明暗」的**落点**，判据一条都没删、
     读数一个字都没少印。为什么换：
     ① 旧牙①（覆盖层 α 把在册地板压破）那批读数是**最坏假设模型**的读数——本格把雾当成"整页、压在两层光之上、
        字之下"的一枚覆盖层，而真实载体不是那个形状（`home.css:251` 那枚是 `160vw` 的椭圆带、
        `essay.css:293/294` 那一层是 `min(.44, .44*var(--fog))` 的**遮罩深度**），本格**没按各自几何复算过面积与层序**
        （这是上一张卡自己登记在册的未验到 #1）。拿一枚没复算面积的模型去把作者在册多年的三枚端点评成门禁红，是冤枉。
     ② 那一族提案（fog-as-darkness 旋钮）已经被这一格判为**不可落**，盘上端点不会为它改动 ⇒ 门禁红会烂成一枚**永久红**；
        而 `npm run check` 是 `&&` 串，④ 红把链截断在第三项，后面六项（phase／gap／taxonomy／media／jieqi／
        font-subset／new-post／check-markdown）日常一格都不跑——本仓已经为"链截断"翻过两次车，这是文档里明写的故障签名。
     ⇒ 于是这一格换成一枚**有方向的、今天活着的**门禁：新牙⑤「单调上界」——`--fog` 的最大端点**不许越过登记上界
       `FOG_CEILING_REGISTERED`（现值 1.35，一枚**独立字面量**，不许从 `FOG_LEVELS` 里 `Math.max` 推了就算登记——
       推出来的话"改数组就等于改判据"，那枚牙会跟着靶一起动）。今天 1.35 恰好就是上界 ⇒ 盘上绿；
       将来谁想把雾往"更浓＝更暗"那一侧推（＝被否决的旋钮重新上岗），必须先跟这枚牙正面交锋。
       这枚牙判的是"越过上界"这件事**本身**，与那族破地板读数**分开红、分开打印、两族话不合并**。
     ⚠️ 这一格**没有**降级成零牙的 report-only 绿灯：同源牙（牙③）、反例牙（牙④，8 枚常驻 fixture）、
       失去靶牙（牙②）继续计入退出码，与换落点之前等价；也没有加任何"零载体就跳过"的条件跳过
       （§16 明令"读不到被测对象的尺子从来不算绿"，牙⑤ 自己那一枚端点都读不到时也判红、不判跳过）。 */
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
const SELFTEST = args.includes('--selftest');   /* ④ 那一格的反例清单（照 phase-check 同一条口径：另一次调用，不接进默认链） */
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
   `--ink-visited`，共 +2；rgba 那一族一枚没动。C1（`v1/palette`，2026-10-01）再从 44 抬到 46＝
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

/* ---------- ①c 消费对账：一枚"声明而不消费"的令牌就是参照站那个病 ----------
   来历：C1（`v1/palette`）落 `--moss-solid` 这一档**故意不落载体**（页脚、主按钮、导航当前页胶囊那三处
   用途全在 C4），于是盘上出现一枚"两档都声明了、四份表里一个 `var()` 都没吃它"的令牌。这恰好是我们
   对照参照站时批评过的那个形状（机制写了、没接进真链路 ⇒ 站里留着一枚没人用的数）。
   卡面给两条路：(A) 加这一关并把零载体的点名进在册例外表、例外条目写明它是哪张卡的活；(B) 不加尺子、
   只在规范里写死"零载体，载体在 C4，C4 若不改这枚必须撤"。**选 A**，实测理由：先把在册 20 枚唯一令牌
   逐枚数了消费者（抹注释后找 `var(--令牌` 后面紧跟 `,` 或 `)` 的出现次数——只认 `var(` 打头会漏掉
   `var(--x, 兜底)` 那种带 fallback 的写法，也会把 `var(--xy)` 读成 `var(--x)`，所以两枚分隔符都要认），
   **每一枚都至少有一处消费者**，最薄的是 `--straw`（home.css 1 处）与 `--ink-visited`（mistwood.css 1 处），
   所以这一关不会误伤任何在册令牌，唯一落进例外表的就是 C1 自己那一枚。
   三条牙，缺一条这关就会长成"跑了但什么都管不到"：
   ① 零消费又不在例外表 ⇒ 红（防"加了令牌忘了它没人用"）；
   ② 例外表里躺着一枚**其实有消费者**的 ⇒ 也红（防例外表变成长期免检的黑名单，C4 落地之后这一格必须销账）；
   ③ 例外表的枚数与 `EXC_REGISTERED` 那枚登记值对不上 ⇒ 红（"三处同源"在这一关的形态：规范句子 / 字面量 / 表）。
   ⚠️ **C4（`v4/surface`，2026-10-01）开始还这一格欠的账**：`--moss-solid` 当时被 `home.css` 的
   `.hero-cta{background:var(--moss-solid)}` 吃到（二轮 §4.1 那枚主按钮，本卡第一档；第二枚载体在同卡的
   第二档——二轮 §6.1 那块页脚地面，落点在 `base.css:582`），零消费掉到 0 ⇒ 牙②当场要求销账，
   于是例外表清空、登记值改 `0`。⚠️ **2026-10-02（规范 §2.6）主行动退成玻璃胶囊**，`home.css` 那一处消费者
   没了 ⇒ 今天这一枚只剩**一处**载体（页脚那块地面），仍然 ≥1 ⇒ 这一关照旧绿、例外表照旧空。
   **这一张表现在是空的，但这一关不是空转**：三条牙照旧逐条跑，
   而防空转的两枚闸还在——`uniq`（BASE_SET 那 20 枚）非空是结构性事实，任何一枚在册令牌一旦丢了消费者就
   必须出现在 `zero` 里并被"① 零消费又不在例外表 ⇒ 红"点名。⚠️ 别把这张空表读成这一关作废了：
   它管的是**下一枚**冒出来的零载体令牌（C1 那条"零载体不许长期在场"的出口），表空＝今天没有欠账，
   不是没有牙。真要重新启用这张表（比如将来又落一枚无消费者的令牌），`EXC_REGISTERED` 那枚字面量与
   规范 §2.4「C1 色板加深」第五段、§17 那一格、`docs/部署与复现.md` §4 的 ③ 那一行是**同一句话的四处**，
   动一处必红另三处。 */
const CONSUMED_EXCEPTIONS = {};
const EXC_REGISTERED = 0;
let useDrift = 0;
{
  const uniq = [...new Set(Object.values(BASE_SET).flat())];
  const bodies = ALL_SHEETS.filter(f => existsSync(f))
    .map(f => ({ file: f.split(/[\\/]/).pop(), src: readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')) }));
  const consumers = name => bodies.map(b => {
    let n = 0, i = 0; const key = 'var(' + name;
    while ((i = b.src.indexOf(key, i)) >= 0){ const c = b.src[i + key.length]; if (c === ')' || c === ',') n++; i += key.length; }
    return n ? `${b.file} ${n}` : null;
  }).filter(Boolean);
  const zero = [], rows = [];
  for (const name of uniq){
    const hits = consumers(name);
    if (!hits.length) zero.push(name);
    rows.push(`    ${name.padEnd(17)}${hits.length ? '消费 ' + hits.join(' / ') : '零消费 ⇒ 例外表：' + (CONSUMED_EXCEPTIONS[name] || '✗ 没登记')}`);
  }
  for (const name of zero) if (!(name in CONSUMED_EXCEPTIONS)){
    useDrift++;
    console.log(`  ✗ ${name} 在 ${bodies.length} 份样式表里被声明进基础板、却没有一处 var() 消费它，也不在例外表里 —— "声明而不消费"没人管（参照站那个形状）`);
  }
  for (const name of Object.keys(CONSUMED_EXCEPTIONS)) if (!zero.includes(name)){
    useDrift++;
    console.log(`  ✗ 例外表里还挂着 ${name}，但它今天已经有消费者了 —— 例外要销账，不然这张表会变成长期免检的黑名单`);
  }
  if (Object.keys(CONSUMED_EXCEPTIONS).length !== EXC_REGISTERED){
    useDrift++;
    console.log(`  ✗ 例外表实际 ${Object.keys(CONSUMED_EXCEPTIONS).length} 枚、登记值 ${EXC_REGISTERED} 枚 —— 这关的"三处同源"断了（规范句子 / 这一枚字面量 / 表）`);
  }
  console.log('\n=== 消费对账（每枚在册基础令牌必须被 var() 吃到 ≥1 次）===');
  console.log(`  ${useDrift ? '✗ 这一关没过' : '✓'} ${bodies.length} 份表（${bodies.map(b => b.file).join(' / ')}）里，BASE_SET 的 ${uniq.length} 枚唯一令牌有消费者 ${uniq.length - zero.length} 枚、零消费 ${zero.length} 枚（在册例外 ${Object.keys(CONSUMED_EXCEPTIONS).length} 枚，登记值 ${EXC_REGISTERED}）`);
  if (process.env.PALETTE_CONSUMER_ROWS) console.log(rows.join('\n'));
}

/* ---------- ①d 枯草金那笔配额：从"每次落形人工算一遍"改成盘上有牙（二轮 §7.2 的判词落尺） ----------
   为什么会多这一关：§2:96「枯草金，每屏至多 2 次；唯一当主角的时段是傍晚」与 §12:2182「❌ 每屏超过 2 处枯草金
   （傍晚时段除外）」这两句，到今天为止**没有任何一把尺读得到**——①c 那一关数的是"这枚令牌有没有消费者"，
   不是"一屏几枚"。于是配额一直是人工账：一轮 A2（年标记号）与人手算过一遍（规范 §13b 那一格：3 > 2 ⇒ 判不进），
   本卡（二轮 §7.2 落款）又要算一遍（详情页 1 枚 ⇒ 枚数那一维过，倒在"傍晚"那一维上）。
   两笔账算的是同一枚令牌、用的却是两份没上盘的心算 ⇒ 这一格把**可静态核的那一半**搬上机器：
     牙① 枚数对账——四份样式表里 `var(--straw)` 的消费者枚数必须等于 `STRAW_CONSUMERS_REGISTERED`（现值 1）。
          多一枚＝红（"又添一处枯草金"当天就要重新算每屏枚数，这一格把它拦成一次显式的改登记值），
          少到 0＝也红（配额尺子读不到对象就是空转；那枚令牌该按 ①c 的"零载体不许长期在场"撤掉，不是留着一句空判据）。
     牙② 闸门对账——**每一处**消费者的选择器必须同时带 `data-phase="dusk"` 与 `data-theme="light"`。
          这一条把 §2:96 那半句"唯一当主角的时段是傍晚"变成可执行形状：§2.3:235 写的落地方式是
          「Hero 斜体词换成 --straw，本屏 2 处配额里只用 1 处」，而盘上唯一在册的那处消费者正是这么gate的；
          任何"全天常亮"的枯草金都是在把傍晚之外的屏也变成它当主角，本卡判 §7.2 落款就是判在这一维上。
     牙③ 防空转（两侧格子常驻，不必改 src 就能验量具）：三枚内置 fixture——带双闸的那条必须数出 1 枚且判合格、
          不带闸的那条必须判不合格、只有傍晚一道闸的那条也必须判不合格；再加一条 `var(--moss)` 的负控制必须数出 0 枚
          （防"选择器扫到了但声明没数"那一族假绿）。
   ⚠️ 这一格管不到"同一枚元素上写两次 `var(--straw)`"算几处的语义，也管不到运行时由 JS 改色的那一种（站内今天没有）；
      它管的是**静态在册消费者的枚数与它们的闸门**——这是"每屏 ≤2"在源码这一侧唯一读得到的形状。 */
const STRAW_CONSUMERS_REGISTERED = 1;
let strawDrift = 0;
{
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  /* 逐字符扫：{ 之前那串压进栈当"当前选择器"，; 或 } 收一条声明——声明里出现 var(--straw 就归给当前选择器 */
  function strawDecls(css){
    const out = [];
    const stack = [];
    let buf = '';
    const flush = () => {
      if (/var\(--straw[,)]/.test(buf)){
        const sel = stack[stack.length - 1] || '(读不到选择器)';
        const n = (buf.match(/var\(--straw[,)]/g) || []).length;
        for (let k = 0; k < n; k++) out.push(sel);
      }
      buf = '';
    };
    for (let i = 0; i < css.length; i++){
      const c = css[i];
      if (c === '{'){ stack.push(buf.trim()); buf = ''; }
      else if (c === '}'){ flush(); stack.pop(); buf = ''; }
      else if (c === ';'){ flush(); }
      else buf += c;
    }
    return out;
  }
  const DUSK = /data-phase\s*=\s*["']?dusk\b/i, LIGHT = /data-theme\s*=\s*["']?light\b/i;
  const gated = sel => DUSK.test(sel) && LIGHT.test(sel);
  const files = ALL_SHEETS.filter(f => existsSync(f));
  const found = files.flatMap(f => strawDecls(strip(readFileSync(f, 'utf8'))).map(sel => ({ file: f.split(/[\\/]/).pop(), sel })));
  /* 牙③：三枚 fixture 先自证量具有行程——判不进这一格的数（0 枚）与合格那一档的数（1 枚）都得读得出来 */
  {
    const ok = 'html[data-phase="dusk"][data-theme="light"] .hero-title em{ color:var(--straw); }';
    const noGate = '.post-sign-mark{ color:var(--straw); }';
    const duskOnly = 'html[data-phase="dusk"] .post-sign-mark{ color:var(--straw); }';
    const none = '.post-body p{ color:var(--moss); }';
    const pairs = strawDecls(ok), misses = strawDecls(noGate), half = strawDecls(duskOnly), ctrl = strawDecls(none);
    const two = strawDecls(ok + noGate);
    if (pairs.length !== 1 || !gated(pairs[0])) strawDrift++;
    if (misses.length !== 1 || gated(misses[0])) strawDrift++;
    if (half.length !== 1 || gated(half[0])) strawDrift++;
    if (ctrl.length !== 0) strawDrift++;
    if (two.length !== 2) strawDrift++;
  }
  /* 牙①：枚数与登记值对账（0 枚也红——那把尺没东西可量就不许挂着"配额有人算"这句绿） */
  if (found.length !== STRAW_CONSUMERS_REGISTERED){
    strawDrift++;
    console.log(`  ✗ 盘上「var(--straw)」消费者 ${found.length} 枚、登记值 ${STRAW_CONSUMERS_REGISTERED} 枚 —— 枯草金的"每屏 ≤2"又要人工算了；添载体那天请连这一枚字面量与规范 §2:96／§12 那两行一起改，别只改样式表`);
  }
  /* 牙②：每一枚都必须带"傍晚 + 亮档"那道闸 */
  for (const f of found) if (!gated(f.sel)){
    strawDrift++;
    console.log(`  ✗ ${f.file} 的「${f.sel}」消费了 --straw 却没有「data-phase="dusk"」与「data-theme="light"」双闸 —— §2:96 那句"唯一当主角的时段是傍晚"在这一处失效了（它会在四个时段都亮）`);
  }
  console.log('\n=== 枯草金配额（①d：在册消费者枚数 + 每一枚的傍晚双闸）===');
  console.log(`  ${strawDrift ? '✗ 这一关没过' : '✓'} 扫了 ${files.length} 份样式表：--straw 消费者 ${found.length} 枚（登记值 ${STRAW_CONSUMERS_REGISTERED}），双闸在位 ${found.filter(f => gated(f.sel)).length} 枚${found.length ? '：' + found.map(f => `${f.file} 「${f.sel}」`).join(' / ') : ''}；三枚 fixture（双闸合格／无闸／只有傍晚）与一枚 var(--moss) 负控制各按其位`);
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
/* ④ 那一格（雾当明暗）不许另起一条合成路径：②③ 这两格算出来的每一档，在它合成完的那一刻
   就把**它自己用的那两个数**交出来存着，④ 吃的就是这两个数（不是再拿 --lit/--ground 复算一遍）。
   theme 单独传进来（label 里那串前缀给人看，给机器当键太脆）。 */
const FOG_STATES = [];
function stateLine(label, eff, effFn, coverNote, theme){
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
  FOG_STATES.push({ label, theme, eff, bgB: gB, bgT: gT });
  console.log(line + (ok && one.wok && two.wok ? '  ⇒ 全过' : ''));
}
for (const [tName, tBase, tFn] of [['light', light, lightFn], ['dark', dark, darkFn]]){
  /* ⚠️ 暗色档的**函数色板**要从基准板起算再盖暗色那份，不是只拿暗色块自己那一份：
     CSS 级联里"只在 `:root` 声明过的令牌"在夜林照样在场（`--ground` 就是这种只声明一次的派生量），
     而它内部的 `var(--lit)` 取的是**当档有效值** ⇒ 暗色档解出来的 `--ground` 自动是月雾那枚的三成。
     这一句不是给工具开后门：`--lit` 这类在暗色块里重声明过的键由 spread 顺序自然盖掉基准值。 */
  const fnBase = { ...lightFn, ...tFn };
  /* 基准档 = :root / [data-theme=dark] 自己：亮色的 day、两主题的无月之夜 */
  stateLine(`${tName} day（基准）`, { ...tBase }, { ...fnBase }, null, tName);
  for (const phase of PHASES) for (const moon of MOONS){
    /* 没点名 data-theme 的块按"亮色专用"处理——§2.3 明写暗色不随时段变色，
       所以一条裸 [data-phase] 规则套到夜林头上同样算分叉 */
    const usable = vs.filter(v => (v.attrs.theme || 'light') === tName)
                     .filter(v => (!v.attrs.phase || v.attrs.phase === phase) && (!v.attrs.moon || v.attrs.moon === moon));
    const eff = { ...tBase }, effFn = { ...fnBase }, from = [];
    for (const v of usable) for (const [k, val] of Object.entries(v.toks)){ if (eff[k] !== val) from.push(`${k}←${v.file}`); eff[k] = val; }
    for (const v of usable) for (const [k, val] of Object.entries(v.fn)){ if (effFn[k] !== val) from.push(`${k}←${v.file}`); effFn[k] = val; }
    if (!from.length) continue;                       // 这个组合一个令牌都不覆盖，不必报
    stateLine(`${tName} ${phase}${moon === 'full' ? '+满月' : ''}`, eff, effFn, from.join('、'), tName);
  }
}
console.log(`  方向光复算 ${litChecked} 档（0 档＝这盏灯没进过闸）`);
console.log(`  两层光（方向光 + 正文脚下地面光）复算 ${groundChecked} 档（0 档＝第二层光没进过闸；` +
  `${groundChecked < litChecked ? `少于方向光的 ${litChecked} 档＝有档位被第二层漏掉了` : '与方向光同档数＝两盏灯跑的是同一批档'}）`);
if (!bad2 && !drift) console.log('\n✓ 条件块达标：时段、月相、方向光与两层光的合成都没有把任何一档推下它的地板');

/* ---------- ④ 雾当明暗：`--fog` 从"氛围乘数"扩成"页面明暗旋钮"**之前**的那把尺 ---------- */
/* 为什么先造尺再谈旋钮（Routes 5 那条 fog-as-darkness 的前置；本卡零枚 src 改动）：
   ① 判据级教训在盘上是现成的：**凡跑一遍某把尺子式的验收，必须先证明那把尺子读得到被测对象，否则它是假验收**
      （§12／§16 那族，同一天还记着"rgba 漂移检查静默空转、退出码 0、长得像全绿"）。而 `--fog` 今天乘在
      `opacity:` 上（`home.css:251` 的 `calc(.75 * var(--fog))`、`mistwood.css:322/349/385/397/407/421/434/444/458`
      那族 `calc(var(--band-a) * var(--fog))`、`essay.css:111` 的 `opacity:var(--fog)`），**opacity 与合成后的
      像素本工具原理上读不到**——它认的是源文件里的色值字面量。⇒ 那枚旋钮今天真落＝没有验收。
      这一格把那一族**静态算得出的那一半**（α 覆盖层压在有效底上的对比度）搬上机器，用数字回答
      "能不能落、落在哪一档"，而不是用意见。
   ② §12 那句"三档端点当初是为了 opacity 到 1 就夹住选的"从今天起有**定量版**：α 夹到 1 之后
      "浓 1.35"与"中 1"合成出**同一页纸**（逐通道 Δ0/255，下面那一行是算出来的、不是我声明的），
      而那页纸就是目标色本身 ⇒ 压在它上面的同名前景只剩 1.00:1。
   判的这件事：一枚覆盖层以 α = `--fog` 的三档端点（`.4 / 1 / 1.35`）压在 ②③ 那两格**已经算出来的**
   十四档有效底/有效顶（基准 × 时段条件块 × 方向光 × 两层光，`FOG_STATES` 直接吃它们的合成结果，
   ⚠️ 不许另起一条合成路径），前景是那四枚在册令牌（`FLOOR` 那四枚登记值）——对比度还剩多少。
   ⚠️ 目标色点名与理由（只许**已登记的基准令牌**、零新 hex、零新 rgba、`REGISTERED = 46` 一枚没动）：
     · 亮档 `--ink` `#232B25`：这一档里在册的**最深**一枚，"明暗旋钮拧到底"就是这个终点；它同时是四枚
       在册前景之一，所以 α=1 那一档会当场把前景按成 1.00:1 ⇒ 夹住这件事**可判**而不是可声明。
     · 亮档第二枚 `--moss-solid` `#2E4331`：提案原话给的另一个候选（"面那一族"），比 `--ink` 浅 .081 个
       OKLCH L ⇒ 严格更轻的一档。两枚都判是要看**天花板差多少**，不是听一句"差不多"。
     · 暗档 `--ink` `#E3E8E0`：夜档四枚在册前景**全是纸**，能吃掉它们的方向只有"把底提亮到纸上"。
     · 暗档第二枚 `--bg-base`：压回该档自己那枚最深的底（§2.2「暗色不是反色，是重新打光」在旋钮上的对账）。
     目标色取**当档有效值**（`--bg-base` 在 `dark dusk` 是 `#0F0F06` 而不是基准那枚），与 ②③ 同一口径。
   ⚠️ 五条牙。**2026-10-03 换的是牙① 的落点，不是牙① 的读数**（理由见文件头那一格：最坏假设模型没复算面积／层序
      ＋那一族已判不可落 ⇒ 门禁红会烂成永久红、把 `npm run check` 的 `&&` 链截断在第三项）：
     牙① 破地板【只印不判】：任一 (主题 × 档 × 目标色 × 前景 × α) 组合跌破 `FLOOR` 里那一枚登记值 ⇒
          **逐组打印**（那一族读数是"为什么这一族提案不可落"的唯一盘上证据，一句都不许删），但**不计入退出码**——
          本格把覆盖层当成"整页、压在两层光之上、字之下"，而 `home.css:251` 那枚是 `160vw` 椭圆带、
          `essay.css:293/294` 那一层是 `min(.44, .44*var(--fog))` 的遮罩深度，本格没按各自几何复算过面积与层序
          （在册未验到 #1）。拿一枚没复算过的模型把作者在册多年的三枚端点评成门禁红＝冤枉，所以这一族不计入退出码。
          ⚠️ 它红的时候话也**不许**与牙⑤ 合并在同一句里：两族话、两枚计数、两行打印。
     牙② 失去靶也红：扫到 0 组读数 / 十四档没进来 / 盘上一枚 `var(--fog)` 都没有 / 某一档的在册前景读不到
          ⇒ 红（`v11h1/numtooth` 那一族口径；`litChecked` 那行"复算 N 档，N=0 就是这盏灯根本没进过闸"是它的母本）。
     牙③ 三枚端点 ⇄ 本格登记值**同源**：盘上 `--fog:` 字面量清单 ⇄ `FOG_LEVELS` ⇄ 规范那句计数。
          登记值是**独立字面量、不从盘上数出来**（照 `REGISTERED` / `EXC_REGISTERED` /
          `STRAW_CONSUMERS_REGISTERED` / `LD_REGISTERED` 那四枚的口径），谁改端点没改这里（或反过来）当场红。
     牙④ 反例常驻：`FOG_FIXTURES` 那几枚内置反例每次跑都吃一遍（照 ①d 牙③ 的形状，红进 `fogDrift`），
          `node tools/palette-check.mjs --selftest` 再单独印一张逐枚的表（照 `phase-check --selftest` 的形状：
          朝宽没力气 ⇒ 红、朝窄误红 ⇒ 红、一枚都没跑 ⇒ 红）。⚠️ `--selftest` **故意**让判据吃坏数据，
          所以它不接进 `npm run check` 的默认链（`package.json` 一枚字没改；日常链里跑的是常驻那几枚 fixture）。
     牙⑤ 单调上界【本卡新增，进退出码】：`--fog` 的最大端点**不许越过 `FOG_CEILING_REGISTERED`**（现值 1.35）。
          判的是"往上拧"这**一个动作**：今天盘上最大端点就是 1.35 ⇒ 绿；谁把它抬过 1.35（＝被否决的
          fog-as-darkness 旋钮重新上岗）⇒ 单独红，红话现算点名天花板那两枚数字与 binding 档，并写明
          "这一族不可落，要推翻先复算面积/层序、再按 --selftest 补反例"。
          ⚠️ 这枚上界**不许从 `FOG_LEVELS` 里 `Math.max` 推**（推出来＝改数组即改判据，牙跟着靶一起动）；
          它自己那四枚内置自证 fixture（照 ①d 牙③ 的形状）每跑都夹住它的可动区间：抬到 1.5 撞 B1（朝宽必须红），
          压到 1.35 以下撞盘上今天的真实读数（牙⑤ 本体红）——所以"把上界改大以便过关"这条路本身是红的。
          一枚端点都读不到时这一格**判红不判跳过**（§16：读不到被测对象的尺子从来不算绿）。 */
const FOG_LEVELS = [.4, 1, 1.35];            /* 本格的登记值：`mistwood.css:18/270/271` 那三枚字面量 */
/* ⚠️ 牙⑤ 的登记值：**一枚独立字面量**，与 `FOG_LEVELS` 两不相含——它是"上界"，不是"当前最大端点"。
   派生（`Math.max(...FOG_LEVELS)`）会把这枚牙变成靶的复读：抬端点就自动抬上界，那一族旋钮就能不改这里地过闸。
   每一跑都打印它自己（红话、绿话、摘要行三处），改动它只在 diff 里看得见；想绕过牙⑤ 就得改这一枚字面量，
   而那一步两头都有人夹着：抬到 1.5 撞 B1（"1.5 必须被判为越过"这条自证当场红），
   压到 1.35 以下撞 B3（"恰好压在上界上不许误红"）与盘上今天的真实读数（牙⑤ 本体红）。 */
const FOG_CEILING_REGISTERED = 1.35;
const FOG_TARGETS = { light: ['--ink', '--moss-solid'], dark: ['--ink', '--bg-base'] };
const FOG_STATES_REGISTERED = 14;            /* ②③ 现印的那十四档；本格吃的档数必须与它相等 */
const FOG_FIXTURES_REGISTERED = 8;
const FOG_READABLE_255 = 7;                  /* §17 那把像素尺登记过的"读得出"＝同档两帧差 ≥7/255（Δ3 读不出） */
const FOG_DECL_RE = /--fog\s*:\s*(\d*\.?\d+)/g;
const fogIsHex = v => typeof v === 'string' && HEX6.test(v);
/* 盘上 `--fog` 那三枚端点：抹注释再读（注释里那些"--fog 是乘数"之类的句子不是声明，
   数进去会把同源判据变成"永远对不上"）；`--read-fog` 那种同族名不吃（它不含 `--fog` 这个前缀串）。 */
function fogLevelsFromBoard(){
  const out = [];
  for (const f of ALL_SHEETS.filter(x => existsSync(x))){
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
    for (const m of src.matchAll(FOG_DECL_RE)){
      const prev = m.index > 0 ? src[m.index - 1] : '';
      if (/[A-Za-z0-9-]/.test(prev)) continue;
      out.push({ file: f.split(/[\\/]/).pop(), line: src.slice(0, m.index).split('\n').length, v: Number(m[1]) });
    }
  }
  return out;
}
/* 端点清单 ⇄ 登记值：两个方向都不许静默（少一枚／多一枚／改了数）*/
function fogLevelDrift(found, registered){
  const out = [];
  const f = found.map(x => x.v).sort((a, b) => a - b), r = [...registered].sort((a, b) => a - b);
  if (f.length !== r.length){
    out.push(`盘上读到 ${f.length} 枚 --fog 端点（${found.map(x => `${x.file}:${x.line} ${x.v}`).join(' / ') || '一枚都没有'}）、` +
      `本格登记值 ${r.length} 枚（${r.join(' / ')}）—— 两处不同源：改端点的人没改这里（或反过来），这格将来是那枚旋钮的验收`);
    return out;
  }
  for (let i = 0; i < r.length; i++) if (f[i] !== r[i]){
    out.push(`盘上第 ${i + 1} 枚端点是 ${f[i]}、本格登记的是 ${r[i]} —— 两处不同源（改端点没改这里＝这格评的是不存在的三档）`);
    break;
  }
  return out;
}
/* 牙⑤ 的判据本体（**纯函数**：真实读数与内置自证 fixture 吃的是同一枚判据，不许各写一份——
   ②③ 与 ④ 同一条合成路径、同一个口径，这条纪律在这把尺子上反复被罚）。
   输入一串端点读数 + 一枚**独立登记**的上界，输出：
     empty  一枚读数都拿不到（＝尺子读不到对象，调用方判红，不许退成"没有就绿"）；
     max    读到的最大端点（null＝没有）；
     over   越过上界的那几枚（判的是 `>` 不是 `>=`：上界登记的就是"合法的最大值"，
            今天盘上那枚 1.35 恰好压在上面 ⇒ 交付态必须是绿）。 */
function fogBoundCheck(reads, bound){
  const nums = reads.map(x => (typeof x === 'number' ? x : Number(x && x.v))).filter(Number.isFinite);
  return { empty: !nums.length, max: nums.length ? Math.max(...nums) : null, over: nums.filter(v => v > bound) };
}
/* 逐 α 扫一遍：给定一档（有效底/顶 + 当档令牌）与一枚目标色，返回"到这儿为止四枚地板全守住"的最大 α。
   ⚠️ 不假设单调：前景可能比目标色更浅，α 拧到底时比值会先降后升，所以取**第一个跌破那一格**之前的界。 */
function fogSweep(states, targets, levels, floorMap = FLOOR){
  const rows = [], breaches = [], bad = [], idle = [];
  const bound = new Map();
  for (const st of states){
    const fgs = [];
    for (const [k, floor] of Object.entries(floorMap)){
      if (fogIsHex(st.eff[k])) fgs.push([k, floor]);
      else bad.push(`${st.label}：在册前景 ${k} 这一档读不到（${st.eff[k] === undefined ? '板子上没有这枚' : `读回来是 ${st.eff[k]}，不是 #rrggbb`}）—— 四枚地板少一枚就是失去靶，不许静默少扫`);
    }
    for (const tk of (targets[st.theme] || [])){
      const th = st.eff[tk];
      if (!fogIsHex(th)){
        bad.push(`${st.label}：目标色 ${tk} 这一档读不到（${th === undefined ? '盘上没有这枚令牌，或它不在 BASE_SET 里' : `读回来是 ${th}，不是 #rrggbb`}）` +
          ` —— 本格只判**已登记的基准令牌**，不许新 hex、不许新 rgba、不许"读不到就当这档不用算"`);
        continue;
      }
      const [tr, tg, tb] = hexToRgb(th), tgt = [tr, tg, tb];
      const paintAt = a => ({ r: tr, g: tg, b: tb, a });
      const holds = a => {
        const bH = overHex(st.bgB, paintAt(a)), tH = overHex(st.bgT, paintAt(a));
        return fgs.every(([k, floor]) => Math.min(ratio(st.eff[k], bH), ratio(st.eff[k], tH)) >= floor);
      };
      let ceiling = 1, grid = 200;
      for (let i = 1; i <= grid; i++) if (!holds(i / grid)){ ceiling = (i - 1) / grid; break; }
      if (ceiling < 1){                                   /* 界在 0.03 这个量级上，1/200 的格子会把它读成 20% 的误差：夹逼再修一次 */
        let lo = ceiling, hi = ceiling + 1 / grid;
        for (let i = 0; i < 14; i++){ const mid = (lo + hi) / 2; if (holds(mid)) lo = mid; else hi = mid; }
        ceiling = Math.floor(lo * 1000) / 1000;
      }
      const travel = Math.max(...hexToRgb(st.bgB).map((v, i) => Math.abs(v - tgt[i])), ...hexToRgb(st.bgT).map((v, i) => Math.abs(v - tgt[i])));
      const key = `${st.theme} ${tk}`;
      const cur = bound.get(key);
      if (!cur || ceiling < cur.ceiling) bound.set(key, { ceiling, travel, state: st.label, bgB: st.bgB, bgT: st.bgT, hex: th });
      for (const lv of levels){
        const a = Math.min(lv, 1);                      /* opacity 上限：1.35 夹到 1 */
        const bH = overHex(st.bgB, paintAt(a)), tH = overHex(st.bgT, paintAt(a));
        for (const [k, floor] of fgs){
          const w = Math.min(ratio(st.eff[k], bH), ratio(st.eff[k], tH));
          const row = { theme: st.theme, state: st.label, target: tk, level: lv, alpha: a, clamped: a !== lv,
            fg: k, floor, base: bH, top: tH, w: +w.toFixed(2), pass: w >= floor, gap: +(w - floor).toFixed(2) };
          rows.push(row); if (!row.pass) breaches.push(row);
        }
      }
    }
  }
  if (!states.length) idle.push(`十四档一档都没进来（吃到的档数 ${states.length}）—— 本格复算的是空气`);
  if (!rows.length) idle.push(`扫到 0 组读数（档 ${states.length} × 目标 ${Object.values(targets).flat().length} × 前景 ${Object.keys(floorMap).length} × α ${levels.length}）` +
    `——失去靶也红（「方向光复算 N 档，0 档＝这盏灯根本没进过闸」那一行是母本），不许顶着一句"没有破地板"过关`);
  return { rows, breaches, bad, idle, bound, combos: rows.length };
}
const fogRed = s => s.breaches.length > 0 || s.bad.length > 0 || s.idle.length > 0;
/* 内置反例的**合成页**（不是盘上那十四档，读数不进盘、只当量具的行程）：两档各一枚，
   色值抄的是 base.css 在册那几枚，底是 ②③ 两层光合成后那两枚。 */
const FOG_FX = [
  { theme: 'light', label: 'fixture·亮档合成页', eff: { '--ink': '#232B25', '--moss-ink': '#384D3B', '--ink-2': '#5A675E', '--ink-visited': '#131B15', '--moss-solid': '#2E4331', '--bg-base': '#EBEDE8' }, bgB: '#EFECE1', bgT: '#F1E5CF' },
  { theme: 'dark', label: 'fixture·夜档合成页', eff: { '--ink': '#E3E8E0', '--moss-ink': '#A9C4A0', '--ink-2': '#87927F', '--ink-visited': '#CED3CB', '--bg-base': '#0B100A', '--bg-top': '#12170F' }, bgB: '#171D16', bgT: '#1D231B' },
];
const FOG_FIXTURES = [
  { id: 'F1 朝宽·把 α 抬到破地板（亮档 .4/1/1.35 压 --ink）', side: 'contra',
    /* ⚠️ 这里写**死**三枚坏 α，不吃 FOG_LEVELS：反例测的是量具有没有行程，不是测登记值。
       （v12p/W2-P 变异实测：让 F1 吃 FOG_LEVELS 之后，把端点整体收到合法缝里（.01/.015/.02）
       会把这一枚反例一起拐没——那一次红的是 fixture，不是判据，读数是混的。） */
    run: () => { const s = fogSweep([FOG_FX[0]], { light: ['--ink'] }, [.4, 1, 1.35]); return { hit: fogRed(s), note: `破地板 ${s.breaches.length} 组／读数 ${s.combos} 组` }; } },
  { id: 'F2 朝窄·同一形状只把 α 收到 .01（合法边界不许误红）', side: 'narrow',
    run: () => { const s = fogSweep([FOG_FX[0]], { light: ['--ink'] }, [.01]); const b = s.bound.get('light --ink'); return { hit: fogRed(s), note: `读数 ${s.combos} 组、天花板 ${b ? b.ceiling.toFixed(3) : '读不到'}` }; } },
  { id: 'F3 朝宽·目标色换成未登记的一枚（必须点名，不许退成"不用算"）', side: 'contra',
    run: () => { const s = fogSweep([FOG_FX[0]], { light: ['--bogus-fog-paint'] }, [.4]); return { hit: fogRed(s), note: `bad ${s.bad.length} 条、idle ${s.idle.length} 条` }; } },
  { id: 'F4 朝窄·点名的四枚目标色全在册（两档 × 两族都不许误红）', side: 'narrow',
    run: () => { const s = fogSweep(FOG_FX, { light: ['--ink', '--moss-solid'], dark: ['--ink', '--bg-base'] }, [.01]); return { hit: fogRed(s), note: `读数 ${s.combos} 组（2 页 × 2 目标 × 4 前景 × 1 α）` }; } },
  { id: 'F5 朝宽·端点少一枚 / 改一枚数（两个方向都不许静默）', side: 'contra',
    run: () => {
      const drop = fogLevelDrift([...FOG_LEVELS].slice(1).map((v, i) => ({ file: 'fixture', line: i, v })), FOG_LEVELS);
      const altered = fogLevelDrift(FOG_LEVELS.map((v, i) => ({ file: 'fixture', line: i, v: i === FOG_LEVELS.length - 1 ? v + 0.05 : v })), FOG_LEVELS);
      return { hit: drop.length > 0 && altered.length > 0, note: `少一枚→${drop.length ? '红' : '不红'}｜改数→${altered.length ? '红' : '不红'}` };
    } },
  { id: 'F6 朝窄·端点同集不同写序（不许误红）', side: 'narrow',
    /* 吃 FOG_LEVELS 自己倒序，而不是写死一枚三元组：这一枚测的是"同源判据只认集合、不认写序"，
       登记值换成别的三枚也照样该是绿的（写死的那版在 v12p 变异里误红过一次）。 */
    run: () => { const d = fogLevelDrift([...FOG_LEVELS].map((v, i) => ({ file: 'fixture', line: i, v })).reverse(), FOG_LEVELS); return { hit: d.length > 0, note: d[0] || '判为同源' }; } },
  { id: 'F7 朝宽·十四档被抽干（0 组读数也红＝失去靶）', side: 'contra',
    run: () => { const s = fogSweep([], FOG_TARGETS, FOG_LEVELS); return { hit: fogRed(s), note: `idle ${s.idle.length} 条、读数 ${s.combos} 组` }; } },
  { id: 'F8 朝宽·某一档的在册前景读不到（抽掉 --ink-2 那枚）', side: 'contra',
    run: () => { const thin = { ...FOG_FX[0], eff: { ...FOG_FX[0].eff } }; delete thin.eff['--ink-2']; const s = fogSweep([thin], { light: ['--ink'] }, [.4]); return { hit: fogRed(s), note: `bad ${s.bad.length} 条、读数 ${s.combos} 组（少一枚靶，比 F2 的 4 组少）` }; } },
];
let fogDrift = 0, fogFixFailed = 0, fogFixRan = 0;
/* 三枚计数各管各的，**不许合并**（2026-10-03 换落点留下的形状）：
     fogDrift        进退出码：失去靶（牙②）／端点不同源（牙③）／反例没红在该红的位置（牙④）
     fogFloorPrinted 不进退出码：牙① 那族最坏假设破地板读数——只印不判，这里只数印了几格
     fogCeilDrift    进退出码：牙⑤ 单调上界（含它自己那四枚自证 fixture 没行程）
   把后两族并成一句"雾当明暗没过"是这一格最容易犯的错：那样一来"抬上界"与"最坏模型读数破地板"
   会红在同一行里，而前者是**要拦的动作**、后者是**没复算几何的模型的既成事实**。 */
let fogCeilDrift = 0, fogFloorPrinted = 0;
{
  const fogFound = fogLevelsFromBoard();
  const fog = fogSweep(FOG_STATES, FOG_TARGETS, FOG_LEVELS);
  const fogBody = ALL_SHEETS.filter(f => existsSync(f)).map(f => ({ file: f.split(/[\\/]/).pop(), src: readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')) }));
  const fogByFile = fogBody.map(b => {
    let n = 0, i = 0; const key = 'var(--fog';
    while ((i = b.src.indexOf(key, i)) >= 0){ const c = b.src[i + key.length]; if (c === ')' || c === ',') n++; i += key.length; }
    return { file: b.file, n };
  }).filter(x => x.n);
  const fogTotal = fogByFile.reduce((s, x) => s + x.n, 0);
  console.log('\n=== ④ 雾当明暗（`--fog` 三档端点当覆盖层 α，压在 ②③ 那十四档有效底/顶上复算四枚在册地板）===');
  console.log(`    落点（2026-10-03 换过一次，读数一字不删）：牙① 那族破地板是**最坏假设模型**的读数 ⇒ 只印不判；进退出码的四枚是牙② 失去靶／牙③ 端点同源／牙④ 常驻反例／牙⑤ 单调上界（--fog 最大端点 ≤ 登记上界 ${FOG_CEILING_REGISTERED}）`);
  console.log('  目标色（点名，全是已登记基准令牌、零新色）：亮档 --ink（压暗，这档在册最深）＋ --moss-solid（提案给的"面"那一族）／' +
    '暗档 --ink（提亮，夜档四枚前景全是纸）＋ --bg-base（压回该档自己最深的底）');
  for (const m of fog.idle){ fogDrift++; console.log(`  ✗ ${m}`); }
  for (const m of fog.bad){ fogDrift++; console.log(`  ✗ ${m}`); }
  for (const m of fogLevelDrift(fogFound, FOG_LEVELS)){ fogDrift++; console.log(`  ✗ ${m}`); }
  if (!fogTotal){ fogDrift++; console.log('  ✗ 盘上一处 var(--fog) 都没有 —— 这枚乘数根本没在场，本格评的是不存在的旋钮'); }
  if (FOG_STATES.length !== litChecked || litChecked !== groundChecked){
    fogDrift++;
    console.log(`  ✗ 本格吃到 ${FOG_STATES.length} 档，②③ 现印的是方向光 ${litChecked} 档／两层光 ${groundChecked} 档 —— 合成路径与本格不同源了（不许少拿一档去算雾）`);
  }
  if (FOG_STATES.length !== FOG_STATES_REGISTERED){
    fogDrift++;
    console.log(`  ✗ 本格吃到 ${FOG_STATES.length} 档、登记值 ${FOG_STATES_REGISTERED} 档 —— 时段/月相条件块动过而这里没跟着登记（三处同源在这一格的形态）`);
  }
  /* 牙④：反例常驻，任何一次跑都吃一遍；红在"反例没力气"或"朝窄误红"那两件事上，不红在盘上 */
  const fogFixRows = [];
  for (const fx of FOG_FIXTURES){
    let r = null, err = null;
    try { r = fx.run(); } catch (e){ err = e; }
    const ran = !!r && typeof r.hit === 'boolean';
    const wantRed = fx.side === 'contra';
    const good = ran && r.hit === wantRed;
    if (good) fogFixRan++; else fogFixFailed++;
    fogFixRows.push(`    ${good ? '✓' : '✗'} ${fx.id}（朝${wantRed ? '宽：必须红' : '窄：不许误红'}）→ ${err ? '抛了 ' + err.message : (ran ? (r.hit ? '红' : '不红') : '没跑出读数') + '｜' + (r && r.note ? r.note : '')}`);
  }
  if (fogFixFailed) { fogDrift += fogFixFailed; console.log(fogFixRows.filter(x => x.startsWith('    ✗')).join('\n')); }
  if (fogFixRan + fogFixFailed !== FOG_FIXTURES_REGISTERED || fogFixRan !== FOG_FIXTURES_REGISTERED){
    fogDrift++;
    console.log(`  ✗ 反例跑了 ${fogFixRan} 枚、清单登记 ${FOG_FIXTURES_REGISTERED} 枚（另有 ${fogFixFailed} 枚没在期望的位置红）—— id 齐不代表牙齐，删掉一枚反例这里就看得见`);
  }
  /* 牙①【只印不判】：逐 (主题 × 目标色 × 登记端点) 报最紧那一格；完整读数在 PALETTE_FOG_ROWS=1 时逐枚印。
     ⚠️ 这一族**不计入 fogDrift**（2026-10-03 换的就是这一枚落点）：它是"最坏假设模型"的读数——本格把覆盖层
        当成整页、压在两层光之上、字之下，而真实载体不是那个形状（`home.css:251` 那枚是 `160vw` 的椭圆带、
        `essay.css:293/294` 那一层是 `min(.44, .44*var(--fog))` 的遮罩深度），本格**没按各自几何复算过面积与层序**
        （在册未验到 #1）。拿一枚没复算过的模型去把作者在册多年的三枚端点评成门禁红是冤枉；
        但删掉它就是删掉"那一族为什么不可落"的唯一盘上证据——所以：逐格照印，只把身份从"门禁红"改成"读数"。
        打印里的每一个数字（含 `地板破了 … ✗ 差 X`）都来自 `fog.rows` 现算，没有一处写死。 */
  const worst = new Map();
  for (const r of fog.rows){
    const key = `${r.theme} ${r.target} 端点${r.level}`;
    const cur = worst.get(key);
    if (!cur || r.w - r.floor < cur.w - cur.floor) worst.set(key, r);
  }
  console.log('  牙① 逐档读数（身份是读数，不计入退出码）：这一族吃的是"整页最坏假设"的覆盖层模型，' +
    '未按各载体的真实几何复算面积与层序 ⇒ 只印不判；它有多少格破了地板都不构成"那一族能落"的证据，' +
    '能不能落由下面的天花板与牙⑤ 说话');
  for (const [, r] of worst){
    if (!r.pass) fogFloorPrinted++;
    console.log(`  读数 ${r.pass ? '地板守住' : '地板破了'} ${r.theme} 目标 ${r.target} α=${r.alpha}${r.clamped ? `（登记端点 ${r.level} 被 opacity 上限夹到 1）` : ''}：底 ${r.base} 顶 ${r.top} → 最紧 ${r.fg} ${r.w.toFixed(2)}:1（地板 ${r.floor}）${r.pass ? '✓' : `✗ 差 ${(r.floor - r.w).toFixed(2)}`}｜档 ${r.state}`);
  }
  console.log(`  逐档逐个 (主题 × 档 × 目标色 × 前景 × α) 全表：扫 ${fog.combos} 组读数、破地板 ${fog.breaches.length} 组（牙① 那一族的读数，只印不判、不计入退出码）${fog.breaches.length ? '：' : ''}`);
  if (process.env.PALETTE_FOG_ROWS) console.log(fog.rows.map(r => `    ${r.pass ? 'ok' : 'BAD'} ${r.theme}｜${r.state}｜目标 ${r.target}｜α ${r.alpha}｜${r.fg} ${r.w.toFixed(2)} vs 地板 ${r.floor}｜底 ${r.base} 顶 ${r.top}`).join('\n'));
  for (const b of fog.breaches.slice(0, 12)) console.log(`    读数 ${b.theme} ${b.state} 目标 ${b.target} α=${b.alpha} ${b.fg} ${b.w.toFixed(2)} < ${b.floor}（差 ${(b.floor - b.w).toFixed(2)}）`);
  if (fog.breaches.length > 12) console.log(`    …破地板共 ${fog.breaches.length} 组，全表用 PALETTE_FOG_ROWS=1 node tools/palette-check.mjs 逐枚印`);
  /* 夹住这件事（§12 那句"三档端点当初是为了 opacity 到 1 就夹住选的"的定量版）：
     认的是**登记端点里 ≥1 的那几枚**，不是写死 1 与 1.35——端点换了数这句话就该跟着换形状。 */
  const clampGe = [...new Set(FOG_LEVELS.filter(l => l >= 1))].sort((a, b) => a - b);
  let clampPairs = 0;
  if (clampGe.length >= 2){
    for (const r of fog.rows.filter(x => x.level === clampGe[0])){
      const twin = fog.rows.find(x => x.theme === r.theme && x.state === r.state && x.target === r.target && x.fg === r.fg && x.level === clampGe[1]);
      if (twin && twin.base === r.base && twin.top === r.top && twin.w === r.w) clampPairs++;
    }
  }
  const deepSame = fog.rows.filter(r => r.alpha === 1 && r.fg === r.target);
  console.log(clampGe.length >= 2
    ? `  夹住这件事：端点 ${clampGe.join(' 与 ')} 都被 opacity 上限夹成同一个 α=1 ⇒ ${clampPairs} 组合成结果逐字符同页（底与顶都变成目标色本身，` +
      `${deepSame.length ? `同名前景那 ${deepSame.length} 格读回 ${Math.min(...deepSame.map(r => r.w)).toFixed(2)}:1——字与底同色` : '这一轮没有同名前景格'}）` +
      `——"浓"这一端不是"更浓"，是**整面涂成目标色**`
    : `  夹住这件事：登记的端点里没有两枚 ≥1（≥1 的那几枚：${clampGe.join(' / ') || '无'}）⇒ 这一轮没有"夹成同一页"的对可读；` +
      `把任一枚抬到 ≥1，它就和 1 同页（F1 那枚反例常驻跑的就是这一维）`);
  /* 天花板 + "读得出三档"的那条式子：a3 ≤ 天花板 且 相邻两档的通道位移 ≥ ${FOG_READABLE_255}/255 */
  const joint = [];
  for (const [key, b] of fog.bound){
    const step = b.travel ? FOG_READABLE_255 / b.travel : Infinity;
    const need = 2 * step;
    if (key === 'light --ink' || key === 'dark --ink') joint.push({ key, ceiling: b.ceiling, step });
    console.log(`  天花板 ${key.padEnd(20)} α ≤ ${b.ceiling.toFixed(3)}（binding 档 ${b.state}，底 ${b.bgB} 顶 ${b.bgT}、目标 ${b.hex}）` +
      `｜拧到上界整页只位移 ${(b.ceiling * b.travel).toFixed(1)}/255（§17 那把像素尺：Δ3 读不出、Δ7 读得出）` +
      `｜读出相邻两档差别需 Δα ≥ ${step.toFixed(3)}（最大通道行程 ${b.travel}/255）` +
      `⇒ 三档（含"不涂"那一端）要 ${need.toFixed(3)} 宽：${b.ceiling >= need ? '存在，但只剩这条缝' : '不存在'}`);
  }
  if (joint.length === 2){
    const ceiling = Math.min(...joint.map(j => j.ceiling)), step = Math.max(...joint.map(j => j.step));
    const times = FOG_LEVELS.map(l => (l / ceiling).toFixed(1)).join('× / ') + '×';
    console.log(`  合用一枚旋钮（--fog 不分主题）⇒ 天花板取交集 α ≤ ${ceiling.toFixed(3)}、` +
      `步进取并集 Δα ≥ ${(2 * step).toFixed(3)}（两档 × 点名目标里最紧的那条）｜登记的三枚端点 ${FOG_LEVELS.join(' / ')} 分别是这个上界的 ${times}，` +
      `${clampGe.length >= 2 ? '而 ≥1 的那几枚被夹住之后是同一个 α ⇒ ' : '（这一轮没有两枚端点同时撞上限）⇒ '}${ceiling >= 2 * step ? '数学上还剩一条缝（整条行程只有 ' + ceiling.toFixed(3) + '，且必须重选端点）' : '端点不存在'}`);
  }
  /* ---------- 牙⑤ 单调上界【本卡新增，进退出码】：`--fog` 的最大端点不许越过登记上界 ----------
     这一枚判的是"往上拧"这**一个动作**本身，与上面牙① 那族破地板读数是两件事：读数那一族今天只印不判
     （最坏假设模型没复算面积/层序），这一族是活的门禁。⚠️ 两族话**分开红、分开打印、绝不合并成一句**：
     今天盘上最浓那枚端点恰好就是上界 ⇒ 牙① 一堆读数 + 牙⑤ 绿 ⇒ rc=0；将来谁把端点抬过那一枚登记上界 ⇒ 只有牙⑤ 红。
     四枚自证 fixture 照 ①d 牙③ 的形状（量具先自证有行程），**不占** FOG_FIXTURES 那 8 枚的登记值；
     B1 顺带夹住"把上界登记值抬大以便过关"这条路——它要求 1.5 必须被判为越过，上界一旦抬到 ≥1.5 就当场红。 */
  const fogJointCeiling = joint.length ? Math.min(...joint.map(j => j.ceiling)) : null;
  const fogJointNeed = joint.length ? 2 * Math.max(...joint.map(j => j.step)) : null;
  const ceilNamed = ['light --ink', 'dark --ink'].map(k => {
    const b = fog.bound.get(k);
    return b ? `${k} α ≤ ${b.ceiling.toFixed(3)}（binding 档 ${b.state}）` : `${k} 这一轮读不到天花板（点名目标没进闸）`;
  }).join('／');
  const fogBoardBnd = fogBoundCheck(fogFound.map(x => x.v), FOG_CEILING_REGISTERED);
  const fogRegBnd = fogBoundCheck(FOG_LEVELS, FOG_CEILING_REGISTERED);
  const fogBnd = fogBoundCheck([...fogFound.map(x => x.v), ...FOG_LEVELS], FOG_CEILING_REGISTERED);
  const fogBndFix = [
    { id: 'B1 朝宽·最大端点 1.5 必须判为越过上界（这一枚同时夹住"抬上界过关"）', want: true, got: fogBoundCheck([.4, 1, 1.5], FOG_CEILING_REGISTERED).over.length > 0 },
    { id: 'B2 朝窄·端点整族收到 .3/.8/1.1 不许误红（合法往下调是作者的权利）', want: false, got: fogBoundCheck([.3, .8, 1.1], FOG_CEILING_REGISTERED).over.length > 0 },
    { id: 'B3 朝窄·端点恰好压在上界上不许误红（判 > 不判 >=，交付态那一枚就靠这一条绿着）', want: false, got: fogBoundCheck([.4, 1, 1.35], FOG_CEILING_REGISTERED).over.length > 0 },
    { id: 'B4 朝宽·一枚端点都读不到必须算失去靶（不许退成"没有就绿"、也不许当条件跳过）', want: true, got: fogBoundCheck([], FOG_CEILING_REGISTERED).empty },
  ];
  for (const f of fogBndFix) if (f.got !== f.want){
    fogCeilDrift++;
    console.log(`  ✗ 牙⑤ 的自证 fixture「${f.id}」没落在期望的一侧（读到 ${f.got ? '越过/失去靶' : '没越过'}、期望 ${f.want ? '越过/失去靶' : '没越过'}）—— 这枚上界牙此刻没有行程`);
  }
  const fogBndFixOk = fogBndFix.filter(f => f.got === f.want).length;
  if (fogBnd.empty){
    fogCeilDrift++;
    console.log(`  ✗ 牙⑤ 单调上界失去被测对象：盘上读到 ${fogFound.length} 枚 --fog 端点、本格登记 ${FOG_LEVELS.length} 枚，两头的数都拿不到 ⇒ 无从判"越没越过上界 ${FOG_CEILING_REGISTERED}"` +
      `——按 §16"读不到被测对象的尺子从来不算绿"判红，这不是条件跳过（跳过就是零牙的绿灯）`);
  } else if (fogBnd.over.length){
    fogCeilDrift++;
    const where = [];
    for (const x of fogFound) if (x.v > FOG_CEILING_REGISTERED) where.push(`盘上 ${x.file}:${x.line} 那枚是 ${x.v}`);
    for (let i = 0; i < FOG_LEVELS.length; i++) if (FOG_LEVELS[i] > FOG_CEILING_REGISTERED) where.push(`本格 FOG_LEVELS[${i}] 登的是 ${FOG_LEVELS[i]}`);
    console.log(`  ✗ 牙⑤ 单调上界（独立红名）：--fog 最大端点读回 ${fogBnd.max}，越过本格登记的上界 ${FOG_CEILING_REGISTERED}` +
      `（上界是独立字面量、不从 FOG_LEVELS 推）—— 越过的那几枚：${where.join(' / ')}`);
    console.log(`      这一枚拦的就是**这一个动作**：把雾往"更浓＝更暗"那一侧推＝Routes 5 那枚 fog-as-darkness 旋钮重新上岗。` +
      `本格判"越过上界"这件事本身，与上面那 ${fog.breaches.length} 组破地板读数是两族话（那些只印不判，这一枚进退出码），两句话不许合成一句。`);
    console.log(`      为什么这一族的结论是不可落（数字全是这一轮现算的，不是抄在源码里的）：②③ 那 ${FOG_STATES.length} 档有效底/顶上的天花板是 ${ceilNamed}；` +
      `合用一枚不分主题的旋钮 ⇒ 天花板取交集 α ≤ ${fogJointCeiling === null ? '读不到' : fogJointCeiling.toFixed(3)}，` +
      `而三档要读出相邻两档的差别共需 Δα ≥ ${fogJointNeed === null ? '读不到' : fogJointNeed.toFixed(3)}（本仓那把像素尺：同档两帧差 ≥${FOG_READABLE_255}/255 才算读得出），` +
      `${fogJointCeiling === null ? '这一轮连有没有缝都读不出' : (fogJointCeiling >= fogJointNeed ? '数学上还剩一条缝，但三枚端点必须整体重选' : '这条缝不存在——既保住 7:1 又能读出三档的端点不存在')}。`);
    console.log(`      要推翻"不可落"这一句，顺序不许倒：① 先按真实几何复算每一枚载体的**面积与层序**（本格吃的是"整页、压在两层光之上、字之下"的最坏假设，` +
      `而盘上的形状是椭圆带与遮罩深度）；② 照 --selftest 的形状给复算之后的新结论补上反例（朝宽必须红、朝窄不许误红）；` +
      `③ 才动 FOG_CEILING_REGISTERED 这一枚 ${FOG_CEILING_REGISTERED}。只把它抬大是绕过判据（而且会先撞 B1 那枚自证），不是推翻判据。`);
  } else {
    const aboveTxt = fogJointCeiling === null
      ? `这一轮读不到天花板（点名目标没进闸），所以"端点在天花板之上"这一句本格说不出`
      : `登记的三枚端点 ${FOG_LEVELS.join(' / ')} 里有 ${FOG_LEVELS.filter(l => l > fogJointCeiling).length} 枚在天花板 α ≤ ${fogJointCeiling.toFixed(3)} 之上（现算 binding ${ceilNamed}）⇒ 三档端点在天花板之上，这一族既保住地板又能读出三档的端点不存在`;
    const atBound = fogBnd.max === FOG_CEILING_REGISTERED;
    const slackTxt = atBound
      ? '今天最浓那枚端点**恰好就是**这枚上界 ⇒ 绿；再往上拧一格就撞它'
      : `今天最浓那枚端点还在上界之下（离上界还差 ${(FOG_CEILING_REGISTERED - fogBnd.max).toFixed(3)}）⇒ 绿；这一格只管"不许越过"，朝窄怎么调都不拦`;
    console.log(`  ✓ 牙⑤ 单调上界：--fog 最大端点 ${fogBnd.max}（盘上最大 ${fogBoardBnd.max === null ? '一枚都没读到' : fogBoardBnd.max}／本格 FOG_LEVELS 最大 ${fogRegBnd.max === null ? '一枚都没读到' : fogRegBnd.max}）未越过登记上界 ${FOG_CEILING_REGISTERED}` +
      `（独立字面量、不从 FOG_LEVELS 里 Math.max 推）——${slackTxt}。` +
      `自证 fixture ${fogBndFixOk}/${fogBndFix.length} 枚各在其位。⚠️ 这枚牙绿**不等于**那一族能落：${aboveTxt}；那些读数在上面牙① 那一族里照印、只印不判。`);
  }
  console.log(`  盘上端点 ${fogFound.map(x => `${x.file}:${x.line} ${x.v}`).join(' / ')} ⇄ 本格登记值 ${FOG_LEVELS.join(' / ')}（${fogLevelDrift(fogFound, FOG_LEVELS).length ? '✗ 不同源' : '同源'}）；` +
    `var(--fog) 消费者 ${fogTotal} 枚（${fogByFile.map(x => `${x.file} ${x.n}`).join(' / ')}）—— 它今天乘在 opacity 上，这就是"已经是响度那一族"的现形`);
  console.log(`  ${fogDrift + fogCeilDrift ? '✗' : '✓'} ④ 这一关（两族计数分开：${fogDrift} 处进门禁的牙②③④／${fogCeilDrift} 处进门禁的牙⑤ 单调上界；牙① 那族破地板读数只印不判）：` +
    `${fogFixRan}/${FOG_FIXTURES_REGISTERED} 枚反例各红在该红的位置、${fog.combos} 组读数、` +
    `破地板 ${fog.breaches.length} 组（牙① 只印不判，逐档那一格里 ${fogFloorPrinted} 格是破的）、` +
    `端点同源 ${fogLevelDrift(fogFound, FOG_LEVELS).length ? '✗ 断了' : '✓'}、` +
    `上界牙 ${fogCeilDrift ? `✗ ${fogCeilDrift} 处（最大端点 ${fogBnd.empty ? '读不到' : fogBnd.max} vs 登记上界 ${FOG_CEILING_REGISTERED}）` : `✓ 最大端点 ${fogBnd.max} ≤ 登记上界 ${FOG_CEILING_REGISTERED}`}、` +
    `失去靶 ${fog.idle.length + fog.bad.length ? `✗ ${fog.idle.length + fog.bad.length} 条` : `✓ ${FOG_STATES.length} 档 × ${Object.keys(FLOOR).length} 枚在册前景全读得到`}、` +
    `牙⑤ 自证 ${fogBndFixOk}/${fogBndFix.length} 枚在其位`);
  if (SELFTEST){
    console.log('\n=== ④ 反例清单（--selftest：朝宽必须红、朝窄不许误红；它故意吃坏数据，所以不接进 npm run check 的默认链）===');
    console.log(fogFixRows.join('\n'));
    console.log(`  ${fogFixFailed ? `✗ ${fogFixFailed} 枚反例没在期望的位置红` : `✓ ${fogFixRan} 枚反例全部落在期望的一侧（登记值 ${FOG_FIXTURES_REGISTERED} 枚）`}`);
    /* 牙⑤ 那四枚自证 fixture 也逐枚印一遍（它们不在 FOG_FIXTURES 那 8 枚的登记值里，各自管各自的） */
    console.log('\n=== ④ 牙⑤ 单调上界的自证 fixture（登记上界 ' + FOG_CEILING_REGISTERED + '，与上面那 ' + FOG_FIXTURES_REGISTERED + ' 枚常驻反例分账）===');
    for (const f of fogBndFix) console.log(`    ${f.got === f.want ? '✓' : '✗'} ${f.id}（期望 ${f.want ? '判为越过/失去靶' : '判为没越过'}）→ ${f.got ? '判为越过/失去靶' : '判为没越过'}`);
    console.log(`  ${fogCeilDrift ? `✗ ${fogCeilDrift} 处牙⑤ 没过（上界本体或它的自证）` : `✓ 牙⑤ ${fogBndFix.length} 枚自证各在其位，盘上最大端点 ${fogBnd.max} 未越过登记上界 ${FOG_CEILING_REGISTERED}`}`);
    process.exit(fogFixFailed || fogCeilDrift ? 1 : 0);
  }
}

if (bad || bad2 || drift || ldDrift || useDrift || strawDrift || fogDrift || fogCeilDrift){ console.log(`\n✗ ${bad} 个基础令牌、${bad2} 处时段/月相/方向光读数、${drift} 处"色板有两处真值"跌破登记值、${ldDrift} 处成对声明/退路镜像没过对账、${useDrift} 处消费对账没过（零消费又没登记，或例外表没销账）、${strawDrift} 处枯草金配额没过（在册消费者枚数对不上，或某处消费者没带"傍晚 + 亮档"那道闸）、${fogDrift} 处「雾当明暗」的牙②③④没过（某一档的在册前景读不到／扫到 0 组失去靶／盘上 --fog 端点与本格登记值不同源／反例没红在该红的位置）、${fogCeilDrift} 处「雾当明暗」的牙⑤ 单调上界没过（--fog 最大端点越过登记上界 ${FOG_CEILING_REGISTERED}＝把雾往"更浓＝更暗"那一侧推，那一族已判不可落；或这枚牙自己的四枚自证 fixture 没了行程）`); process.exit(1); }
console.log('\n✓ 色板达标：正文级 ≥7、次要 ≥4.5 全部守住');
