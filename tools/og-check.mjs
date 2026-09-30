/* og-check.mjs —— 逐篇社交卡在不在、是不是当前那一版的门禁（`card/ogcheck`；链上的落点＝`npm run gate` 的**末步**，排在 build 之后，与 `font-subset.mjs --check`／`search-check`／`runtime-check` 同排；**不接进 `check`**）
   用法  node tools/og-check.mjs              源码级 ①–⑦（不读 dist/、不起浏览器、不联网、不写盘；改卡之后随时单跑得动）
         node tools/og-check.mjs --dist       再加 ⑧ 那一格：读 `dist/`，所以只在 build 之后跑得动——链上跑的是这一档
         node tools/og-check.mjs --list       外加逐枚打印卡面账目：slug / 题面 / 清单来源 / 字节 / 帧头

   ── 这一格补的是哪个洞 ──────────────────────────────────────────────────────
   出图链是有的（`npm run og` = `node tools/og-cards.mjs`，一张稿子一枚 `public/og/<slug>.png`），页面上也是有的
   （`src/layouts/Layout.astro:38-46` 的 `cardFor()`：详情页地址 × `existsSync(public/og/<slug>.png)` ⇒ `og:image`），
   但它**不在 build、不在 check、不在 gate**：`tools/*check*.mjs` 里 grep "og" 命中的全是 `fog.jpg`。
   ⇒ 下一篇稿子发出去就是没卡的稿子，而全链绿。这是 §12:1012 那一族（机制写了、链上无人守）在本仓的自家版本。

   ── 落点：整只工具挂在 `gate` 的末步（build 之后）一处，不拆进 `check` ──────────────────
   §16 那条已签字的分层口径：读 `dist/` 的判据必须排在 build 之后，否则干净检出上"红的是环境不是代码"。
   本卡 ①–⑦ 读的**不是** `dist/`：卡的住址是 `public/og/<slug>.png`，而 `public/` 是**源码**、不是产物——
   所以这一档随时能单跑（不 build、不起浏览器、不联网），改完卡自己核对用；但**链上只挂 build 之后那一处**，三条理由：
   ① 页面上的 `og:image` 就是由 `existsSync(join(ROOT,'public','og',`${m[1]}.png`))` 派生的（`Layout.astro:41`），
      所以本卡读的是**同一枚文件、同一枚判据**，不是"退回去数源文件列表"那种降级读法；
   ② 因果链是一条："稿 → `npm run og` → `public/` → build → `dist/` → 访客取到"。同一件事在两条链上各挂一遍，
      红话就分不清坏在哪一侧；挂在 build 之后这一处，⑦（源码⇄页面/出图链同源绊线）与 ⑧（产物侧引用与拷贝）
      在同一次运行里各读一侧，"源码里卡齐了、产物没落位"这一族当场点得出来（本卡实测吃过这一档，见 ⑧ 的红话）；
   ③ `check` 的现值（八项，全读源码、build 之前）是文档里的账面数，卡面把这一格定在 build 之后，就不顺手把链改了型。
   ⚠️ ② 里"public/ → dist/ 逐字节原样拷贝"这句话此前**一枚尺子都没读过**（本轮实测过：三枚卡与站点级那枚 build 前后
      sha256 四枚同值——但实测不等于判据）。格 ⑧ 就是读这一件事的：墙破了 ⑧ 红、①–⑦ 照绿（它们读的对象没坏），
      红话点名是哪一侧坏的。

   ── 为什么"文件在不在"这一档不够（本卡实测过，读数登记在 §13a 那一格）──────────
   只判存在性时，把某篇的 `title` 改掉、不重跑 `npm run og`，盘上那枚 PNG 一个字节没变、文件照样在 ⇒ 判据 exit 0。
   转发出去的是一张写着旧标题的卡，而全链绿。mtime 那一档更不能用：git 不存 mtime，
   干净检出上卡片与稿件的先后由 checkout 顺序决定（本卡实测：工作树与 HEAD 逐字节相同时，稿件 mtime 仍比卡新 2ms ⇒ 恒假红）。
   ⇒ 必须判到内容层。内容层的真值住在 `tools/og-cards.manifest.json`：每枚卡记**出图时那一句题面**与**落位后回读的字节的 sha256**，
      写者只有 `tools/og-cards.mjs`（全部复验通过、落位之后才写），读者是这里。
   ⚠️ 这一档拦的是**漂移**，不是**伪造**：手改清单里的题面就能放行一张旧卡，那与手改 `gap-check` 的注册表同级，
      清单头上写着"手工改这份文件＝伪造出图记录"。sha256 那一半拦的是"卡被换过／截断过／从别处搬来一枚同名旧图"。

   ── 为什么没有"重出一遍再比字节"这一档 ────────────────────────────────────────
   §12:1013 那一条把"构建不可复现"当成裁决依据（salt/iv 每跑都换 ⇒ 判否）。逐篇卡是浏览器画的：
   §13a 登记的历史读数是"三张三遍逐字节相同"，但那句话的成立条件是**同一台机器、字体真落地**（母题对账那一道
   同时是在对"字没落地时字形与字距都会变，md5 不可能还相等"）。⇒ 拿"当场重出 ⇄ 盘上"当判据，换一台机器或字体站换域名
   就会红，而红的是环境（§16 明文），而且它还得起 Edge（`check` 里不许起浏览器，同 `search-check`/`runtime-check` 排在 build 之后的那两条理由）。
   所以本卡的 sha256 只对**清单 ⇄ 盘上**，不对**重出 ⇄ 盘上**；出图这一趟仍然只有 `npm run og` 能做。

   ── 两侧都有格子（§16 那条"新加判据必须做一次变异测试"的口径，本卡跑了九格，读数登记在 §13a 那一格）───
   朝宽：少一张（删卡）｜多一张（塞一枚没人指的）｜改了 title 不重跑 og（旧卡，存在性判据放行的正是这一档）｜空文件（截断到 0 字节）｜
     从别处搬一枚真卡顶上来（字节对不上清单）｜稿转草稿而卡还留着｜清单 cards 掏空（判据被拔牙）｜needle 那篇从名单里消失｜
     Layout 的派生路径换了（同源绊线）——九格各 exit 1 且点名。
   朝窄：今天这棵树（3 篇 ⇄ 3 枚，无草稿、无孤儿）必须 exit 0，且每一枚都数得出来。
   needle：`forest-blog`（一篇真稿的 slug）同时钉在②的名单、③的集合、④的题面、⑤的字节与⑧的产物窗口上——这一族空转不了。
   ⚠️ 变异与还原的跑法：这一族的扭动全部在一份**仓库副本**（sim 树，浏览器换成桩）里做，真工作树一个字节不动——
      因为要扭的对象里有 `public/og/*.png` 与稿件这些**已提交的 tracked 文件**，而 §16 那条"还原只走 `git checkout --`"
      在未提交态会连自己的活一起吞掉（本轮规矩：只走 cp 备份＋当场 sha256 复算）。

   ── 口径：哪几篇该有卡 ────────────────────────────────────────────────────────
   **只滤草稿**，含不列入的（`unlisted: true`）。这不是偷懒，是与站上同一份读法：
   稿件清单走 `tools/frontmatter.mjs` 的 `splitFm`/`readTaxonomy`（链上第 ① 项与 taxonomy-check 吃的是同一份实现），
   草稿判定与顺序走 shipped 的 `src/lib/taxonomy.js` 的 `isDraft`/`sortPosts`——与 `tools/og-cards.mjs:31,108` 同一套，
   也就是与 `src/lib/posts.js:30` 的 `publishedPosts()` 同一套。为什么 `unlisted` 也要卡：
   `src/pages/essays/[slug].astro:28` 的 `getStaticPaths` 吃的正是 `publishedPosts()` ⇒ 那一枚地址是**活的**、页面烘得出来，
   抓取器与聊天软件照样会去取 `og:image`（本卡实测：把某篇标 `unlisted: true`，`og-cards` 的口径仍然把它算进"该出卡"那一侧）。
   草稿反过来：那一枚地址根本不建（`isDraft` 那一档），给它出卡就是给一个不存在的页面做一张能转发的图。

   ── 不碰的三处 ────────────────────────────────────────────────────────────────
   · 不起浏览器、不联网、不写盘：本卡是纯读判据（`npm run og` 才写 `public/`，`check` 里写二进制等于让门禁每次改一遍 git，§13a 那句仍然成立）。
   · 不判卡**好不好看**：标题梯度的四条规则住在 `tools/og-card.html` 文件头，由 `og-cards` 的 fit 趟当场量（装不下就 exit 1、一张都不落位）。
   · 不替谁删卡：稿撤了卡还在，本卡按 ③ 点名报红并说清怎么收手（删那枚文件、或重跑一次全量 `npm run og` 让清单先追上），不动手。

   ── 没盖住的（别把上面读成"卡已经全交给机器"）────────────────────────────────
   ① 清单里 bootstrap 那几枚的"题面 ⇄ 像素"这一因果**没被本轮跑过**：本机这一轮起不了 headless Edge 的一次性 CLI
      （`--dump-dom`/`--screenshot` 零输出、exit 0、不落文件，`npm run og` 当场死在探针那一格——见 §13a 本轮登记）。
      那几枚的 sha256 与字节是当场对盘上真文件算的（真牙），题面是从当时的 front matter 抄的（旧一轮 `npm run og` 的产物）。
      下一次任何人跑一遍不带 `--slug` 的 `npm run og`，写者会把它们换成 stamped:"og-cards"，那一格才算当众验过。
   ② 判据链不覆盖 `public/og.png` 之外的**站点级图**（首屏那两张照片、favicon）——favicon 那一族 §13 另有格。
   ③ 卡面**画错了**（比如模板槽错位、色板注进注释）本卡读不出来：那是母题对账那一道的活，仍归 `og-cards`。
   ④ 本卡不读 `dist/`，所以"build 没跑、`dist/og/` 是上一版"这件事不在这里判——那一族归 `runtime-check` 的产物普查。
*/
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

import { splitFm, readTaxonomy } from './frontmatter.mjs';
import { isDraft, sortPosts } from '../src/lib/taxonomy.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const OG_DIR = join(ROOT, 'public', 'og');
const SITE_CARD = join(ROOT, 'public', 'og.png');
const MANIFEST = join(ROOT, 'tools', 'og-cards.manifest.json');
const LAYOUT = join(ROOT, 'src', 'layouts', 'Layout.astro');
const OGCARDS = join(ROOT, 'tools', 'og-cards.mjs');
/* needle：一篇真稿的 slug。它同时出现在"该有卡"名单、盘上集合、清单三处，
   任何一格把对象扫空了都过不了它（§16 那条"扫了但没匹配到与扫了且全过长得一样"） */
const NEEDLE = 'forest-blog';
/* 空文件／截断文件的地板：一张写着字的 1200×630 卡不可能小于这个数（口径抄 og-cards.mjs:267 那枚 GDI BYTES 地板） */
const MIN_BYTES = 4096;

const args = process.argv.slice(2);
let asserted = 0;
const problems = [];
const notes = [];
const listing = [];
/* 前置条件（读不到对象就没法判）走这一条：一句话点名死在哪一步，不甩栈——
   与 og-cards.mjs 的 die() 同一个立场："没有 dist 就红并说是哪一步死的"（§16 runtime-check 那一格） */
function fatal(msg, hint){
  console.log(`\n✗ og-check：${msg}`);
  if (hint) console.log(`  ${hint}`);
  process.exit(1);
}
function cell(id, label, fn){
  let n = 0, threw = null;
  try { n = fn() || 0; }
  catch (e){ threw = e; }
  if (threw){ problems.push(`${id} ${label}：${threw && threw.message ? threw.message : threw}`); return; }
  if (!n){ problems.push(`${id} ${label}：asserted=0（这一格一个断言都没跑就交了白卷）`); return; }
  asserted += n;
  notes.push(`${id} ${label}：${n} 条断言 ✓`);
}

/* ---------- 1. 稿件侧：与 og-cards / publishedPosts 同一套读法 ---------- */
function publishedSide(){
  assert.ok(existsSync(POSTS_DIR), `${POSTS_DIR} 不存在 —— 连稿件目录都没有，这一格就没有被测对象（判据不许对着空处打勾）`);
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  assert.ok(files.length > 0, 'src/content/posts 里一篇稿子都没有 —— 本卡的判据对象是零，红在这里，不往下装绿');
  const live = [], drafts = [];
  for (const f of files){
    const slug = f.slice(0, -3);
    const parsed = splitFm(readFileSync(join(POSTS_DIR, f), 'utf8'));
    assert.ok(parsed, `${f} 的 front matter 不成形 —— 读不出 title，这一篇有没有卡都判不了`);
    const tax = readTaxonomy(parsed.fmText);
    const title = parsed.fm.title;
    assert.ok(title && title.trim(), `${f} 的 front matter 没有 title —— 卡面上该写什么没有依据，清单无从对账`);
    /* ⚠️ 只带 draft/pinned 两枚旗进 isDraft —— 与 tools/og-cards.mjs:107 逐字同形：那一枚 post 对象里就没有 unlisted，
       所以出卡口径就是"只滤草稿"。这里复刻它不是抄近路，是**不许两处各一套过滤**（§16"门禁一套、页面一套"那一族）。 */
    const post = { id: slug, data: { title, draft: tax.draft, pinned: tax.pinned } };
    (isDraft(post) ? drafts : live).push({ slug, title, draft: !!tax.draft, unlisted: !!tax.unlisted });
  }
  return { live: live.sort((a, b) => a.slug.localeCompare(b.slug)), drafts, files };
}

/* ---------- 2. 卡侧：public/og/ 的盘上账 ---------- */
const CARD_NAME = /^([a-z0-9][a-z0-9._-]*)\.png$/;   /* 与 Layout.astro:39 那条 slug 形状同一条口径 */
function cardSide(side){
  assert.ok(existsSync(OG_DIR), `${OG_DIR} 不存在 —— 一枚卡都没有，而稿子有 ${side.live.length} 篇：这就是"新稿没卡"那一族，红着说，不静默`);
  const all = readdirSync(OG_DIR);
  const pngs = all.filter(f => f.endsWith('.png'));
  assert.ok(pngs.length > 0, `public/og/ 里一枚 .png 都没有（目录里有 ${all.length} 个别的文件）—— 判据在这儿停住，不对着空目录打勾`);
  const odd = all.filter(f => !CARD_NAME.test(f));
  const cards = new Map();
  for (const f of pngs){
    const p = join(OG_DIR, f);
    const buf = readFileSync(p);
    const m = CARD_NAME.exec(f);
    cards.set(m[1], { file: f, buf, size: statSync(p).size, sha: createHash('sha256').update(buf).digest('hex'), head: null });
  }
  return { cards, odd };
}

/* 帧头复验：口径搬 og-cards.mjs:233-244（Node 自己读签名 / IHDR / IEND，不依赖编解码器），
   空文件与上一版的旧卡在这一格当场死，而不是"存在即通过"。
   ⚠️ 这一枚不许在收卡那一趟就调：一枚坏了就抛，其余几枚的读数一起没了——它在 ⑤ 的循环里逐枚 try，坏几枚点几枚。 */
function sniffPng(buf, label){
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  assert.ok(buf.length >= 33 && SIG.every((b, i) => buf[i] === b),
    `public/og/${label}：连 PNG 签名都不是（前 ${Math.min(8, buf.length)} 字节 ${buf.subarray(0, 8).toString('hex')}，共 ${buf.length} 字节）—— 一枚空文件或对不齐的残块都算"文件存在"，所以存在性不够`);
  assert.ok(buf.subarray(12, 16).toString('ascii') === 'IHDR', `public/og/${label}：第一段块不是 IHDR`);
  const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20);
  assert.ok(buf.subarray(-8, -4).toString('ascii') === 'IEND', `public/og/${label}：末尾没有 IEND —— 这是一张被截断的图，看着像图而已`);
  return { width, height, depth: buf[24], color: buf[25], interlace: buf[28] };
}

/* ---------- 3. 清单侧：题面与字节的出处 ---------- */
function readManifest(){
  assert.ok(existsSync(MANIFEST), `${MANIFEST} 不在 —— 题面与字节的清单没了，"卡是不是当前那一版"就没人答得出（缺清单＝缺判据，不许退成只判存在性）`);
  let j;
  try { j = JSON.parse(readFileSync(MANIFEST, 'utf8')); }
  catch (e){ assert.fail(`${MANIFEST} 不是合法 JSON：${e.message}`); }
  assert.ok(j && typeof j === 'object' && j.cards && typeof j.cards === 'object',
    `${MANIFEST} 里没有 cards 那一格 —— 清单形状变了，本卡的读法要跟着改`);
  const keys = Object.keys(j.cards);
  assert.ok(keys.length > 0, `${MANIFEST} 的 cards 是空的 —— 只判存在性会放过旧卡，所以清单为空就是判据被掏空，红`);
  return { j, keys };
}

/* ---------- 4. Layout 那侧登记的几何（一枚尺子，不在这儿抄第二份 1200/630） ---------- */
function layoutMeta(){
  const src = readFileSync(LAYOUT, 'utf8').replace(/\r\n/g, '\n');
  const w = /property="og:image:width"\s+content="(\d+)"/.exec(src);
  const h = /property="og:image:height"\s+content="(\d+)"/.exec(src);
  assert.ok(w && h, 'Layout.astro 里读不到 og:image:width / og:image:height —— 卡面几何的唯一登记处没了，本卡就没有尺子');
  return { w: Number(w[1]), h: Number(h[1]) };
}

/* ---------- 前置读盘：四侧对象一次收齐 ----------
   收不到对象就没有判据可言（稿件目录空的、`public/og/` 整目录没了、清单一枚都没有、Layout 里那两枚登记值读不出来）。
   这一趟的死法一律"一句话点名死在哪一步"，不甩栈——口径照 §16 那条 runtime-check 的"没有 dist / dist 里没 HTML /
   断言份数为 0 —— 一律 exit 1 并点名是哪一步死的"。 */
let side, liveBySlug, cardside, man, META;
try {
  side = publishedSide();
  liveBySlug = new Map(side.live.map(p => [p.slug, p]));
  cardside = cardSide(side);
  man = readManifest();
  META = layoutMeta();
} catch (e){
  fatal(e && e.message ? e.message : String(e));
}

/* ---------- 判据逐格 ---------- */

/* ① 站点级退路那张：拿不到逐篇卡时全站落的就是它，它不在盘上＝全站 og:image 指向一枚 404 */
cell('①', '站点级退路那张 public/og.png 在盘上、帧头与几何对得上', () => {
  assert.ok(existsSync(SITE_CARD),
    'public/og.png 不在盘上 —— Layout.astro:46 的退路是 `/og.png`（本卡实测：缺逐篇卡那一页的 og:image / twitter:image / JSON-LD image 三处全落它），这张一没，全站转发出都是一片空白');
  const buf = readFileSync(SITE_CARD);
  const head = sniffPng(buf, 'og.png');
  assert.ok(buf.length >= MIN_BYTES, `public/og.png 只有 ${buf.length} 字节，地板 ${MIN_BYTES} —— 一张有字的卡不可能这么小`);
  assert.ok(head.width === META.w && head.height === META.h,
    `public/og.png 帧头是 ${head.width}×${head.height}，而 Layout 登记的 og:image 是 ${META.w}×${META.h} —— 两处不同值，抓取器按哪一个裁？`);
  return 4;
});

/* ② 朝少：每篇该有卡的稿子都有一枚卡文件（口径见文件头"哪几篇该有卡"） */
cell('②', '每篇已发布稿（含不列入的）都有一枚 public/og/<slug>.png', () => {
  const miss = side.live.filter(p => !cardside.cards.has(p.slug));
  for (const p of miss){
    problems.push(`② ${p.slug}「${p.title}」这篇在站上是要建页面的（isDraft 为假），盘上却没有 public/og/${p.slug}.png ⇒ 那一页的 og:image 静默退回站点级那张。修法：npm run og`);
  }
  assert.ok(side.live.length > 0, `② 该有卡的稿子数到 0 篇（扫了 ${side.files.length} 个 .md）—— 这一格正在空转`);
  assert.ok(cardside.cards.has(NEEDLE), `② 盘上扫不到 needle 那一篇的卡：public/og/${NEEDLE}.png —— 扫描器或目录口径坏了，后面的账都不承重`);
  return side.live.length + 2;
});

/* ③ 朝多：卡每枚都得有稿子指它（稿撤了卡还在也要红），外加目录里不许有说不清的文件 */
cell('③', 'public/og/ 里每一枚都对应一篇已发布稿（多一张也要红）', () => {
  const orphans = [...cardside.cards.keys()].filter(s => !liveBySlug.has(s));
  for (const s of orphans){
    problems.push(`③ public/og/${s}.png 没有稿子指它（已发布 ${side.live.length} 篇里没有这个 slug）⇒ 站上不会引用它，但它留在仓库与产物里。删掉那枚文件并重跑 npm run og 让清单追上`);
  }
  for (const f of cardside.odd){
    problems.push(`③ public/og/${f} 的名字对不上 Layout.astro:39 那枚 slug 形状 —— 页面永远不会引用它，目录里多一枚说不清来历的文件`);
  }
  assert.ok(orphans.length === 0 && cardside.odd.length === 0, `③ 多出来 ${orphans.length + cardside.odd.length} 枚没人认领的卡文件（逐条已点名）`);
  assert.ok(liveBySlug.has(NEEDLE), `③ 稿子那一侧扫不到 needle「${NEEDLE}」—— 名单是空的，②③ 两格都会假绿`);
  return cardside.cards.size + cardside.odd.length + 2;
});

/* ④ 内容层·题面：清单记的那一句必须逐字符等于当前 front matter 的 title */
cell('④', '清单里的题面逐枚等于当前 front matter 的 title（改了题不重跑 og 就红）', () => {
  let n = 0;
  for (const p of side.live){
    const e = man.j.cards[p.slug];
    if (!e){ problems.push(`④ ${p.slug} 有卡（public/og/${p.slug}.png）却没有清单条目 —— 这张卡是谁、按哪一句题面画的，无从考证。重跑 npm run og`); n++; continue; }
    assert.equal(String(e.title), p.title,
      `④ ${p.slug} 的卡是按「${e.title}」出的，而稿子现在的 title 是「${p.title}」⇒ 改了题面没重跑 npm run og，转发出去的是上一版的卡（存在性判据在这一格是绿的，那正是它不够的地方）`);
    n++;
  }
  for (const s of man.keys){
    if (!liveBySlug.has(s)){ problems.push(`④ 清单里有一条 ${s}，稿子侧没有它（草稿或已删）⇒ 清单也要跟着收手：重跑一次全量 npm run og`); n++; }
  }
  assert.ok(n > 0 || side.live.length === 0, '④ 一枚题面都没比 —— 空转');
  const nd = man.j.cards[NEEDLE];
  assert.ok(nd && String(nd.title) === liveBySlug.get(NEEDLE).title, `④ needle「${NEEDLE}」的题面没对上：清单 ${JSON.stringify(nd && nd.title)} ⇄ 稿子 ${JSON.stringify(liveBySlug.get(NEEDLE).title)}`);
  return side.live.length + 1;
});

/* ⑤ 内容层·字节：盘上那枚必须逐字节就是出图落位的那一枚；顺带逐枚帧头/几何。
   帧头是逐枚 try 的：坏两枚就点两枚，不是第一枚坏了就把其余几枚的读数一起吞掉。 */
cell('⑤', '盘上字节 ⇄ 清单 sha256/bytes 逐枚相同，且每张帧头与几何齐', () => {
  let n = 0;
  for (const [slug, c] of cardside.cards){
    const e = man.j.cards[slug];
    let head = null;
    try { head = sniffPng(c.buf, c.file); c.head = head; }
    catch (err){ problems.push(`⑤ ${err.message}`); n++; continue; }
    assert.ok(c.size >= MIN_BYTES, `⑤ public/og/${c.file} 只有 ${c.size} 字节，地板 ${MIN_BYTES} —— 空文件或对不齐的残块，"存在"不等于"是一张卡"`);
    assert.ok(head.depth === 8 && (head.color === 2 || head.color === 6),
      `⑤ ${c.file} 帧头是 ${head.depth}bit color=${head.color}，要的是 8-bit RGB/RGBA（og-cards.mjs:266 那枚 GDI 口径）`);
    assert.ok(head.interlace === 0, `⑤ ${c.file} interlace=${head.interlace}，社交卡应当是一遍扫过的非交错图`);
    assert.ok(head.width === META.w && head.height === META.h,
      `⑤ ${c.file} 帧头 ${head.width}×${head.height} 与 Layout 登记的 ${META.w}×${META.h} 不同值`);
    n += 4;
    if (!e) continue;   /* 没有条目那一条已经在 ④ 点名了，这里不重复报 */
    assert.equal(String(e.sha256), c.sha,
      `⑤ public/og/${c.file} 的字节与清单记的不是同一张（盘上 ${c.sha.slice(0, 12)}… ⇄ 清单 ${String(e.sha256).slice(0, 12)}…）⇒ 这张卡被换过／截断过／从别处搬来一枚同名旧图`);
    assert.equal(Number(e.bytes), c.size, `⑤ ${c.file} 字节数：盘上 ${c.size}，清单记的 ${e.bytes}`);
    n += 2;
  }
  /* 逐张互不相同：两枚卡字节相同＝标题没参与出图（口径抄 og-cards.mjs:373 那一条） */
  const byHash = new Map();
  for (const [slug, c] of cardside.cards){
    const dup = byHash.get(c.sha);
    assert.ok(!dup, `⑤ ${slug} 与 ${dup} 的卡逐字节相同 —— 两篇不同的题面画出同一张图，等于题面没参与出图`);
    byHash.set(c.sha, slug);
    n++;
  }
  const nd = cardside.cards.get(NEEDLE);
  assert.ok(nd && nd.sha === String(man.j.cards[NEEDLE]?.sha256), `⑤ needle「${NEEDLE}」的字节对不上清单 —— 这一格的牙是空的`);
  return n + 1;
});

/* ⑥ 清单自校与防空转：形状、来源标注、一枚都不许是空串 */
cell('⑥', '清单自校（每条都有题面、sha256、bytes、stamped；防空转）', () => {
  let n = 0;
  for (const s of man.keys){
    const e = man.j.cards[s];
    assert.ok(e && typeof e === 'object', `⑥ 清单里 ${s} 那一条不是一个对象`);
    assert.ok(typeof e.title === 'string' && e.title.trim(), `⑥ 清单里 ${s} 的 title 是空串 —— 空题面的条目拦不住旧卡，这一格就白写了`);
    assert.ok(/^[0-9a-f]{64}$/.test(String(e.sha256)), `⑥ 清单里 ${s} 的 sha256 不是一枚 64 位十六进制（读到 ${JSON.stringify(e.sha256)}）`);
    assert.ok(Number.isInteger(e.bytes) && e.bytes > 0, `⑥ 清单里 ${s} 的 bytes 不是一枚正整数（读到 ${JSON.stringify(e.bytes)}）`);
    assert.ok(e.stamped === 'og-cards' || e.stamped === 'bootstrap',
      `⑥ 清单里 ${s} 的 stamped 是 ${JSON.stringify(e.stamped)}，只许 og-cards（出图链落的章）或 bootstrap（本轮就地起的账，题面⇄像素那笔因果没当众验过）`);
    n += 5;
  }
  assert.ok(man.keys.length > 0, '⑥ 清单条目数为 0 —— 判据空转');
  return n + 1;
});

/* ⑦ 同源绊线：本卡的三条前提还住在页面上（换了机制本卡必须跟着改，不是悄悄绿） */
cell('⑦', '本卡读的三处前提与页面／出图链同源（绊线）', () => {
  const code = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const layout = code(readFileSync(LAYOUT, 'utf8').replace(/\r\n/g, '\n'));
  assert.ok(/existsSync\(join\(ROOT,\s*'public',\s*'og',\s*`\$\{m\[1\]\}\.png`\)/.test(layout),
    '⑦ Layout.astro 的 cardFor() 不再用 existsSync(public/og/<slug>.png) 派生 —— 本卡判的"盘上有没有"与页面上引用的不是同一件事，判据的来源要换');
  assert.ok(/const SITE_CARD\s*=\s*'\/og\.png'/.test(layout),
    "⑦ Layout.astro 的站点级退路不再是 '/og.png' —— ① 那格钉的那枚文件就不是退路落点，本卡要改钉的对象");
  const gen = code(readFileSync(OGCARDS, 'utf8').replace(/\r\n/g, '\n'));
  assert.ok(/import\s*\{[^}]*\bisDraft\b[^}]*\}\s*from\s*'\.\.\/src\/lib\/taxonomy\.js'/.test(gen),
    '⑦ tools/og-cards.mjs 不再用 src/lib/taxonomy.js 的 isDraft 滤草稿 —— 出卡口径与站上分叉了，② 那格的名单要重定');
  assert.ok(!/isUnlisted/.test(gen),
    '⑦ tools/og-cards.mjs 现在把不列入的滤掉了 —— 那一枚地址是活的（getStaticPaths 吃 publishedPosts，[slug].astro:28），它的 og:image 照样会被抓取器取，卡不能少');
  const mf = man.j;
  assert.ok(typeof mf.note === 'string' && mf.note.includes('og-cards'),
    '⑦ 清单的 note 不再写明写者是谁 —— 这份文件是谁写的、能不能手改，读不出来了');
  return 5;
});

/* ⑧ 产物级（只在 `--dist` 那趟跑，排在 gate 的 build 之后）：页面真的引用到了那张卡，而卡真的被原样拷进了产物。
   为什么这一段不许待在 check 里：它读 `dist/`，而 `check` 跑在 build 之前——干净检出上红的是环境不是代码（§16 明文）。
   为什么源码级那七格不够：②–⑤ 量的是 `public/` 与清单，而站上访客拿到的是 `dist/`。
   "public/ 整目录原样拷进 dist/"这句话（§13a 的 `og:image` 取值口径就钉在这句话上）此前**没有任何尺子读过**——
   它要是哪天不成立了，七格全绿而站上是一片取不到的 og:image。这一格就是读这一件事的。 */
if (args.includes('--dist')){
  cell('⑧', '产物级：详情页的 og:image 指的是本篇那张卡，且 dist/og/ 里那枚与 public/ 逐字节相同', () => {
    const DIST = join(ROOT, 'dist');
    if (!existsSync(DIST)) fatal(`${DIST} 不存在 —— ⑧ 这一格读的是产物，必须先跑 npm run build（它排在 gate 的 build 之后，正是为这个）`);
    let n = 0, copied = 0, refd = 0;
    const ogImages = [];
    for (const p of side.live){
      const page = join(DIST, 'essays', p.slug, 'index.html');
      if (!existsSync(page)){ problems.push(`⑧ ${p.slug}：${page} 不存在 —— 稿子说是要建页面（isDraft 为假），产物里没有那一页，og:image 也就无从谈起`); n++; continue; }
      const html = readFileSync(page, 'utf8');
      const m = /<meta property="og:image" content="([^"]*)"/.exec(html);
      if (!m){ problems.push(`⑧ ${p.slug}：产物里没有 og:image 那枚 meta —— Layout 的 head 变了，本卡与页面已经不同源`); n++; continue; }
      ogImages.push([p.slug, m[1]]);
      /* 逐篇卡必须在：这一枚有卡（②③④⑤ 都过了），页面却退回站点级那张 ⇒ 引用这一步坏了 */
      if (!m[1].endsWith(`/og/${p.slug}.png`)){
        problems.push(`⑧ ${p.slug}：产物里的 og:image 是 ${m[1]}，不是本篇那张 /og/${p.slug}.png ⇒ 卡出了、页面没引用它。两种因由：` +
          `一是 cardFor() 那一档坏了／地址形状变了，二是这份 dist/ 是上一版留下的（本卡实测吃过这一档：public/og/ 里的卡补回来之后没重跑 build，产物还停在"退回站点级那张"那一版）——先 npm run build 再看这一条还在不在`);
        n++; continue;
      }
      refd++;
      const d = join(DIST, 'og', `${p.slug}.png`);
      if (!existsSync(d)){ problems.push(`⑧ dist/og/${p.slug}.png 不在产物里，而 public/og/${p.slug}.png 在盘上 —— "public/ 原样拷进 dist/"这句话破了，访客取到的是一枚 404`); n++; continue; }
      const ds = readFileSync(d);
      /* 源码侧那枚必须也在（② 已红在同一个 slug 上时这里不甩一枚 ENOENT，而是说清两侧的相对位置） */
      const c = cardside.cards.get(p.slug);
      if (!c){ problems.push(`⑧ dist/og/${p.slug}.png 在产物里、public/og/${p.slug}.png 却不在盘上 —— 这份 dist/ 是上一版留下的（没重跑 build）；② 那格已经点名同一个 slug，修法也是一条：npm run og 之后 npm run build`); n++; continue; }
      const ss = c.buf;
      if (createHash('sha256').update(ds).digest('hex') !== createHash('sha256').update(ss).digest('hex')){
        problems.push(`⑧ dist/og/${p.slug}.png 与 public/og/${p.slug}.png 不是逐字节相同 —— 产物里那张不是盘上这张（拷贝中间被人动过，或 dist/ 是上一版留下的）`);
        n++; continue;
      }
      copied++;
      n += 3;
    }
    /* 退路那一档也要在产物上读一次：非详情页的 og:image 必须落站点级那张 */
    for (const rel of ['index.html', 'essays/index.html', 'about/index.html', '404.html']){
      const page = join(DIST, rel);
      if (!existsSync(page)){ problems.push(`⑧ dist/${rel} 不在产物里 —— 这一格的参照物少了，退路那一句就没读过`); n++; continue; }
      const m = /<meta property="og:image" content="([^"]*)"/.exec(readFileSync(page, 'utf8'));
      assert.ok(m && /\/og\.png$/.test(m[1]), `⑧ dist/${rel} 的 og:image ${m ? m[1] : '（没有那枚 meta）'} 不落站点级 /og.png —— 退路在产物上没成立`);
      n++;
    }
    /* 产物里不许多出没人指的卡（public 侧的账 ③ 已经数过，这里数的是拷贝之后） */
    const distOg = existsSync(join(DIST, 'og')) ? readdirSync(join(DIST, 'og')).filter(f => f.endsWith('.png')) : [];
    assert.ok(distOg.length === cardside.cards.size,
      `⑧ dist/og/ 有 ${distOg.length} 枚而 public/og/ 有 ${cardside.cards.size} 枚 —— 两边不同枚，拷贝这一步没原样搬（dist/ 里躺着上一版残留也长这样）`);
    assert.ok(ogImages.some(([s]) => s === NEEDLE), `⑧ needle「${NEEDLE}」没进这一格的窗口（页面没读到）—— 这一趟白跑`);
    assert.ok(refd === side.live.length && copied === side.live.length,
      `⑧ 引用对上 ${refd}/${side.live.length} 篇、逐字节拷对 ${copied}/${side.live.length} 枚 —— 有没落位的，逐条已点名`);
    console.log(`  ⑧ 产物级读数：${side.live.length} 篇详情页的 og:image 各指本篇那张卡 ＋ ${copied} 枚 dist/og ⇄ public/og 逐字节相同 ＋ 退路在 4 份非详情页产物上各读一次`);
    return n;
  });
}

/* ---------- 打印 ---------- */if (args.includes('--list')){
  listing.push(`  稿件侧：${side.files.length} 个 .md ＝ 该有卡 ${side.live.length} 篇 ＋ 草稿 ${side.drafts.length} 枚不出卡${side.drafts.length ? `（${side.drafts.map(d => d.slug).join(' / ')}）` : ''}`);
  for (const p of side.live){
    const c = cardside.cards.get(p.slug), e = man.j.cards[p.slug];
    listing.push(`  · ${p.slug}${p.unlisted ? '（unlisted，地址仍是活的）' : ''}  题面「${p.title}」` +
      `  卡 ${c ? `${c.size}B ${c.head ? `${c.head.width}×${c.head.height}` : '帧头坏'} sha=${c.sha.slice(0, 12)}` : '缺'}` +
      `  清单 ${e ? `sha=${String(e.sha256).slice(0, 12)} stamped:${e.stamped}` : '缺条目'}` +
      `  ${c && e && c.sha === String(e.sha256) && String(e.title) === p.title ? '⇄ 对得上' : '⇄ 对不上'}`);
  }
  for (const s of cardside.cards.keys()) if (!liveBySlug.has(s)) listing.push(`  · ${s} —— 卡文件在盘上、没有稿子指它（③ 报红）`);
  console.log(listing.join('\n'));
}

const stamped = { 'og-cards': 0, bootstrap: 0 };
for (const s of man.keys) stamped[man.j.cards[s].stamped] = (stamped[man.j.cards[s].stamped] || 0) + 1;
for (const nt of notes) console.log(`  ${nt}`);
console.log(`  账目：稿 ${side.files.length} 枚（该有卡 ${side.live.length}／草稿 ${side.drafts.length} 不出／其中不列入 ${side.live.filter(p => p.unlisted).length} 枚照样要卡）` +
  ` ⇄ 卡 ${cardside.cards.size} 枚 ⇄ 清单 ${man.keys.length} 条（stamped：og-cards ${stamped['og-cards']}／bootstrap ${stamped.bootstrap}）`);
console.log(`  尺子：卡面几何取自 Layout 的 og:image 登记值 ${META.w}×${META.h}，字节地板 ${MIN_BYTES}，needle「${NEEDLE}」`);
if (stamped.bootstrap) console.log(`  ⚠ 清单里 ${stamped.bootstrap} 枚是 bootstrap 就地起的账：字节对得上盘（⑤ 真牙），"题面⇄像素"那一道本轮没重跑出图链验（文件头没盖住的①）`);

if (problems.length){
  console.log(`\n✗ og-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log(`\n✓ 逐篇社交卡：${notes.length} 格共 ${asserted} 条断言全过 —— ${side.live.length} 篇该有卡的稿子 ⇄ ${cardside.cards.size} 枚卡 ⇄ 清单 ${man.keys.length} 条，题面与字节逐枚对得上，没有多出来的卡${args.includes('--dist') ? '，产物侧的引用与拷贝也逐枚对过' : ''}`);
