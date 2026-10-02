/* ring-check.mjs —— 同心环归档（四轮 §4-3）的**产物级**对账
   用法  node tools/ring-check.mjs              （接进 `npm run gate`，排在 build 之后；纯读 dist/、零浏览器）
         node tools/ring-check.mjs --selftest    （只跑 ①：内置夹具与两侧变异，不读 dist/）
         node tools/ring-check.mjs --dist=<dir>   （另指产物目录）

   ── 这一格为什么必须存在 ────────────────────────────────────────────────
   环是一枚**构建期从稿件日期派生**的图形：一圈一年、圈上的点＝那一年写过的篇数。它有四条只在产物里
   才看得见的坏法，模板自己担保不了任何一条：
     · 点数与篇数分叉（多一枚点＝替作者多写一篇，§12 禁假数字），
     · 圈跳的靶不在同一份产物里（§12 死锚点禁令的产物级版：一页上出现的具名片段必须有同值 id），
     · 退档没落（零篇可见稿或只有一年时整块不许存在；落了就是 `yearArc()` 那一族犯过的 `NaN` 上纸），
     · 环被插进页头那把已签字的尺的尺身里（`tools/pagination-check.mjs:113` 拿
       `<span class="density"[^>]*>(…)<span class="density-cap">` 抠字节，中间塞进新东西＝拉那把尺读一枚新对象）。
   ⚠️ 尺子的独立性（§16"期望数不许由被测对象自己出"）：期望的圈数与每圈点数**不吃 `src/lib/stats.js`
      的 `yearRings()`**（那是被测对象），而是自己按 `tools/frontmatter.mjs` 读 `src/content/posts/` 的
      front matter、再吃 `src/lib/taxonomy.js` 那三枚**纯**读函数算出与 `visiblePosts()` 同一条名单，
      年份与篇数由这一份名单现数。切页与地址仍旧 import shipped 的 `src/lib/pagination.js`（页面与判据
      不吃同一份就会分叉，§16 记过的那一族），而退档门 `MIN_YEARS`、四枚类名、靶名前缀、`viewBox`
      那几枚是**手写字面量**——模板哪天改形状，这一格当场红，判据不会跟着被一起改掉。
   ── 为什么落 `gate` 不落 `check`（§16 分层）：②③④ 读的都是产物。干净检出（零篇可见稿）上
      `npm run check` 必须照旧全绿，而那一态在 gate 里由 ② 当场验成"整块不落"，不是跳过。
*/
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

import { isDraft, isUnlisted, sortPosts } from '../src/lib/taxonomy.js';
import { splitFm, readTaxonomy } from './frontmatter.mjs';
import { essaysPerPage, pageRanges, pageHref } from '../src/lib/pagination.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const args = process.argv.slice(2);
const DIST_ARG = (args.find(a => a.startsWith('--dist=')) || '').slice(7);
const DIST = DIST_ARG ? join(ROOT, DIST_ARG) : join(ROOT, 'dist');
const SELFTEST = args.includes('--selftest');

/* 手写字面量：改这些等于改这枚环的规格，必须与模板同一次改（先例：pagination-check 的那五枚字面量）。 */
const MIN_YEARS = 2;              /* `years.length < MIN_YEARS` ⇒ 整块不落（判词在 stats.js 那一格） */
const HOST = 'rings';             /* 容器 .rings */
const CAP = 'rings-cap';          /* 图例 .rings-cap */
const LINE = 'ring-line';         /* 圈线那一枚 <circle> */
const DOT = 'ring-dot';           /* 篇数那一枚 <circle> */
const ID_PREFIX = 'y';            /* 靶：.year-block 的 id ＝ y<YYYY> */
const VIEWBOX = '0 0 100 100';    /* 画幅只住 `RING.box` 一处，这里钉字面量 */

const problems = [];
const notes = [];
let asserted = 0;
function cell(id, label, fn){
  let n = 0, threw = null;
  try { n = fn() || 0; } catch (e){ threw = e; }
  if (threw){ problems.push(`${id} ${label}：${threw.message}`); return; }
  if (!n){ problems.push(`${id} ${label}：asserted=0（这一格一个断言都没跑就交了白卷）`); return; }
  asserted += n;
  notes.push(`${id} ${label}：${n} 条断言 ✓`);
}
const die = (msg, hint) => { console.error(`\n✗ ${msg}`); if (hint) console.error(hint); process.exit(1); };
/* 读 dist 的那四格：--selftest 只跑 ①（口径照 pagination-check 的同一枚旗标），不许拿上一轮的产物冒充这一轮 */
const cellDist = (id, label, fn) => { if (!SELFTEST) cell(id, label, fn); };

/* ---------- 名单：自己按盘上的 front matter 算（口径照 pagination-check / runtime-check）---------- */
function scanPosts(dir, rel = ''){
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })){
    const p = join(dir, e.name);
    if (e.isDirectory()){ out.push(...scanPosts(p, `${rel}${e.name}/`)); continue; }
    if (!/\.md$/i.test(e.name)) continue;
    const raw = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    const parsed = splitFm(raw);
    if (!parsed){ problems.push(`名单 ${rel}${e.name}：front matter 不成形 ⇒ 期望数算不出来（宁缺不假绿）`); continue; }
    const tax = readTaxonomy(parsed.fmText);
    if (tax.errors.length){ problems.push(`名单 ${rel}${e.name}：front matter 读不过预检（${tax.errors[0]}）`); continue; }
    out.push({ id: `${rel}${e.name.replace(/\.md$/i, '')}`, data: { draft: tax.draft, unlisted: tax.unlisted, date: new Date(parsed.fm.date) } });
  }
  return out;
}

/* ---------- 收集器：读不到一律交回 null，绝不把"读不到"长成"读到零枚"（口径照 runtime-check 1d）---------- */
const stripComments = s => s.replace(/<!--[\s\S]*?-->/g, ' ');
/* 容器里只有 a / svg / circle，没有嵌套 span ⇒ 非贪婪到第一枚 </span> 就是容器收尾 */
const ringsHostOf = html => {
  const m = /<span class="rings"[^>]*>([\s\S]*?)<\/span>/.exec(html);
  return m ? m[1] : null;
};
const ringsCapOf = html => {
  const m = /<span class="rings-cap">([\s\S]*?)<\/span>/.exec(html);
  return m ? m[1].replace(/<[^>]*>/g, '') : null;
};
/* 每一圈：属性顺序不写死（href 与 aria-label 谁在前都读得出来） */
function ringsOf(host){
  if (host === null) return null;
  const attr = (s, name) => { const m = new RegExp(name + '="([^"]*)"').exec(s); return m ? m[1] : ''; };
  return [...host.matchAll(/<a class="ring"([^>]*)>([\s\S]*?)<\/a>/g)].map(m => {
    const circles = [...m[2].matchAll(/<circle\b([^>]*)>/g)].map(c => ({ cls: attr(c[1], 'class'), r: attr(c[1], ' r') }));
    return {
      href: attr(m[1], 'href'),
      label: attr(m[1], 'aria-label'),
      viewbox: attr(m[2], 'viewBox'),
      lines: circles.filter(c => c.cls === LINE).length,
      dots: circles.filter(c => c.cls === DOT).length,
      radii: circles.filter(c => c.cls === LINE).map(c => Number(c.r)),
      other: circles.filter(c => c.cls !== LINE && c.cls !== DOT).length,
    };
  });
}
/* `pagination-check.mjs:113` 那枚正则的**同一条**：尺身字节 */
const RULER_RE = /<span class="density"[^>]*>([\s\S]*?)<span class="density-cap">/;
const rulerBodyOf = html => { const m = RULER_RE.exec(html); return m ? m[1] : null; };

/* ---------- 期望：由整份名单现数，不吃 yearRings() ---------- */
function expectOf(visible, per){
  const tally = new Map();
  for (const p of visible){
    const y = p.data.date.getUTCFullYear();
    tally.set(y, (tally.get(y) || 0) + 1);
  }
  const years = [...tally.keys()].sort((a, b) => a - b);
  const pages = pageRanges(visible.length, per).map(r => ({
    page: r.page, href: pageHref(r.page),
    yearsOnPage: [...new Set(visible.slice(r.from, r.to).map(p => p.data.date.getUTCFullYear()))].sort((a, b) => a - b),
  }));
  const homeOf = y => pages.find(pg => pg.yearsOnPage.includes(y));
  return {
    drawn: years.length >= MIN_YEARS,
    years, tally, pages, posts: visible.length,
    wantRings: years.map(y => ({ y, n: tally.get(y) })),
    /* 本页有那一年 ⇒ 同页片段；没有 ⇒ 指到那一年在的那一页，仍旧吃同一枚片段 */
    hrefFor: (y, onPage) => onPage.yearsOnPage.includes(y) ? `#${ID_PREFIX}${y}`
      : homeOf(y) ? `${homeOf(y).href}#${ID_PREFIX}${y}` : `#${ID_PREFIX}${y}`,
  };
}

/* ---------- 判据：一页产物 ⇄ 期望，交回红名数组（夹具与 dist 吃同一条）---------- */
/* readTarget(pathHref) → 那一页的 HTML，或 null（盘上没有那一页）；pathHref === '' 就是本页 */
function judgePage(html, exp, onPage, url, readTarget){
  const bad = [];
  const host = ringsHostOf(html), cap = ringsCapOf(html);
  const main = html.slice(Math.max(0, html.indexOf('<main')), html.indexOf('</main>') + 7);
  /* 尺身字节：与"画不画环"无关，两态都必须跑 */
  const body = rulerBodyOf(html);
  if (body === null) bad.push(`${url}：读不到密度尺那一块（<span class="density"> ⇄ <span class="density-cap">）⇒ 尺身字节这一格没有对象`);
  else if (/<circle|\bclass="ring/.test(body))
    bad.push(`${url}：环的字节落进了尺身里（${RULER_RE.source} 抠出来的那一段含 ring/circle）⇒ 已经签字的那把尺被拉去读一枚新东西；环必须排在 .density-cap 之后`);
  if (/NaN/.test(main)) bad.push(`${url}：<main> 里印出 NaN ⇒ 退档没拦住（§12「空着就是不画」）`);

  if (!exp.drawn){
    if (host !== null) bad.push(`${url}：整份名单只跨 ${exp.years.length} 年（<${MIN_YEARS}）而环画了（${ringsOf(host).length} 圈）⇒ 退档没落：少于两圈没有"之间"可读，它就是装饰`);
    if (cap !== null) bad.push(`${url}：退档那一态里 .${CAP} 那句图例仍在产物里 ⇒ "整块不落"连图例一起算，一个字节都不许进`);
    return { bad, rings: 0 };
  }
  if (host === null){ bad.push(`${url}：整份名单跨 ${exp.years.length} 年（${exp.years.join(' ')}），产物里却读不到 <span class="${HOST}"> ⇒ 环没画，升级位没落地`); return { bad, rings: 0 }; }
  if (cap === null) bad.push(`${url}：环画了而 .${CAP} 那句图例不在 ⇒ 图形没有图例就读不出"一圈一年、一点一篇"（页头那把尺架的口径）`);

  const rings = ringsOf(host);
  if (rings.length !== exp.wantRings.length)
    bad.push(`${url}：环 ${rings.length} 圈，整份名单跨 ${exp.wantRings.length} 年（${exp.years.join(' ')}）⇒ 圈数不等于跨年数`);
  const seenYears = [];
  let prevR = -Infinity;
  for (let i = 0; i < rings.length; i++){
    const g = rings[i];
    const mm = /^(\d{4}) 年 (\d+) 篇$/.exec(g.label);
    if (!mm){ bad.push(`${url}：第 ${i + 1} 圈的 aria-label 是 "${g.label}"，在册形状是 "<YYYY> 年 <N> 篇"`); continue; }
    const y = Number(mm[1]), n = Number(mm[2]);
    seenYears.push(y);
    const want = exp.tally.get(y);
    if (want === undefined) bad.push(`${url}：第 ${i + 1} 圈报 ${y} 年，整份名单里没有这一年 ⇒ 环自己造了一年`);
    else if (g.dots !== want) bad.push(`${url}：${y} 年画了 ${g.dots} 枚点，那一年实际写了 ${want} 篇 ⇒ 点数不等于篇数（§12 禁假数字：多一枚点就是替作者多写一篇）`);
    else if (n !== want) bad.push(`${url}：${y} 年那圈的名字报 ${n} 篇而名单是 ${want} 篇 ⇒ 链接的名字与点数两套账`);
    if (g.lines !== 1) bad.push(`${url}：${y} 年那圈有 ${g.lines} 枚 ${LINE}（在册一枚圈线）`);
    if (g.other) bad.push(`${url}：${y} 年那圈里有 ${g.other} 枚 class 既不是 ${LINE} 也不是 ${DOT} 的 <circle>`);
    if (g.viewbox !== VIEWBOX) bad.push(`${url}：${y} 年那圈 viewBox 是 "${g.viewbox}"，在册 ${VIEWBOX} ⇒ 画幅长出了第二处真值`);
    if (g.radii.length === 1){
      if (!(g.radii[0] > prevR)) bad.push(`${url}：${y} 年那圈半径 ${g.radii[0]} 不比内圈 ${prevR} 大 ⇒ 图例那句"由内而外是早到晚"印的是假话（圈序与半径分叉）`);
      prevR = g.radii[0];
    }
    /* 靶：href 指向的那枚 id 必须真在产物里 */
    const frag = g.href.split('#')[1] || '';
    const fileHref = g.href.split('#')[0];
    if (!frag) bad.push(`${url}：${y} 年那圈的 href="${g.href}" 没有片段 ⇒ 这一圈不是一个跳转`);
    else if (!frag.startsWith(`${ID_PREFIX}${y}`)) bad.push(`${url}：${y} 年那圈跳的是 #${frag}，在册靶名是 ${ID_PREFIX}<YYYY>＝#${ID_PREFIX}${y}`);
    else {
      const th = readTarget(fileHref);
      if (th === null) bad.push(`${url}：${y} 年那圈跳 ${g.href}，盘上找不到那一页的产物 ⇒ §12 死锚点（地址不是产物）`);
      else if (!new RegExp(`\\bid="${frag}"`).test(th)) bad.push(`${url}：${y} 年那圈跳 ${g.href}，而那份产物里没有 id="${frag}"（没有 <section class="year-block" id="${frag}">）⇒ §12 死锚点：这一圈点不开`);
    }
    const wantHref = exp.hrefFor(y, onPage);
    if (g.href !== wantHref) bad.push(`${url}：${y} 年那圈的 href 是 "${g.href}"，按整份名单应该是 "${wantHref}"（本页有那一年 ⇒ 同页片段；没有 ⇒ 指到那一年在的那一页）`);
  }
  if (seenYears.join(' ') !== exp.years.join(' '))
    bad.push(`${url}：环上的年份序是 ${seenYears.join(' ') || '（空）'}，由早到新应该是 ${exp.years.join(' ')} ⇒ 圈序与名单分叉（由内而外＝早到晚）`);
  const totalDots = rings.reduce((a, g) => a + g.dots, 0);
  if (totalDots !== exp.posts) bad.push(`${url}：全环点数 ${totalDots} ≠ 整份名单 ${exp.posts} 篇 ⇒ 有一年的篇数没数进环里`);
  if (cap !== null && !cap.includes(`${exp.years.length} 年`)) bad.push(`${url}：图例那句 "${cap}" 里读不到 "${exp.years.length} 年" ⇒ 图例与环数的不是同一件事`);
  if (cap !== null && !cap.includes(`${exp.posts} 篇`)) bad.push(`${url}：图例那句 "${cap}" 里读不到 "${exp.posts} 篇" ⇒ 图例报的篇数与名单分叉（§12 禁假数字）`);
  return { bad, rings: rings.length };
}

/* ---------- ① 内置夹具 ----------
   夹具 HTML 用字符串拼（一枚嵌套模板字面量写歪，整格就变成"读不出对象还打印漂亮话"）。 */
function fxRing(y, n, r){
  let s = '<a class="ring" href="#' + ID_PREFIX + y + '" aria-label="' + y + ' 年 ' + n + ' 篇">'
    + '<svg viewBox="' + VIEWBOX + '" aria-hidden="true" focusable="false">'
    + '<circle class="' + LINE + '" cx="50" cy="50" r="' + r + '"></circle>';
  for (let i = 0; i < n; i++) s += '<circle class="' + DOT + '" cx="50" cy="1" r="3.2"></circle>';
  return s + '</svg></a>';
}
function fxHost(pairs){
  return '<span class="rings" role="group" aria-label="年轮目录">'
    + pairs.map(([y, n], i) => fxRing(y, n, 17 + i * 29)).join('') + '</span>';
}
function fxPage(pairs, o){
  const opt = o || {};
  const total = pairs.reduce((a, [, n]) => a + n, 0);
  const drawn = opt.draw === false ? '' : fxHost(pairs);
  const cap = (opt.draw === false || opt.capOff) ? ''
    : '<span class="' + CAP + '">同心年轮 · 一圈一年 · 一点一篇 · 由内而外是早到晚（' + pairs.length + ' 年 · ' + total + ' 篇）</span>';
  const body = ('body' in opt) ? opt.body : '<span class="tick"></span>';
  const sections = pairs.map(([y]) => '<section class="year-block reveal" id="' + ID_PREFIX + y + '"><h2 class="year-mark">' + y + '</h2></section>').join('');
  return '<main class="wrap"><header><span class="density-wrap">'
    + '<span class="density" aria-hidden="true">' + body + '</span>'
    + '<span class="density-cap">近 12 个月 · 共 ' + total + ' 篇</span>'
    + drawn + cap + '</span></header>' + sections + '</main>';
}
/* 夹具都是"一页装完"那一态（per=0）⇒ 期望的 href 永远是同页片段 */
function fxExp(pairs){
  const visible = [];
  for (const [y, n] of pairs) for (let i = 0; i < n; i++) visible.push({ id: 'p' + y + '-' + i, data: { date: new Date(Date.UTC(y, 5, 1)) } });
  return expectOf(visible, 0);
}
const runFx = (html, exp) => judgePage(html, exp, exp.pages[0], '/essays/', p => (p === '' ? html : null));

cell('①', '内置夹具：好形状零红 ＋ 收集器自证 ＋ 两侧变异各红一次（不读 dist）', () => {
  let n = 0;
  const pairs = [[2025, 1], [2026, 2]];            /* 由早到新：内圈 2025 一枚点、外圈 2026 两枚点 */
  const exp = fxExp(pairs);
  const oneYearExp = fxExp([[2026, 3]]);
  const goodHtml = fxPage(pairs);
  /* (a) 朝窄：好形状必须一条红都不报，且收集器真读出两圈 */
  const okRes = runFx(goodHtml, exp);
  assert.equal(okRes.bad.join(' ｜ '), '', '① 朝窄：好形状夹具被报了红 ⇒ 判据偏宽或夹具与模板不同形：' + okRes.bad.join(' ｜ '));
  assert.equal(okRes.rings, 2, '① 收集器在好形状夹具里读不到两圈 ⇒ 这一族断言全在读空气');
  n += 2;

  /* (b) 朝宽：十二种坏形状，每一种都必须让判据报话（两侧变异＝"该画而没画"与"不该画而画了"都在列） */
  const MUT = [
    ['少一圈（只画 2026）', () => runFx(fxPage([[2026, 2]]), exp)],
    ['多一枚点（2025 画 2 枚而那一年只 1 篇）', () => runFx(fxPage([[2025, 2], [2026, 2]]), exp)],
    ['圈序倒过来（由内而外成了晚到早）', () => runFx(fxPage([[2026, 2], [2025, 1]]), exp)],
    ['靶被改名（2025 那一节的 id 换掉）', () => runFx(goodHtml.replace('id="y2025"', 'id="zz2025"'), exp)],
    ['href 换一枚盘上没有的片段', () => runFx(goodHtml.replace('href="#y2025"', 'href="#y1999"'), exp)],
    ['href 换成空片段（点了不跳）', () => runFx(goodHtml.replace('href="#y2025"', 'href="#"'), exp)],
    ['退档没落：只跨一年还画环', () => runFx(fxPage([[2026, 3]]), oneYearExp)],
    ['该画而没画：跨两年而容器整块缺席', () => runFx(fxPage(pairs, { draw: false }), exp)],
    ['图例一起漏（环在而 .rings-cap 不在）', () => runFx(fxPage(pairs, { capOff: true }), exp)],
    ['环插进尺身（density ⇄ density-cap 之间）', () => runFx(fxPage(pairs, { body: '<span class="tick"></span>' + fxHost(pairs) }), exp)],
    ['画幅长出第二处真值（viewBox 改掉）', () => runFx(goodHtml.replace(VIEWBOX, '0 0 96 96'), exp)],
    ['退档那一态落了活壳还把读数印成 NaN', () => runFx(fxPage([[2026, 3]]).replace('共 3 篇', '共 NaN 篇'), oneYearExp)],
  ];
  for (const [what, f] of MUT){
    const res = f();
    assert.ok(res.bad.length, `① 朝宽：坏形状「${what}」没有让判据报任何一条 ⇒ 这一族的判据只在好数据上跑过，根本不知道有没有牙`);
    n += 1;
  }
  /* (c) "零环是真没画、不是收集器空转"：退档那一次读出 0 圈，同一轮里好形状必须读出 2 圈 */
  const wRes = runFx(fxPage([[2026, 3]], { draw: false }), oneYearExp);
  assert.equal(wRes.bad.join(' ｜ '), '', '① 退档夹具（跨一年而不画环）本该合法，却被报了红：' + wRes.bad.join(' ｜ '));
  assert.equal(wRes.rings, 0, '① 退档夹具读出非零圈 ⇒ 上面那条"0 枚容器"的判据没有对象');
  assert.equal(runFx(goodHtml, exp).rings, 2, '① 同一次运行里收集器读不出好形状的 2 圈 ⇒ 退档那一格的"零枚"是空转不是没画');
  n += 3;
  notes.push('① 夹具自证：好形状（2 圈 · 点数 1/2 · 年份升序 · 靶都在）零红 ＋ 12 种坏形状各红一次（含"该画而没画"与"不该画而画了"两侧）＋ 退档态与好形状态同轮对照 ⇒ 零环≠空转');
  return n;
});

/* ---------- ②③④ 真产物 ---------- */
const corpus = scanPosts(POSTS);
const published = sortPosts(corpus.filter(p => !isDraft(p)));
const visible = published.filter(p => !isUnlisted(p));
const PER = essaysPerPage();
const EXP = expectOf(visible, PER);
const REAL = existsSync(DIST);
const fileFor = href => href === '/essays/'
  ? join(DIST, 'essays', 'index.html')
  : join(DIST, ...href.replace(/^\/|\/$/g, '').split('/'), 'index.html');
/* 跨页那一枚靶：开那一页的文件来核 id（runtime-check 的全站扫描只认 href="#x"，读不到这一串） */
const targetReader = () => pathHref => {
  const f = (pathHref === '' || pathHref === '/' || pathHref === '/essays/') ? fileFor('/essays/') : fileFor(pathHref);
  return existsSync(f) ? stripComments(readFileSync(f, 'utf8')) : null;
};
const treePages = () => {
  const out = [];
  for (const r of EXP.pages){
    const file = fileFor(r.href);
    if (!existsSync(file)) continue;
    out.push({ file, html: stripComments(readFileSync(file, 'utf8')), onPage: r, url: r.href });
  }
  return out;
};

cellDist('②', '退档两态（0 年／1 年 ⇒ 第 1 页 0 枚容器、0 枚图例、零 NaN）在真产物上落定', () => {
  assert.ok(REAL, `② ${DIST} 不存在 ⇒ 这一格没有对象（先 npm run build；"读不到"从来不算过）`);
  const p1 = join(DIST, 'essays', 'index.html');
  assert.ok(existsSync(p1), `② 盘上没有 ${p1}`);
  const html = stripComments(readFileSync(p1, 'utf8'));
  if (EXP.years.length < MIN_YEARS){
    assert.equal(ringsHostOf(html), null, `② 整份名单只跨 ${EXP.years.length} 年（<${MIN_YEARS}）而第 1 页画了环 ⇒ 退档没落：少于两圈没有"之间"可读，它就是装饰`);
    assert.equal(ringsCapOf(html), null, '② 退档那一态里 .rings-cap 那句还在产物里 ⇒ "整块不落"连图例一起算');
    assert.ok(!/NaN/.test(html.slice(html.indexOf('<main'), html.indexOf('</main>') + 7)), '② 退档那一态的 <main> 里印出了 NaN ⇒ 空数组上的读数上了纸');
    notes.push(`② 退档态跑了：可见名单 ${visible.length} 篇 / 跨 ${EXP.years.length} 年 ⇒ 第 1 页读出 0 枚环容器、0 枚图例、零 NaN ✓（收集器由 ①(c) 同轮自证还活着）`);
    return 3;
  }
  assert.notEqual(ringsHostOf(html), null, `② 名单跨 ${EXP.years.length} 年而第 1 页读不到 <span class="rings"> ⇒ 升级位没落地`);
  notes.push(`② 落环态：可见名单 ${visible.length} 篇 / 跨 ${EXP.years.length} 年（${EXP.years.join(' ')}）≥ 退档门 ${MIN_YEARS} ⇒ 环必须画，容器已读出`);
  return 1;
});

cellDist('③', '逐页对账：圈数⇄跨年数、点数⇄那一年篇数、每一圈的 href 在产物里真有一枚同值 id', () => {
  assert.ok(REAL, '③ dist/ 不存在');
  const pages = treePages();
  assert.ok(pages.length, `③ 盘上读不到任何一页目录（期望 ${EXP.pages.length} 页：${EXP.pages.map(p => p.href).join(' ')}）`);
  assert.equal(pages.length, EXP.pages.length, `③ 读到 ${pages.length} 页目录，整份名单应该切成 ${EXP.pages.length} 页`);
  let n = 1, seen = 0, dots = 0;
  for (const pg of pages){
    const res = judgePage(pg.html, EXP, pg.onPage, pg.url, targetReader(pg.file));
    for (const b of res.bad) problems.push(b);
    seen += res.rings; n += 1;
    const h = ringsHostOf(pg.html);
    if (h) dots += ringsOf(h).reduce((a, g) => a + g.dots, 0);
  }
  if (EXP.drawn) assert.ok(seen > 0, '③ 逐页跑完而全站点到的环是 0 枚 ⇒ 这一格在空转');
  notes.push(`③ ${pages.length} 页逐页对账：${seen} 枚圈次 · ${dots} 枚点次 ⇄ 名单 ${EXP.posts} 篇跨 ${EXP.years.length} 年（${EXP.years.join(' ') || '—'}）· 每一圈的 href 都开文件核过同值 id`);
  return n;
});

cellDist('④', '尺身字节没被动过：各页的 <span class="density">(…)<span class="density-cap"> 逐位相同，且区间内不含环的字节', () => {
  assert.ok(REAL, '④ dist/ 不存在');
  const pages = treePages();
  assert.ok(pages.length, '④ 读不到目录页');
  const bodies = pages.map(p => rulerBodyOf(p.html));
  assert.ok(bodies.every(b => b !== null), '④ 有一页读不到尺身那一块 ⇒ 这一格在空转');
  let n = 0;
  for (const [i, b] of bodies.entries()){
    assert.equal(b, bodies[0], `④ 第 ${i + 1} 页的尺身字节与第 1 页不同 ⇒ 页头那把已签字的尺被各页各画了一遍`);
    assert.ok(!/<circle|\bclass="ring/.test(b), `④ 第 ${i + 1} 页的尺身字节里含环的字节 ⇒ 环必须排在 .density-cap **之后**，不许插进 pagination-check.mjs:113 那枚正则抠出来的区间里`);
    n += 2;
  }
  notes.push(`④ 尺身字节：${bodies.length} 页逐位相同、每一页的区间内 0 枚环字节（环排在 .density-cap 与 .yring-cap 之后）`);
  return n;
});

/* ---------- ⑤ 产物级变异自证（当场造一棵坏产物，证明 ③ 的两条红名不是只跑过好数据） ---------- */
cellDist('⑤', '产物级变异：删掉一圈 ⇒ 红且点名靶；点数多一枚 ⇒ 红且点名篇数', () => {
  assert.ok(REAL, '⑤ dist/ 不存在');
  if (!EXP.drawn){ notes.push('⑤ **没跑对象变异**（今天退档态不画环 ⇒ 产物里没有圈可删）；两侧变异的牙由 ①(b) 那 12 种夹具当众响'); return 1; }
  const src = treePages();
  const tmp = mkdtempSync(join(tmpdir(), 'ringmut-'));
  try {
    let n = 0;
    for (const [mode, expectWord] of [['dropring', '圈数'], ['extradot', '点数']]){
      const dir = join(tmp, mode);
      for (const pg of src){
        const at = join(dir, ...pg.file.slice(DIST.length + 1).split(/[\\/]/).slice(0, -1), 'index.html');
        let html = pg.html;
        if (mode === 'dropring'){
          const first = /<a class="ring"[\s\S]*?<\/a>/.exec(html);
          if (first) html = html.replace(first[0], '');
        } else {
          html = html.replace('<circle class="' + LINE + '"', '<circle class="' + DOT + '" cx="1" cy="1" r="3.2"></circle><circle class="' + LINE + '"');
        }
        mkdirSync(dirname(at), { recursive: true });
        writeFileSync(at, html);
      }
      const pages = [];
      for (const r of EXP.pages){
        const f = join(dir, ...(r.href === '/essays/' ? ['essays'] : r.href.replace(/^\/|\/$/g, '').split('/')), 'index.html');
        if (existsSync(f)) pages.push({ html: readFileSync(f, 'utf8'), onPage: r, url: r.href });
      }
      let bad = [];
      for (const pg of pages) bad = bad.concat(judgePage(pg.html, EXP, pg.onPage, pg.url, p => {
        const f = (p === '' || p === '/') ? join(dir, 'essays', 'index.html') : join(dir, ...p.replace(/^\/|\/$/g, '').split('/'), 'index.html');
        return existsSync(f) ? readFileSync(f, 'utf8') : null;
      }).bad);
      assert.ok(bad.length, `⑤ 产物级变异「${mode}」跑完一条红都没有 ⇒ ③ 那两格只在好产物上跑过，不知道有没有牙`);
      assert.ok(bad.some(x => x.includes(expectWord)), `⑤ 变异「${mode}」红了，但没有一条点名「${expectWord}」：${bad.join(' ｜ ')}`);
      n += 2;
      notes.push(`⑤ 产物级变异「${mode}」红 ${bad.length} 条，点名『${expectWord}』：${bad.find(x => x.includes(expectWord)).slice(0, 150)}`);
    }
    return n;
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

if (SELFTEST){
  console.log('① 夹具与两侧变异跑完；--selftest 不读 dist ⇒ 这一行不是发布前的读数，日常与 gate 都跑全五格。');
} else if (!REAL){
  die('没有产物 ' + DIST, '  先 `npm run build`；本卡读 dist/，排在 build 之后（§16 分层）。缺产物时报红不是跳过。');
}

if (problems.length){
  console.error(`\n✗ ring-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.error('  · ' + p);
  console.error(`\n  账目：可见名单 ${visible.length} 篇 · 跨 ${EXP.years.length} 年（${EXP.years.join(' ') || '—'}）· 退档门 ≥${MIN_YEARS} 年 · 应画环=${EXP.drawn ? '是' : '否（整块不落）'}`);
  process.exit(1);
}
for (const s of notes) console.log('  ✓ ' + s);
console.log(`\n✓ 同心环归档：${asserted} 条断言全过——圈数＝跨年数、点数＝那一年篇数、每一圈跳的靶在产物里真存在、退档两态整块不落、尺身字节没被插。`);
