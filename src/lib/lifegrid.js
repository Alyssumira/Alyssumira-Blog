/* 一生格子的**纯派生**那一半（`card/lifegrid`）：不 import 'astro:content'、不碰 DOM、不读盘、不读时钟。
   接法照 `src/lib/taxonomy.js` 那三枚纯读函数——关于页与 `tools/lifegrid-check.mjs` 吃**同一份实现**：
   工具里另抄一份周数算法，就会出现"门禁绿、页面红"那种两边各自赦免同一个错（§16 记过的那一族）。
   ⚠️ 连渲染器也住在这里，页面只写 `set:html`：格子那片 markup 若有第二份（页面一份、尺子一份），
      尺子量的就不是访客看到的那件事了（§16 同一族；页面那侧的用法见 `src/pages/about.astro`）。

   ── 口径：一片格子 = 从出生日那天起，每 7 天一格，只画**已经活过的那些** ──────────────
   一格 ＝ 一周**已经开始**（出生那天起的前 7 天是第一格，哪怕它只走到第 3 天）。
   ⚠️ 不许写死寿命：这里没有"人活 900 格"那种替作者编的数（§12「编一个访问量」同族）。
      行数由周数除以每行 52 格**推**出来，`WEEKS_PER_ROW` 是画幅（一行摆几格），不是上限；
      没活到的那一半一格都不画——画了就是给一个还没发生的事画地图。

   ── 输入只有两枚：出生日 ＋ 构建日 ────────────────────────────────────────────────
   页面上出现的每一格都必须能由这两枚复算（关于页那一行把枚数、起点与"构建于"并排给读者，就是给他复算的三枚数）。
   两枚都只取**日历日**（年／月／日），不参与时刻、时区、夏令时——一天的账不该被本机时钟那一个小时挪动
   （§12「露水蒸发」禁的正是把界面正确性挂在没人能核对的时钟上）。闰年因此是日历自己算的：
   `Date.UTC` 的日序天然带着 2 月 29 日，代码里不出现 365/366 这类常量，也不判断年初年末的边界
   （写法与 `src/lib/stats.js` 的 `yearArc()`"比值向日历本身要"是同一句）。
   ⚠️ 那些边界对不对，由尺子判（`tools/lifegrid-check.mjs` ②：闰年／年初／年末各点一次），不由文案判。

   ── 空态：没登记就一格都不画 ────────────────────────────────────────────────────
   `parseBirth()` 交回 `null` 的三种情况：整串空着／写法不是日历上存在的某一天（`2026-02-30`）／还没到那一天。
   ⇒ 调用方连"第 0 年""第 0 格"都不许出现（口径照 §12:1000 那条"载入次数读不到时整行不出现"；
      退回一个 0 或一枚占位灰格都是假值，而这一页专门放的是复算得出的数）。 */

/* 一行的格数＝一年 52 周：这是**画幅**（一片格子怎么摆），不是"人活多久"。 */
export const WEEKS_PER_ROW = 52;

const DAY_MS = 86400000;
/* 日历日 → 日序（整数）。两端的年月日都用 `Date.UTC` 折成同一个时间轴上的整天数，
   于是差值是纯日历日数：本机时区与夏令时进不来，闰日天然在里面。 */
const dayIndex = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);

/* 一枚日期对象（构建戳那枚 `new Date()`）→ 它的日历日。只取年月日三个字段，不取时刻。
   ⚠️ 不导出：尺子要自己算一遍同一件事（它 import 的是 `parseBirth` 与 `lifeField` 那两枚口径），
      工具顺手复用这里的日序函数就等于两边一起错。 */
const dayIndexOfDate = dt => dayIndex(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());

/* 出生日的读法：`YYYY-MM-DD` 与 `YYYY.MM.DD` 都认（站里所有日期都是点写法，git 给的是连字符写法，
   两种都是"同一件事的两种写法"，`src/lib/stats.js` 的 `dot()` 已经把账并过一次）。
   ⚠️ 交回的是 `{ y, m, d, day }` 这样一枚**日历记录**，不是 `Date`：
      `new Date('1990-05-14')` 按 UTC 零点解析、`.getFullYear()` 按本地时区读，
      西半球那一边就会把出生日读成前一天——一格之差正是尺子要红的那种错。
      没填／填得不像日历上的一天／还没到那一天 ⇒ `null`（＝这一格没有可画的起点）。 */
export function parseBirth(raw){
  const s = String(raw ?? '').trim();
  const m = /^(\d{4})[.-](\d{2})[.-](\d{2})$/.exec(s);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1) return null;
  const back = new Date(Date.UTC(y, mo - 1, d));
  /* 回代校验：`2026-02-30` 会被 Date.UTC 滚成 3 月 2 日，那一天不存在 ⇒ 不算登记过 */
  if (back.getUTCFullYear() !== y || back.getUTCMonth() + 1 !== mo || back.getUTCDate() !== d) return null;
  return { y, m: mo, d, day: dayIndex(y, mo, d) };
}

/* 已经走过的那一片：周数（格数）＋按年分行。
   `on` 是构建那一刻那枚日期对象——关于页必须把它和"构建于"那一行用**同一枚**（§16 一页只许有一个构建时刻，
   两处各求一次就会在跨秒的那一次构建里自相打脸；接法见 `src/lib/stats.js` 的 `now`）。
   出生当天：days=0 ⇒ weeks=1（第一格已经开始）。还没到那一天 ⇒ weeks=0（调用方什么都不画）。 */
export function lifeField(birth, on){
  const days = dayIndexOfDate(on) - birth.day;
  if (days < 0) return { days, weeks: 0, rows: [] };
  const weeks = Math.floor(days / 7) + 1;
  const rows = [];
  for (let i = 0; i < weeks; i += WEEKS_PER_ROW){
    rows.push({ year: rows.length, count: Math.min(WEEKS_PER_ROW, weeks - i) });
  }
  return { days, weeks, rows };
}

/* 那片格子的 markup——页面与尺子共用这一份。
   ⚠️ 串里进的只有本卡自己算出来的整数：没有作者文本、没有日期原文进 HTML，所以这里不引转义那一套
      （进了文本就要引 `src/lib/markdown.js` 的 `esc()`，那是另一件事）。
   `data-week` 是全局序号（第 1 格起算，跨年连续），尺子拿它逐枚对账：
   枚数、序号连续性、行宽都从它读，不靠数标签的字数。 */
export function lifeFieldHtml(birth, on){
  const f = lifeField(birth, on);
  if (!f.weeks) return '';
  const out = [];
  for (const r of f.rows){
    const cells = [];
    for (let i = 0; i < r.count; i++){
      cells.push(`<span class="life-cell" data-week="${r.year * WEEKS_PER_ROW + i + 1}"></span>`);
    }
    out.push(`<div class="life-year" data-life-year="${r.year}">${cells.join('')}</div>`);
  }
  return out.join('\n');
}
