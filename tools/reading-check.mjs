/* reading-check.mjs —— 详情页那一族三格（F4 相关阅读 ／ F5 系列内导航 ／ F6 写信回应）的门禁
   （第十八轮 `card/reading2`；接进 `npm run gate`，位置在 `lifegrid-check` 之后、两枚起浏览器的尺子之前。
   它是**读产物的**判据，所以不许塞进 `npm run check`：干净检出上 `dist/` 还不存在，
   放在 build 之前就会假红（§16 签过的那一条，`search-check`／`feed-check`／`lifegrid-check` 同一格）。

   用法  node tools/reading-check.mjs

   ── 它钉住的事（一格一条，两侧都有牙）───────────────────────────────────────────
   ① **真产物 ⇄ 独立复算**：逐篇详情页对三样东西——
      · `related ·` 那一行的地址清单 ⇄ 本工具**独立复算**的那份（**不复用** `src/lib/related.js` 的打分：
        两边各算一遍才有得对，共用一枚打分函数就只能证明"它等于它自己"——`lifegrid-check` 那枚
        `daysFromCivil` 是同族先例）。名字怎么变成地址仍然向 `taxSlug()` 要（那是全站唯一的归一化，
        不是这一格被测的那件事）。
      · `in series ·` 那一行的邻居 ⇄ `/series/<slug>/` 那一页从上往下数的**相邻两枚**——参照物是
        **另一份产物**而不是 `src/lib/series.js`：详情页与系列页哪天分叉，红的是这一格。
      · `letter ·` 那枚 mailto ⇄ `src/data/site.js` 里那枚地址 ＋ 这篇 front matter 的 title 百分号编码
        之后的值，并且**不许有 `body=`**（正文留空是预签的那一条）。
      ⚠️ 今天三篇稿子的 `category`／`tags`／`series` 全空着 ⇒ related 与 in series 都是 **在册 0 枚**。
        这枚 0 由 ② ③ 那些 fixture 与 needle 兜住（同一枚收集器在合成样本上必须收到东西），
        所以"扫了但没匹配到"与"扫了且全过"在两串输出里长得不一样（§16 那条 rgba 空转的教训）。
   ② **shipped 判据吃反例**：`relatedPosts()` 与 `seriesSiblings()` 逐条规则点一次（唯一的排序信号／
      平票保持池子顺序／上限 3／任一侧零 token 不画／自己不进／分类与标签不同名相通撞／清不成 slug 的名字
      不记分；系列的 order 档与 date 档／单篇一组／跨系列不互指／没填／不列入）。期望串是**手写的**。
   ③ **绊线**：十五枚合成坏产物喂 ① 用的**同一枚** `judgePage()`——凭空多一行 related／related 指到自己／
      与复算不符／指到站外／指到 `/rss.xml`（不是详情页）／in series 指到别组／那一行里冒序数／
      没填系列却画了那一行／mailto 与 site.js 不同源／subject 没编码／subject 是别的篇名／
      预填了正文／少一枚锚点／多一枚锚点／`EMAIL` 没登记却画了锚点；另加两枚**朝窄**的合法样本
      （三枚相关 + 零枚系列邻居；组内第一篇只有一侧邻居）不许误红，再钉一枚 `RELATED_MAX === 3` 的在册值。
   ④ **一处真值与同源性**：那枚邮箱地址在 `src/` 全树**只许命中一处**（site.js）；关于页与详情页都从它取、
      且 `about.astro` 里那枚局部 const 真的没了；详情页必须还在 import 并调用那两枚纯函数、池子必须是
      `visiblePosts()` 那份数组；`related.js`／`series.js` 不许 import `astro:content`；这三格**零新 CSS**
      （五份样式表里不许出现为它们新增的选择器）、**零新色**（本卡碰过的源码文件里不许有色字面量）。

   ── 两侧都有格子（口径照 lifegrid-check / media-check）──────────────────────────
   朝宽：③ 那十五枚合成坏样本必红；另在真产物上跑过三枚真变异（退出码与红句原文登记在规范 §16 那一格）。
   朝窄：今天零载体必须绿且当众说明它由 fixture 兜住；注入真载体（两篇共享 tags ＋ 同一枚系列）之后
         同一格也必须绿——它判的是"产物 ⇄ 复算相等"，不是"产物里必须为 0"。

   ── 不碰的 ────────────────────────────────────────────────────────────────────
   · 仓库里那三篇稿件一个字节不改（载体只在变异那一跑里临时注入，跑完还原并复算行尾与枚数）。
   · 不动 gap-check / palette-check 的在册数（这一族零新 CSS、零新色，两把尺一枚都不该动）。
   · 不判版式与几何（那三行落在哪个高度、窄屏折几行——本卡零新 CSS，账在 §4／§11）。
*/
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import { splitFm, readTaxonomy } from './frontmatter.mjs';
import { sortPosts, taxSlug } from '../src/lib/taxonomy.js';
import { relatedPosts, RELATED_MAX } from '../src/lib/related.js';
import { seriesSiblings, seriesGroups } from '../src/lib/series.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const read = f => readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
/* 判据只认代码：模板里那些说明会原样落进产物，往注释里举一例"related 长这样"不该被数成一行人；
   源码侧同理（注释里写一句 `astro:content` 不该把同源那一格判红）。这一族坑本仓踩过两次。 */
const stripComments = s => String(s).replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const codeOnly = stripComments;

let asserted = 0;
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

/* ───────── 收集器（① 与 ③ 共用同一枚，所以 fixture 验过它就等于验过真产物那一路） ─────────
   三行都用"行首那枚拉丁标签"当锚点：`related ·` / `in series ·` / `letter ·`。 */
const rowRe = label => new RegExp(`<p class="post-when">${label} · ([\\s\\S]*?)</p>`);
const rowInner = (html, label) => {
  const m = rowRe(label).exec(stripComments(html));
  return m ? m[1] : null;
};
const rowCount = (html, label) => [...stripComments(html).matchAll(new RegExp(`<p class="post-when">${label} · `, 'g'))].length;
const rowHrefs = (html, label) => {
  const inner = rowInner(html, label);
  return inner ? [...inner.matchAll(/href="([^"]*)"/g)].map(x => x[1]) : null;
};
const rowText = (html, label) => {
  const inner = rowInner(html, label);
  return inner === null ? null : inner.replace(/<[^>]*>/g, '');
};
const mailtoOf = html => [...stripComments(html).matchAll(/<p class="post-when">letter · <a class="post-act" href="([^"]+)">/g)].map(x => x[1]);
/* 系列页那一排目录行的地址顺序（① 的参照物是**另一份产物**，不是 src/lib/series.js） */
const seriesOrderOf = html => [...stripComments(html).matchAll(/<a class="row[^"]*" href="(\/essays\/[^"]+?\/)"/g)].map(x => x[1]);

const addr = id => `/essays/${id}/`;                    /* 详情页地址的唯一拼法（与模板那一枚形状相同） */
const idOf = href => String(href).replace(/^\/essays\//, '').replace(/\/$/, '');

/* ───────── ① 的独立复算：本工具自己写一遍"共享枚数 → 排序 → 取前三" ─────────
   ⚠️ **不 import** `relatedPosts()`——那枚函数正是这一格要对账的东西（`lifegrid-check` 的 `daysFromCivil`
      就是为躲这一手才独立写的）。名字怎么变成地址仍向 `taxSlug()` 要，全站只有这一份归一化。 */
const cleanName = s => String(s ?? '').trim().replace(/\s+/g, ' ');
function indieTokens(p){
  const out = [];
  const cat = cleanName(p.data.category);
  if (cat && taxSlug(cat)) out.push('c:' + cat);
  for (const raw of (p.data.tags || [])){
    const t = cleanName(raw);
    if (t && taxSlug(t)) out.push('t:' + t);
  }
  return out;
}
function indieRelated(pool, cur, limit = RELATED_MAX){
  const mine = new Set(indieTokens(cur));
  if (!mine.size) return [];
  const scored = [];
  pool.forEach((p, i) => {
    if (p.id === cur.id) return;
    let shared = 0;
    for (const t of indieTokens(p)) if (mine.has(t)) shared++;
    if (shared) scored.push({ id: p.id, shared, i });
  });
  scored.sort((a, b) => (b.shared - a.shared) || (a.i - b.i));
  return scored.slice(0, Math.min(Math.max(limit, 0), RELATED_MAX));
}

/* ───────── 盘上的真值：名单从 front matter 现算，不硬编码、也不由产物自己出 ───────── */
function roster(){
  const DIR = join(ROOT, 'src', 'content', 'posts');
  const files = existsSync(DIR) ? readdirSync(DIR).filter(f => f.endsWith('.md')) : [];
  const out = [];
  for (const f of files){
    const parsed = splitFm(readFileSync(join(DIR, f), 'utf8').replace(/\r\n/g, '\n'));
    if (!parsed) continue;
    const tax = readTaxonomy(parsed.fmText);
    assert.equal(tax.errors.length, 0, `名单读不动 ${f}：${tax.errors[0]}`);
    out.push({
      id: f.slice(0, -3),
      data: {
        title: parsed.fm.title ?? '',
        date: new Date(parsed.fm.date ?? '2026-01-01'),
        category: tax.category, tags: tax.tags, series: tax.series, seriesOrder: tax.seriesOrder,
        draft: tax.draft, pinned: tax.pinned, unlisted: tax.unlisted,
      },
    });
  }
  const sorted = sortPosts(out);
  return { published: sorted.filter(p => !p.data.draft), visible: sorted.filter(p => !p.data.draft && !p.data.unlisted) };
}
/* site.js 里那枚邮箱地址（① ③ ④ 共用；读法照 lifegrid-check 读 BIRTH_DATE——按声明行读，不猜） */
function siteEmail(){
  const m = /^\s*export const EMAIL\s*=\s*['"](mailto:[^'"]+)['"]/m.exec(read('src/data/site.js'));
  return m ? m[1] : '';
}
/* src/ 全树（ROOT 锚定，与当前工作目录无关）：一处真值那一格要的是"全树扫一遍"，不是点名几份文件 */
function walk(relDir, acc = []){
  const dir = join(ROOT, relDir);
  for (const name of readdirSync(dir)){
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(`${relDir}/${name}`, acc);
    else acc.push(`${relDir}/${name}`);
  }
  return acc;
}

/* ───────── 对账器：一份详情页的 HTML ⇄ 三枚期望。返回问题数组（空＝过） ─────────
   ① 的真产物与 ③ 的合成样本都走这一枚 ⇒ 牙只有一副，绊线那格不许另配一副。 */
function judgePage(html, exp){
  const red = [];
  /* —— related：清单 ⇄ 独立复算，枚数与先后都判 —— */
  const relN = rowCount(html, 'related');
  if (exp.related.length){
    if (relN !== 1) red.push(`related 那一行在 ${exp.slug} 的产物里数到 ${relN} 枚（该恰好一枚）`);
    const got = rowHrefs(html, 'related') || [];
    const want = exp.related.map(addr);
    if (relN === 1 && JSON.stringify(got) !== JSON.stringify(want))
      red.push(`related 那一行的清单与独立复算的不符（${exp.slug}）：产物 ${JSON.stringify(got)} ⇄ 复算 ${JSON.stringify(want)}`
        + ` —— 唯一的排序信号是共享的真 token 枚数、平票保持 visiblePosts() 的顺序、至多 ${RELATED_MAX} 枚（§15 F4 那一格）`);
    for (const h of got){
      if (!h.startsWith('/essays/')) red.push(`related 指到站内之外（${exp.slug}）：${h}`);
      else if (idOf(h) === exp.slug) red.push(`related 指回这一篇自己（${exp.slug}）：${h} —— 自己永远不进`);
    }
  } else if (relN !== 0){
    red.push(`${exp.slug} 这一篇与谁都不共享真 token（独立复算 0 枚），产物里却有 ${relN} 行 related ——`
      + ` "没填 ⇒ 整块不出现"当场破（§14），而且那几枚链接的分数是编的`);
  }
  /* —— in series：邻居 ⇄ 系列页那一排目录行（两份产物互相咬合） —— */
  const serN = rowCount(html, 'in series');
  if (exp.series.length){
    if (serN !== 1) red.push(`in series 那一行在 ${exp.slug} 的产物里数到 ${serN} 枚（该恰好一枚）`);
    const got = (rowHrefs(html, 'in series') || []).map(idOf);
    if (serN === 1 && JSON.stringify(got) !== JSON.stringify(exp.series))
      red.push(`in series 的邻居与 /series/${exp.seriesSlug}/ 那一页的行序对不上（${exp.slug}）：`
        + `产物 ${JSON.stringify(got)} ⇄ 系列页上它的相邻 ${JSON.stringify(exp.series)} —— 顺序必须只住 seriesGroups() 一处（§15 F5 那一格）`);
    const txt = rowText(html, 'in series') || '';
    if (/第\s*\d+|^\s*\d+\s*篇|\d+\s*\/\s*\d+/.test(txt))
      red.push(`in series 那一行里冒出序数（${exp.slug}）：${JSON.stringify(txt)} —— §15 明令不印「第 N 篇」，seriesOrder 可以整枚没填`);
  } else if (serN !== 0){
    red.push(`${exp.slug} 拿不到系列邻居（没填系列／这一组只它一枚／它不列入／系列页上没有它），产物里却有 ${serN} 行 in series —— 那一行指的是读不到的顺序`);
  }
  /* —— letter：mailto ⇄ site.js ＋ 篇名 —— */
  const gotMail = mailtoOf(html);
  if (!exp.mailtoAddr){
    if (gotMail.length) red.push(`${exp.slug} 的 EMAIL 没登记，产物里却有 ${gotMail.length} 枚写信锚点（§14 没填 ⇒ 不出现）`);
  } else if (gotMail.length !== 1){
    red.push(`${exp.slug} 的写信锚点应当恰好一枚，产物里数到 ${gotMail.length} 枚`);
  } else {
    const h = gotMail[0];
    const head = exp.mailtoAddr + '?subject=';
    if (!h.startsWith(head)) red.push(`${exp.slug} 的 mailto 与 src/data/site.js 那枚地址不同源（或后面跟的不是 subject）：${h}`);
    else {
      const raw = h.slice(head.length);
      if (raw === exp.title) red.push(`${exp.slug} 的 subject 没做百分号编码就拼进了 href：${raw}`);
      let dec = null;
      try { dec = decodeURIComponent(raw); }
      catch { red.push(`${exp.slug} 的 subject 不是合法的百分号编码（decodeURIComponent 抛）：${raw}`); }
      if (dec !== null && dec !== exp.title)
        red.push(`${exp.slug} 的 subject 解码之后不是这篇的篇名：${JSON.stringify(dec)} ⇄ ${JSON.stringify(exp.title)}`);
    }
    if (/[?&]body=/.test(h)) red.push(`${exp.slug} 的 mailto 预填了正文：${h} —— 预签的那一条是"正文留空给读者"`);
    if (/[<>"]/.test(h)) red.push(`${exp.slug} 的 mailto 里还有裸的尖括号或引号（属性会被截断）：${h}`);
  }
  return red;
}

/* ---------- ① 真产物 ⇄ 独立复算 ---------- */
cell('①', '真产物（dist 逐篇详情页）：related ⇄ 独立复算｜in series ⇄ 组内顺序（源码侧那把 ⇄ 系列页那一排目录行，两把都要对上）｜letter ⇄ site.js + 篇名', () => {
  assert.ok(existsSync(DIST), '① dist/ 不在盘上 —— 这一格在评空气：它是 gate 里 build 之后的那一步，先跑 npm run build');
  const { published, visible } = roster();
  assert.ok(published.length > 0, '① 盘上一枚已发布稿都读不到（src/content/posts 空／读不出）—— 这一格在空转');
  const mailAddr = siteEmail();
  assert.ok(/^mailto:\S+@\S+\.\S+$/.test(mailAddr), '① src/data/site.js 里那枚 EMAIL 读不出形状（改名／挪走／写成了裸邮箱名）⇒ 页面与尺子读的不是同一枚地址');
  let n = 0, relRows = 0, serRows = 0, mailRows = 0;
  const per = [];
  for (const p of published){
    const file = join(DIST, 'essays', p.id, 'index.html');
    assert.ok(existsSync(file), `① 已发布的 ${p.id} 在 dist/essays/${p.id}/index.html 上没有产物 —— dist 是半成品？重跑 npm run build`);
    const html = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const rel = indieRelated(visible, p);                    /* 池子＝那份"滤草稿＋滤不列入"的数组，与模板同源 */
    /* in series 的参照有两把，缺一枚就露一角：
       · `wantOrder`＝shipped 的 `seriesGroups(visible)` 给出的组内顺序（**源码侧真值**——它自己那两条规则
         由 ② 用**手写**期望逐条钉死，所以这里拿它当参照不是"被测物自证"）；
       · `pageOrder`＝`/series/<slug>/index.html` 上那一排 `.row` 的地址顺序（**另一份产物**）。
       详情页那两枚邻居必须同时等于这两把给出的相邻两枚 ⇒ 系列页哪天与详情页分叉（stale dist、
       有人手改产物、页面换了排序），当场点名。 */
    const sslug = p.data.series ? taxSlug(p.data.series) : '';
    let ser = [], wantOrder = null;
    if (sslug){
      const g = seriesGroups(visible).find(x => x.slug === sslug);
      wantOrder = g ? g.posts.map(x => x.id) : null;
      const sp = join(DIST, 'series', sslug, 'index.html');
      assert.ok(wantOrder, `① ${p.id} 填了 series（"${p.data.series}"），shipped 的分组里却没有这一组 —— 页面与尺子读的不是同一份名单（先查 visiblePosts() 那一步）`);
      assert.ok(existsSync(sp), `① 这一组在册，可 /series/${sslug}/index.html 不在盘上 —— 详情页那一行会指到读不到的地方（dist 是半成品？重跑 npm run build）`);
      const pageOrder = seriesOrderOf(readFileSync(sp, 'utf8').replace(/\r\n/g, '\n')).map(idOf);
      assert.ok(pageOrder.length > 0, `① /series/${sslug}/ 那一页上本工具一枚目录行都没读到 —— 收集器在空转，那一格的邻居判据不作数`);
      n += 2;
      assert.deepEqual(pageOrder, wantOrder, `① /series/${sslug}/ 那一页的行序与源码侧那把（seriesGroups 给的${g.by === 'order' ? ' order 档' : ' date 档'}）不符：`
        + `产物 ${JSON.stringify(pageOrder)} ⇄ 真值 ${JSON.stringify(wantOrder)} —— 两页迟早各说一套顺序`);
      n++;
      if (wantOrder){
        const i = wantOrder.indexOf(p.id);
        if (i >= 0) ser = [wantOrder[i - 1], wantOrder[i + 1]].filter(Boolean);
        assert.ok(i >= 0 || p.data.unlisted, `① ${p.id} 填了系列 "${p.data.series}" 却不在那一组的顺序里（不列入的稿子才会这样，可它没标 unlisted）`);
        n++;
      }
    }
    const red = judgePage(html, { slug: p.id, related: rel.map(x => x.id), series: ser, seriesSlug: sslug || '—', mailtoAddr: mailAddr, title: p.data.title });
    for (const r of red) problems.push(`① ${r}`);
    n += 4;                                                 /* 产物在 ⇄ 三行各判一次；红逐条点名进账单 */
    relRows += rel.length; serRows += ser.length; if (mailAddr) mailRows++;
    per.push(`      ${p.id}：related ${rel.length} 枚（共享 ${rel.map(x => String(x.shared)).join('、') || '—'}）· in series ${ser.length} 枚${ser.length ? `（${ser.join(' ⇄ ')}）` : ''} · letter ${mailAddr ? 1 : 0} 枚`);
  }
  /* 收集器不空转的正面控制：同一枚 rowHrefs／rowText／mailtoOf 在合成样本上必须收得到东西 */
  const ctl = '<p class="post-when">related · <a class="post-act" href="/essays/x/">甲</a></p>'
    + '<p class="post-when">in series · <a class="post-act" href="/essays/y/">← 上一篇 乙</a></p>'
    + `<p class="post-when">letter · <a class="post-act" href="${mailAddr}?subject=%E7%AC%AC">写</a></p>`;
  assert.deepEqual(rowHrefs(ctl, 'related'), ['/essays/x/'], '① needle：related 收集器在合成样本上都读不到地址 ⇒ 上面那枚"在册 0 枚"分不开"真没画"与"收集器坏了"');
  assert.deepEqual(rowHrefs(ctl, 'in series'), ['/essays/y/'], '① needle：in series 收集器读不到东西');
  assert.equal(rowText(ctl, 'in series'), '← 上一篇 乙', '① needle：in series 的文字收集器读不到东西（序数那一枚判据因此是瞎的）');
  assert.equal(mailtoOf(ctl).length, 1, '① needle：mailto 收集器读不到东西');
  assert.equal(rowCount('<p class="post-when">related · <a href="/essays/x/">x</a></p><!--<p class="post-when">related · 举例</p>-->', 'related'), 1,
    '① needle：HTML 注释没被摘干净 ⇒ 模板里的说明文字会被数成产物里的行（假红那一族）');
  assert.equal(rowCount('<p class="post-when">in series · <a href="/essays/x/">x</a></p>', 'related'), 0,
    '① needle：标签锚点串了（in series 被数成 related）');
  n += 6;
  notes.push(`① 逐篇（已发布 ${published.length} 枚，其中可见 ${visible.length} 枚；名单由 front matter 现算，不硬编码）：\n${per.join('\n')}`);
  notes.push(`① 今天在册：related ${relRows} 枚 · in series ${serRows} 枚 · letter ${mailRows} 枚`
    + (relRows === 0 && serRows === 0
      ? ' ⇒ 三篇稿子的 category/tags/series 全空着，前两格是"机制在册、零载体"（与 card/lifegrid 同档）；'
        + '这枚 0 的可信度由上面六枚 needle 兜住（同一枚收集器在合成样本上收得到东西），所以它是"真没画"而不是"扫不到"。'
        + 'letter 那一格有载体（' + mailRows + ' 枚），它判的是同源、编码与"不许预填正文"'
      : ' ⇒ 载体在场，两格都在逐枚对账（这一格不是跳过的，判据吃的仍是"产物 ⇄ 复算相等"，不是"必须为 0"）'));
  return n;
});

/* ---------- ② shipped 判据吃反例（期望串手写） ---------- */
const mk = (id, { category = '', tags = [], series = '', seriesOrder, date = '2026-01-01', unlisted = false, pinned = false } = {}) => ({
  id, data: { title: id, category, tags, series, seriesOrder, date: new Date(date), unlisted, pinned },
});
cell('②', 'shipped 的 relatedPosts()／seriesSiblings() 逐条规则吃反例（期望是手写的，不由被测函数自己出）', () => {
  let n = 0;
  const pool = [
    mk('a', { category: '随笔', tags: ['雾', '写作'] }),          /* 与参照篇共享 2 枚 */
    mk('b', { category: '随笔', tags: ['雾', '调试'] }),          /* 共享 2 枚，池子里在 a 之后 */
    mk('c', { category: '', tags: ['雾'] }),                      /* 共享 1 枚 */
    mk('d', { category: '', tags: [] }),                          /* 零 token：不可能进 */
    mk('e', { category: '随笔', tags: ['写作'] }),                /* 共享 1 枚 */
    mk('f', { category: '', tags: ['调试', '雾', '随笔'] }),      /* 共享 1 枚（t:随笔 ≠ c:随笔） */
  ];
  const cur = mk('x', { category: '随笔', tags: ['雾'] });
  assert.deepEqual(relatedPosts(pool, cur).map(p => p.id), ['a', 'b', 'c'],
    '② relatedPosts 不是"共享枚数在前、平票保持池子顺序、至多 3 枚"（期望 a b c：a/b 各 2 枚、c 与 e 与 f 各 1 枚而 c 在池子里最靠前）');
  n++;
  /* 平票：把池子里 a 与 b 的位置对调 ⇒ 结果头两枚跟着对调 ⇒ 第二判据确实是输入顺序，不是标题／日期／id */
  const swapped = [pool[1], pool[0], pool[2], pool[3], pool[4], pool[5]];
  assert.deepEqual(relatedPosts(swapped, cur).map(p => p.id), ['b', 'a', 'c'],
    '② 平票时 relatedPosts 自己发明了第二枚排序键（§15"顺序只住一处"管到这一格：池子顺序换了、结果没换就是它）');
  n++;
  /* 一枚故意的边界：池子里零 token 的那一枚永远不进，即便它排在最前 */
  assert.ok(relatedPosts([mk('z', {}), ...pool], cur).every(p => p.id !== 'z'), '② 零 token 的候选进了清单（共享 0 枚不叫相关）');
  n++;
  /* 上限 */
  const many = ['甲', '乙', '丙', '丁', '戊'].map((_, i) => mk('m' + i, { tags: ['雾'] }));
  assert.equal(relatedPosts(many, mk('x', { tags: ['雾'] })).length, RELATED_MAX, `② 没有夹在 ${RELATED_MAX} 枚上限上`);
  assert.equal(relatedPosts(many, mk('x', { tags: ['雾'] }), 99).length, RELATED_MAX, '② limit 传得比上限大时必须停在上限，不能不限枚数');
  assert.equal(relatedPosts(many, mk('x', { tags: ['雾'] }), 0).length, 0, '② limit=0 没退回"关掉这一格"（宁可少画，不许多画）');
  assert.equal(relatedPosts(many, mk('x', { tags: ['雾'] }), -3).length, 0, '② limit 是负数却没退回空清单');
  n += 4;
  /* 任一侧零 token ⇒ 不画 */
  assert.deepEqual(relatedPosts(pool, mk('x', { category: '', tags: [] })), [], '② 这一篇自己零 token 却交出了清单（"没填 ⇒ 整块不出现"）');
  assert.deepEqual(relatedPosts([mk('d1', {}), mk('d2', {})], mk('x', { tags: ['雾'] })), [], '② 候选一枚 token 都没有，共享 0 枚却被算成相关');
  /* 分类与标签是两个维度，同名不互撞 */
  assert.deepEqual(relatedPosts([mk('p', { category: '雾' }), mk('q', { tags: ['雾'] })], mk('r', { category: '雾' })).map(x => x.id), ['p'],
    '② 分类「雾」与标签「雾」被当成同一枚 token（两族页面本来就是两套地址：/categories/ 与 /tags/）');
  /* 自己不进（即便池子里坐着它自己） */
  assert.ok(!relatedPosts(pool, pool[0]).map(x => x.id).includes('a'), '② 自己出现在自己的相关清单里');
  /* 清不成 slug 的名字不记分（它压根没有页面，指过去就是 §12 的死锚点） */
  assert.deepEqual(relatedPosts([mk('s', { category: '。' }), mk('t', { category: '。' })], mk('u', { category: '。' })), [],
    '② 清不成 slug 的名字被算成了共享');
  /* 写法差不影响：多余空白与首尾空白归一之后是同一枚 token */
  assert.deepEqual(relatedPosts([mk('v', { tags: ['散文  笔记'] })], mk('w', { tags: [' 散文 笔记 '] })).map(x => x.id), ['v'],
    '② tagsOf/cleanName 那层归一化没被用上（同一件事读成两枚 token）');
  n += 5;
  /* 不列入的稿子不可能进清单：调用方交进来的池子必须是 visiblePosts()，这里把那条口径的形状钉住 */
  const withHidden = [mk('h', { tags: ['雾'], unlisted: true }), mk('v2', { tags: ['雾'] })];
  assert.deepEqual(relatedPosts(withHidden.filter(p => !p.data.unlisted), mk('x', { tags: ['雾'] })).map(x => x.id), ['v2'],
    '② 拿"含不列入"的池子算相关时它会露头（这一格记的是模板那一侧必须交 visiblePosts() 数组的坐标）');
  n++;
  assert.deepEqual(relatedPosts([], cur), [], '② 空池子该给出空清单');
  assert.deepEqual(relatedPosts(pool, null), [], '② 没有"当前篇"该给出空清单，而不是抛');
  n += 2;

  /* ---- seriesSiblings：两种排序档 + 四种"拿不到邻居" ---- */
  const byOrder = [
    mk('third', { series: '雾中练习', seriesOrder: 3, date: '2026-01-01' }),
    mk('first', { series: '雾中练习', seriesOrder: 1, date: '2026-09-09' }),
    mk('second', { series: '雾中练习', seriesOrder: 2, date: '2026-05-05' }),
  ];
  const o = seriesSiblings(byOrder, byOrder[1]);
  assert.equal(o.prev, undefined, '② order 档：这一组的第一篇左边不该有邻居');
  assert.equal(o.next?.id, 'second', '② order 档：邻居取自"按 seriesOrder 升序"那一档（first 的下一枚是 second，与日期方向无关）');
  assert.equal(seriesSiblings(byOrder, byOrder[0]).prev?.id, 'second', '② order 档：third 的上一枚应是 second');
  assert.equal(seriesSiblings(byOrder, byOrder[0]).next, undefined, '② order 档：末篇右边不该有邻居');
  n += 4;
  /* 缺一枚 order ⇒ 整组退回按 date（先写的在前），不许混排 */
  const byDate = [
    mk('late', { series: '雾中练习', date: '2026-09-09' }),
    mk('mid', { series: '雾中练习', seriesOrder: 1, date: '2026-05-05' }),
    mk('early', { series: '雾中练习', date: '2026-01-01' }),
  ];
  assert.equal(seriesGroups(byDate)[0].by, 'date', '② 缺一枚 seriesOrder 却没整组退回按 date');
  assert.equal(seriesSiblings(byDate, byDate[1]).prev?.id, 'early', '② 退回按 date 之后邻居没跟着换（读到的还是 order 档那对）');
  assert.equal(seriesSiblings(byDate, byDate[1]).next?.id, 'late', '② date 档：中间那一枚右边应是最晚的那枚');
  assert.equal(seriesSiblings(byDate, byDate[2]).prev, undefined, '② date 档：最早那一枚（early）左边不该有邻居');
  assert.equal(seriesSiblings(byDate, byDate[2]).next?.id, 'mid', '② date 档：early 的下一枚应是 mid');
  assert.equal(seriesSiblings(byDate, byDate[0]).next, undefined, '② date 档：最晚那一枚（late）右边不该有邻居');
  n += 4;
  /* 拿不到邻居的四档：没填 / 名字没有地址 / 只它一枚 / 不列入 */
  assert.equal(seriesSiblings(byDate, mk('none', { series: '' })).prev, undefined, '② 没填系列却拿到了邻居');
  assert.equal(seriesSiblings(byDate, mk('none', { series: '。' })).next, undefined, '② 系列名清不成 slug（没有地址）却拿到了邻居');
  const alone = [mk('solo', { series: '单独一串' })];
  assert.equal(seriesSiblings(alone, alone[0]).next, undefined, '② 这一组只有它一枚，右边不该有邻居');
  assert.equal(seriesSiblings(alone, alone[0]).prev, undefined, '② 这一组只有它一枚，左边不该有邻居');
  const hidden = [mk('shown', { series: '雾中练习' }), mk('hid', { series: '雾中练习', unlisted: true })];
  const visibleOnly = hidden.filter(p => !p.data.unlisted);
  assert.equal(seriesSiblings(visibleOnly, visibleOnly[0]).next, undefined, '② 不列入的那一枚不在数组里，可见这一枚的右边不该指到它');
  assert.equal(seriesSiblings(visibleOnly, hidden[1]).prev, undefined, '② 不列入的那一篇自己拿到了邻居（它与 /series/ 页上的顺序必然分叉）');
  n += 6;
  /* 跨系列不互指 */
  const two = [mk('s1', { series: '甲串' }), mk('s2', { series: '乙串' }), mk('s3', { series: '甲串' })];
  assert.equal(seriesSiblings(two, two[2]).prev?.id, 's1', '② 甲串的邻居指到了乙串（分组串了）');
  assert.equal(seriesSiblings(two, two[1]).next, undefined, '② 乙串只一枚却拿到了邻居');
  n += 2;
  return n;
});

/* ---------- ③ 绊线：合成坏产物喂 ① 那同一枚对账器 ---------- */
cell('③', '绊线：多一行／指错／没编码／预填正文／少一枚 mailto —— 十五样全须红，两枚合法形状不许误红（合成样本，仓库不动）', () => {
  const A = 'mailto:probe@example.test';
  const SUB = encodeURIComponent('甲篇 · 上');
  const relRow = (ids, texts) => '<p class="post-when">related · '
    + ids.map((h, i) => `${i ? ' · ' : ''}<a class="post-act" href="${h}">${(texts || [])[i] || h}</a>`).join('') + '</p>';
  const serRow = (ids) => `<p class="post-when">in series · <a class="post-act" href="${ids}">← 上一篇 末</a></p>`;
  const mailRow = (href) => `<p class="post-when">letter · <a class="post-act" href="${href}">写信回应这一篇</a></p>`;
  const good = relRow(['/essays/a/'], ['甲']) + serRow('/essays/z/') + mailRow(`${A}?subject=${SUB}`);
  const exp = { slug: 'cur', related: ['a'], series: ['z'], seriesSlug: '串', mailtoAddr: A, title: '甲篇 · 上' };
  let n = 0;
  const first = judgePage(good, exp);
  assert.deepEqual(first, [], `③ 绊线的正面样本没能过自己的对账器（${first.join('；')}）⇒ 后面那些"必红"证明的是坏样本还是它自己？`);
  n++;
  const cases = [
    ['凭空多一行 related', good + relRow(['/essays/b/'], ['乙']), exp],
    ['related 指回这一篇自己', good.replace('/essays/a/">甲', '/essays/cur/">甲'), exp],
    ['related 与独立复算的顺序不符', good.replace('/essays/a/">甲', '/essays/zz/">甲'), exp],
    ['related 指到站内之外', good.replace('/essays/a/', 'https://elsewhere.test/x'), exp],
    ['related 指到 feed（不是详情页）', good.replace('/essays/a/', '/rss.xml'), exp],
    ['in series 指到别组的稿子', good.replace('/essays/z/', '/essays/q/'), exp],
    ['in series 那一行里冒出序数', good.replace('← 上一篇 末', '← 第 2 篇'), exp],
    ['没填系列却画了 in series 那一行', relRow(['/essays/a/'], ['甲']) + serRow('/essays/z/') + mailRow(`${A}?subject=${SUB}`), { ...exp, series: [] }],
    ['邮箱地址与 site.js 不同源', good.replace(A, 'mailto:other@example.test'), exp],
    ['subject 没做百分号编码', good.replace(SUB, '甲篇 · 上'), exp],
    ['subject 是别的篇名', good.replace(SUB, encodeURIComponent('乙篇')), exp],
    ['mailto 预填了正文', mailRow(`${A}?subject=${SUB}&body=%E4%BD%A0%E5%A5%BD`) + relRow(['/essays/a/'], ['甲']) + serRow('/essays/z/'), exp],
    ['少一枚写信锚点', good.replace(mailRow(`${A}?subject=${SUB}`), ''), exp],
    ['多出第二枚写信锚点', good + mailRow(`${A}?subject=${SUB}`), exp],
    ['EMAIL 没登记却画了锚点', good, { ...exp, mailtoAddr: '' }],
  ];
  for (const [what, html, e] of cases){
    const red = judgePage(html, e);
    assert.ok(red.length > 0, `③ 绊线没牙：${what} 却被同一枚对账器判为过`);
    n++;
  }
  /* 朝窄：合法的三枚相关 + 零枚系列邻居 + 编码过的篇名，不许误红 */
  const wide = relRow(['/essays/a/', '/essays/b/', '/essays/c/'], ['甲', '乙', '丙'])
    + mailRow(`${A}?subject=${encodeURIComponent('第')}`);
  assert.deepEqual(judgePage(wide, { slug: 'zzz', related: ['a', 'b', 'c'], series: [], seriesSlug: '—', mailtoAddr: A, title: '第' }), [],
    '③ 朝窄误红：三枚相关的合法一行（这一格没有系列邻居）被判坏');
  n++;
  /* 朝窄第二枚：只有一枚邻居（组内第一篇）也是合法形状 */
  assert.deepEqual(judgePage(serRow('/essays/n/') + relRow(['/essays/a/'], ['甲']) + mailRow(`${A}?subject=${SUB}`),
    { slug: 'cur', related: ['a'], series: ['n'], seriesSlug: '串', mailtoAddr: A, title: '甲篇 · 上' }), [],
    '③ 朝窄误红：组内第一篇（只有下一枚）被判坏');
  n++;
  /* 独立一枚牙：RELATED_MAX 在册值必须是 3（美化建议预签的"1–3 篇"那一档），有人抬上限就红 */
  assert.equal(RELATED_MAX, 3, `③ RELATED_MAX 现在是 ${RELATED_MAX}，而签字的那一档是 3（抬上限要先改 §15 那一格与美化建议那句）`);
  n++;
  return n;
});

/* ---------- ④ 一处真值与同源性 ---------- */
cell('④', '邮箱只有一处真值／页面与尺子吃同一份纯函数／零新 CSS、零新色', () => {
  const detail = codeOnly(read('src/pages/essays/[slug].astro'));
  const about = codeOnly(read('src/pages/about.astro'));
  const site = codeOnly(read('src/data/site.js'));
  let n = 0;
  /* 那枚地址在 src/ 全树只许命中一处 */
  const m = /'mailto:([^']+)'/.exec(read('src/data/site.js'));
  assert.ok(m, '④ src/data/site.js 里没有 `export const EMAIL = \'mailto:…\'` —— 一处真值的所在地搬走了，① 判的地址与页面用的地址会分家');
  const hits = walk('src').filter(f => read(f).includes(m[1]));
  assert.deepEqual(hits, ['src/data/site.js'], `④ 那枚邮箱地址在 src/ 里命中 ${hits.length} 处（${hits.join(' / ')}）—— 两页各抄一份，改了那一处没人知道（§13a 点名的那一族）`);
  assert.ok(/export const AUTHOR\s*=/.test(site), '④ EMAIL 不再挨着 AUTHOR 住在 src/data/site.js（§13a：身份件一处一份）');
  assert.ok(/import \{[^}]*\bEMAIL\b[^}]*\} from '\.\.\/data\/site\.js'/.test(about), '④ about.astro 不再从 src/data/site.js 拿 EMAIL —— 关于页那枚链接会变成第二处真值');
  assert.ok(!/const EMAIL\s*=/.test(about), '④ about.astro 里还留着一枚局部 const EMAIL（搬走的是声明，旧的没删）');
  assert.ok(/import \{ EMAIL \} from '\.\.\/\.\.\/data\/site\.js'/.test(detail), '④ 详情页不再从 src/data/site.js 拿 EMAIL');
  assert.ok(/encodeURIComponent\(\s*post\.data\.title\s*\)/.test(detail), '④ 详情页的 subject 不再由 encodeURIComponent(篇名) 生成 —— 篇名里的中文／引号／& 会截断那枚 mailto');
  assert.ok(!/body=/.test(detail), '④ 详情页的 mailto 里出现了 body= —— 预签的那一条是"正文留空给读者"');
  n += 6;
  /* 页面与尺子吃同一份纯函数 */
  assert.ok(/import \{ relatedPosts \} from '\.\.\/\.\.\/lib\/related\.js'/.test(detail), '④ 详情页不再 import src/lib/related.js —— 那枚打分函数换了宿主，本卡 ① 判的就不是页面画的那个东西');
  assert.ok(/import \{[^}]*seriesSiblings[^}]*\} from '\.\.\/\.\.\/lib\/series\.js'/.test(detail), '④ 详情页不再 import seriesSiblings() —— 邻居改成页面自己算，与 /series/<slug>/ 那份顺序从此各说各话');
  const gsp = /export async function getStaticPaths\s*\([\s\S]*?\n\}/.exec(detail);
  assert.ok(gsp, '④ 详情页找不到 getStaticPaths —— ② 与 taxonomy-check 那圈点名的共同对象没了');
  assert.ok(/visiblePosts\s*\(/.test(gsp[0]), '④ 详情页的 getStaticPaths 里不再问 visiblePosts() —— 相关与系列邻居的池子必须是那份"滤草稿＋滤不列入"的数组');
  assert.ok(/relatedPosts\(\s*listed\s*,/.test(detail), '④ relatedPosts() 的池子不再是那份 listed（换成别的数组＝草稿或不列入的会露头）');
  assert.ok(/seriesSiblings\(\s*listed\s*,/.test(detail), '④ seriesSiblings() 的池子不再是那份 listed');
  n += 5;
  /* 纯函数那两份不许取集合 */
  for (const f of ['src/lib/related.js', 'src/lib/series.js'])
    assert.ok(!/astro:content/.test(codeOnly(read(f))), `④ ${f} import 了 astro:content —— 唯一入口那一条破在这里，门禁与页面就各有自己那份名单`);
  n += 2;
  const ser = codeOnly(read('src/lib/series.js'));
  assert.ok(/taxSlug\(\s*seriesOf\(\s*current\s*\)\s*\)/.test(ser), '④ seriesSiblings 不再用 taxSlug(seriesOf(current)) 找那一组 —— 第二份"名字→地址"的归一化进场');
  assert.ok(/seriesGroups\(\s*posts\s*\)/.test(ser), '④ seriesSiblings 不再从 seriesGroups() 拿顺序 —— 邻居自己排了一遍（§15"顺序只住一处"）');
  n += 2;
  /* 三格都只吃在册那两枚类：五份样式表里不许出现为它们新增的选择器（新一条带上下 px 的规则就得进 gap-check 注册表）。
     ⚠️ 判的是"选择器与文案"，不是任何含这些字的属性名——`letter-spacing` 里那截 `letter` 不是类（第一版就是这么误红的，
        量具的假红比漏检更坏：它教人忽略门禁，`new-post` 文件头那条同一个教训）。 */
  for (const css of ['src/styles/essay.css', 'src/styles/mistwood.css', 'src/styles/base.css', 'src/styles/home.css', 'src/styles/notes.css']){
    const t = codeOnly(read(css));
    assert.ok(!/(^|[,{}\s])\.(related|letter|post-letter|series-nav|in-series)/m.test(t) && !/写信|in series/.test(t),
      `④ ${css} 里冒出了为 F4／F5／F6 新增的选择器或文案 —— 这三行的落点是 .post-when ＋ .post-act（在册那两条声明），零新 CSS 是这一族的硬口径`);
    n++;
  }
  /* 在册那两枚类还在（① 认的就是它们；改名就红，不留"尺子读的类名页面早不用了"那种假绿） */
  const e = codeOnly(read('src/styles/essay.css'));
  assert.ok(/^\.post-when\{/m.test(e) && /^\.post-act\{/m.test(e), '④ essay.css 里 .post-when 或 .post-act 那两条声明没了 —— ① 的锚点与页面的类会分叉');
  n++;
  /* 零新色：本卡碰过的源码文件里不许有色字面量（palette-check 数的是源码里的字面量） */
  for (const f of ['src/lib/related.js', 'src/lib/series.js', 'src/pages/essays/[slug].astro', 'src/data/site.js', 'src/pages/about.astro']){
    const body = codeOnly(read(f));
    assert.equal((body.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length, 0, `④ ${f} 里出现了十六进制色字面量 —— 零新色这一条不许破（§12 第五色）`);
    assert.ok(!/rgba?\(/.test(body), `④ ${f} 里出现了 rgb()/rgba() 字面量`);
    n += 2;
  }
  return n;
});

/* ---------- 打印 ---------- */
for (const nt of notes) console.log(`  ${nt}`);
if (problems.length){
  console.log(`\n✗ reading-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log(`\n✓ 详情页三格（F4 相关／F5 系列内导航／F6 写信回应）：四格共 ${asserted} 条断言全过`
  + ` —— related 由本工具独立复算对账、in series 与 /series/<slug>/ 的行序双向咬合、letter 与 src/data/site.js 同源且百分号编码；`
  + `零载体那一档当众报"在册 0 枚"，它由 ① 的六枚 needle 与 ② ③ 的 fixture 兜住（不空转）`);
