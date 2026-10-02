/* pagination-check.mjs —— `/essays/` 分页的**产物级**对账（本轮 `card/pagination` ③）
   用法  node tools/pagination-check.mjs                （接进 `npm run gate`，排在 build 之后；纯读 dist/、零浏览器）
         node tools/pagination-check.mjs --dist=<dir>    （另指产物目录：夹具以外的档与"没有产物"那一档都要当众验一次）
         node tools/pagination-check.mjs --reference=<d> （④c：与"不分页那一档"的第 1 页逐字节比，见下面那一格）
         node tools/pagination-check.mjs --list          （外加逐页的账目）
         node tools/pagination-check.mjs --selftest      （只跑 ①：内置夹具与两侧格子，不读 dist/）

   ── 这一格为什么必须存在（第 0 问）─────────────────────────────────────────
   `/essays/` 今天有**三枚**载体、每页容量也是三 ⇒ 一页就装完了：**分页这一拍今天在产物里读不出来**。
   读不出来不等于不判，也不等于造假稿子去把它读出来（§12 禁假内容、禁假数字）。合法做法与 §16 那几格同源：
     · 判据**自己带 fixture**（第 ① 格：在临时目录里造"一页档／两页档／旋钮关掉那一档／八种坏档"的产物 HTML 树，
       吃的是**同一套**收集器与同一条 `judge()`——"某页少一枚链接""多生成一空页"这些朝宽的格子全部在这儿响，
       今天这份三篇的 dist 上响不了的东西不必等投稿量），
     · 真产物那三格（②③④）跑的是"只有一页"这一态：**第 1 页不许多出任何分页壳**就是那一态的判据。
       ⚠️ 干净检出（模板出厂态＝零篇可见稿）也在"只有一页"这一态里，而它**没有行**：所以 ③ 那枚针判"第 1 页有行 ⇄ 名单非空"
       两向相等、④ 的在册子元素序列由名单枚数现算（零稿 ⇒ `<header>` 一枚，因为年分节整块不落）。这不是把判据放宽——
       有稿而读不出行、零稿而页上凭空长出行、第 1 页多带一层包裹，三种都当场红。
   ⚠️ 夹具造的是**产物 HTML**，不是稿件：站内那三篇真稿一枚都不许多，也不许为了看见第二页去写一篇假的。

   ── 它钉的六件事 ──────────────────────────────────────────────────────────
   ① 页与页的篇数之和 ⇄ 整份可见名单：**逐枚 slug 比、按页序拼**（不重不漏，多一枚少一枚换一枚都红）。
   ② 每页的"上一页／下一页"只许指向**盘上真存在**的产物（§12 死锚点那条的产物级版）；末页没有下一页、
      第 1 页没有上一页；页码从 2 起（第 1 页是 `/essays/` 本身，不许有 `/essays/page/1/`）。
   ③ 任何一页都不许是空的（能访问、零行＝一枚读者点进去读不出东西的活锚点，§12 那条"关掉之后不留活壳"）。
   ④ 密度尺与那句 `共 N 篇` 与扉页那个 `essays — <b>NN</b>` 读的是**整份名单**，不是本页那几行：各页的尺身
      字节必须逐位相同，句子里那两个数必须等于整份名单的算法值 ⇒ "每页各画一把尺子"（一把随页数漂移的假尺）红。
   ⑤ 每页 canonical 指自己；非第 1 页**进 sitemap**（那一枚地址是真产物、真内容，不进就是替读者说
      "这条路不存在"）、**不进 feed**（两枚订阅源的条目是一篇篇稿子，"第几页"不是一篇稿子）。口径登记在 §15。
   ⑥ 第 1 页 ⇄ 不分页：装得下就一个字都不许多（④c 另拿 `ESSAYS_PER_PAGE=0` 那一档的产物逐字节比）。

   ── 尺子的独立性（§16 那条"期望数不许由被测对象自己出"）───────────────────
   名单**不 import** `src/lib/posts.js`（那一枚吃 `astro:content`，node 侧吃不动；"读 posts 只有一处"由
   `taxonomy-check` 的 ①② 两格钉）——本工具与 `runtime-check`／`feed-check` 同一套路：自己按
   `tools/frontmatter.mjs` 读 front matter，再吃 `src/lib/taxonomy.js` 那三枚**纯**读函数算名单。
   切页与地址确实 import shipped 的 `src/lib/pagination.js`（页面与判据不吃同一份就会分叉，§16 记过），
   所以那一层另钉一组**手写字面量**：`/essays/`、`/essays/page/2/`、`/essays/page/3/`、命名空间 `page`、
   默认容量 `3`——shipped 函数一旦改形状，① 那一格当场红，判据不会跟着被一起改掉。

   ── 为什么落点在 `gate` 而不是 `check`（§16 那条分层）───────────────────────
   ②③④ 读的都是构建产物：塞进 `check` 会让干净检出上 `npm run check` 直接红——红的是环境不是代码。
   缺 `dist/` 时它**红**并指路"先 npm run build"，不被 `if` 跳过装绿（§16："尺子读不到被测对象从来不算绿"）。
*/
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

import { isDraft, isUnlisted, sortPosts } from '../src/lib/taxonomy.js';
import { splitFm, readTaxonomy } from './frontmatter.mjs';
import { ESSAYS_PAGE_NS, ESSAYS_PER_PAGE, essaysPerPage, pageRanges, pageHref, isPageHref } from '../src/lib/pagination.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const args = process.argv.slice(2);
const DIST_ARG = (args.find(a => a.startsWith('--dist=')) || '').slice(7);
const DIST = DIST_ARG ? join(ROOT, DIST_ARG) : join(ROOT, 'dist');
const REF_ARG = (args.find(a => a.startsWith('--reference=')) || '').slice(12);
const REFERENCE = REF_ARG ? join(ROOT, REF_ARG) : '';
const SELFTEST = args.includes('--selftest');

const pad = n => String(n).padStart(2, '0');
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
const throws = fn => { try { fn(); return false; } catch { return true; } };

/* ---------- 名单：自己按盘上的 front matter 算（口径照 runtime-check / feed-check）---------- */
function scanPosts(dir, rel = ''){
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })){
    const p = join(dir, e.name);
    if (e.isDirectory()){ out.push(...scanPosts(p, `${rel}${e.name}/`)); continue; }
    if (!/\.md$/i.test(e.name)) continue;
    const id = `${rel}${e.name.replace(/\.md$/i, '')}`;
    const raw = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    const parsed = splitFm(raw);
    if (!parsed){ problems.push(`名单 ${id}：front matter 不成形 ⇒ 这一格的名单算不出来（宁缺不假绿）`); continue; }
    const tax = readTaxonomy(parsed.fmText);
    if (tax.errors.length){ problems.push(`名单 ${id}：front matter 读不过预检（${tax.errors[0]}）`); continue; }
    out.push({ id, data: { draft: tax.draft, pinned: tax.pinned, unlisted: tax.unlisted, date: new Date(parsed.fm.date) } });
  }
  return out;
}
const corpus = scanPosts(POSTS);
const published = sortPosts(corpus.filter(p => !isDraft(p)));            /* publishedPosts() 的口径：只滤草稿 */
const visible = published.filter(p => !isUnlisted(p));                    /* visiblePosts() 的口径：再多滤一道不列入 */
const roster = visible.map(p => p.id);
const ROSTER_DATES = new Map(visible.map(p => [p.id, p.data.date]));
const PER = essaysPerPage();
const RANGES = pageRanges(roster.length, PER);

/* ---------- 收集器：一页产物读成一条账（属性顺序与引号写法都不许写死在判据里）---------- */
const stripTags = s => s.replace(/<[^>]*>/g, '');
function readPage(file, href, page){
  /* 收集器一律读**去注释之后**的字节：Astro 把 HTML 注释原样落进产物（`SearchEntry.astro` 那几段就是），
     而"注释里的地址访客走不到"（§14 那条）——判活锚点判的是能点的那一枚。
     ⚠️ 但逐字节那一档（④c 的回归比）必须拿**原文件**比：注释也是产物的一部分，那才是"第 1 页没变样"的意思。 */
  const raw = readFileSync(file);
  const html = raw.toString('utf8').replace(/<!--[\s\S]*?-->/g, ' ');
  const nav = /<nav class="tax-empty"[^>]*>([\s\S]*?)<\/nav>/.exec(html);
  const density = /<span class="density"[^>]*>([\s\S]*?)<span class="density-cap">/.exec(html);
  const cap = /<span class="density-cap">([\s\S]*?)<\/span>/.exec(html);
  const label = /class="sec-label"[^>]*>\s*essays — <b>(\d{2,})<\/b>/.exec(html);
  const canon = /<link rel="canonical" href="([^"]+)">/.exec(html);
  return {
    page, href, file, raw, html,
    rows: [...html.matchAll(/data-slug="([^"]+)"/g)].map(m => m[1]),
    folios: [...html.matchAll(/class="folio">(\d{2})</g)].map(m => Number(m[1])),
    years: [...html.matchAll(/<h2 class="year-mark">(\d{4})<\/h2>/g)].map(m => m[1]),
    navHtml: nav ? nav[1] : null,
    navHrefs: nav ? [...nav[1].matchAll(/href="([^"]+)"/g)].map(m => m[1]) : [],
    density: density ? density[1] : null,
    cap: cap ? stripTags(cap[1]) : null,
    label: label ? Number(label[1]) : null,
    /* canonical 只比 pathname：绝对地址由 PUBLIC_SITE 拼一份，判据不许依赖域名 */
    canonPath: canon ? (() => { try { return new URL(canon[1]).pathname; } catch { return null; } })() : undefined,
    pageHrefs: [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(isPageHref),
  };
}
/* 一棵树读成"有哪些页"：第 1 页固定是 essays/index.html，第 n 页是 essays/page/<n>/index.html。
   命名空间里多出来的东西（非数字目录、页码根下没有 index.html、`/essays/page/1/`、命名空间根下那枚
   index.html）**原样交回**由 judge 点名——前一种半截页与那一枚撞名的稿件在产物侧是同一个形状。 */
function collectTree(dist){
  const pages = [];
  const junk = [];
  const first = join(dist, 'essays', 'index.html');
  if (existsSync(first)) pages.push(readPage(first, pageHref(1), 1));
  const ns = join(dist, 'essays', ESSAYS_PAGE_NS);
  if (existsSync(ns)){
    for (const f of readdirSync(ns, { withFileTypes: true }).filter(x => !x.isDirectory())) junk.push(`/essays/${ESSAYS_PAGE_NS}/${f.name}`);
    for (const e of readdirSync(ns, { withFileTypes: true })){
      if (!e.isDirectory()) continue;
      if (!/^[1-9]\d*$/.test(e.name)){ junk.push(`/essays/${ESSAYS_PAGE_NS}/${e.name}/（不像页码的目录名）`); continue; }
      const n = Number(e.name);
      if (n === 1){ junk.push(`${pageHref(1)}（第 1 页是 /essays/ 本身，不许有 /essays/page/1/ 这种重复地址）`); continue; }
      const at = join(ns, e.name, 'index.html');
      if (!existsSync(at)){ junk.push(`/essays/${ESSAYS_PAGE_NS}/${n}/（有目录、没有 index.html——半截页）`); continue; }
      pages.push(readPage(at, pageHref(n), n));
    }
  }
  pages.sort((a, b) => a.page - b.page);
  const locs = [];
  if (existsSync(dist)) for (const f of readdirSync(dist).filter(x => /^sitemap-.*\.xml$/i.test(x)))
    for (const m of readFileSync(join(dist, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)){
      try { locs.push(new URL(m[1]).pathname); } catch { locs.push(null); }
    }
  const feeds = {};
  if (existsSync(dist)) for (const f of ['rss.xml', 'atom.xml']){
    const p = join(dist, f);
    if (!existsSync(p)){ feeds[f] = null; continue; }
    const txt = readFileSync(p, 'utf8');
    feeds[f] = { hrefs: [...txt.matchAll(/href="([^"]*)"/g)].map(m => m[1])
      .concat([...txt.matchAll(/<link>([^<]*)<\/link>/g)].map(m => m[1])) };
  }
  return { pages, junk, locs, feeds };
}

/* 那句图例里的"几个月有更新"：窗口从**产物句子里**读（`近 12 个月 · YYYY.MM → YYYY.MM`），
   不拿本工具跑的那一刻算——那样跨月重跑判据会自己漂（一把随时间漂的尺子读不出任何东西）。 */
function wroteInWindow(list, dmap, cap){
  const m = /近 12 个月 · (\d{4})\.(\d{2}) → (\d{4})\.(\d{2})/.exec(cap || '');
  if (!m) return null;
  const y0 = Number(m[1]), m0 = Number(m[2]) - 1;
  const inWindow = new Set();
  for (let i = 0; i < 12; i++){
    const d = new Date(Date.UTC(y0, m0 + i, 1));
    inWindow.add(`${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}`);
  }
  const seen = new Set();
  for (const id of list){
    const d = dmap.get(id);
    if (!d) continue;
    const k = `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}`;
    if (inWindow.has(k)) seen.add(k);
  }
  return seen.size;
}

/* ---------- judge：一棵树 ⇄ 一份名单 ÷ 每页容量 ----------
   ①的夹具与②③④的真产物吃的是**同一套**。它只交回问题清单、不打印也不退出，
   这样"合法档零红／坏档每种必红"两侧都能拿它当众验。 */
function judge(tree, list, per, dmap){
  const bad = [];
  const ranges = pageRanges(list.length, per);
  const expectPages = ranges.map(r => r.page);
  const byNum = new Map(tree.pages.map(p => [p.page, p]));
  const base = byNum.get(1);
  /* 页集 ⇄ 期望页集：多一枚少一枚都红（"多生成一空页"与"少生成一页"在这一格分不开就别想两枚都拦住） */
  for (const n of expectPages) if (!byNum.has(n)) bad.push(`第 ${n} 页不在盘上（期望 ${expectPages.join('/')} 页，实到 ${tree.pages.map(p => p.page).join('/') || '零页'}）`);
  for (const p of tree.pages) if (!expectPages.includes(p.page)) bad.push(`${p.href} 在盘上，却不属于 ${list.length} 篇 ÷ 每页 ${per} 行切出来的 ${ranges.length} 页（多出来的一页）`);
  for (const j of tree.junk) bad.push(`分页命名空间 /essays/${ESSAYS_PAGE_NS}/ 里读出不像一页的东西：${j} —— 那一段是保留字，这一枚要么是一篇撞名的稿子、要么是半截页（§15 那一格，机器牙在 new-post --check）`);
  if (!base) bad.push('第 1 页 /essays/ 不在盘上 ⇒ 本卡所有判据没有对象');
  const flat = [];
  for (const r of ranges){
    const p = byNum.get(r.page);
    if (!p) continue;
    if (list.length > 0 && p.rows.length === 0){ bad.push(`${p.href} 是一页**空目录**（零行）——能访问、读不出东西，§12 那条"关掉之后不留活壳"`); continue; }
    if (p.rows.length !== r.to - r.from) bad.push(`${p.href} 读出 ${p.rows.length} 行，这一页应该是 ${r.to - r.from} 行（前 ${Math.max(0, ranges.length - 1)} 页装满、末页留余数；每页 ${per} 行）`);
    flat.push(...p.rows);
    /* 门牌是**整份目录**里第几行，不是这一页第几行 ⇒ 跨页连号 */
    const wantFolio = Array.from({ length: r.to - r.from }, (_, i) => pad(r.from + i + 1)).join(' ');
    if (p.folios.map(pad).join(' ') !== wantFolio) bad.push(`${p.href} 的门牌读出来是 ${p.folios.map(pad).join(' ')}，应该是 ${wantFolio} —— 翻页之后重新从 01 数起＝两页各数各的，那是第二把尺（§15 那条"门牌跨分节也连号"扩到跨页）`);
    /* 年分节跟着本页那几行：一年的行被页界切开时，两页各写一次那一年（那是"这一页里有这几行"的事实，不是第二把尺） */
    const wantYears = [];
    for (const id of p.rows){
      const d = dmap.get(id);
      if (!d) continue;
      const y = String(d.getUTCFullYear());
      if (wantYears[wantYears.length - 1] !== y) wantYears.push(y);
    }
    if (p.years.join(' ') !== wantYears.join(' ')) bad.push(`${p.href} 的年分节是 ${p.years.join(' ') || '（一枚都没有）'}，本页那几行按年分应该是 ${wantYears.join(' ')} —— §15 那条"年份只写一次"跟着数组走，翻页不许把它翻乱`);
    /* 一把尺子读整份名单：各页的尺身字节必须与第 1 页逐位相同 */
    if (p.density === null) bad.push(`${p.href} 读不到那把密度尺（<span class="density"> 那一块）⇒ 尺子的判据在这一页没有对象`);
    else if (p.page !== 1 && base && p.density !== base.density) bad.push(`${p.href} 的密度尺身与第 1 页不是同一串字节 ⇒ 这一页在给自己画一把尺子（那把尺会随页数漂移，§15 那条）`);
    /* 句子里那两个数：整份名单的算法值，不是本页行数 */
    const capNums = /（(\d+) 个月有更新，共 (\d+) 篇）/.exec(p.cap || '');
    if (!capNums) bad.push(`${p.href} 的 .density-cap 那句读不出"（W 个月有更新，共 N 篇）"⇒ 图例那一格的判据没有对象`);
    else {
      if (Number(capNums[2]) !== list.length) bad.push(`${p.href} 的图例写"共 ${capNums[2]} 篇"，整份名单是 ${list.length} 篇 ⇒ 那一句数的是本页那几行，不是整份目录（每页一把假尺的形状）`);
      const w = wroteInWindow(list, dmap, p.cap);
      if (w === null) bad.push(`${p.href} 的图例读不出"近 12 个月 · YYYY.MM → YYYY.MM"那扇窗口`);
      else if (Number(capNums[1]) !== w) bad.push(`${p.href} 的图例写 ${capNums[1]} 个月有更新，按整份名单与句子里那扇窗口算是 ${w} 个月`);
    }
    if (p.label === null) bad.push(`${p.href} 读不到扉页那一行 "essays — <b>NN</b>"`);
    else if (p.label !== list.length) bad.push(`${p.href} 的扉页那行是 essays — ${pad(p.label)}，整份名单是 ${list.length} 篇 ⇒ 那个数应该是目录的枚数，不是这一页的行数`);
    /* canonical 指自己 */
    if (p.canonPath === undefined) bad.push(`${p.href} 没有 <link rel="canonical">`);
    else if (p.canonPath !== p.href) bad.push(`${p.href} 的 canonical 指到 ${p.canonPath === null ? '（读不出）' : p.canonPath} ⇒ 同一份内容两枚地址（§13a 那格钉过的同一族）`);
    /* 翻页那一行 */
    const prev = p.page > 1 ? pageHref(p.page - 1) : null;
    const next = expectPages.includes(p.page + 1) ? pageHref(p.page + 1) : null;
    const wantNav = [prev, next].filter(Boolean);
    if (ranges.length === 1){
      if (p.navHtml !== null) bad.push(`${p.href} 画了翻页那一行，而整份名单只有一页 ⇒ 那一行指向的"另一页"盘上不存在（活锚点）`);
      if (p.pageHrefs.length) bad.push(`${p.href} 里出现 ${p.pageHrefs.join(' ')}，而 /essays/${ESSAYS_PAGE_NS}/** 这一族在"一页装完"那一态一枚都不该被引用（§12 那条"关掉之后不留活壳"）`);
    } else {
      if (p.navHtml === null) bad.push(`${p.href} 没有翻页那一行，而整份名单切成 ${ranges.length} 页 ⇒ 读者在这一页出不去`);
      else {
        const got = p.navHrefs;
        if (new Set(got).size !== got.length) bad.push(`${p.href} 的翻页那一行里同一枚地址出现两遍：${got.join(' ')}`);
        for (const h of wantNav) if (!got.includes(h)) bad.push(`${p.href} 的翻页那一行少了 ${h}（${h === prev ? '上一页' : '下一页'}）——少一枚就是这一页把读者关在里面`);
        for (const h of got) if (!wantNav.includes(h)) bad.push(`${p.href} 的翻页那一行多出 ${h}，而它不是这一页的邻居${h === pageHref(p.page + 1) && !next ? '（末页没有下一页）' : ''}`);
        const text = stripTags(p.navHtml).trim();
        if (!text.includes(`目录第 ${p.page} 页 · 共 ${ranges.length} 页`)) bad.push(`${p.href} 的翻页那一行写的是"${text.slice(0, 44)}"，与页码对不上（应当是"目录第 ${p.page} 页 · 共 ${ranges.length} 页"）`);
      }
      for (const h of new Set(p.pageHrefs)){
        const n = Number(/(\d+)\/$/.exec(h)[1]);
        if (!expectPages.includes(n)) bad.push(`${p.href} 里有一枚指向 ${h} 的链接，那一页不属于切出来的 ${ranges.length} 页`);
        else if (!byNum.has(n)) bad.push(`${p.href} 里有一枚指向 ${h} 的链接，而盘上没有那一页的产物 —— 死锚点的产物级版（§12）`);
      }
    }
  }
  /* 不重不漏，逐枚 slug 比（页与页的篇数之和 ⇄ 整份名单） */
  if (flat.join(' ') !== list.join(' ')) bad.push(`各页的行按页序拼起来是 ${flat.join(' ') || '（零枚）'}，整份名单是 ${list.join(' ')} ⇒ 分页吞了一枚、重复了一枚、或自己排了序（名单与顺序只许住在 visiblePosts()）`);
  /* 非第 1 页进 sitemap；feed 里一枚页都不许有 */
  if (tree.locs.length === 0) bad.push('盘上一枚 sitemap-*.xml 的 <loc> 都没读到 ⇒ "每页进 sitemap"这一格没有对象（读不到不等于全过）');
  else for (const p of tree.pages){
    const n = tree.locs.filter(x => x === p.href).length;
    if (n !== 1) bad.push(`${p.href} 在 sitemap 里出现 ${n} 次（应当恰好 1 次）——它是盘上真存在的一页：不进＝替读者说"这条路不存在"，两枚＝同一页两枚地址`);
  }
  for (const [f, feed] of Object.entries(tree.feeds)){
    if (!feed){ bad.push(`dist/${f} 不在 ⇒ "分页不进 feed"这一格没有对象`); continue; }
    const hits = feed.hrefs.filter(h => isPageHref(h));
    if (hits.length) bad.push(`dist/${f} 里出现 ${hits.join(' ')}：订阅源的条目是一篇篇稿子，"第几页"不是一篇稿子（口径在 §15 那一格）`);
  }
  return bad;
}

/* ---------- 夹具：造一棵产物树（HTML，不是稿件）---------- */
function fixtureTree(dir, { list, per, dmap, mutate = null, name = 'fix' }){
  const ranges = pageRanges(list.length, per);
  const densityBlock = '<span class="tick nil" style="left:calc(0 / 11 * 100%);height:3px"></span><span class="tick now" style="left:calc(11 / 11 * 100%);height:36px"></span>';
  const capText = `近 12 个月 · 2025.10 → 2026.09（${wroteFixture(list, dmap)} 个月有更新，共 ${list.length} 篇）`;
  for (const r of ranges){
    const n = r.page;
    const rows = list.slice(r.from, r.to);
    const yr = [];
    const lis = rows.map((id, i) => {
      const y = String(dmap.get(id).getUTCFullYear());
      if (!yr.length || yr[yr.length - 1] !== y) yr.push(y);
      return `<li><a class="row" href="/essays/${id}/" data-slug="${id}"><span class="folio">${pad(r.from + i + 1)}</span><span class="row-main"><h3>${id}</h3></span></a></li>`;
    }).join('');
    const sections = yr.map(y => `<section class="year-block reveal"><h2 class="year-mark">${y}</h2><ol class="essay-index">${lis}</ol></section>`).join('');
    const prev = n > 1 ? pageHref(n - 1) : null;
    const next = n < ranges.length ? pageHref(n + 1) : null;
    const nav = ranges.length === 1 ? '' : `<nav class="tax-empty" aria-label="目录翻页">目录第 ${n} 页 · 共 ${ranges.length} 页${prev ? ` · <a href="${prev}">← 上一页</a>` : ''}${next ? ` · <a href="${next}">下一页 →</a>` : ''}</nav>`;
    let html = `<!DOCTYPE html><html lang="zh-CN"><head><link rel="canonical" href="https://fixture.test${pageHref(n)}"></head><body><main class="wrap"><header class="page-head reveal"><h1 class="page-title">文章</h1><div class="sec-label">essays — <b>${pad(list.length)}</b> →</div><span class="density-wrap"><span class="density" aria-hidden="true">${densityBlock}</span><span class="density-cap">${capText}</span></span></header>${sections}${nav}</main></body></html>`;
    if (mutate) html = mutate(html, n);
    const file = n === 1 ? join(dir, 'essays', 'index.html') : join(dir, 'essays', ESSAYS_PAGE_NS, String(n), 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, html);
  }
  mkdirSync(join(dir, 'essays', ESSAYS_PAGE_NS), { recursive: true });
  writeFileSync(join(dir, 'sitemap-0.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset>`
    + ranges.map(r => `<url><loc>https://fixture.test${pageHref(r.page)}</loc></url>`).join('') + `</urlset>`);
  writeFileSync(join(dir, 'rss.xml'), `<rss><channel><link>https://fixture.test/</link>${list.map(id => `<item><guid>https://fixture.test/essays/${id}/</guid></item>`).join('')}</channel></rss>`);
  writeFileSync(join(dir, 'atom.xml'), `<feed>${list.map(id => `<entry><id>https://fixture.test/essays/${id}/</id><link>https://fixture.test/essays/${id}/</link></entry>`).join('')}</feed>`);
  return { dir, ranges };
}
/* 夹具那句图例里的 W：窗口写死在夹具里（2025.10 → 2026.09），与本机今天无关 */
function wroteFixture(list, dmap){
  const set = new Set();
  for (const id of list){
    const d = dmap.get(id);
    const k = `${d.getUTCFullYear()}.${pad(d.getUTCMonth() + 1)}`;
    if (k >= '2025.10' && k <= '2026.09') set.add(k);
  }
  return set.size;
}

cell('①', '内置夹具（两侧格子：三态合法档不许误红／八种坏产物每种必须红）＋ shipped 分页函数的在册字面量', () => {
  let n = 0;
  /* —— 手写字面量：地址形状、命名空间、默认容量。这一组期望值是人抄的，不由被测函数派生（§16 那条） —— */
  assert.equal(pageHref(1), '/essays/', '① 第 1 页的地址不是 /essays/ 本身（回归牙的起点：旧地址一个字节都不许动）');
  assert.equal(pageHref(2), '/essays/page/2/', '① 第 2 页的地址形状与在册字面量不符');
  assert.equal(pageHref(3), '/essays/page/3/', '① 第 3 页的地址形状与在册字面量不符');
  assert.equal(ESSAYS_PAGE_NS, 'page', '① 命名空间那一段不再是 "page" ⇒ 路由目录、new-post 的保留字名单与本卡所有期望串全要一起改（漏一处就是两套真值）');
  assert.equal(ESSAYS_PER_PAGE, 3, '① 每页容量的默认值不再是 3 —— 那一枚是 §15 签过字的"与首页那三行同长"，换数要重签');
  assert.equal(essaysPerPage({}), 3, '① 没设旋钮时读到的不是在册默认值');
  assert.equal(essaysPerPage({ ESSAYS_PER_PAGE: '' }), 3, '① 空串旋钮应退回默认值（与 schema 那套"空着＝没填"同口径）');
  assert.equal(essaysPerPage({ ESSAYS_PER_PAGE: '2' }), 2, '① 旋钮读不进整数');
  assert.equal(essaysPerPage({ ESSAYS_PER_PAGE: '0' }), 0, '① 0＝关掉分页这一拍那一档读丢了');
  n += 9;
  for (const bad of ['1.5', '-4', 'abc', '007', '+3'])
    assert.ok(throws(() => essaysPerPage({ ESSAYS_PER_PAGE: bad })), `① 坏旋钮 "${bad}" 被放过了（静默退默认值＝作者拧了旋钮而产物没有反应）`);
  n += 5;

  /* —— pageRanges 的行为表：不重不漏、无空页、末页留余数、0＝不分页、整站零篇只留那一页 —— */
  const TABLE = [
    [[3, 3], [[1, 0, 3]]],
    [[4, 3], [[1, 0, 3], [2, 3, 4]]],
    [[6, 2], [[1, 0, 2], [2, 2, 4], [3, 4, 6]]],
    [[1, 5], [[1, 0, 1]]],
    [[0, 3], [[1, 0, 0]]],
    [[5, 0], [[1, 0, 5]]],
  ];
  for (const [key, want] of TABLE){
    const got = pageRanges(key[0], key[1]);
    assert.deepEqual(got.map(r => [r.page, r.from, r.to]), want, `① pageRanges(${key.join(',')}) 交回的不是在册的切法`);
    const cover = [];
    for (const r of got){
      assert.ok(r.to > r.from || key[0] === 0, `① pageRanges(${key.join(',')}) 交出一枚空区间 ${JSON.stringify(r)}——空页就是从这儿漏出来的`);
      for (let i = r.from; i < r.to; i++) cover.push(i);
    }
    assert.deepEqual(cover, Array.from({ length: key[0] }, (_, i) => i), `① pageRanges(${key.join(',')}) 的区间拼起来不是 0…${key[0] - 1}（不重不漏）`);
    n += 3;
  }
  for (const [t, p] of [[-1, 3], [3, -2], [2.5, 3], [3, 1.5]])
    assert.ok(throws(() => pageRanges(t, p)), `① pageRanges(${t},${p}) 这种输入被放过了`);
  for (const bad of [0, 1.5, -2, '2'])
    assert.ok(throws(() => pageHref(bad)), `① pageHref(${bad}) 这种页码被放过了`);
  n += 8;
  assert.ok(isPageHref('/essays/page/2/') && isPageHref('/essays/page/12/'), '① isPageHref 认不出在册形状');
  assert.ok(!isPageHref('/essays/') && !isPageHref('/essays/page/07/') && !isPageHref('/essays/page/2') && !isPageHref('/essays/page/x/') && !isPageHref('/essays/page/0/'),
    '① isPageHref 认下了不该认的（带前导零的、缺尾斜杠的、非数字的、0 都该拒——/essays/page/1/ 认是认的，它由"期望页集"那一格判红，第 1 页是 /essays/ 本身）');
  n += 2;

  /* —— 两侧格子：同一套收集器 + 同一条 judge() 吃夹具 —— */
  const dmap = new Map([['a', new Date('2026-09-10')], ['b', new Date('2026-09-05')], ['c', new Date('2026-08-20')], ['d', new Date('2026-08-01')]]);
  const tmp = mkdtempSync(join(tmpdir(), 'mistwood-pgfix-'));
  try {
    const build = (spec) => {
      const dir = join(tmp, spec.name);
      mkdirSync(dir, { recursive: true });
      const t = fixtureTree(dir, { dmap, ...spec });
      if (spec.after) spec.after(dir, t);
      return { tree: collectTree(dir), list: spec.list, per: spec.per };
    };
    /* 朝窄：三态合法都不许误红 */
    const LEGAL = [
      { name: 'legal-one', list: ['a', 'b', 'c'], per: 3 },
      { name: 'legal-two', list: ['a', 'b', 'c', 'd'], per: 3 },
      { name: 'legal-off', list: ['a', 'b', 'c', 'd'], per: 0 },
      { name: 'legal-onepage-per1', list: ['a'], per: 1 },
    ];
    for (const spec of LEGAL){
      const { tree, list, per } = build(spec);
      const bad = judge(tree, list, per, dmap);
      assert.deepEqual(bad, [], `① 朝窄：合法档 ${spec.name}（${list.length} 篇 ÷ 每页 ${per}）被误红了：${bad.join(' ／ ')}`);
      n += 1;
    }
    /* 收集器自证（§16 那条"读不到与被读到零长得一样"）：合法两页档必须真读到东西 */
    const probe = build({ name: 'probe', list: ['a', 'b', 'c', 'd'], per: 3 });
    assert.equal(probe.tree.pages.length, 2, '① 收集器在夹具里读不到两页 ⇒ 上面每一格都在读空气');
    assert.deepEqual(probe.tree.pages.map(p => p.rows), [['a', 'b', 'c'], ['d']], '① 收集器读出的行不对（data-slug 那一枚属性读不出来？）');
    assert.deepEqual(probe.tree.pages.map(p => p.folios), [[1, 2, 3], [4]], '① 收集器读门牌失败（跨页连号那一格没有对象）');
    assert.deepEqual(probe.tree.pages.map(p => p.years), [['2026'], ['2026']], '① 收集器读年分节失败');
    assert.equal(probe.tree.pages[1].navHrefs.length, 1, '① 收集器读翻页那一行的 href 失败');
    assert.equal(probe.tree.pages[1].canonPath, '/essays/page/2/', '① 收集器读 canonical 失败');
    assert.equal(probe.tree.pages[1].label, 4, '① 收集器读扉页那个数失败');
    assert.equal(probe.tree.locs.length, 2, '① 收集器读 sitemap 的 <loc> 失败');
    n += 8;

    /* 朝宽：八种坏产物，每种都必须让 judge 报出话（前两种就是本卡点名的"某页少一枚链接／多生成一空页"） */
    const MUT = [
      ['某页少一枚翻页链接', ['a', 'b', 'c', 'd'], 3, h => h.replace(' · <a href="/essays/page/2/">下一页 →</a>', '')],
      ['多生成一空页', ['a', 'b', 'c'], 2, null, (dir, t) => {
        const at = join(dir, 'essays', ESSAYS_PAGE_NS, '3');
        mkdirSync(at, { recursive: true });
        writeFileSync(join(at, 'index.html'), readFileSync(join(t.dir, 'essays', 'index.html'), 'utf8')
          .replace(/<section class="year-block[\s\S]*?<\/section>/g, '').replace(/<nav class="tax-empty"[\s\S]*?<\/nav>/, '')
          .replace(/https:\/\/fixture\.test\/essays\/page\/\d+\//, 'https://fixture.test/essays/page/3/'));
      }],
      ['翻页指向盘上不存在的产物', ['a', 'b', 'c', 'd'], 3, (h, n) => n === 2 ? h.replace('<a href="/essays/">← 上一页</a>', '<a href="/essays/page/9/">← 上一页</a>') : h],
      ['末页多一枚下一页', ['a', 'b', 'c', 'd'], 3, (h, n) => n === 2 ? h.replace('</nav>', '<a href="/essays/page/3/">下一页 →</a></nav>') : h],
      ['某页 canonical 指到别页', ['a', 'b', 'c', 'd'], 3, (h, n) => n === 2 ? h.replace('https://fixture.test/essays/page/2/', 'https://fixture.test/essays/') : h],
      ['每页各画一把尺子', ['a', 'b', 'c', 'd'], 3, (h, n) => n === 2 ? h.replace('共 4 篇', '共 1 篇').replace(/<span class="density" aria-hidden="true">[\s\S]*?<\/span><span class="density-cap">/, '<span class="density" aria-hidden="true">本页那几行</span><span class="density-cap">') : h],
      ['某一页少了一枚 slug', ['a', 'b', 'c', 'd'], 3, h => h.replace(/<li><a class="row" href="\/essays\/d\/"[\s\S]*?<\/li>/, '')],
      ['sitemap 少一枚页', ['a', 'b', 'c', 'd'], 3, null, (dir) => {
        writeFileSync(join(dir, 'sitemap-0.xml'), readFileSync(join(dir, 'sitemap-0.xml'), 'utf8')
          .replace(`<url><loc>https://fixture.test${pageHref(2)}</loc></url>`, ''));
      }],
    ];
    for (let i = 0; i < MUT.length; i++){
      const [what, list, per, mutate, after] = MUT[i];
      const { tree } = build({ name: `mut${i}`, list, per, mutate, after });
      const bad = judge(tree, list, per, dmap);
      assert.ok(bad.length, `① 朝宽：坏产物「${what}」没有让 judge 报任何一条 ⇒ 这一族的判据只在好数据上跑过，根本不知道有没有牙`);
      n += 1;
      if (process.argv.includes('--verbose-mut')) console.log(`    夹具「${what}」报出 ${bad.length} 条：${bad[0].slice(0, 110)}`);
    }
    /* 再钉一枚方向相反的：一页装完那一态如果硬塞一枚 /essays/page/2/ 的链接，必须红（今天这一态的活壳判据） */
    const shell = build({ name: 'shell', list: ['a', 'b', 'c'], per: 3, mutate: h => h.replace('</main>', '<nav class="tax-empty">目录第 1 页 · 共 1 页 · <a href="/essays/page/2/">下一页 →</a></nav></main>') });
    assert.ok(judge(shell.tree, ['a', 'b', 'c'], 3, dmap).length, '① 朝宽：一页装完那一态被塞进一枚指向不存在页的翻页壳，judge 没响');
    n += 1;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  notes.push('① 夹具：四种合法态（一页／两页／旋钮 0／单篇）各 0 红 ＋ 八种坏产物各红一次 ＋ 收集器自证 8 条；'
    + '在册字面量 /essays/ ⇄ /essays/page/2/ ⇄ /essays/page/3/、命名空间 page、默认容量 3');
  return n;
});

/* ---------- ② 真产物：同一套 judge 吃 dist ---------- */
const REAL = existsSync(DIST) ? collectTree(DIST) : null;
/* ②③④ 读的是产物：`--selftest` 那一档跳过它们（只跑 ① 与⑤，干净检出没 build 也能验夹具）。
   ⚠️ 跳过时当众印一行——"没跑"与"跑了全绿"在两串输出里不许长成同一个样子（§16 那条）。 */
if (!SELFTEST){
cell('②', `真产物逐页对账：各页行拼起来 ⇄ 整份名单 ${roster.length} 篇 ÷ 每页 ${PER === 0 ? '0（不分页那一档）' : PER} 行`, () => {
  assert.ok(REAL, '② dist/ 不存在 —— 这一格没有对象');
  const bad = judge(REAL, roster, PER, ROSTER_DATES);
  for (const b of bad) problems.push(`② ${b}`);
  for (const p of REAL.pages) listing.push(`  第 ${p.page} 页 ${p.href}：${p.rows.length} 行（${p.rows.join(' ')}）· 门牌 ${p.folios.map(pad).join(' ')} · 年 ${p.years.join(' ') || '—'} · canonical ${p.canonPath ?? '（无）'} · 翻页 ${p.navHrefs.join(' ') || '（没有这一行）'}`);
  const sum = REAL.pages.reduce((a, p) => a + p.rows.length, 0);
  notes.push(`② 页数 ${REAL.pages.length} · 各页行数之和 ${sum} ⇄ 名单 ${roster.length}（逐枚 slug 比）· 命名空间里不像一页的东西 ${REAL.junk.length} 枚`);
  return REAL.pages.length + 1 + roster.length;
});

/* ---------- ③ 读得到（防空转）：真产物上必须读到那些字节 ---------- */
cell('③', '判据读得到被测对象：dist 里有目录页、页里有行、尺身与图例都读得出（针）', () => {
  assert.ok(REAL, '③ dist/ 不存在');
  const p1 = REAL.pages.find(p => p.page === 1);
  assert.ok(p1, '③ 第 1 页 /essays/ 读不到 ⇒ 整条判据在空转');
  /* 在册开口形状：页头那枚 `head-essays` 修饰类是 §2.1 子页雾线族的宿主锚（`v5b/heads`，规范 §13b 那一格），
     写死整串类名而不是放宽成通配——模板换宿主时这一格必须当众红一次，逼人来核对全部正则。 */
  assert.ok(/<main class="wrap"><header class="page-head reveal head-essays">/.test(p1.html), '③ 第 1 页的 <main> 开口形状与在册序列不符（在册＝`page-head reveal head-essays`；模板换了宿主 ⇒ 本卡所有正则要一起核对）');
  /* 干净检出＝模板出厂态（零篇可见稿）那一档第 1 页本来就该零行，所以这一枚针判的是**两向相等**，不是放宽：
     名单非空而页里读不出行＝收集器瞎了（针落空）；名单为空而页上有行＝产物给自己造内容（§12 禁假稿）。 */
  assert.equal(p1.rows.length > 0, roster.length > 0, `③ 第 1 页读出 ${p1.rows.length} 行，整份名单是 ${roster.length} 篇——两向都不许单边：零稿而页上有行＝造内容，有稿而读不出行＝收集器读不到 data-slug`);
  assert.ok(p1.density !== null, '③ 第 1 页读不到密度尺那一块 ⇒ ④"各页同一把尺"那一格在空转');
  assert.ok(p1.cap && p1.cap.length > 0, '③ 第 1 页读不到图例那句 ⇒ "共 N 篇"那一格在空转');
  assert.ok(p1.label !== null, '③ 第 1 页读不到扉页那个数');
  if (roster.length === 0) notes.push('③ 针全过，但今天整站零篇 ⇒ ② 的行判据没有对象（这一行必须当众印出来）');
  return 6;
});

/* ---------- ④ 第 1 页 ⇄ 不分页（本卡的回归牙）---------- */
cell('④', '第 1 页与不分页那一版逐字节相同：结构序列在册 ＋ 一页装完时分页壳零枚 ＋ --reference 那一档', () => {
  assert.ok(REAL, '④ dist/ 不存在');
  const p1 = REAL.pages.find(p => p.page === 1);
  assert.ok(p1, '④ 第 1 页不在');
  let n = 0;
  /* (a) <main> 的直接子元素序列：页头 → 年分节×G → （可选）翻页那一行 → 收。不许多出任何包裹层。 */
  const inner = p1.html.slice(p1.html.indexOf('<main class="wrap">') + '<main class="wrap">'.length, p1.html.indexOf('</main>'));
  const tops = [];
  let depth = 0;
  /* 空元素（`<input>`／`<img>` 那一族）自己不开层：SearchEntry 就带一枚 input，把它算进深度就永远
     回不到 0，`<section>` 会整个看不见——那是一把读不到被测对象的尺子（§16 记过的那一族）。 */
  const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'path', 'circle']);
  const tagRe = /<(\/?)(header|section|nav|div|p|ol|ul|span|h1|h2|h3|li|a|img|time|button|input|label|svg|circle|path)\b[^>]*?(\/?)>/g;
  for (const m of inner.matchAll(tagRe)){
    /* ⚠️ 四轮 §4-3（同心环归档）改的就是这一行，而且只改这一行：空元素的**闭合 tag** 过去也减一次深度，
       而它的开标签从来没加过（上面那枚 `VOID` 只在开标签那一侧查）——这是一枚左右不对称的账。
       它以前读不出来，是因为本工具只读 `/essays/` 那几页，而那些页的 `<main>` 里今天一枚 `<circle>` 都没有
       （改动前实测：`dist/essays/index.html` 的 `<main>` 里 `<circle>` 0 枚、`<path>` 0 枚——全站那八枚 SVG
       都在 `<main>` 之外或别的页上：`about` 页 `<main>` 里那 5 枚 `.w-dot` 没有一把尺读过它）。
       这一卡是本仓第一枚往 `/essays/` 的 `<main>` 里画 `<circle>` 的东西 ⇒ 本卡不躲它：不改钉法、
       不放宽 `wantSeq`、也不把环挪出页头，只把那一枚多减的账补回来。判据的强度一处没动——
       `uniqTops` 仍旧必须逐位等于 `wantSeq`（多一枚包裹层、少一枚 `section` 都照样红：
       本轮拿变异过的产物各跑过一次，两条红名分别指着 `<div>` 与 `section`，见回执）。 */
    if (m[1] === '/'){ if (depth > 0 && !VOID.has(m[2])) depth--; continue; }
    if (depth === 0) tops.push(m[2]);
    if (!VOID.has(m[2]) && m[3] !== '/') depth++;
  }
  /* 在册序列由名单枚数现算：0 篇那一档 `byYear` 是空的 ⇒ 年分节整块不落（§15 那一格签过），`<main>` 的直接子元素只剩 `<header>`。
     ⚠️ 这不是"有没有 section 都行"——名单非空而序列里缺 `section` 当场红，多出一层包裹也当场红。 */
  const wantSeq = RANGES.length > 1 ? ['header', 'section', 'nav'] : roster.length === 0 ? ['header'] : ['header', 'section'];
  const uniqTops = [...new Set(tops)];
  assert.deepEqual(uniqTops, wantSeq, `④ 第 1 页 <main> 的直接子元素种类是 ${uniqTops.join('/') || '（空）'}，在册是 ${wantSeq.join('/')} ⇒ 分页多带了一层包裹（那一层就是"第 1 页变了样"）`);
  n += 1;
  /* (b) 一页装完那一态：分页壳零枚（这一条是"不许留活壳"，也是第 1 页与不分页那一版相同的前提） */
  if (RANGES.length === 1){
    assert.equal(p1.pageHrefs.length, 0, `④ 一页装完那一态里第 1 页出现 ${p1.pageHrefs.join(' ')} —— 分页那一拍不该在产物里留下任何字节`);
    assert.equal(p1.navHtml, null, '④ 一页装完那一态里第 1 页画了翻页那一行');
    assert.ok(!p1.html.includes(`href="/essays/${ESSAYS_PAGE_NS}/`), '④ 第 1 页里出现 /essays/page/ 那一串字节');
    n += 3;
  } else {
    assert.ok(p1.navHtml !== null, `④ 名单切成 ${RANGES.length} 页，第 1 页却没有翻页那一行`);
    n += 1;
  }
  /* (c) --reference=<另一棵 dist>：那一档必须是"不分页"（ESSAYS_PER_PAGE=0）构建出来的同一棵源码树 */
  if (REFERENCE){
    const refFirst = join(REFERENCE, 'essays', 'index.html');
    assert.ok(existsSync(refFirst), `④c --reference 指到 ${REFERENCE}，那里没有 essays/index.html —— 参照档不存在不是"跳过"，是判据没有对象`);
    const ref = readFileSync(refFirst);
    const refHtml = ref.toString('utf8').replace(/<!--[\s\S]*?-->/g, ' ');
    const refSlugs = [...refHtml.matchAll(/data-slug="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(refSlugs, p1.rows, `④c 参照档第 1 页的行是 ${refSlugs.join(' ')}，本侧是 ${p1.rows.join(' ')} ⇒ 参照不是同一份名单（拿一份不同内容的 dist 当参照，比出来的字节不算回归）`);
    const same = Buffer.compare(ref, p1.raw) === 0;
    assert.ok(same, `④c 参照档（不分页那一档）的第 1 页与本侧第 1 页字节不同（参照 ${ref.length}B ⇄ 本侧 ${p1.raw.length}B）：`
      + '分页那一拍在不该出现的时候改到了第 1 页的字节——先定位差异，别把这一格调宽');
    n += 2;
    notes.push(`④c 跑了：${REFERENCE}/essays/index.html（不分页那一档）⇄ 本侧第 1 页，${ref.length} 字节逐位相同`);
  } else {
    notes.push('④c **没跑**（没带 --reference=<dir>）：要跑就 `ESSAYS_PER_PAGE=0 npm run build` 到另一棵 dist（或先把当前 dist 拷走）再带这一枚旗。'
      + '今天这一态（一页装完）由 ④a/④b 的结构判据代跑，逐字节那一档由本轮 §15 记的实测代跑一次。');
  }
  return n;
});

/* ---------- ⑤ 同源绊线（源码级）：机制只有一份实现 ---------- */
} else {
  notes.push('②③④ **没跑**（--selftest 只跑 ① 夹具与 ⑤ 同源绊线，不读 dist/）⇒ 这一档不是发布前的读数，日常与 gate 都跑全五格');
}
cell('⑤', '分页只有一份实现：两枚路由在位、共用一份模板；切页与地址只住在 pagination.js；旋钮只读一次', () => {
  const code = s => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const read = f => code(readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n'));
  const count = (s, re) => (s.match(re) || []).length;
  const idx = read('src/pages/essays/index.astro');
  const pager = read('src/pages/essays/page/[n].astro');
  const tpl = read('src/components/EssayIndex.astro');
  assert.ok(/EssayIndex/.test(idx) && /page=\{1\}/.test(idx), '⑤ src/pages/essays/index.astro 不再把第 1 页交给共用模板 ⇒ 两页两套排版的形状回来了');
  assert.ok(/EssayIndex/.test(pager) && /getStaticPaths/.test(pager) && /ranges\.slice\(1\)/.test(pager),
    '⑤ src/pages/essays/page/[n].astro 的 getStaticPaths 不再交 ranges.slice(1) ⇒ 第 1 页会被建两遍，或者末页开始发空页');
  assert.ok(/visiblePosts\s*\(/.test(idx) && /visiblePosts\s*\(/.test(pager), '⑤ 两枚路由里少了一处 visiblePosts()（名单只许由它交进来，见 taxonomy-check ②）');
  assert.ok(!/pageRanges|pageHref|essaysPerPage/.test(idx), '⑤ 第 1 页那一枚路由自己在算页 ⇒ 页码算了两遍（切法只住在 pagination.js 与模板那一处）');
  assert.equal(count(tpl, /class="density"/g), 1, '⑤ 模板里那把密度尺出现不止一次 ⇒ 一份模板自己就画了两把尺');
  assert.ok(count(tpl, /pageRanges\s*\(/g) === 1 && count(tpl, /posts\.slice\s*\(/g) === 1,
    '⑤ 模板里的切页那一行不止一处（或行区间不是由 pageRanges 交的区间切出来的）');
  assert.equal(count(tpl, /data-slug=/g), 1, '⑤ 模板里的目录行写了不止一次 ⇒ 行那一族分叉了');
  assert.ok(/href=\{pageHref\(page - 1\)\}/.test(tpl) && /href=\{pageHref\(page \+ 1\)\}/.test(tpl),
    '⑤ 模板里翻页那两枚 href 不再由 pageHref() 交 ⇒ 页面自己拼地址（① 那些在册字面量就管不到产物了，两处真值的形状回来了）');
  assert.ok(/data-slug=/.test(tpl) && /href=\{`\/essays\/\$\{p\.id\}\/`\}/.test(tpl), '⑤ 模板里的目录行不再指 /essays/<id>/ ⇒ ② 那格的行判据（data-slug）没有对象');
  const pg = read('src/lib/pagination.js');
  assert.equal(count(pg, /\benv\.ESSAYS_PER_PAGE\b/g), 1, '⑤ pagination.js 里读旋钮的地方不止一处 ⇒ 同一枚 ESSAYS_PER_PAGE 在两处各有各的读法');
  assert.equal(count(pg, /process\.env\b/g), 1, '⑤ 取环境那一步不在"一枚函数的默认参数"里 ⇒ 旋钮变成了随处可取的隐式状态（页面读到 3、判据读到别的数）');
  assert.ok(!/ESSAYS_PER_PAGE/.test(tpl) && !/ESSAYS_PER_PAGE/.test(read('src/pages/essays/index.astro')), '⑤ 页面那一侧自己读起了旋钮 ⇒ 构建期开关有了第二处消费者');
  assert.ok(/export const ESSAYS_PAGE_NS = 'page'/.test(pg), '⑤ pagination.js 不再交出那枚命名空间常量 ⇒ new-post 的保留字名单与本卡都在吃空气');
  const np = read('tools/new-post.mjs');
  assert.ok(/ESSAYS_PAGE_NS/.test(np), '⑤ tools/new-post.mjs 的保留字名单不再 import 命名空间常量（抄了字面量＝两处真值，路由改名时名单不会跟着改）');
  assert.ok(!/import .*from .*lib\/posts\.js/.test(tpl), '⑤ 模板自己去 import 读函数（名单必须由调用方交进来，见 taxonomy-check ② 那一格）');
  return 13;
});

/* ---------- 打印 ---------- */
if (!SELFTEST){
  if (!existsSync(join(DIST, 'index.html')))
    die(`没有产物 ${join(DIST, 'index.html')}`, '  先 `npm run build`；本卡读 dist/，排在 build 之后（§16 分层）。缺产物时报红不是跳过。');
  if (!existsSync(join(DIST, 'essays', 'index.html')))
    die(`没有产物 ${join(DIST, 'essays', 'index.html')}`, '  build 绿而 /essays/ 不在——那不是"没有分页页"，是整格判据没有对象。');
}
if (args.includes('--list')){
  console.log('  逐页账目（行数／门牌／年分节／canonical／翻页）：');
  for (const l of listing) console.log(l);
  if (!listing.length) console.log('  （一枚页都没读到）');
}
for (const nt of notes) console.log(`  ${nt}`);
console.log(`  账目：旋钮 ESSAYS_PER_PAGE ${process.env.ESSAYS_PER_PAGE === undefined ? '没设 ⇒ 在册默认值' : `"${process.env.ESSAYS_PER_PAGE}"`} ⇒ 每页 ${PER} 行 · `
  + `整份名单 ${roster.length} 篇（已发布 ${published.length} 篇，其中不列入 ${published.length - visible.length} 篇已被滤掉）⇒ 期望 ${RANGES.length} 页 · `
  + `盘上 ${REAL ? REAL.pages.length : 0} 页（${REAL ? REAL.pages.map(p => `${p.page}:${p.rows.length}行`).join(' ') : '读不到'}）`);
if (problems.length){
  console.log(`\n✗ pagination-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log(`\n✓ /essays/ 分页：五格共 ${asserted} 条断言全过——各页行拼起来等于整份名单、翻页只指盘上真存在的产物、没有空页、一把尺子读整份目录、第 1 页没被分页改动`);
