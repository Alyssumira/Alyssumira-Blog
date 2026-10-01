/* lifegrid-check.mjs —— "一生格子"的门禁（`card/lifegrid`；接进 `npm run gate`，位置在 feed-check 之后、
   search-check 之前——它是**读产物的**判据，所以不许塞进 `npm run check` 那条链：干净检出上 dist 还不存在，
   放在 build 之前就会假红（§16 签过的那一条）。
   用法  node tools/lifegrid-check.mjs

   ── 它钉住的事 ────────────────────────────────────────────────────────────────
   ① **数据缺位 ⇒ 一格都不许出现**：`src/data/site.js` 的 `BIRTH_DATE` 没登记（今天就是这档）时，
      `dist/about/index.html` 里格子枚数必须是 0，且那句"还没有可用的出生日"必须当众在场；
      反过来登记了 ⇒ 同一格改判"产物里的枚数必须等于复算值"（这一格不会因为是空态就跳过）。
   ② **数据到位 ⇒ 逐枚对账**：内置 fixture 造一份**临时产物**（写在 `.scratch/` 里，已 gitignore），
      格子枚数逐枚等于由「出生日 ＋ 构建日」两枚输入**独立复算**出来的数——闰年、年初、年末三种边界各点一次。
      独立复算＝本工具自带一枚 `daysFromCivil`（Hinnant 那套公历日化整），**不 import** `lifegrid.js` 里的日序算法：
      两边共用同一枚日序就分叉不出错，正是 §16 记过的"两边各自赦免同一个错"的反面做法。
   ③ **绊线**：输入字段改名／多写一格／少写一格 ⇒ 这一格当场红（今天仓库里那些都是好的，所以这里是绿的；
      红是拿**合成坏样本**喂同一枚对账器验出来的，不是"看起来会红"）。
   ④ **同源性**：页面必须还在吃那一份共用渲染器（`lifeFieldHtml`）与那一枚 `f.now`；
      `siteFacts` 必须还在把同一枚 `now` 交回来。前提哪天没了，① ② 就成了假真值——这一格红了就去改判据来源，别删格。

   ── 两侧都有格子（口径照 media-check ① 那一格）────────────────────────────────
   朝宽：②③ 在 fixture 上真的收到过格子（枚数打得出来），扭坏形状必红。
   朝窄：① 今天的 0 枚必须**由 fixture 兜住**才敢说是绿——同一枚收集器在 fixture 样本上必须收到 N 枚（N>0），
        否则"产物里 0 枚"分不开"真没画"与"收集器坏了"。① 末尾把这句话当众打印出来。
   ⚠️ 这枚绿不代表格子已经上过屏：今天这一片格子从未在真实 dist 里出现过（载体还没有，§12 那一族），
      验到的是**同一份渲染器在 fixture 输入下产出的临时产物**。真日期到位那天，① 那一半才第一次量到真页面。

   ── 不碰的 ────────────────────────────────────────────────────────────────────
   · 仓库里那三篇稿件一个字节不改；`src/data/site.js` 里不写任何假日期（fixture 只在内存与 `.scratch/` 里）。
   · 不动 `tools/search-check.mjs` / `tools/runtime-check.mjs` 的浏览器候选段。
   · 不判版式好不好看：色板/圆角/模糊/时长档的账在 palette-check / gap-check 那里，本卡一枚都不新立。
*/
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import { parseBirth, lifeField, lifeFieldHtml, WEEKS_PER_ROW } from '../src/lib/lifegrid.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SCRATCH = join(ROOT, '.scratch', 'lifegrid-fixture');
const CELL_ATTR = 'class="life-cell"';
let asserted = 0;                       /* 每格自己上报跑了几条断言；0 ⇒ 这一格在空转（口径照 media-check） */
const problems = [];
const notes = [];
function cell(id, label, fn){
  let n = 0, threw = null;
  try { n = fn() || 0; }
  catch (e){ threw = e; }
  if (threw){ problems.push(`${id} ${label}：${threw && threw.message ? threw.message : threw}`); return; }
  if (!n){ problems.push(`${id} ${label}：asserted=0（这一格一个断言都没跑就交了白卷）`); return; }
  asserted += n;
  notes.push(`${id} ${label}：${n} 条断言 ✓`);
}

/* ---------- 收集器：从 HTML 串里数格子（① ② ③ 共用这一枚，所以 fixture 验过它就等于验过真产物那一路） ---------- */
const cellsOf = html => [...String(html).matchAll(/<span class="life-cell" data-week="(\d+)">/g)].map(m => Number(m[1]));
const rowsOf = html => [...String(html).matchAll(/<div class="life-year" data-life-year="(\d+)">/g)].map(m => Number(m[1]));
const hasGridBox = html => /<div class="life-grid"/.test(String(html));

/* ---------- 独立复算：公历日 → 日序（Howard Hinnant 的 days_from_civil，本工具自己写的整数账） ----------
   ⚠️ 故意不用 `Date.UTC(...)/86400000`——那正是 `src/lib/lifegrid.js` 里用的那一枚；
      两边各算一遍才有得对。对上了说明"两枚输入 ⇒ 一枚数"这件事真的成立，对不上就是尺子该红的时候。 */
function daysFromCivil(y, m, d){
  let yy = y - (m <= 2 ? 1 : 0);
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;                                   /* [0, 399] */
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;  /* [0, 365] */
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;/* [0, 146096] */
  return era * 146097 + doe - 719468;
}
/* 由两枚输入算出该画的东西：格数、行数、末行格数。纯整数，没有日历常量。 */
function expectOf(birth, on){     /* birth / on 都是 { y, m, d } */
  const days = daysFromCivil(on.y, on.m, on.d) - daysFromCivil(birth.y, birth.m, birth.d);
  if (days < 0) return { days, weeks: 0, rows: 0, last: 0 };
  const weeks = Math.floor(days / 7) + 1;
  const rows = Math.ceil(weeks / WEEKS_PER_ROW);
  return { days, weeks, rows, last: weeks - WEEKS_PER_ROW * (rows - 1) };
}

/* 对账器：产物串 ⇄ 两枚输入。返回 null＝过；字符串＝进账单的那句话。
   ① 的真产物、② 的临时产物、③ 的合成坏样本都走这一枚——牙只有一副，别在绊线那格另配一副。 */
function reconcile(html, birth, on){
  const want = expectOf(birth, on);
  const got = cellsOf(html);
  if (got.length !== want.weeks) return `产物里 ${CELL_ATTR} 收到 ${got.length} 枚，两枚输入复算出来是 ${want.weeks} 枚（${birth.y}.${birth.m}.${birth.d} → ${on.y}.${on.m}.${on.d}）`;
  for (let i = 0; i < got.length; i++) if (got[i] !== i + 1) return `第 ${i + 1} 枚格子的 data-week 是 ${got[i]}：序号必须从 1 连续数下来，跳号/重号就是有一格没画或画了两遍`;
  const rs = rowsOf(html);
  if (rs.length !== want.rows) return `产物里 ${want.rows} 行格子（每行至多 ${WEEKS_PER_ROW} 格）扫到 ${rs.length} 行`;
  if (want.rows && rs[rs.length - 1] !== want.rows - 1) return `末行的 data-life-year 是 ${rs[rs.length - 1]}，按行号该是 ${want.rows - 1}`;
  const perRow = String(html).split('<div class="life-year"').slice(1).map(chunk => cellsOf(chunk).length);
  for (let i = 0; i < perRow.length - 1; i++) if (perRow[i] !== WEEKS_PER_ROW) return `第 ${i} 行画了 ${perRow[i]} 格，一年那一行该铺满 ${WEEKS_PER_ROW} 格（只有末行允许不满）`;
  if (perRow.length && perRow[perRow.length - 1] !== want.last) return `末行画了 ${perRow[perRow.length - 1]} 格，两枚输入算出来是 ${want.last} 格`;
  return null;
}

/* ---------- ① 数据缺位 ⇒ 真产物里一格都不许出现；登记了 ⇒ 改判逐枚对账 ---------- */
const siteRaw = readFileSync(join(ROOT, 'src', 'data', 'site.js'), 'utf8').replace(/\r\n/g, '\n');
/* 顶层 await 一次：`cell()` 不 await（照 media-check 那副写法），所以模块的读法在这里取好再交给 ① */
const siteMod = await import('../src/data/site.js');
cell('①', '真产物：出生日没登记 ⇒ 0 枚格子 + 那句实话在场（登记了则改判枚数对账）', () => {
  let n = 0;
  assert.ok(existsSync(DIST), '① dist/ 不在盘上 —— 这一格在评空气：它是 gate 里 build 之后的那一步，先跑 npm run build');
  const file = join(DIST, 'about', 'index.html');
  assert.ok(existsSync(file), '① dist/about/index.html 不在盘上 —— 关于页没被构建，这一格判不了任何产物');
  const html = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const raw = siteMod.BIRTH_DATE;
  const birth = parseBirth(raw);
  n += 3;
  /* 字段今天必须是"没有默认值"那一枚：写死了一枚日期就是替作者编了一个他没说过的数 */
  assert.ok(/^\s*export const BIRTH_DATE\s*=/m.test(siteRaw),
    '① src/data/site.js 里那行 `export const BIRTH_DATE =` 不在了（改名/挪走 ⇒ 页面与尺子读的不是同一枚输入，这一格必须先红）');
  if (!birth){
    const cells = cellsOf(html);
    assert.equal(cells.length, 0, `① 出生日没登记（BIRTH_DATE = ${JSON.stringify(raw)}），产物里却画了 ${cells.length} 枚格子——没起点的那一格连"第 0 年"都不该有（§12 那条"载入次数读不到时整行不出现"同口径）`);
    assert.ok(!hasGridBox(html), '① 出生日没登记，产物里却出现了 .life-grid 那个盒子（哪怕里面是空的）——空态不许留一枚占位灰格');
    assert.ok(/还没有可用的出生日[^<]*一格都不画/.test(html), '① 那句实话不在产物里：读不到起点时页面必须当面说"没有"，不许沉默、也不许退回 0');
    assert.equal(rowsOf(html).length, 0, '① 出生日没登记却扫到行');
    n += 4;
    /* 收集器的正面控制：同一个收集器在 fixture 上必须收得到格子——否则上面那个 0 分不开"真没画"与"它坏了" */
    const ctl = '<div class="life-grid">' + lifeFieldHtml(parseBirth('2020.01.01'), new Date(2020, 0, 21)) + '</div>';
    const ctlCells = cellsOf(ctl);
    assert.ok(ctlCells.length > 0, '① needle：同一枚收集器在 fixture 样本上也收到 0 枚 ⇒ 收集器在空转，那个"产物里 0 枚"不作数');
    assert.equal(ctlCells.length, 3, `① needle：2020.01.01 → 2020.01.21 相差 20 个日历天，(20/7)+1 = 3 枚，实际收到 ${ctlCells.length} 枚`);
    assert.ok(hasGridBox(ctl), '① needle：fixture 样本里那个盒子收集器也认不出 ⇒ 认盒子的判据坏了');
    n += 3;
    notes.push(`① 真产物（dist/about/index.html）：格子 0 枚 · .life-grid 盒子 0 个 · 那句实话在场`
      + ` ⇒ 今天的绿由 fixture 兜住：同一枚收集器在 fixture 上收到 ${ctlCells.length} 枚（>0），`
      + `所以这个 0 是"真没画"而不是"收集器空转"；⚠️ 这不代表格子已经上过屏——载体还没有（§12 那一族），`
      + `真日期到位那天 ① 才第一次量到真页面`);
    return n;
  }
  /* 登记了的那天：产物里必须逐枚对得上（构建日从产物自己那行"构建于"里读，尺子不自己拿时钟） */
  const m = /构建于<\/dt>\s*<dd>(\d{4})\.(\d{2})\.(\d{2})/.exec(html);
  assert.ok(m, '① 出生日登记了，产物里却读不到"构建于"那一行 ⇒ 第二枚输入没处取（格子与那一行必须说同一刻）');
  const on = { y: +m[1], m: +m[2], d: +m[3] };
  const word = reconcile(html, birth, on);
  assert.ok(!word, `① ${word}`);
  assert.ok(hasGridBox(html), '① 出生日登记了、也复算得出格子，产物里却没有那个盒子');
  notes.push(`① 真产物：出生日已登记 ⇒ 格子逐枚对过账（${expectOf(birth, on).weeks} 枚，输入 ${raw} ⇄ 构建于 ${m[1]}.${m[2]}.${m[3]}）`);
  return n + 2;
});

/* ---------- ② 数据到位：内置 fixture 造临时产物，逐枚对账，三种边界各点一次 ---------- */
const FIXTURES = [
  ['闰年', { y: 2016, m: 2, d: 29 }, { y: 2024, m: 3, d: 1 }, '出生在 2 月 29 日那天（闰日本身），构建落在下一个闰年的 3 月 1 日——2 月有没有第 29 天这笔账必须由日历算完'],
  ['闰年·跨过', { y: 2023, m: 12, d: 31 }, { y: 2024, m: 12, d: 31 }, '同月同日跨一整年，而那一年是闰年：366 天，不是 365'],
  ['年初', { y: 2025, m: 12, d: 1 }, { y: 2026, m: 1, d: 1 }, '构建落在 1 月 1 日：这一年那一行还没铺开，行号在年底那一格翻过去'],
  ['年末', { y: 2025, m: 1, d: 1 }, { y: 2025, m: 12, d: 31 }, '构建落在 12 月 31 日：364 天 ⇒ 53 格，第一行铺满 52、末行只剩 1 格'],
  ['无上限', { y: 1900, m: 1, d: 1 }, { y: 1930, m: 1, d: 1 }, '三十年：1566 格、31 行——这里没有"人活 900 格"那种替作者编的寿命上限（§12「编一个访问量」同族）'],
];
const fxOf = name => FIXTURES.find(f => f[0] === name);
cell('②', '数据到位（内置 fixture → .scratch/ 里的临时产物）：枚数逐枚等于由两枚输入独立复算的数', () => {
  mkdirSync(SCRATCH, { recursive: true });
  let n = 0;
  const lines = [];
  for (const [name, birth, on, why] of FIXTURES){
    const b = parseBirth(`${birth.y}-${String(birth.m).padStart(2, '0')}-${String(birth.d).padStart(2, '0')}`);
    assert.ok(b, `② fixture「${name}」的出生日 parseBirth 认不出：内置样本自己就坏了`);
    const html = `<div class="life-grid" aria-hidden="true">${lifeFieldHtml(b, new Date(on.y, on.m - 1, on.d))}</div>`;
    const file = join(SCRATCH, name, 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html, 'utf8');
    const back = readFileSync(file, 'utf8');                    /* 回读：对账吃的是盘上那份，不是内存里那串 */
    const word = reconcile(back, birth, on);
    assert.ok(!word, `② fixture「${name}」${why} —— ${word}`);
    const want = expectOf(birth, on);
    assert.equal(cellsOf(back).length, lifeField(b, new Date(on.y, on.m - 1, on.d)).weeks,
      `② fixture「${name}」：lib 自己交回的格数与产物里的枚数不是同一件东西`);
    n += 3;
    lines.push(`      ${name}：${want.days} 天 → ${want.weeks} 格（${want.rows} 行，末行 ${want.last} 格）· 临时产物 .scratch/lifegrid-fixture/${name}/index.html`);
  }
  /* 没活到的那一半不许画：格子只到构建日为止 */
  const yearEnd = fxOf('年末');
  const last = cellsOf(readFileSync(join(SCRATCH, '年末', 'index.html'), 'utf8')).pop();
  assert.equal(last, expectOf(yearEnd[1], yearEnd[2]).weeks, '② 末枚格子的序号超过了复算值——那是在画还没过完的那一格');
  n++;
  /* 也没有寿命上限：那一格只报枚数，画到构建日为止 */
  const cap = fxOf('无上限');
  assert.ok(expectOf(cap[1], cap[2]).weeks > 900, '② 「无上限」那枚 fixture 复算出来不到 900 格 ⇒ 这一格没在验"没有寿命上限"这件事');
  assert.ok(/data-life-year="30"/.test(readFileSync(join(SCRATCH, '无上限', 'index.html'), 'utf8')), '② 「无上限」的产物里没有第 31 行 ⇒ 某处悄悄立了寿命上限');
  n++;
  notes.push(`② fixture 五格（临时产物写在 .scratch/，仓库里那三篇稿子与 site.js 一个字没动）：\n${lines.join('\n')}`);
  return n;
});

/* ---------- ③ 绊线：扭坏的形状必须当场红（合成样本喂同一枚对账器，不碰仓库） ---------- */
cell('③', '绊线：字段改名／多写一格／少写一格 ⇒ 当场红（合成坏样本，仓库不动）', () => {
  let n = 0;
  const birth = { y: 2000, m: 3, d: 8 };
  const on = { y: 2024, m: 2, d: 29 };                 /* 一枚闰日当构建日：好样本自己也在闰年边界上 */
  const b = parseBirth('2000-03-08');
  const good = `<div class="life-grid">` + lifeFieldHtml(b, new Date(on.y, on.m - 1, on.d)) + '</div>';
  assert.ok(!reconcile(good, birth, on), '③ 绊线的正面样本（该有的形状）没能过自己的对账器 ⇒ 后面那些"必红"证明的是坏样本还是它自己？');
  n++;
  /* 多写一格 */
  const extra = good.replace('</div>', '<span class="life-cell" data-week="9999"></span></div>');
  assert.ok(reconcile(extra, birth, on), '③ 绊线没牙：多塞一枚格子，对账器却说过');
  const extra2 = good.replace('<span class="life-cell" data-week="1">', '<span class="life-cell" data-week="1"></span><span class="life-cell" data-week="2">');
  assert.ok(reconcile(extra2, birth, on), '③ 绊线没牙：开头多一格（序号重复）也没报');
  /* 少写一格 */
  const short = good.replace(/<span class="life-cell" data-week="1"><\/span>/, '');
  assert.ok(reconcile(short, birth, on), '③ 绊线没牙：少一枚格子，对账器却说过了');
  const occ = [...good.matchAll(/<span class="life-cell" data-week="\d+"><\/span>/g)];
  const lastM = occ[occ.length - 1];
  const tailShort = good.slice(0, lastM.index) + good.slice(lastM.index + lastM[0].length);
  assert.ok(reconcile(tailShort, birth, on), '③ 绊线没牙：末行少一格也没报');
  /* 序号跳号：总数对得上但中间缺一格（枚数判据之外的第二副牙） */
  const jump = good.replace('data-week="2"', 'data-week="7"');
  assert.ok(reconcile(jump, birth, on), '③ 绊线没牙：data-week 跳号（有一格没画却把序号补上）也说过了');
  n += 5;
  /* 输入字段改名：尺子读的那枚声明必须跟着消失（这才叫"当场红"，不是注释里说说） */
  const renamed = siteRaw.replace(/export const BIRTH_DATE\s*=/m, 'export const LIFEGRID_BIRTHDAY =');
  assert.ok(!/^\s*export const BIRTH_DATE\s*=/m.test(renamed), '③ 绊线没牙：把字段改名之后那行 needle 还在 ⇒ needle 是个恒真的假判据');
  assert.ok(/^\s*export const LIFEGRID_BIRTHDAY\s*=/m.test(renamed), '③ 绊线样本本身没写成（改名没生效），这一枚证明不了任何事');
  n += 2;
  return n;
});

/* ---------- ④ 同源性：页面与尺子吃的是同一份实现 ---------- */
/* 注释剥离：判据只认代码（往注释里写一句"别再这么写"不该把自己判红——本仓那一族坑踩过两次）。 */
const codeOnly = s => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
cell('④', '本卡吃的两份真值与页面同源（绊线：页面换渲染方式/换时钟 ⇒ 本卡跟着改）', () => {
  const read = f => codeOnly(readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n'));
  const page = read('src/pages/about.astro');
  assert.ok(/import\s*\{[^}]*parseBirth[^}]*\}\s*from\s*'\.\.\/lib\/lifegrid\.js'/.test(page),
    '④ 关于页不再 import src/lib/lifegrid.js 那三枚纯函数 ⇒ 页面与尺子读的不是同一份实现（§16 两边各自赦免同一个错）');
  assert.ok(/lifeFieldHtml\(\s*birth\s*,\s*f\.now\s*\)/.test(page),
    '④ 关于页那片格子不再由 lifegrid.js 的渲染器交出（页面自己写 markup ⇒ ② 验的临时产物不再是访客看到的那件事）');
  assert.ok(/parseBirth\(\s*BIRTH_DATE\s*\)/.test(page), '④ 关于页不再吃 site.js 的那枚 BIRTH_DATE ⇒ ① 判的输入与页面的输入分家了');
  assert.ok(/f\.now/.test(page), '④ 关于页不再吃 f.now ⇒ 第二枚构建时刻进场（§16 一页只许有一个构建时刻）');
  const stats = read('src/lib/stats.js');
  assert.ok(/^\s*now,\s*$/m.test(stats), '④ siteFacts 不再把那一枚 now 交回来 ⇒ 页面只能自己再取一次时钟，"构建于"与格子会打脸');
  const lib = read('src/lib/lifegrid.js');
  assert.ok(!/new Date\(\s*\)/.test(lib), '④ lifegrid.js 自己取了时钟 ⇒ 格子的构建日不再是页面那一枚（一处动处处静的那一族）');
  assert.equal((lib.match(/Date\.utc|Date\.UTC/g) || []).length, 2,
    '④ lifegrid.js 里 `Date.UTC` 的枚数变了：它只该在日序那一行与回代校验那两处出现（第三处意味着又立了一枚日历账）');
  return 7;
});

/* ---------- 打印 ---------- */
for (const nt of notes) console.log(`  ${nt}`);
if (problems.length){
  console.log(`\n✗ lifegrid-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log(`\n✓ 一生格子：四格共 ${asserted} 条断言全过——没登记时产物里 0 枚格子且那句实话在场，登记后逐枚由两枚输入复算（闰年/年初/年末各点一次）`);
