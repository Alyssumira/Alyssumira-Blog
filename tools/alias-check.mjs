/* alias-check.mjs —— 「旧地址仍然能到达」那一族的**产物级**对账（第十七轮 `card/aliases`）
   用法  npm run build && node tools/alias-check.mjs
         node tools/alias-check.mjs --list    （外加打印在册的旧地址名单，一枚都没有时也照样打一行）
         node tools/alias-check.mjs --dist=<dir>   （换产物目录，变异测试用；指向空目录 ⇒ 当场死，不许跳过）

   ── 它管哪几件事 ────────────────────────────────────────────────────────────
   ① **名单 ⇄ 产物（两向）**：名单按 `src/content/posts/*.md` 的 front matter **现算**
      （`tools/frontmatter.mjs` 的 `readTaxonomy` ＋ `src/lib/taxonomy.js` 的 `aliasesOf`/`isDraft`/`isUnlisted`，
      两份都不碰 `astro:content`——页面、`astro.config.mjs` 与门禁吃的是同一份判据；§16 那条"门禁一套算法、
      页面一套算法，然后两边各自赦免同一个错"防的就是这个）。朝少＝在册的旧地址没有真跳转页就红；
      朝多＝`dist/` 里冒出一枚名单外的跳转页也红。**本卡最需要的那颗牙是朝少这一侧**：旧地址被更高优先级的
      路由抢掉时 `astro build` 只打印一行 `[WARN] Could not render … as it conflicts with higher priority route …`
      并**静默丢掉那一枚文件**，退出码仍是 0（2026-09-30 实测，读数登记在 §15 alias 那一格）。
   ② **形态**：每一枚在册产物必须真的是 `Astro.redirect()` 烘出来的那一枚模板——meta refresh 的秒数与目标、
      `noindex`、canonical 的 pathname、那枚兜底 `<a href>`，四样逐枚读出来对账。
   ③ **目标必须是真地址**（§12"死锚点"那一族的产物版）：跳转目标那枚详情页必须在 `dist/` 里真存在、
      不是第二枚跳转页，而且目标稿件必须是**可见**稿件（草稿根本没有页；不列入不该有第二个入口）。
   ④ **不进第二套真值**：旧地址在 `sitemap-0.xml`／`sitemap-index.xml`／`rss.xml`／`atom.xml`／`search.json`／
      `llms.txt` 各 **0 次**，且 `dist/` 里没有任何一份产物的 `<a href>` 指向它。
      ⚠️ 分工照 `feed-check` 那一格的写法：`tools/runtime-check.mjs` 的 `pointsTo` 管的是"**不列入的稿件**
      不许被指到"（本轮把她也扩到认得旧地址——指到某篇稿子的旧地址＝指到那一篇）；这里管的是"**旧地址本身**
      不许被站内任何一处指到"。两处各扫一遍就是两把尺子比谁更宽，所以各自点名自己那一半。
   ⑤ **源侧的坏写法与撞名**：`aliases` 里形状不合格的一项（`/`、带协议头、带 `?`、带扩展名那几枚）必须由人看见
      ——静默丢掉就是"作者写了却看不见"那一族；两篇稿子抢同一枚旧地址同样红（路由侧留名单里第一枚是**确定的**，
      但那不是判据，见 `src/pages/[...alias].astro` 头上那段）。

   ── 分层与落点（§16 那条口径）────────────────────────────────────────────────
   ①②③④ 读 `dist/` ⇒ 只能在 build 之后 ⇒ 它在 `gate` 里、**排在 `feed-check` 之后、两枚要起浏览器的尺子之前**：
   零浏览器、红了当场看得见。塞进 `npm run check` 是禁止的（干净检出没有 `dist/`，红的是环境不是代码）。
   ⑤ 是源码级判据，跟着这把尺子放在这里而不是搬回 `check`：它判的是"名单算得对不对"，必须与 ①②③④ 同源
   ——两处读法一旦分家，"在册 0 枚"与"产物 0 枚"就可能是两把不同的尺各自数出来的 0。
   `tools/new-post.mjs --check` 另有撞名那一格（红在人动手之前），与本格不冲突、不重复算期望值。

   ── 为什么它不许 import 页面那侧的建路代码来算期望值 ────────────────────────
   `runtime-check` 那条老规矩（"尺子不许由被检物自己出"）同样管这里：① 的期望值来自 front matter 与
   `src/lib/taxonomy.js` 的那一枚**纯**读法（`aliasSlot`），而不是来自 `src/pages/[...alias].astro` 的
   `getStaticPaths`——后者要是坏了（比如整段返回空数组），拿它算期望的尺子会跟着一起绿。
   ⓪ 那格的跳转页 fixture 是**手写字面量**（照 2026-09-30 本机落出来的那枚产物抄），不由任何模板派生。 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitFm, readTaxonomy } from './frontmatter.mjs';
import { isDraft, isUnlisted, aliasSlot, aliasesOf } from '../src/lib/taxonomy.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = name => { const m = args.find(a => a.startsWith(`--${name}=`)); return m ? m.slice(name.length + 3) : ''; };
const LIST = args.includes('--list');
const DIST = opt('dist') ? join(ROOT, opt('dist').replace(/^[/\\]+/, '')) : join(ROOT, 'dist');

const problems = [];
const notes = [];
const red = m => problems.push(m);
const die = (m, hint = '') => { console.error(`\n✗ alias-check 出不了结论：${m}${hint ? `\n  ${hint}` : ''}`); process.exit(1); };

if (!existsSync(DIST) || !statSync(DIST).isDirectory()) die(`没有产物目录 ${DIST}`, '⇒ 这一格读 dist/，必须在 npm run build 之后跑（npm run gate 里就在 build 之后）');

/* ---------- 读盘（缺产物就点名，不许静默跳过——§16 那族 dist/dist 空转的坑） ---------- */
const readDist = rel => {
  const p = join(DIST, ...rel.split('/'));
  if (!existsSync(p)) return null;
  try { return readFileSync(p, 'utf8'); } catch { return null; }
};
const stripComments = s => String(s).replace(/<!--[\s\S]*?-->/g, ' ');

/* ---------- 五把小尺子（②③④ 都吃它们；⓪ 拿内置 fixture 验它们还活着） ---------- */
const REFRESH_RE = /\bhttp-equiv\s*=\s*["']?refresh["']?/i;
/* content 的两种属性顺序都读得出来：判据不许把"Astro 恰好是那个顺序"当前提（同 feed-check 那句） */
const refreshOf = txt => [...txt.matchAll(/<meta\b[^>]*>/gi)].filter(t => REFRESH_RE.test(t)).map(t => {
  const c = /content\s*=\s*["']([^"']*)["']/i.exec(t);
  const m = c && /^\s*(\d+)\s*;\s*url=([\s\S]*)$/i.exec(c[1]);
  return m ? { delay: Number(m[1]), url: m[2].trim() } : { delay: null, url: null };
});
const NOINDEX_RE = /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex[^"']*["']/i;
const canonicalOf = txt => [...txt.matchAll(/<link\b[^>]*>/gi)].filter(t => /\brel\s*=\s*["']?canonical["']?/i.test(t))
  .map(t => { const m = /href\s*=\s*["']([^"']*)["']/i.exec(t); return m ? m[1] : ''; });
const hrefsOf = txt => [...txt.matchAll(/<a\b[^>]*?href=(?:"([^"]*)"|'([^']*)')/gi)].map(m => m[1] ?? m[2] ?? '');
/* 归一成"恰好一枚尾斜杠"的 path：与 runtime-check 的 pathOf 同一口径（trailingSlash: ignore 下两种写法都回 200，
   两种都算同一枚地址；绝对地址取回 path 那一段再比）。⓪ 各钉一枚正例与反例。 */
const pathOf = h => {
  let p = String(h).split('#')[0].split('?')[0];
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/]*(.*)$/i.exec(p);
  if (m) p = m[1];
  if (!p.startsWith('/')) p = `/${p}`;
  return `${p.replace(/\/+$/, '')}/`;
};
/* 地址 ⇄ 产物文件的对应，两个方向（本站的 URL 只有目录式一种，§15） */
const fileOf = path => join(DIST, ...path.replace(/^\//, '').replace(/\/$/, '').split('/'), 'index.html');
const relOf = p => '/' + p.slice(DIST.length + 1).split('\\').join('/');
const addrOfRel = rel => pathOf(rel.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '/'));

/* ---------- 名单：按 front matter 现算，不吃 astro:content、不抄硬编码 ---------- */
const POST_DIR = join(ROOT, 'src', 'content', 'posts');
const all = [];
(function walk(dir, rel = ''){
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })){
    const p = join(dir, e.name);
    if (e.isDirectory()){ walk(p, `${rel}${e.name}/`); continue; }
    if (!/\.md$/i.test(e.name)) continue;
    const parsed = splitFm(readFileSync(p, 'utf8'));
    if (!parsed) continue;                    /* 读不到 front matter 的不进名单（照 astro.config 那一格的口径：宁可不判，不许猜） */
    const tax = readTaxonomy(parsed.fmText);
    if (tax.errors.length) continue;          /* 预检会红在这一篇上（new-post --check），这里不重复报，也不替它放行 */
    all.push({ id: `${rel}${e.name.replace(/\.md$/i, '')}`, data: { draft: tax.draft, unlisted: tax.unlisted, aliases: tax.aliases } });
  }
})(POST_DIR);
const visible = all.filter(p => !isDraft(p) && !isUnlisted(p));   /* 与 src/lib/posts.js 的 visiblePosts() 同一问 */
const hidden = all.filter(p => isDraft(p) || isUnlisted(p));      /* 草稿与不列入的：那一族一枚路都不建 */

const wanted = new Map();      /* 在册旧地址 → { to, owner }：该有一枚真跳转页 */
const forbidden = new Map();   /* 声明在草稿／不列入那一批的旧地址 → 该一枚都不在盘上（不留活壳） */
const dupes = [];              /* 跨篇抢同一枚旧地址 */
const badShape = [];           /* aliases 里形状不合格的那几项 */
for (const p of all){
  for (const raw of (p.data.aliases ?? [])){
    const s = aliasSlot(raw);
    if (s.bad) badShape.push(`${p.id}：${s.bad}`);
  }
  for (const path of aliasesOf(p)){
    const to = `/essays/${p.id}/`;
    const prev = wanted.get(path) || forbidden.get(path);
    if (prev){
      if (prev.to !== to) dupes.push(`${path}：${prev.owner} 与 ${p.id} 都声明了同一枚旧地址（路由只会留名单里第一枚 ⇒ 另一篇的访客被悄悄改道）`);
      continue;
    }
    (isDraft(p) || isUnlisted(p) ? forbidden : wanted).set(path, { to, owner: p.id, why: isDraft(p) ? 'draft: true' : 'unlisted: true' });
  }
}

/* ---------- dist 侧：扫全部文本产物，认出"跳转页那一族"的每一件 ---------- */
const arts = [];                                   /* { rel, txt } —— ④ 的全站 href 扫描吃它 */
const found = new Map();                           /* 产物里读到的跳转页地址 → { rel, count, delay, url, noindex, canonical, hrefs } */
(function scan(dir){
  for (const e of readdirSync(dir, { withFileTypes: true })){
    const p = join(dir, e.name);
    if (e.isDirectory()){ scan(p); continue; }
    let buf;
    try { buf = readFileSync(p); } catch (err){ red(`读不开 ${p}（${err.message}）⇒ "没有多余跳转页"这一条不再等于全量，本卡不许算过`); continue; }
    if (buf.includes(0)) continue;                 /* 二进制（png / woff2 / jpg）里不会有 meta refresh */
    const rel = relOf(p);
    const txt = stripComments(buf.toString('utf8'));
    arts.push({ rel, txt });
    const rs = refreshOf(txt);
    if (!rs.length) continue;
    if (!/\.html$/i.test(rel)){
      red(`盘上 ${rel} 里有一枚 meta refresh，却不是一枚 .html 产物 ⇒ 这一族的形态变了，"名单 ⇄ 文件"在这里比不上号`);
      continue;
    }
    found.set(addrOfRel(rel), {
      rel, count: rs.length, delay: rs[0].delay, url: rs[0].url,
      noindex: NOINDEX_RE.test(txt), canonical: canonicalOf(txt), hrefs: hrefsOf(txt),
    });
  }
})(DIST);
if (!arts.length) die(`${DIST} 里一枚文本产物都没读到`, '⇒ 要么没 build，要么 --dist 指错了地方；这一格那些"在册几枚／0 次／0 处"没有对象，不许算过');

/* 机器侧那六份产物：名字＝给人看的，parts＝找文件的，第三枚＝"这一份里本来该不该出现稿件详情页的地址"
   （`sitemap-index.xml` 只列 sitemap 文件自己，所以它进"不许出现旧地址"那一侧、不进正向见证——
   拿它当"读得到在册稿件"的尺子就是必红的假红，§16 那条"假阳性比漏检更糟"教的同一件事） */
const MACHINE = [['sitemap-0.xml', ['sitemap-0.xml'], true], ['sitemap-index.xml', ['sitemap-index.xml'], false],
  ['rss.xml', ['rss.xml'], true], ['atom.xml', ['atom.xml'], true], ['search.json', ['search.json'], true], ['llms.txt', ['llms.txt'], true]];
const machineTxt = new Map();
const machineHasPage = new Set();
for (const [name, parts, hasPage] of MACHINE){
  const t = readDist(parts.join('/'));
  if (t === null) red(`④ ${name} 不在 dist/ ⇒ 那一处"旧地址出现 0 次"没有对象（这一格在空转，不许算过）`);
  else { machineTxt.set(name, stripComments(t)); if (hasPage) machineHasPage.add(name); }
}

/* ---------- ⓪ 自证：内置 fixture，盘上零枚也照跑（§16 那条"扫了但没匹配到"与"全过"长得一样） ---------- */
/* ⚠️ FX_PAGE 是**手抄的产物字面量**（2026-09-30 本机 `astro build` 落出来的那 306 枚字节，模板在
   `node_modules/astro/dist/core/routing/3xx.js`），不由任何模板函数派生——拿被检物自己算期望，
   它坏的时候判据会跟着一起坏（runtime-check 那条老规矩在这里的第三次使用）。 */
const FX_PAGE = '<!doctype html><title>Redirecting to: /essays/needle-probe/</title>'
  + '<meta http-equiv="refresh" content="0;url=/essays/needle-probe/">'
  + '<meta name="robots" content="noindex">'
  + '<link rel="canonical" href="https://mistwood.example.com/essays/needle-probe/">'
  + '<body>\t<a href="/essays/needle-probe/">Redirecting from <code>/needle-old/</code> to <code>/essays/needle-probe/</code></a></body>';
const FX_PLAIN = '<!doctype html><html><head><link rel="canonical" href="https://mistwood.example.com/essays/x/">'
  + '<meta name="robots" content="index, follow"></head><body><a href="/essays/x/">行</a></body></html>';
const FX_NOINDEX = FX_PAGE.replace('<meta name="robots" content="noindex">', '');
const FX_BROKEN = '<meta http-equiv="refresh" content="5">';
function cell0(){
  let n = 0;
  const ok = (c, m) => { n++; if (!c) red(`⓪ 自证：${m} ⇒ 下面那些"在册几枚／0 次／0 处"从此不可信`); };
  /* —— 读法之一：front matter 里那一枚键（该收到的必须收到、不该收到的必须收不到）—— */
  const fmFlow = readTaxonomy(splitFm('---\ntitle: t\ndate: 2026-01-01\naliases: ["/2026/old/", /another/]\n---\n\n正文\n').fmText);
  ok((fmFlow.aliases || []).length === 2, `flow 写法 \`aliases: ["/2026/old/", /another/]\` 读出 ${JSON.stringify(fmFlow.aliases)}，期望两枚 ⇒ 名单永远算成空的，① 会绿在"在册 0 枚"上`);
  ok((fmFlow.aliases || [])[0] === '/2026/old/', `flow 第一项读成 ${JSON.stringify((fmFlow.aliases || [])[0])}`);
  const fmBlock = readTaxonomy(splitFm('---\ntitle: t\ndate: 2026-01-01\naliases:\n  - /a/\n  - /b/\n---\n\n正文\n').fmText);
  ok((fmBlock.aliases || []).join('|') === '/a/|/b/', `block 写法读出 ${JSON.stringify(fmBlock.aliases)}，期望 /a/|/b/`);
  const fmBlank = readTaxonomy(splitFm('---\ntitle: t\ndate: 2026-01-01\naliases:\n---\n\n正文\n').fmText);
  ok((fmBlank.aliases || []).length === 0, `空着的 \`aliases:\` 读出 ${JSON.stringify(fmBlank.aliases)}，期望 0 枚（与没写这一行同解）`);
  const fmEmpty = readTaxonomy(splitFm('---\ntitle: t\ndate: 2026-01-01\naliases: []\n---\n\n正文\n').fmText);
  ok((fmEmpty.aliases || []).length === 0 && !fmEmpty.errors.length, '`aliases: []` 应当是 0 枚且不报错');
  const fmNone = readTaxonomy(splitFm('---\ntitle: t\ndate: 2026-01-01\n---\n\n正文\n').fmText);
  ok((fmNone.aliases || []).length === 0 && !fmNone.errors.length, '没写这一行 ⇒ 0 枚且不报错（"没填＝一枚都不生成"那条口径）');
  /* block 那一路的空项不许消失（`- ` 一行后面什么都没有：它必须成为"点名"而不是"没读到"） */
  const fmGap = readTaxonomy(splitFm('---\ntitle: t\ndate: 2026-01-01\naliases:\n  - /a/\n  -\n---\n\n正文\n').fmText);
  ok((fmGap.aliases || []).length === 2, `block 里那一枚空项被吞了（读出 ${JSON.stringify(fmGap.aliases)}，期望两枚，第二枚是空串）⇒ "作者写了却看不见"那一族`);
  /* —— 读法之二：归一化（正例三枚＋反例十枚）—— */
  ok(aliasSlot('/2026/old').path === '/2026/old/', `aliasSlot("/2026/old") 交出 ${JSON.stringify(aliasSlot('/2026/old'))}，期望 /2026/old/（目录式，尾斜杠补齐）`);
  ok(aliasSlot('bare').path === '/bare/', `aliasSlot("bare") 交出 ${JSON.stringify(aliasSlot('bare'))}，期望 /bare/`);
  ok(aliasSlot('/旧路径/二节/').path === '/旧路径/二节/', '中文旧路径被清掉了——本站的地址不是 ASCII 专属');
  for (const bad of ['/', '', 'https://example.com/a/', '/a?b', '/a#b', '/a b', '../x', './x', '/a.html', '/a%20b']){
    const r = aliasSlot(bad);
    ok(r.path === '' && r.bad !== '', `aliasSlot(${JSON.stringify(bad)}) 交出 ${JSON.stringify(r)}——必须是"没有地址＋一句成因"：静默收下就是替作者改地址，静默丢掉就是"写了却看不见"`);
  }
  /* —— 读法之三：产物形状（②③ 吃的四把小尺子）—— */
  const rs = refreshOf(FX_PAGE);
  ok(rs.length === 1 && rs[0].url === '/essays/needle-probe/' && rs[0].delay === 0,
    `refreshOf(FX_PAGE) 读出 ${JSON.stringify(rs)}，期望一枚、目标 /essays/needle-probe/、0 秒 ⇒ ② 会把每一枚在册跳转页都判成形态不对`);
  ok(refreshOf(FX_PLAIN).length === 0, 'refreshOf 把一枚正常页面读成了跳转页 ⇒ ① 的"朝多"会在每份产物上红');
  const rb = refreshOf(FX_BROKEN);
  ok(rb.length === 1 && rb[0].url === null, 'refreshOf 读不出"有 refresh 却没有 url"那枚坏形状 ⇒ ② 会放过它');
  ok(NOINDEX_RE.test(FX_PAGE) && !NOINDEX_RE.test(FX_NOINDEX), 'noindex 尺子读不到标准写法／或把缺 meta 的那一枚也认了 ⇒ ② 的 noindex 那一格是空的');
  ok(canonicalOf(FX_PAGE).join('|') === 'https://mistwood.example.com/essays/needle-probe/', `canonicalOf(FX_PAGE) 读出 ${JSON.stringify(canonicalOf(FX_PAGE))}`);
  ok(canonicalOf(FX_PLAIN).length === 1, 'canonicalOf 连一枚正常页面上的 canonical 都读不到');
  ok(hrefsOf(FX_PAGE).join('|') === '/essays/needle-probe/', 'hrefsOf 读不到跳转页里那枚 <a href> ⇒ ④ 的全站扫描也一起瞎了');
  ok(!NOINDEX_RE.test('<meta name="description" content="noindex">'), 'noindex 尺子把别的 meta 也认了（判据太宽，会假绿在真正缺 meta 的那一页上）');
  /* —— 读法之四：地址 ⇄ 文件名，两个方向 —— */
  ok(relOf(fileOf('/2026/old/')) === '/2026/old/index.html', `fileOf→relOf 交出 ${relOf(fileOf('/2026/old/'))}，期望 /2026/old/index.html`);
  ok(addrOfRel('/2026/old/index.html') === '/2026/old/' && addrOfRel('/404.html') === '/404/', `addrOfRel 反解不对（${addrOfRel('/2026/old/index.html')} / ${addrOfRel('/404.html')}）⇒ 名单与盘永远比不到一起`);
  /* —— 盘上的正向对象：尺子至少吃到了东西 —— */
  ok(all.length > 0, `posts/ 里读出 ${all.length} 篇稿件 ⇒ 名单根本没吃到东西（目录空着，还是读法坏了？）`);
  ok(visible.length > 0, `可见稿件读出 ${visible.length} 篇`);
  ok(arts.length > 0 && machineTxt.size > 0, `窗口里 ${arts.length} 份文本产物、机器侧 ${machineTxt.size} 份 ⇒ ④ 的两把尺子没有对象`);
  notes.push(`⓪ 自证 ${n} 条：front matter 读法 7 枚 fixture（该收到 flow 2／block 2、空项 1，不该收到 没填／[]／空值）· 归一化正例 3 ＋反例 10 · `
    + `产物形状尺子 7 条 · 地址⇄文件名 2 条 · 窗口 ${arts.length} 份文本产物／${visible.length} 篇可见稿件。`
    + `盘上今天在册 ${wanted.size} 枚——**零枚时"这一格凭什么绿"就是上面这些 fixture 答的**（照 media-check ① 那一格的路子）`);
  return n;
}

/* ---------- ① 名单 ⇄ 产物（两向：朝少与朝多各一组牙） ---------- */
function cell1(){
  const miss = [], asNotAlias = [], extra = [], stole = [];
  for (const [path, w] of wanted){
    if (!existsSync(fileOf(path))){ miss.push(`${path} → ${w.to}（${w.owner}）`); continue; }
    if (!found.has(path)) asNotAlias.push(`${path}（${w.owner}）：那一枚文件在盘上，却**不是跳转页**——`
      + '最常见的一种坏法是这枚地址被更高优先级的路由抢了（build 只 WARN 不红），产物于是是别人的页面');
  }
  for (const path of found.keys()) if (!wanted.has(path)) extra.push(`${path}（产物 ${found.get(path).rel}，目标 ${found.get(path).url ?? '∅'}）`);
  for (const [path, f] of forbidden) if (found.has(path)) stole.push(`${path} → ${f.owner}（${f.why}）`);
  if (miss.length) red(`① 朝少（漏生成）${miss.length} 枚：${miss.slice(0, 6).join('；')}`
    + ' ⇒ 作者声明了旧地址而 dist/ 里没有那一枚文件，旧地址仍然是死的。成因排查顺序：那一枚路径是否被别的路由占了（'
    + '`[WARN] Could not render …`，build 仍 exit 0）、`getStaticPaths` 是否吃了 visiblePosts()、写法是否被 aliasSlot() 判成不合格');
  if (asNotAlias.length) red(`① 朝少（在册却没烘成跳转页）${asNotAlias.length} 枚：${asNotAlias.slice(0, 4).join('；')}`);
  if (stole.length) red(`① 不该生成却生成了 ${stole.length} 枚：${stole.slice(0, 6).join('；')}`
    + ' ⇒ 草稿的旧地址不该存在（详情页根本没建，跳转过去就是一枚死锚）；不列入那一篇的旧地址也不该存在'
    + '（§15 那一格签的是"它自己的地址是唯一入口"，多一枚入口就是推翻那句话——runtime-check 的全站 href 扫描也会在这里红）');
  if (extra.length) red(`① 朝多（名单外的跳转页）${extra.length} 枚：${extra.slice(0, 6).join('；')}`
    + ' ⇒ 名单之外长出来的地址＝第二处真值：旧地址的名单只有一个出处，就是稿件的 front matter。'
    + '手工往 dist/ 塞一枚、或者 `getStaticPaths` 自己多返回了几枚，都是这个形状');
  notes.push(wanted.size
    ? `① 在册 ${wanted.size} 枚旧地址 ⇄ 盘上 ${found.size} 枚跳转页产物：两向相等（漏 ${miss.length}／多 ${extra.length}／不该生成 ${stole.length}／被别的路由占了 ${asNotAlias.length}）✓`
    : `① 在册旧地址 **0 枚**（扫了 ${all.length} 篇稿件的 front matter，${visible.length} 篇可见、${hidden.length} 篇草稿／不列入）⇒ 这一格今天没有对象；`
      + `盘上的跳转页产物 ${found.size} 枚，两边都是 0 才算一致。**这句 0 由 ⓪ 那格当众兜住**：同一枚读法在 fixture 上收到过 flow 两枚与 block 两枚、`
      + `也收不到"没写这一行"与 ` + '`aliases: []`' + `——所以它是"稿子里真没填"，不是"工具读不到那一枚键"（口径照 media-check ② 那句"扫了但没匹配到"）`);
  return 4;
}

/* ---------- ② 形态：那一枚模板真的在页上 ---------- */
function cell2(){
  let n = 0;
  const bad = [];
  for (const [path, w] of wanted){
    const art = found.get(path);
    if (!art) continue;                              /* ① 已经点名"文件不在"，这里不重复报 */
    const why = [];
    if (art.count !== 1) why.push(`meta refresh ${art.count} 枚（应当恰好一枚：两枚就是两个说法）`);
    if (art.delay !== 0) why.push(`refresh 的秒数是 ${art.delay}（应当 0）——实测：` + '`Astro.redirect(to, 301)` 落 0 秒，'
      + '不写状态码与写 302 都落 2 秒（`3xx.js` 里那一句 `status === 302 ? 2 : 0`）。写 2 秒就是让访客盯着一页空壳数两下，而这一族买的是"照样走得进那一篇"');
    if (pathOf(art.url || '') !== pathOf(w.to)) why.push(`refresh 的目标是 ${JSON.stringify(art.url)}，名单里应当是 ${w.to}`);
    if (!art.noindex) why.push('缺 `<meta name="robots" content="noindex">` ⇒ 抓取器会把旧地址当成一篇独立页面收走（第二套真值）');
    if (art.canonical.length !== 1) why.push(`canonical ${art.canonical.length} 枚（应当恰好一枚）——同一页两枚 canonical 迟早一枚真一枚旧（§13a 那一格）`);
    else if (art.canonical[0] && pathOf(art.canonical[0]) !== pathOf(w.to)) why.push(`canonical 的 pathname 是 ${pathOf(art.canonical[0])}，应当等于目标 ${w.to}（绝对地址由 Astro.site 拼一份，这里只比 path）`);
    if (art.hrefs.length !== 1) why.push(`页面里的 <a href> 有 ${art.hrefs.length} 枚（应当恰好一枚：那枚给不执行 refresh 的访客兜底的链接）`);
    else if (pathOf(art.hrefs[0]) !== pathOf(w.to)) why.push(`兜底链接指到 ${JSON.stringify(art.hrefs[0])}，应当是 ${w.to}`);
    if (why.length) bad.push(`${path}：${why.join('；')}`);
    n++;
  }
  if (bad.length) red(`② 形态不合那一枚模板（${bad.length} 枚）：${bad.slice(0, 5).join('　|　')}`
    + '\n     模板的实测形状登记在 §12 那一格与 `src/pages/[...alias].astro` 头上。Astro 换了模板就是这一格先红——这是设计：'
    + '形态判据不许悄悄跟着被检物走');
  notes.push(`② 形态：${n ? `${n} 枚在册跳转页逐枚回读——refresh 的秒数与目标、noindex、canonical、兜底链接四项各等于名单与模板 ✓`
    : '今天在册 0 枚 ⇒ 这一格没有对象，读法由 ⓪ 那枚手写的 FX_PAGE 当众验过（同一把尺子读出 0 秒／目标／noindex／canonical 各一项，反例 FX_PLAIN 与 FX_BROKEN 各自不收）'}`);
  return Math.max(n, 1);
}

/* ---------- ③ 目标必须是真地址（§12 死锚点那一族的产物版） ---------- */
function cell3(){
  let n = 0;
  const dead = [];
  const visibleIds = new Set(visible.map(p => p.id));
  for (const [path, w] of wanted){
    if (!found.has(path)) continue;                  /* ① 点名；这里不重复 */
    const to = pathOf(w.to);
    const page = join(DIST, ...to.replace(/^\//, '').replace(/\/$/, '').split('/'), 'index.html');
    const why = [];
    if (!/^\/essays\/[^/]+\/$/i.test(to)) why.push(`目标 ${to} 不是 /essays/<slug>/ 那一形状`);
    if (!existsSync(page)) why.push(`目标 ${to} 在 dist/ 里没有详情页产物 ⇒ 这枚跳转页把访客送往一枚 404`);
    else if (found.has(to)) why.push(`目标 ${to} 自己又是一枚跳转页 ⇒ 两枚旧地址互相指，谁都不落地`);
    if (!visibleIds.has(w.owner)) why.push(`名单里 ${w.owner} 不是可见稿件（本工具的名单算歪了）`);
    if (why.length) dead.push(`${path}：${why.join('；')}`);
    n++;
  }
  /* 反向：盘上每枚跳转页的目标也得是真地址（哪怕它不在名单里——① 会另报"多生成"，死目标更要紧） */
  for (const [path, art] of found){
    const to = art.url ? pathOf(art.url) : '';
    if (!to){ red(`③ ${path}（${art.rel}）的 refresh 读不出目标 ⇒ 形态变了，"旧地址能到达"这件事不再有见证物`); continue; }
    const page = join(DIST, ...to.replace(/^\//, '').replace(/\/$/, '').split('/'), 'index.html');
    if (!existsSync(page)) red(`③ ${path}（${art.rel}）指向 ${to}，而 dist/ 里没有那一枚详情页 ⇒ 访客从旧地址走进来会被送到 404`);
    n++;
  }
  if (dead.length) red(`③ 目标不是真地址（${dead.length} 枚）：${dead.slice(0, 5).join('　|　')}`);
  notes.push(`③ 目标存活：在册 ${wanted.size} 枚各验一次"目标那枚详情页在盘上、且不是第二枚跳转页"，另对盘上 ${found.size} 枚跳转页各反查一次目标 ✓`);
  return Math.max(n, 1);
}

/* ---------- ④ 不进第二套真值：六份机器侧 0 次 ＋ 全站 href 0 处指向 ---------- */
function cell4(){
  let n = 0;
  const addrs = [...new Set([...wanted.keys(), ...found.keys(), ...forbidden.keys()])];
  for (const [name, txt] of machineTxt){
    const hit = addrs.filter(p => txt.includes(p));
    if (hit.length) red(`④ 旧地址出现在 ${name} 里（${hit.slice(0, 6).join(' / ')}）⇒ 这一族不许进第二套真值：`
      + (name.startsWith('sitemap')
        ? '落点是 `astro.config.mjs` 那枚 sitemap filter 里的 `hiddenPaths()`——实测 @astrojs/sitemap 3.7.4 连 Astro 自己写进跳转页的 noindex 都不认，只认这枚 filter'
        : '写那份产物的端点吃的是 visiblePosts()，旧地址根本不在它的清单上；它出现了就说明有人在那里另拼了一套地址'));
    n++;
  }
  /* 正向见证：机器侧那五份"本来该装着详情页地址"的产物读得到**在册稿件**，否则上面的"0 次"是空转 */
  const probe = visible.length ? `/essays/${visible[0].id}/` : '';
  for (const [name] of machineTxt){
    if (!machineHasPage.has(name)) continue;
    if (!probe) continue;
    if (!machineTxt.get(name).includes(probe)) red(`④ 正向见证：在册稿件 ${visible[0].id} 在 ${name} 里读不到 ⇒ 那一枚"旧地址 0 次"没有对象（尺子瞎了，不许算过）`);
    n++;
  }
  const refs = new Map();
  for (const { rel, txt } of arts){
    for (const h of hrefsOf(txt)){
      const p = pathOf(h);
      if (!wanted.has(p) && !found.has(p) && !forbidden.has(p)) continue;
      if (found.get(p) && found.get(p).rel === rel) continue;      /* 跳转页自己不指自己 */
      if (!refs.has(p)) refs.set(p, []);
      refs.get(p).push(rel);
    }
  }
  if (refs.size) red(`④ 站内有 ${refs.size} 枚旧地址被产物的 <a href> 指到：`
    + [...refs.entries()].slice(0, 5).map(([p, rs]) => `${p}（被 ${rs.slice(0, 3).join(' / ')} 指到）`).join('；')
    + ' ⇒ 旧地址是接**外部**的，不是站内的导航层：目录页一旦开始链它，同一篇文章就长出第二个入口（与 §15 不列入那一族同源，也是"第二套真值"的起点）');
  notes.push(`④ 不进第二套真值：${addrs.length} 枚旧地址（在册 ${wanted.size}／盘上 ${found.size}／不该生成 ${forbidden.size}）在 ${machineTxt.size} 份机器侧产物各 0 次`
    + `（正向见证跑在 ${machineHasPage.size} 份"本来该装着详情页地址"的那几份上——` + '`sitemap-index.xml` 只列 sitemap 文件自己，不进那一侧' + `）、`
    + `全站 ${arts.length} 份文本产物里 <a href> 指向旧地址 ${refs.size} 处${addrs.length ? '' : '（今天没有对象，两把尺子的读法都由 ⓪ 当众验过）'}`);
  return n + 1;
}

/* ---------- ⑤ 源侧：坏写法与撞名（静默丢掉＝"作者写了却看不见"那一族） ---------- */
function cell5(){
  let n = 0;
  for (const m of badShape){ red(`⑤ aliases 里有形状不合格的项：${m}`); n++; }
  for (const m of dupes){ red(`⑤ 跨篇撞名：${m}`); n++; }
  const filled = all.filter(p => (p.data.aliases ?? []).length).length;
  notes.push(`⑤ 源侧：扫了 ${all.length} 篇（${filled} 篇填了 aliases）· 形状不合格 ${badShape.length} 项 · 跨篇撞名 ${dupes.length} 枚`
    + `${filled ? '' : '（一篇都没填 ⇒ 这一行是证明每一篇的 front matter 都被读过，不是这格没跑）'}✓`);
  return Math.max(n, 1) + 1;
}

/* ---------- 跑 ---------- */
const counts = [];
for (const [label, fn] of [['⓪', cell0], ['①', cell1], ['②', cell2], ['③', cell3], ['④', cell4], ['⑤', cell5]]){
  try { counts.push(fn()); }
  catch (e){ red(`${label} 判据自己炸了：${e && e.message ? e.message : String(e)} ⇒ 这一格的读数不作数，别把"没打印"当"没红"`); counts.push(0); }
}

if (LIST){
  console.log('\n在册的旧地址（front matter 现算）：');
  if (!wanted.size) console.log('  （0 枚——三篇稿子的 aliases 都空着。这不等于这一格没跑：⓪ 那格用内置 fixture 验过同一枚读法"填了就读得到"）');
  for (const [path, w] of wanted){
    const art = found.get(path);
    console.log(`  ${path.padEnd(26)} → ${w.to.padEnd(30)} ${art ? `${art.delay}s · noindex:${art.noindex ? '有' : '无'} · ${art.rel}` : '〔盘上没有这一枚文件〕'}（${w.owner}）`);
  }
  for (const [path, f] of forbidden) console.log(`  ${path.padEnd(26)}   不该生成：${f.owner}（${f.why}）${found.has(path) ? ' ← 盘上却有！' : ''}`);
  console.log(`  盘上读到的跳转页产物：${found.size} 枚${found.size ? `（${[...found.keys()].join(' / ')}）` : ''} · 文本产物窗口 ${arts.length} 份`);
}
for (const x of notes) console.log(`  ${x}`);
if (problems.length){
  console.log(`\n✗ alias-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log(`\n✓ 旧地址那一族：六格共 ${counts.reduce((a, b) => a + b, 0)} 条断言全过（在册 ${wanted.size} 枚 ⇄ 盘上 ${found.size} 枚跳转页，两向相等）`);
