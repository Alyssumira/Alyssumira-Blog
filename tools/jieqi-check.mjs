/* jieqi-check.mjs —— 「每条手记的日期旁边并上它的节气」那半件事的三向门禁
   （四轮 §4，`v11d/jieqi` 2026-10-02 新立；挂进 `npm run check` 作**第 ⑨ 项**，位置理由在"挂在哪儿"那一格）

   用法  node tools/jieqi-check.mjs            （门禁跑这一条：三格的牙都在源码侧，不要求 dist 在场）
         node tools/jieqi-check.mjs --list     （外加逐枚打印每一条手记读到的 jieqi 原文与它的判决）
         node tools/jieqi-check.mjs --selftest （照 tools/phase-check.mjs --selftest 与 tools/visited-probe.mjs
                                                selftest 的先例：逐格吃自己的反例——该红的必须红、合法边界不许
                                                误红；反例一枚都没跑 ⇒ selftest 自己红）

   ── 它钉住的三件事 ──────────────────────────────────────────────────────────
   ① **词表关**：作者手填的 `jieqi` 只要不在那 24 枚名字里就红。拼错、两侧多空格、字间夹空格（含全角）、
      全角／兼容字形（`⼩满`）、`小满/夏至` 那种两气混填——全都要红。**这张卡真正的牙就在这一格**：
      提案那条落地之前，打错一字只是"少一格亮"，没有任何东西告发——那是提案那条的**静默失效面**。
      词表是**封闭**的，所以"不在表里"是可判的。而"作者手填、不计算"是 `src/content.config.ts:127-133`
      已经签掉的判断（24 节气间隔 14–16 天且按时刻定，本地数组要么写死当年、要么近似，而它紧挨着的是
      全站唯一承诺"分钟级真实"的那口时钟 §6）⇒ **本卡不把它改成算法**，只给手填那一格装牙。
      ⚠️ 本卡判"是不是那 24 枚之一"，**不判"这一填配不配那个日子"**：后者要一枚近似节气表，正是上面那条
      注释判不进的东西，也不许由工具替作者算一遍（登记在本卡回执的"未验到"）。
   ② **形状关**：页头那把标尺的**格数＝词表枚数**、**点亮格数＝去重后的命中数**（多一枚少一枚都红），
      零枚命中 ⇒ 整块不落（连那 24 格都不出现在产物里），而刻度必须**匿名**（格子里不许长字）。
   ③ **并法关**：`notes.astro` 那行 `<time>` 与 `about.astro` 那行 `<time>`（＋关于页 last-walk 那一行）必须是
      同一枚段式——`fmtDate` 打头，其后每一枚可空位各自带一枚 ` · `，空值那枚的分隔点一起消失。
      "两页同口径"不许靠记性：注释里写一句"要一致"没有尺子读得到（§16 那一族"两边各自赦免同一个错"）。

   ── 为什么三格的牙都长在源码上，产物那一拍只是加映 ────────────────────────
   `npm run check` 这条链今天**不读 dist**（`tools/taxonomy-check.mjs:4` 原话「跑在 build 之前，不需要 dist/」，
   链上八项没有一项读产物）。本卡挂进这一条链，所以：
     · ① 吃 `src/content/notes/*.md` 的 front matter（`tools/frontmatter.mjs` 那枚现成读法，工具侧只此一份，
       不自己再 split 一遍 `---`；行尾先归一成 LF，躲开 `splitFm` 文件头点过的那枚 CRLF 假红）；
     · ② 吃 `src/pages/notes.astro` 里那一段模板形状（格数由**同一枚** `JIEQI.map` 出、点亮集合由**同一枚**
       去重＋词表过滤出，所以"格数＝词表枚数"是**构造**而不是账上第二枚数字）＋ `notes.css` 那两枚几何数；
     · ③ 吃两份 `.astro` 里那几行的字面形状。
   `dist/notes/index.html` 在场**且新鲜**（mtime 不早于上面任何一枚输入）时，② 再当众数一遍产物里那 24 枚
   `<span>`、亮了几格、格子里有没有字。落后或缺席的产物**不参与判定并明打一句**——拿旧产物装绿比不量更坏。
   "零枚手记时这一格怎么退"照 `tools/media-check.mjs` ① 的先例答：同一枚收集器在合成 fixture 上必须数得到
   24 格与指定枚数的亮格，所以"读到 0 枚容器"是**真没画**而不是**收集器空转**；这条自证每次跑（① 的控制样本
   那一拍 + ② 的"收集器读不到对象也算一种读"那句），`--selftest` 再把它两侧各扭一次。

   ── 词表住在哪儿（一处真值 ⇄ 一枚独立参照物）──────────────────────────────
   名单的**真值在 `src/pages/notes.astro` 的 front matter**（`const JIEQI = [...]`）：页面上那 24 格由它 map 出来，
   ①② 两格读回的也是它——工具侧**不抄第二份名单**（抄的那份改了没人知道，§13a）。
   但本卡另外带一枚**独立**的在册名单 `CANON`，只对着词表本身扭：参照物必须独立于被测物，否则"页面与工具
   一起被改成 23 枚"就查不出来——先例是 `tools/phase-check.mjs` 里那枚故意保留旧实现的 `OLD_phaseOf`。

   ── 挂在 check 链的哪一格（§16：判据挂在哪儿由依赖方向定，不是口味）────────
   **第 ⑨ 项**：`media-check` 之后、`font-subset --verify` 之前。
   链上今天的形状是「发布预检 → markdown → 源码形状尺那一族（palette／phase／gap／taxonomy）→ 媒体 → 字体盘上对账」。
   本卡是"源码形状尺"那一族的成员（读 `.astro`、读 `content/notes/`、读一枚 CSS 声明），插在媒体之后把这一族
   续全；而 `font-subset --verify` 是链上唯一一枚**二进制字节／sha256 级**的复验，留在链尾最省事——它前面任何
   一项红了就不必跑到它。**为什么不挂 gate**：① 那一格的失效面（作者打错一字）要在**写手记的当天**说话，
   而 gate 排在 build 之后；三格都不需要产物，挂 check 不新增"必须先 build 才能跑"的依赖。

   ── 今天零对象 ⇒ 每一格都不许静默 ─────────────────────────────────────────
   `src/content/notes/*.md` 那一层被 `.gitignore` 单独管着，**干净检出就是零枚**（`src/lib/personal.js:6-8`
   那句"零枚是在册状态而不是坏了"）。所以 ① 每格都自带控制样本（坏写法必须有判决句子、好写法必须没有），
   三格都印出"扫了几枚、填了几枚、命中几格"这三个数——数要打得出来，不是沉默（media-check 文件头那条）。

   ── 不碰的四处 ────────────────────────────────────────────────────────────
   · `src/content/notes/*.md` 里作者写的任何一个字（那是手记不是数据；本卡只判 jieqi 那一枚键）。
   · `src/content.config.ts` 的 `jieqi: blankSlot(z.string().default(''))`（`about.astro:97` 今天就在吃它；
     改成必填、或改成算出来，都不是这张卡的授权，也不该是）。
   · `src/lib/sun.js` 的 `solarTerms()`：那枚函数返回的是**时差 eqtime ＋赤纬 decl**（`:36-39`），与 24 节气
     无关，只是名字撞车。本卡不 import 它，也不许下一张卡拿它当节气源。
   · 那把尺的**深浅**本身：`--moss-ink`／`--ink-3` 两枚在册令牌之外本卡不判色（`--straw` 的消费者配额与双闸
     归 `palette-check` ①d，这里不重述；只在 ② 顺手拦一道"本卡自己的文件里不许冒 --straw"）。
*/
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import { splitFm, unquote } from './frontmatter.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTES_DIR = join(ROOT, 'src', 'content', 'notes');
const PAGE = 'src/pages/notes.astro';
const ABOUT = 'src/pages/about.astro';
const CSS = 'src/styles/notes.css';
const CFG = 'src/content.config.ts';
const DIST_PAGE = join(ROOT, 'dist', 'notes', 'index.html');
const argv = process.argv.slice(2);
const SELFTEST = argv.includes('--selftest');

/* ---------- 在册那 24 枚（独立参照物；顺序＝一年从立春起，封闭词表） ---------- */
const CANON = ['立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
  '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];

let asserted = 0;                     /* 每格自己上报跑了几条断言；0 ⇒ 这一格在空转（口径照 media-check） */
const problems = [];
const ledger = [];
const listing = [];
function cell(id, label, fn) {
  let n = 0, threw = null;
  try { n = fn() || 0; }
  catch (e) { threw = e; }
  /* 一格死了只报一次：抛出来的那条就是原因，不再补一句 asserted=0（两条都进账单会淹掉真正那句） */
  if (threw) { problems.push(`${id} ${label}：${threw && threw.message ? threw.message : threw}`); return; }
  if (!n) { problems.push(`${id} ${label}：asserted=0（这一格一个断言都没跑就交了白卷）`); return; }
  asserted += n;
  ledger.push(`${id} ${label}：${n} 条断言 ✓`);
}

const read = f => readFileSync(join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
/* 形状针看的是**代码**：块注释、HTML 注释先抹掉（口径照 media-check ④ 与 gap-check 的 strip，
   "注释里写一句不算数"）。⚠️ 残余局限照实登记：这枚非字符串感知的剥法认不出串里的 `/*`——
   今天两份 .astro 与那份 CSS 里都没有这种形状（notes.astro 与 about.astro 的 glob 字面量住在
   content.config.ts，而那一枚本卡只读 mtime 不读形状），真冒出来时红的是本卡，改的是这枚剥法。 */
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));   /* 保行数的抹法：下面那几枚 ^ 锚与行号点名都靠它 */

/* ---------- 词表：从页面的 front matter 里读回那一行（工具侧不抄第二份名单） ---------- */
function readVocab(src) {
  const m = /^const JIEQI = \[([\s\S]*?)\];/m.exec(src);
  assert.ok(m, `读不到词表：${PAGE} 里找不到「const JIEQI = [...]」那一行——页面上那 24 格、${CSS} 那把尺、`
    + `本卡 ①② 两格吃的都是它。名单若搬去别处，本卡的落点要跟着改（一处真值两本账），但**不许**在工具里另抄一份第二名单`);
  const list = [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]);
  assert.ok(list.length > 0, `词表那一枚数组是空的：${PAGE} 里那 24 格是从一枚空数组 map 出来的`);
  return list;
}
/* 词表 ⇄ 在册 24 枚（纯函数：门禁那一格与 --selftest 的"词表被扭"反例吃同一枚判决） */
function judgeVocab(vocab) {
  if (vocab.length !== CANON.length) return `词表是 ${vocab.length} 枚，在册那 24 气是 ${CANON.length} 枚`
    + ` ⇒ 页面与本卡之间有一处被改窄／改宽（页面上那 24 格按词表 map，格数跟着一起变）`;
  for (const [i, q] of vocab.entries()) {
    if (CANON[i] !== q) return `词表第 ${i + 1} 枚是「${q}」，在册名单第 ${i + 1} 枚是「${CANON[i]}」`
      + ` ⇒ 顺序＝一年从立春起排；改名、改序、漏一格都要回 §13b 重签，不许在那一行悄悄换`;
  }
  const dup = vocab.filter((q, i) => vocab.indexOf(q) !== i);
  if (dup.length) return `词表里重复了这些气：${dup.join(' / ')} ⇒ 标尺长出两枚同名格，而点亮集合是一枚 Set`
    + ` ⇒"点亮格数＝去重命中数"从此对不上`;
  const odd = vocab.filter(q => q.length !== 2);
  if (odd.length) return `词表里这些枚形状不对（在册的都是两枚汉字）：${odd.join(' / ')}`;
  return null;
}

/* ---------- ① 的判据：一枚手填值 ⇄ 词表（纯函数：控制样本与真对象吃同一枚） ---------- */
const SEPS = /[\s\u3000·/、,，;；|–—_-]+/g;
/* NFKC 把全角／兼容字形（`⼩`）与全角空格折回正常形，再去掉分隔符。折叠**只用于给作者一句人话**，
   放行只认逐字符精确命中：折得回来 ≠ 对上。 */
const fold = s => s.normalize('NFKC').replace(SEPS, '');
function nearest(s, vocab) {
  let best = '', score = 0;
  for (const q of vocab) {
    const share = [...new Set(s)].filter(c => q.includes(c)).length;
    if (share > score) { score = share; best = q; }
  }
  return score > 0 ? `${best}（共有 ${score} 枚字）` : '连一枚字都对不上';
}
/* 交回 null＝放行；交回字符串＝那一句进账单的话（说清作者该改哪一字、页面上现在长成什么样） */
function judgeJieqi(raw, vocab) {
  if (raw === '') return null;                          /* 可空位：没填＝那一段连分隔点都不出现（blankSlot 口径） */
  if (vocab.includes(raw)) return null;                  /* 逐字符精确命中——唯一的放行路径 */
  const f = fold(raw);
  const inside = vocab.filter(q => f === q || f.includes(q));
  if (raw !== raw.trim() && vocab.includes(raw.trim())) {
    return `「${JSON.stringify(raw)}」两侧带了空格：去掉空格才是词表里那枚「${raw.trim()}」。`
      + `标尺按逐字符比 ⇒ 那一格**不亮**，而 <time> 那一行把带空格的那一串照原样印给读者`;
  }
  if (inside.length >= 2) {
    return `「${raw}」里塞了 ${inside.length} 枚气名（${inside.join(' / ')}）：一条手记只属于一气。`
      + `混填在标尺上谁都不亮（去重集合收下的是整串，词表里没有这一枚），在页面上是一串读者拼不出来的字`;
  }
  if (inside.length === 1) {
    const kind = raw.normalize('NFKC') !== raw ? '全角／兼容字形'
      : /\s/.test(raw) ? '字间夹了空格（含全角空格）' : '写法不同';
    return `「${raw}」折过来是词表里的「${inside[0]}」，但站上比的是**逐字符**：${kind} ⇒ 那一格不亮、页面上那行也是这串错字`;
  }
  return `「${raw}」不在那 24 枚气名里（最接近：${nearest(f, vocab)}）：词表是封闭的，表外的写法既不亮格、也没人告发——这一格就是那位"没人"`;
}

/* ---------- ② 的收集器：从 HTML 里数那 24 格（合成 fixture 与真产物吃同一枚） ---------- */
const RULER_RE = /<div class="jieqi-scale"[^>]*>([\s\S]*?)<\/div>/;
function collectRuler(html) {
  const m = RULER_RE.exec(String(html));
  if (!m) return { present: false, cells: 0, lit: 0, label: '' };
  const inner = m[1];
  return {
    present: true,
    cells: (inner.match(/<span\b[^>]*>/g) || []).length,
    lit: (inner.match(/<span class="jq-lit">/g) || []).length,
    label: inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ''),   /* 匿名刻度 ⇒ 这一串必须是空的 */
  };
}
/* 收集器读到的三个数 ⇄ 期望的两个数（纯判决；"整块不落"这一档由 wantLit===0 表达） */
function judgeRuler(got, wantCells, wantLit) {
  if (!got.present) {
    if (wantLit > 0) return `词表里有 ${wantLit} 枚命中，产物里却一枚标尺都没画 ⇒ "整块不落"走错了档（那一档只在零枚命中时开）`;
    return null;                                                    /* 零枚命中 ⇒ 不落＝对 */
  }
  if (got.cells !== wantCells) return `产物里标尺画了 ${got.cells} 枚格，词表是 ${wantCells} 枚 ⇒ 格数与词表分叉（多一格少一格都算）`;
  if (got.lit !== wantLit) return `产物里点亮 ${got.lit} 格，去重后的命中是 ${wantLit} 枚 ⇒ 点亮数与命中数分叉`;
  if (got.label !== '') return `刻度不匿名：那 ${wantCells} 格里画出了字（「${got.label.slice(0, 40)}」）——气名只许出现在每行 <time> 上作者手填的那一枚。`
    + `写进模板还会把 24 枚气名推进码点并集（今天这 48 枚字里有 14 枚不在 835 码点的子集内 ⇒ font-subset --check 红在缺字上）`;
  return null;
}

/* ---------- ③ 的段式：一行 = fmtDate 打头 ＋ 若干枚「键 ? ' · ' + 同一枚键 : ''」 ---------- */
const HEAD = '\\{fmtDate\\(([A-Za-z_$][\\w$]*)\\.data\\.date\\)\\}([\\s\\S]*?)(?=</(?:time|p)\\b)';
const SEG_SPLIT = /\{[^{}]*\}/g;
const SEG = /^\{\s*([A-Za-z_$][\w$]*)\.data\.([A-Za-z_$][\w$]*)\s*\?\s*' · (?:[a-z]+: )?'\s*\+\s*\1\.data\.\2\s*:\s*''\s*\}$/;
const TIME_RE = new RegExp('<time>' + HEAD);
const WALK_RE = new RegExp('<p class="last-walk">last walk · ' + HEAD);
/* 把一行拆成段：fields＝按盘上顺序读到的可空键名；bad＝不认得的那几段原文；stray＝段与段之间残留的字面
   （那里残留一枚 ` · ` 就是「2026.09.25 · 」那种活壳的形状）。 */
function parseLine(src, re, label) {
  const m = re.exec(src);
  if (!m) return null;
  const [, host, rest] = m;
  const chunks = rest.match(SEG_SPLIT) || [];
  const fields = [], bad = [];
  for (const c of chunks) { const g = SEG.exec(c); if (g) fields.push(g[2]); else bad.push(c); }
  return { label, host, fields, bad, count: chunks.length, stray: rest.replace(SEG_SPLIT, '').replace(/\s+/g, '') };
}
/* 一行读法交回的判决（null＝这行的形状就是在册那一枚）；③ 与 --selftest 吃同一枚 */
function judgeLine(t) {
  if (!t) return '读不到那一行（fmtDate 打头那段形状换了宿主或换了写法）—— 并法这一格失去了对象';
  if (t.bad.length) return `有 ${t.bad.length} 段不认得（${t.bad.join(' | ').slice(0, 140)}）：在册的段式是`
    + `「一枚可空位带一枚 · 」（键 ? ' · ' + 同一枚键 : ''）。两枚同时在场时并成一枚、换分隔符、`
    + `或给空值留一枚点，都算长出第二种形状`;
  if (t.stray) return `段与段之间残留了字面（「${t.stray.slice(0, 40)}」）——那正是「2026.09.25 · 」那种活壳的形状（§14 那条"没填 ⇒ 不出现"）`;
  return null;
}

/* 那一行 front matter 的**盘上原文**（`splitFm` 的 `:\s*` 会替我们把冒号后的空格吃掉，而"多一个空格"这一扭
   要的正是盘上那一枚空格）——所以这里自己按行抠一次：冒号后到行尾全收，两侧空格一律保留。 */
function rawValueLine(fmText) {
  const m = /^jieqi:(.*)$/m.exec(fmText);
  if (!m) return null;                       /* 整枚键没写（可空位） */
  return m[1];
}
/* 盘上原文 → 页面那侧看得见的值 ＋ 那一枚键脏在哪里的话。
   ⚠️ 常规写法 `jieqi: 白露` 冒号后那**一枚**空格是 YAML 的分隔符，不是脏——只有"冒号后多于枚空格"与
      "行尾拖空格"两种才算，否则这一格会把每一条正常手记都弄红（假阳性比漏检更糟，它教人忽略门禁：
      new-post.mjs:25 那个教训）。加了引号的值不在这儿判——引号里面那串空格是**内容**，页面照原样带上它，
      那一支交给 judgeJieqi 的逐字符比对去报（"那一格不亮"是真会发生的失效，不是排版洁癖）。 */
function readJieqiKey(rawLine) {
  if (rawLine === null) return { present: false, value: '', edge: null };
  const [, lead, body, trail] = /^([ \t]*)([\s\S]*?)([ \t]*)$/.exec(rawLine);
  const quoted = body.length > 1 && (body[0] === '"' || body[0] === "'") && body.endsWith(body[0]);
  const value = quoted ? unquote(body) : body;    /* 引号那一层走工具侧只此一份的 unquote（media-check 同一口径） */
  const w = [];
  if (!quoted) {
    if (lead.length > 1) w.push(`冒号后空了 ${lead.length} 枚`);
    if (trail.length) w.push(`行尾拖着 ${trail.length} 枚`);
  }
  return { present: true, value, edge: w.length ? `${w.join('、')}空格（盘上那一行是 ${JSON.stringify('jieqi:' + rawLine)}）` : null };
}

/* ---------- 读盘上的手记（只读那一枚键，稿件一个字节都不改） ---------- */
function readNoteSlots() {
  const files = existsSync(NOTES_DIR) ? readdirSync(NOTES_DIR).filter(f => f.endsWith('.md')).sort() : [];
  const out = [];
  for (const f of files) {
    const text = readFileSync(join(NOTES_DIR, f), 'utf8').replace(/\r\n/g, '\n');
    const parsed = splitFm(text);
    const end = text.indexOf('\n---\n', 3);
    const fmHead = end < 0 ? text : text.slice(0, end + 1);
    const km = /^jieqi:/m.exec(fmHead);
    const key = readJieqiKey(rawValueLine(parsed ? parsed.fmText : ''));
    out.push({
      f,
      parsed: !!parsed,
      hasKey: key.present,
      raw: key.value,                                  /* 页面上那串（与 gray-matter/js-yaml 同一读法） */
      edge: key.edge,                                  /* 盘上那串带了两侧空格而没加引号 */
      line: km ? fmHead.slice(0, km.index).split('\n').length : null,   /* front matter 里那一行的行号，只用于点名 */
    });
  }
  return out;
}

const pageSrc = read(PAGE);
const pageCode = code(pageSrc);          /* 形状针读的是抹掉注释之后的那一份（注释里写一句"已经并了"不算数） */
const aboutCode = code(read(ABOUT));
const cssCode = code(read(CSS));
let vocabError = null, V = [];
try { V = readVocab(pageCode); } catch (e) { vocabError = e.message; }
const slots = readNoteSlots();
/* 命中集合：与页面同一枚构造（去重 ＋ 词表过滤），本卡不另猜一遍 */
const hitSet = () => new Set(slots.map(s => s.raw).filter(q => V.includes(q)));

/* ============================ 门禁三格 ============================ */
cell('①', '词表关（手填的 jieqi ⇄ 那 24 枚逐字符精确；词表本身 ⇄ 在册名单逐枚逐序）', () => {
  let n = 0;
  assert.ok(!vocabError, `① ${vocabError || ''}`);
  n++;
  const vw = judgeVocab(V);
  assert.ok(!vw, `① ${vw}`);
  n++;

  /* 控制样本：坏写法必须有判决句子、好写法必须一枚都没有。
     ⚠️ 今天真对象是零枚（干净检出的在册状态），这一拍就是 ① 唯一的证词——没有它，"扫了但没匹配到"与
        "扫了且全过"在两串输出里是同一种样子（media-check 文件头那条老判据；空转的尺子就这么长）。 */
  const BROKEN = ['小漫', '小满 ', ' 小满', '小 满', '小　满', '⼩满', '小满/夏至', '小满 夏至', '冬至节', 'xiaoman'];
  const GOOD = ['', '立春', '小满', '大寒'];
  let caught = 0;
  for (const raw of BROKEN) {
    assert.ok(judgeJieqi(raw, V), `① needle：写法「${JSON.stringify(raw)}」被判成合法 ⇒ 词表关没牙了`);
    caught++; n++;
  }
  for (const raw of GOOD) {
    assert.equal(judgeJieqi(raw, V), null,
      `① needle：合法写法「${JSON.stringify(raw)}」被拦住了（${judgeJieqi(raw, V)}）——假阳性比漏检更糟，它教人忽略门禁（new-post.mjs:25 同一个教训）`);
    n++;
  }
  /* 词表被扭的那两向也必须当场红（同一枚 judgeVocab，反例与门禁吃一条路） */
  assert.ok(judgeVocab(V.slice(0, 23)), '① needle：词表少一枚（摘掉大寒）却没红 ⇒ 封闭名单那一半没牙');
  assert.ok(judgeVocab([...V, '立春']), '① needle：词表多塞一枚重复却没红 ⇒ 25 格那一向没牙');
  n += 2;

  /* 真对象 */
  assert.ok(existsSync(NOTES_DIR), `① src/content/notes/ 不在盘上——手记那一层连目录都没了（在册的是目录旁那枚 .gitkeep：`
    + `glob loader 的 base 指向不存在的目录时 astro build 红在配置上，而不是红在"这个作者还没写手记"上）⇒ 这一格在评空气`);
  n++;
  let filled = 0, hit = 0, wrong = 0, blankKey = 0, noKey = 0;
  for (const s of slots) {
    assert.ok(s.parsed, `① src/content/notes/${s.f} 的 front matter 不成形（链上第 ① 项 new-post --check 本该先拦下它）`);
    n++;
    if (!s.hasKey) { noKey++; listing.push(`  ${s.f}  整枚没写 jieqi（可空位 ⇒ 放行）`); continue; }
    if (s.raw === '' && !s.edge) { blankKey++; listing.push(`  ${s.f}:${s.line ?? '?'}  jieqi 空着（可空位 ⇒ 放行）`); continue; }
    filled++;
    if (s.edge) {
      wrong++;
      problems.push(`① src/content/notes/${s.f}:${s.line ?? '?'} 的 jieqi —— ${s.edge}。`
        + `YAML 会把这些空格削掉、页面上看不出差别 ⇒ 这一枚既不炸构建也不少一格，但文件写的与页面读的不是同一串，`
        + `而那枚空格写在手填的那一格上：删掉它（要留空格就得加引号，加了引号页面就真带上它、那一格随即不亮）`);
      continue;
    }
    const w = judgeJieqi(s.raw, V);
    if (w) { wrong++; problems.push(`① src/content/notes/${s.f}:${s.line ?? '?'} 的 jieqi —— ${w}`); }
    else { hit++; listing.push(`  ${s.f}:${s.line ?? '?'}  jieqi「${s.raw}」命中 ⇒ 标尺第 ${V.indexOf(s.raw) + 1} 格亮`); }
  }
  ledger.push(`① 词表关：词表 ${V.length} 枚与在册 24 气逐枚逐序相同 ✓ · 扫了 src/content/notes/ 的 ${slots.length} 枚手记`
    + `（填了 ${filled} 枚：命中 ${hit} · 错填 ${wrong}；空着 ${blankKey} 枚、整枚没写 ${noKey} 枚 ⇒ 可空位放行）`
    + ` · 控制样本：坏写法 ${caught}/${BROKEN.length} 枚各有判决句子（错字／两侧空格／字间半角与全角空格／兼容部首／斜杠混填／空格混填／多一枚字／拼音）`
    + `，合法写法 ${GOOD.length} 枚零误红 · 词表被扭两向（少一枚／多一枚重复）各自红 ✓`
    + `${slots.length === 0 ? ' ⇒ 今天干净检出零枚手记（那一层 *.md 不进仓库，personal.js:6 那句"零枚是在册状态而不是坏了"）：'
      + '这一格的红牙由上面那 10 枚控制样本当场撑着——不是空转，也不是恒红' : ''}`);
  return n;
});

cell('②', '形状关（标尺格数＝词表枚数、点亮格数＝去重命中数、零命中整块不落、刻度匿名）', () => {
  let n = 0;
  assert.ok(V.length === 24, `② 词表读不到（本卡第 ① 格报的那件事），这一格没有分母`);
  n++;
  /* 模板形状那一串针：格数与点亮数在源码里必须是**同一枚** map 与同一枚集合，不许有第二个来源。
     红了不是洁癖：它逼下一轮同时改本卡的判据来源（先例 media-check ④「页面换渲染方式 ⇒ 本卡跟着改」）。 */
  const decl = /^const jqLit = new Set\(.*$/m.exec(pageCode);
  assert.ok(decl, `② ${PAGE} 里那枚点亮集合不再是"对 notes 现算一枚 Set"（找不到 const jqLit = new Set(...) 那一行）`
    + ` ⇒ "点亮格数＝去重后的命中数"这句话失去了对象`);
  assert.ok(/notes\.map\(/.test(decl[0]), `② jqLit 不再从 notes 现算（读到：${decl[0]}）：它换了一枚分母`);
  assert.ok(/\.data\.jieqi/.test(decl[0]), `② jqLit 读的不是 .data.jieqi（${decl[0]}）：并的不是那一枚键了`);
  assert.ok(/JIEQI\.includes\(/.test(decl[0]), `② jqLit 那一行不再过滤词表（${decl[0]}）`
    + ` ⇒ 词表外的值也进集合，"点亮格数"与"命中数"就会是两个数（那一枚错字谁都亮不了，而页面上那行 <time> 会把错字印出来）`);
  n += 4;

  const mapM = /\{\s*JIEQI\.map\(\s*([A-Za-z_$][\w$]*)\s*=>\s*jqLit\.has\(/.exec(pageCode);
  assert.ok(mapM, `② 那 24 格不再是由词表一枚 map 出来的 ⇒ 格数与词表枚数从此是两件事（找不到 JIEQI.map(...)）`);
  {
    const end = pageCode.indexOf('</div>', mapM.index);
    assert.ok(end > 0, '② 标尺那个 div 没有收口：模板形状读不出来');
    const block = pageCode.slice(mapM.index, end);
    assert.ok(!new RegExp('\\{\\s*' + mapM[1] + '\\s*\\}').test(block),
      `② map 表达式里把那枚气名插进了格子里（${block.slice(0, 120)}）：刻度必须匿名——气名只走每行 <time> 上作者手填的那一枚，`
      + `而 24 枚名字一旦上纸就进码点并集（① 那条码点账）`);
    assert.ok(/<span class="jq-lit"><\/span>\s*:\s*<span><\/span>/.test(block),
      `② 亮格与不亮格不再是同一枚二选一（${block.slice(0, 120)}）：点亮那一档换了写法，本卡的收集器就读不到对象了`);
  }
  n += 3;

  assert.match(pageCode, /jqLit\.size > 0 &&/,
    `② 零枚命中那一档的门不在了（找不到 jqLit.size > 0 &&）⇒ 空着也要画 24 格空壳，`
    + `撞 §12 那句"关掉一档 ⇒ 那条路不生成"（先例：EssayIndex.astro 那把横条的 posts.length > 0、about.astro 那片 .word-river 的零篇不落）`);
  n++;

  const cssSrc = cssCode;   /* 注释里写一句 border-radius 不算数：看的是声明 */
  assert.match(cssSrc, /\.jieqi-scale\s*\{[^}]*column-gap:\s*3px/,
    `② ${CSS} 里那把尺的格缝不再是 column-gap:3px（照 .yring 搬的那一枚）：缝一旦写成单值 gap 或 row-gap，`
    + `gap-check 就在 notes.css 里多抓一枚垂直槽位而注册表无人认领（那 144 枚的账不归本卡改）`);
  assert.match(cssSrc, /\.jieqi-scale\s*\{[^}]*height:\s*12px/,
    `② ${CSS} 里那把尺的画幅不再是 12px（notes 页小字那一档、与 .yring 同值）：它自起了一枚新数`);
  assert.ok(!/border-radius/.test(cssSrc), `② ${CSS} 里长出 border-radius：圆角那 32 枚／12 种一枚不许添`
    + `（§13b 那条先例只留两条路：格是方的，或圆走 SVG <circle>，如 about.astro:139 那枚 .w-dot）`);
  assert.ok(!/--straw/.test(cssSrc), `② ${CSS} 里出现 --straw：枯草金的消费者今天钉死 1 枚、且必须带 data-phase="dusk"＋data-theme="light" 双闸`
    + `（那一本账归 palette-check ①d；这里只是在本卡自己的文件上早拦一道，不重述它的判据）`);
  n += 4;

  /* 期望值现算（与页面同一枚构造，不另猜），再决定要不要与产物对账 */
  const hits = hitSet();
  const wantCells = V.length, wantLit = hits.size;
  let newestSrc = 0;
  for (const p of [PAGE, ABOUT, CSS, CFG, ...slots.map(s => join(NOTES_DIR, s.f))]) {
    if (existsSync(p)) newestSrc = Math.max(newestSrc, statSync(p).mtimeMs);
  }
  const hasDist = existsSync(DIST_PAGE);
  const fresh = hasDist && statSync(DIST_PAGE).mtimeMs >= newestSrc;
  let productWord;
  if (fresh) {
    const got = collectRuler(readFileSync(DIST_PAGE, 'utf8'));
    assert.ok(!judgeRuler(got, wantCells, wantLit), `② 产物对账 —— ${judgeRuler(got, wantCells, wantLit)}`);
    productWord = `产物 dist/notes/index.html（新鲜：不早于 src 那 ${inputsCount()} 枚输入）读到 ${got.present
      ? `${got.cells} 格／亮 ${got.lit}／格内${got.label ? '有字' : '无字'}` : '整块不落'} ✓`;
  } else {
    productWord = `产物${hasDist ? '比源码旧（dist 落后于 src ⇒ 不参与判定：拿旧产物装绿比不量更坏）' : '缺席（dist/notes/index.html 不在——check 链本来就跑在 build 之前）'}`
      + ` ⇒ 收集器那一半的力气由 --selftest 当众验：同一枚收集器在 24 格 fixture 上数得到格数与亮格，`
      + `所以真产物里读到 0 枚容器是"真没画"而不是"收集器空转"（media-check ① 那条先例）`;
  }
  assert.ok(wantLit <= wantCells, `② 点亮数 ${wantLit} 大于格数 ${wantCells}：命中集合溢出词表（构造被改了）`);
  n++;
  ledger.push(`② 形状关：期望 ${wantCells} 格／点亮 ${wantLit} 枚（去重命中：${[...hits].join(' ') || '一枚都没有'}；`
    + `${slots.filter(s => s.hasKey && s.raw !== '').length} 枚手记填了 jieqi）· 源码侧九枚针当场断到`
    + `（jqLit＝notes 现算＋词表过滤／24 格由同一枚 JIEQI.map 出且格内无名／亮与不亮是同一枚二选一／零命中那档的门在／`
    + `CSS＝column-gap 3px ＋ height 12px、零 border-radius、零 --straw）✓ · ${productWord}`);
  return n;
});
function inputsCount() { return 5 + slots.length; }

cell('③', '并法关（notes 那行 <time> ⇄ about 那行 <time> 与 last-walk：同一枚段式）', () => {
  const rows = [
    parseLine(pageCode, TIME_RE, `${PAGE} 的 <time>`),
    parseLine(aboutCode, TIME_RE, `${ABOUT} 的 <time>`),
    parseLine(aboutCode, WALK_RE, `${ABOUT} 的 .last-walk`),
  ];
  let n = 0;
  for (const t of rows) {
    const w = judgeLine(t);
    assert.ok(!w, `③ ${w || ''}${t ? `（对象：${t.label}）` : ''}`);
    n += 2;
  }
  const [noteTime, aboutTime, aboutWalk] = rows;
  assert.ok(noteTime.fields.includes('jieqi'), `③ ${noteTime.label} 没有并 jieqi（读到的序列：${noteTime.fields.join(' → ') || '只有日期'}）`
    + `：提案那一半（05.21 · 小满）今天不在页面上`);
  assert.ok(aboutTime.fields.includes('jieqi'), `③ ${aboutTime.label} 不再并 jieqi 了（读到：${aboutTime.fields.join(' → ') || '只有日期'}）`
    + `：about.astro:97 今天就在并它，notes 与它必须同一口径——谁先撤，另一侧就红在这一格`);
  assert.ok(aboutWalk.fields.includes('jieqi') && aboutWalk.fields.includes('weather'),
    `③ ${aboutWalk.label} 那行少了东西（读到：${aboutWalk.fields.join(' → ')}）：它是全站第一处把两枚可空位并排写的地方`);
  n += 3;
  assert.deepEqual(noteTime.fields, ['weather', 'jieqi'],
    `③ ${noteTime.label} 的可空位序列是 ${noteTime.fields.join(' → ') || '（空）'}，在册的是 weather → jieqi`);
  n++;
  const common = noteTime.fields.filter(f => aboutTime.fields.includes(f));
  assert.deepEqual(noteTime.fields.filter(f => common.includes(f)), aboutTime.fields.filter(f => common.includes(f)),
    `③ 两页共同那几枚可空位的**顺序**不同（notes：${noteTime.fields.join(' → ')} ⇄ about：${aboutTime.fields.join(' → ')}）`
    + `：同一批手记在两处读出两种先后，就是第二种并法`);
  n++;
  /* 反面对账：一枚三元里同时拼两枚可空位（"并成一枚"那种形状）在两页都不许存在 */
  for (const [f, src] of [[PAGE, pageCode], [ABOUT, aboutCode]]) {
    assert.ok(!/' · '[^?]{0,60}\.data\.\w+\s*\+/.test(src),
      `③ ${f} 里有一枚「' + ' · ' + … + 值 : …」形状的拼接（两枚可空位并成一枚）⇒ 并法长出了第二种形状，两页从此分叉`);
    n++;
  }
  ledger.push(`③ 并法关：notes 那行＝日期 → ${noteTime.fields.join(' → ')}（${noteTime.count} 段，每段各带自己那一枚 · ，空值那段连点一起消失）`
    + ` ⇄ about 那行 <time>＝日期 → ${aboutTime.fields.join(' → ')}（${aboutTime.count} 段）· last-walk＝日期 → ${aboutWalk.fields.join(' → ')}`
    + `（${aboutWalk.count} 段，其中 weather 那枚带 ` + '`weather: ` ' + `标签——那是那一行在册的散文，段式仍同一枚）`
    + `：三处逐段读通 ✓、两页共同那 ${common.length} 枚顺序相同 ✓、零枚"并成一枚" ✓`);
  return n;
});

/* ============================ --selftest：两侧都要扭得动 ============================ */
if (SELFTEST) {
  console.log('== jieqi-check --selftest（逐格吃自己的反例；口径照 tools/phase-check.mjs --selftest）==');
  console.log(`  被测词表：${V.length} 枚 ${V.join(' ')}（读自 ${PAGE}）`);
  let bad = 0, ran = 0;
  const fail = msg => { bad++; console.log(`  ✗ ${msg}`); };
  const mustRed = (name, word) => {
    ran++;
    if (!word) fail(`${name}：该红的没红（反例没力气）`);
    else console.log(`  ✓ ${name} ⇒ 红：${String(word).slice(0, 150)}`);
  };
  const mustGreen = (name, word) => {
    ran++;
    if (word) fail(`${name}：朝窄误红（合法边界被拦）—— ${String(word).slice(0, 150)}`);
    else console.log(`  ✓ ${name} ⇒ 放行（合法边界，不许误红）`);
  };

  console.log('  ① 词表关：作者那一枚手填值（十枚坏写法各扭一次，四枚好写法不许误红，词表本身扭两侧）');
  const CASES = [
    ['拼错一字', '小漫'], ['尾随空格', '小满 '], ['前导空格', ' 小满'], ['字间半角空格', '小 满'],
    ['字间全角空格', '小　满'], ['兼容部首形', '⼩满'], ['两气混填（斜杠）', '小满/夏至'],
    ['两气混填（空格）', '小满 夏至'], ['多一枚字', '冬至节'], ['写了拼音', 'xiaoman'],
  ];
  for (const [name, raw] of CASES) mustRed(`① ${name}「${JSON.stringify(raw)}」`, judgeJieqi(raw, V));
  for (const raw of ['', '立春', '小满', '大寒']) mustGreen(`① 合法写法「${JSON.stringify(raw)}」`, judgeJieqi(raw, V));
  mustRed('① 词表被摘掉一枚（只剩 23 枚）', judgeVocab(V.slice(0, 23)));
  mustRed('① 词表被多塞一枚重复', judgeVocab([...V, '立春']));
  mustRed('① 词表被改了顺序（立春与大寒对调）', judgeVocab(['大寒', ...V.slice(1, 23), '立春']));
  mustGreen('① 词表原样（在册 24 枚逐枚逐序）', judgeVocab(V));
  {
    /* 那一枚键的**读法**也要有牙：`splitFm` 的 `:\\s*` 会替我们把前导空格吃掉，而"多一个空格"这一扭
       要的正是盘上那一枚空格——所以读法自己按行抠一次。下面六枚是同一枚键的六种盘上形状（含"不许误红"那三枚）。 */
    const k = line => readJieqiKey(rawValueLine(line));
    mustRed('① 键两侧带空格（不加引号）：页面削得掉、盘上留着', k('jieqi: 白露 ').edge ? '读法认得出这一枚尾随空格（值交给 ① 的 edge 那一支报）' : null);
    mustRed('① 键前导空格（不加引号）', k('jieqi:   白露').edge ? '读法认得出这一枚前导空格（splitFm 会把它吃掉，本卡不吃）' : null);
    mustRed('① 带引号而里面藏空格（页面照原样带上、那一格不亮）', judgeJieqi(k('jieqi: "白露 "').value, V));
    mustGreen('① 干净一行（两侧无空格、值命中）', k('jieqi: 白露').edge || judgeJieqi(k('jieqi: 白露').value, V));
    mustGreen('① 整枚没写（可空位）', k('date: 2026-01-01').present ? '不该出现' : null);
    mustGreen('① 有键而值为空（blankSlot 那一档）', k('jieqi:').present ? judgeJieqi(k('jieqi:').value, V) : '不该出现');
  }

  console.log('  ② 形状关：同一枚收集器（fixture 必须数得到 24 格 ⇒ 读到 0 枚容器才是"真没画"）');
  const mk = (cells, lit, label = '') =>
    `<div class="jieqi-scale" aria-hidden="true">${label}`
    + `${Array.from({ length: cells }, (_, i) => i < lit ? '<span class="jq-lit"></span>' : '<span></span>').join('')}</div>`;
  {
    const good = collectRuler(mk(24, 3));
    ran++;
    if (!(good.present && good.cells === 24 && good.lit === 3 && good.label === '')) fail(`② 收集器在 24 格／亮 3 的 fixture 上没数对（读到 ${JSON.stringify(good)}）⇒ 后面的"读到 0"证词是假的`);
    else console.log('  ✓ 收集器读到对象：fixture 24 格／亮 3／格内无字 ⇒ 真产物里读到 0 枚容器＝"整块没画"，不是"收集器空转"');
  }
  mustRed('② 多画一格（25）', judgeRuler(collectRuler(mk(25, 3)), 24, 3));
  mustRed('② 少画一格（23）', judgeRuler(collectRuler(mk(23, 3)), 24, 3));
  mustRed('② 点亮多一枚（亮 4）', judgeRuler(collectRuler(mk(24, 4)), 24, 3));
  mustRed('② 点亮少一枚（亮 2）', judgeRuler(collectRuler(mk(24, 2)), 24, 3));
  mustRed('② 有命中却整块没画', judgeRuler(collectRuler('<main><p>一条手记</p></main>'), 24, 3));
  mustRed('② 格子里长了字（匿名刻度被写脏）', judgeRuler(collectRuler(mk(24, 3, '立春')), 24, 3));
  mustRed('② 画了一把 0 格的空尺', judgeRuler({ present: true, cells: 0, lit: 0, label: '' }, 24, 3));
  mustGreen('② 零命中 ⇒ 不落（收集器读到 0 枚容器）', judgeRuler(collectRuler('<main class="wrap"><p class="tax-empty">还没有手记。</p></main>'), 24, 0));
  mustGreen('② 满命中（24 枚全亮）', judgeRuler(collectRuler(mk(24, 24)), 24, 24));

  console.log('  ③ 并法关：段式（shipped 那一行必须读通，五种坏形状必须红）');
  const parse = body => parseLine(`<time>{fmtDate(n.data.date)}${body}</time>`, TIME_RE, 'fixture 那行');
  const SEG_OK = `{n.data.weather ? ' · ' + n.data.weather : ''}{n.data.jieqi ? ' · ' + n.data.jieqi : ''}`;
  {
    const good = parse(SEG_OK);
    ran++;
    if (!(good && good.fields.join() === 'weather,jieqi' && !good.bad.length && good.stray === '')) fail(`③ shipped 那种并法读不通（读到 ${JSON.stringify(good)}）`);
    else console.log('  ✓ 段式认得 shipped 那一行：日期 → weather → jieqi，两段各带一枚 · ，空值那段连点一起消失');
  }
  mustRed('③ 两枚并成一枚（只留一处 ·）', judgeLine(parse(`{n.data.weather ? ' · ' + n.data.weather + n.data.jieqi : ''}`)));
  mustRed('③ 空值那档留了一枚点（活壳）', judgeLine(parse(`{n.data.jieqi ? ' · ' + n.data.jieqi : ' · '}`)));
  mustRed('③ 换了第二种分隔符', judgeLine(parse(`{n.data.jieqi ? ' / ' + n.data.jieqi : ''}`)));
  mustRed('③ 段与段之间残留字面（多点一枚）', judgeLine(parse(`{n.data.weather ? ' · ' + n.data.weather : ''}' · '{n.data.jieqi ? ' · ' + n.data.jieqi : ''}`)));
  mustRed('③ 那一行整个不在（宿主换了）', judgeLine(parseLine('<div>没有 time</div>', TIME_RE, 'fixture')));
  mustGreen('③ 只并一枚（about 那行今天就是这一档）', judgeLine(parse(`{n.data.jieqi ? ' · ' + n.data.jieqi : ''}`)));
  mustGreen('③ 裸日期一行（两枚可空位都没填）', judgeLine(parse('')));
  {
    ran++;
    const labeled = parseLine(`<p class="last-walk">last walk · {fmtDate(walk.data.date)}{walk.data.weather ? ' · weather: ' + walk.data.weather : ''}{walk.data.jieqi ? ' · ' + walk.data.jieqi : ''}</p>`, WALK_RE, 'fixture');
    if (!(labeled && !labeled.bad.length && !labeled.stray && labeled.fields.join() === 'weather,jieqi')) fail(`③ 带标签那一枚段式（last walk 那行）读不通：${JSON.stringify(labeled)}`);
    else console.log('  ✓ 段式认得 last-walk 那一行（` · weather: ` 那枚带标签的是在册形状，不算第二种）');
  }
  console.log(bad ? `\n✗ jieqi-check --selftest 有 ${bad} 项没过（跑了 ${ran} 项）` : `\n✓ jieqi-check --selftest 全过：${ran} 项——反例都红在该红的地方，合法边界一枚没误红`);
  process.exit(bad ? 1 : 0);
}

/* ---------- 打印 ---------- */
if (argv.includes('--list')) {
  console.log('  逐枚账目（读的是 src/content/notes/ 的 front matter；稿件一个字节都不改）：');
  for (const l of listing) console.log(l);
  if (!listing.length) console.log('  （一枚都读不到：那一层 *.md 不进仓库，干净检出就是零枚——这一行是打出来的，不是沉默）');
}
for (const s of ledger) console.log(`  ${s}`);
if (problems.length) {
  console.log(`\n✗ jieqi-check 红了 ${problems.length} 条：`);
  for (const p of problems) console.log(`  · ${p}`);
  process.exit(1);
}
console.log(`\n✓ 节气三格共 ${asserted} 条断言全过：手填的 jieqi 逐字符落在那 24 枚里、标尺那 24 格与点亮数同源、三处并法同一枚段式`);
