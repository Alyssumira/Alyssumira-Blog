/* phase-check.mjs —— `data-phase` 边界的第五类判据：**换算法这件事到底改变了多少体验**（§2.3）
   用法  node tools/phase-check.mjs            （断言 + 摘要；接进 npm run check）
         node tools/phase-check.mjs --table    （外加打印那张经纬度×月份的差值表）
         node tools/phase-check.mjs --now      （外加打印"此时此刻"三地的表算档 / 太阳算档）
         node tools/phase-check.mjs --selftest （`npm run selftest`：逐格吃自己的反例，要求"该格必须红"）

   ── 它管哪几件事，为什么每件都得有 ──────────────────────────────────────────
   ⓪ **月份表在位**：退路自己的形状。表被删短 / 键写错 / 行破坏不变式 ⇒ 后面每一格都是在评一份坏退路。
   ① **等价性**：拿不到定位时（拒绝授权 / 超时 / 浏览器没这个 API）走的那条退路，必须和本次改动之前
      **逐分钟一致**。判法是把改动前那五行 `phaseOf` 原样抄成 `OLD_phaseOf` 当参照，对 12 个月 × 一天
      每一分钟逐个比。"看着一样"不算，比完全表才算。
      ⚠️ 这一格还多一条**参照物独立性**：拿 ③ 里"表 vs NOAA 差得最远"的时刻问一遍，旧表与太阳路径必须
      **给出过不同档**。sep=0 只有两种解释（太阳边界根本没在动 = 这条改动白做；或参照物已经变成被测物自己
      = 有人"顺手清理"把 OLD_phaseOf 改成调用 phaseAt），两种都不许顶着绿灯过去。
   ② **不变式**：算出来的四个边界必须满足 `night < dawn < day < dusk` 且每一档都活着（塌成三档＝少一档
      色温，那是偷偷改了档位而不是改边界）。高纬度夏季的极昼极夜、以及"太阳给的窗口互相吞掉"，都归这里。
   ③ **差值表**：三处经纬度 × 四天，现有表的四个切换时刻 vs NOAA 的四个切换时刻 vs 差多少分钟。
      这张表的用途是**判断这条值不值得上**——所以"平均 |Δ| ≥ 15 分钟"是**判据**，不是提示（低于阈值这一格红）。
   ④ **三档授权状态**：把 shipped 的那段分支（`sunOverride`）分别喂 granted / denied / unsupported，
      报各自实际生效的边界与档位。浏览器侧另有一跑 --dump-dom 对账，见规范登记。
   ⑤ **抗"静默不跑"**：坏输入必须死得看得见（抛，而不是被兜成 'day'）。
   ⑥ **物理标定**：拦"边界形状全合法但天文算错了"那一族（符号翻转、年循环错位）。
   ⑦ **登记表自校**：这一层守的是**门禁自己**——四份清单必须同源（见下）。

   ── 为什么要有 ⑦（§14 第 14 项的那个洞）─────────────────────────────────────
   判据的坑从来不是"太严"，是**坏了也不响**。M6 实测过：把 ⑥ 整格注释掉，工具照样 exit 0——因为"少一格"
   这件事没有任何人报告。`palette-check` 的 rgba 漂移检查也静默空转过一次（§16）。所以这一轮起：
   · 每格登记成对象并**自己交回 `asserted`（跑了多少条断言）**；`asserted === 0` 直接红，不许"今天没东西可测"
   · 四份**互相独立**的清单：登记表 CELLS、`CELL_IDS`（日常必须跑齐的格）、`CONTRA_IDS`（反例清单）、
     以及 `docs/设计规范.md` 里那行机器可读清单。**后三枚都不许由 CELLS 派生**——否则删掉一格时"期望数"
     跟着掉，就是这个洞的第二次发作。删格 ⇒ ⑦ 与驱动层的"跑齐没跑齐"双双变红（是红，不是跳过）
   · 每格自带**两枚**反例：**朝宽**（一个喂给它就必须让那格变红的坏输入/坏参照）与**朝窄**（一个合法
     边界情形，不许误红）。`--selftest` 逐格跑这两枚：反例没力气 ⇒ 红；朝窄误红 ⇒ 红；反例一格都没跑 ⇒ 红
   ⚠️ `--selftest` **故意**让判据吃坏数据，所以它不接进日常 `check` 的默认链（混在一起会分不清红的是哪一件），
      收在 `npm run selftest`。它是 `--table` / `--now` 那种"另一次调用"，不是 `check` 的第五项。
   ⚠️ 残余局限照实说：`CONTRA_IDS` 本身仍是人工维护的字面量——**把反例条目连同 id 一起删掉仍然会静默**，
      只是范围从"删判据静默"缩到"删反例静默"。要一次删干净得同时动 ①登记表 ②CELL_IDS ③CONTRA_IDS
      ④规范里那行清单四处，且规范那一行是**签字文档**（§16 规范先行），动它是要在 diff 里显形的。

   ── 防空转（§16 那条"检查静默空转、退出码 0、长得像全绿"）────────────────────
   每一处"没吃到东西"都是 exit 1，并且点名是哪一步死的：月份表被删短 / 键写错、四个经纬度组合一个都没算、
   等价性比对的格数是 0、NaN 喂进去没被挡、坏边界喂进 phaseAt 竟然没抛、档位取值掉出四档枚举、
   差值表退化成正比（表与太阳同源）、物理标定那 5 条被清空成 0/0、某一格 asserted=0、登记表少一格。
   ⚠️ 变异测试现在不必再手工一次：反例就是长在仓库里、会自己吃坏数据的变异测试。逐格记录在规范 §2.3 末。
*/
import { SEASON_DUSK, seasonOf, tableBounds, sunBounds, sunOverride, clampScale, phaseAt, assertBounds, PHASES, DAWN_HALF, DUSK_HALF, MIN_SPAN } from '../src/lib/phase.js';
import { sunHours, solarTerms } from '../src/lib/sun.js';
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const SELFTEST = argv.includes('--selftest');
const SHOW_TABLE = argv.includes('--table');
const SHOW_NOW = argv.includes('--now');
/* ⚠️ 把钟表时区**钉住**再算：北京/乌鲁木齐/广州三处共用 +8 这一条钟表，差值表量的就是"上海钟表读到的
   太阳"。不钉的话这张表会随跑命令的机器变（在纽约的机器上跑出一张完全不同的表，还不报错）。
   要换口径传 --tz=Europe/Berlin。Node 在进程内改 process.env.TZ 实测立即生效（本卡验过）。 */
const WANT_TZ = (argv.find(a => a.startsWith('--tz=')) || '').slice(5) || 'Asia/Shanghai';
process.env.TZ = WANT_TZ;

const bad = [];
const fail = m => bad.push(m);
let p2 = n => String(n).padStart(2, '0');
/** 小数小时 → "HH:MM:SS"（秒只是让分钟级的差值可对账，显示粒度仍是分钟） */
function hhmm(h) {
  if (!Number.isFinite(h)) return '—';
  let x = ((h % 24) + 24) % 24;
  let s = Math.round(x * 3600);
  return `${p2(Math.floor(s / 3600) % 24)}:${p2(Math.floor(s / 60) % 60)}:${p2(s % 60)}`;
}
const TZNAME = Intl.DateTimeFormat().resolvedOptions().timeZone;
if (TZNAME !== WANT_TZ) { console.log(`  ✗ 钟表时区钉不住：要 ${WANT_TZ}、Node 实际用 ${TZNAME} —— 差值表在任何机器上不可复跑，判据不许在这种地基上出数`); process.exit(1); }
const D = (m, d) => new Date(2026, m, d, 12);      /* 中午构造，避开夏令时切换日的那一小时 */
/** 小数小时 → 那一个分钟的时刻（探针用；秒也保住，因为差值量到分钟） */
const atHour = (m, d, h) => new Date(2026, m, d, Math.floor(h), Math.floor((h % 1) * 60), Math.round((((h % 1) * 60) % 1) * 60));

/* ---------- ⑦ 要读的那三份外部清单：谁都不许由 CELLS 派生 ---------- */
/* 日常必须跑齐的格。少一格就是 §14 第 14 项的原案：删掉的判据不会自己报告。 */
const CELL_IDS = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦'];
/* 反例清单（selftest 的期望数）。⚠️ 它与 CELL_IDS 内容相同是**巧合**，不是派生关系：
   两枚分开写，删一格时要同时删两处才不被发现——这就是"期望数不许由 registry 派生"的落点。 */
const CONTRA_IDS = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦'];
/* 第四份清单在**另一份文件**里：规范 §16 那行机器可读登记表。它是签字文档，动它会在 diff 里显形。
   ⚠️ 读不到、或读到了但一个 id 都没有 ⇒ 红（fail closed），绝不"跳过这一格"。 */
const SPEC_MARK = 'phase-check 登记表';
const CIRCLED = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
function specRegistry() {
  const file = new URL('../docs/设计规范.md', import.meta.url);
  let text;
  try { text = readFileSync(file, 'utf8'); } catch (e) { return { ids: [], why: `读不到 docs/设计规范.md（${e.message}）` }; }
  const line = text.split(/\r?\n/).find(l => l.includes(SPEC_MARK));   /* ⚠️ CRLF 工作树：按 includes 找行，别用 $ 锚 */
  if (!line) return { ids: [], why: `docs/设计规范.md 里没有「${SPEC_MARK}」那一行（⑦ 的第四份清单丢了）` };
  const ids = CIRCLED.filter(c => line.split(`${SPEC_MARK}`)[1].includes(c));
  if (!ids.length) return { ids: [], why: `「${SPEC_MARK}」那一行里一个 id 都没有（清单被掏空 = 空转的另一副面孔）` };
  return { ids, why: '' };
}

const LOCS = [
  ['北京', 39.9, 116.4],
  ['乌鲁木齐', 43.8, 87.6],
  ['广州', 23.1, 113.3],
];
const MONTHS = [[0, 15, '冬'], [3, 15, '春'], [6, 15, '夏'], [9, 15, '秋']];
const CUT_NAME = ['入dawn', '入day', '入dusk', '入night'];
const TZ0 = process.env.TZ;
const zoneFor = lon => { const n = Math.round(lon / 15); return n === 0 ? 'UTC' : `Etc/GMT${n > 0 ? '-' : '+'}${Math.abs(n)}`; };
const restoreTZ = () => { if (TZ0 === undefined) delete process.env.TZ; else process.env.TZ = TZ0; };

/* ---------- 差值表那 48 格：③ 的正文，也是 ① 独立性探针的素材 ---------- */
const cutsOf = b => [b.dawnStart, b.dawnEnd, b.duskStart, b.duskEnd];
function buildRows(E) {
  const rows = [];
  for (const [name, lat, lon] of E.locs) {
    for (const [m, d, season] of E.months) {
      const day = D(m, d);
      const tb = E.tableBounds(day);
      const sb = E.sunBounds(day, lat, lon);
      let cells = null;
      if (sb) {
        const a = cutsOf(tb), c = cutsOf(sb);
        /* 每一格同时带**两个参照**：数值（画表用）与两份边界对象（① 的分离性探针要用边界、不只是要用数） */
        cells = a.map((v, i) => ({ i, name, m, d, a: v, c: c[i], dv: Math.round((c[i] - v) * 60), mid: atHour(m, d, (v + c[i]) / 2), tbBounds: tb, sb }));
      }
      rows.push({ name, lat, lon, m, d, season, tb, sb, cells });
    }
  }
  return rows;
}

/* ---------- ① 的参照物：从 `git show HEAD~:src/scripts/site.js` 抄下来的旧实现 ---------- */
/* ⚠️ 这五行是**故意**保留它自己的 SEASON_DUSK 读法的：参照物必须独立于被测物，否则"两边一起改错"
   就查不出来。把函数体改成调用 phaseAt 会让 ① 变成一枚绿灯装饰——所以 ① 现在自带一条独立性断言
   （见下面 probes 那段），改坏之后那一格当场红，`--selftest` 的反例也把这一族固定成了常驻判据。 */
function OLD_phaseOf(d) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 9) return 'dawn';
  const [ds, de] = SEASON_DUSK[seasonOf(d.getMonth())];
  if (h >= ds && h < de) return 'dusk';
  if (h >= 9 && h < ds) return 'day';
  return 'night';
}

/* ---------- 反例喂坏表用的是"原地换内容"，不是抄一份校验 ---------- */
/* SEASON_DUSK 是导出的可变对象，⑤ 本来就在这么改它再还原。换法沿用同一招，且事后**核对还原干净**——
   反例把全局表改坏了没还原，比反例本身更糟（它会污染同一进程后面每一格）。 */
function withTable(rows, fn) {
  if (!rows) return fn();
  const snapshot = JSON.stringify(SEASON_DUSK);
  const orig = { ...SEASON_DUSK };
  for (const k of Object.keys(SEASON_DUSK)) delete SEASON_DUSK[k];
  Object.assign(SEASON_DUSK, rows);
  try { return fn(); } finally {
    for (const k of Object.keys(SEASON_DUSK)) delete SEASON_DUSK[k];
    Object.assign(SEASON_DUSK, orig);
    if (JSON.stringify(SEASON_DUSK) !== snapshot) fail(`反例把 SEASON_DUSK 改坏了没还原（selftest 污染了被测物，比它查出的错更严重）`);
  }
}

/* ============================ 判据登记表 ============================
   每格 run(E) → { asserted, failed, out }：
     asserted 这一格真跑了多少条断言（0 ⇒ 空转，直接红）
     failed   报红的原文（多条）
     out      给人看的摘要行（绿时才打印）
   每格再带两侧反例：contra（朝宽：喂坏输入，必须让这格红）/ narrow（朝窄：合法边界，不许误红）。
   E 是"这一格吃的数据与函数"，默认 E = REAL 就是 shipped 的那一份；反例只换掉它要验的那一枚。 */
const CELLS = [
  /* ---------- ⓪ ---------- */
  {
    id: '⓪', name: '月份表在位（退路本身没坏）',
    run(E) {
      let asserted = 0; const failed = [], out = [];
      const keys = Object.keys(E.SEASON_DUSK);
      asserted++;
      if (keys.length !== 4) failed.push(`SEASON_DUSK 只剩 ${keys.length} 行（应为 4：winter/spring/summer/autumn）—— 退路本身就是坏的，等价性比对没有对象`);
      for (const k of ['winter', 'spring', 'summer', 'autumn']) {
        asserted++;
        if (!E.SEASON_DUSK[k]) { failed.push(`SEASON_DUSK 缺 ${k} 行`); continue; }
        const b = E.tableBounds(D(k === 'summer' ? 6 : k === 'winter' ? 0 : k === 'spring' ? 3 : 9));
        asserted++;
        if (!E.assertBounds(b)) failed.push(`SEASON_DUSK.${k} = ${JSON.stringify(E.SEASON_DUSK[k])} 给出的边界不满足 night < dawn < day < dusk`);
      }
      out.push(`  ⓪ 月份表  ✓ ${keys.length} 行在位，四行各自给出的边界都满足 night < dawn < day < dusk`);
      return { asserted, failed, out };
    },
    contra: [{
      name: '删掉 winter 那一行（M2 的形状）',
      env: () => ({ ...REAL, table: { spring: SEASON_DUSK.spring, summer: SEASON_DUSK.summer, autumn: SEASON_DUSK.autumn } }),
    }],
    narrow: [{
      name: 'winter 收到合法极值 [9, 23.99]（贴着 9 ≤ ds < de ≤ 24 的边界，不该误红）',
      env: () => ({ ...REAL, table: { ...REAL.SEASON_DUSK, winter: [9, 23.99] } }),
    }],
  },

  /* ---------- ① ---------- */
  {
    id: '①', name: '退路逐分钟等价 + 参照物独立性',
    run(E) {
      let asserted = 0, n = 0, mism = 0; const failed = [], out = [];
      for (let m = 0; m < 12; m++) {
        const b = E.tableBounds(D(m, 15));
        for (let min = 0; min < 1440; min++) {
          const t = new Date(2026, m, 15, 0, min);
          n++; asserted++;
          if (E.phaseAt(t, b) !== E.oldPhase(t)) {
            if (mism < 4) failed.push(`退路不等价：${m + 1}/15 ${hhmm(min / 60)} 旧=${E.oldPhase(t)} 新=${E.phaseAt(t, b)}`);
            mism++;
          }
        }
      }
      if (!n) failed.push('等价性比对一格都没跑（0 格＝判据空转）');
      out.push(mism ? `  ① 退路等价  ✗ ${mism}/${n} 格不同档` : `  ① 退路等价  ✓ ${n} 格（12 个月 × 1440 分钟）逐分钟与改动前的实现同档`);
      /* (ii) **参照物独立性（结构判据）**。为什么不能只用差分：把 OLD_phaseOf 换成
         `d => phaseAt(d, tableBounds(d))` 之后它与真旧实现**逐分钟同解**，于是"参照物是不是被测物自己"
         这一件事在任何输入输出上都看不出来——差分原理上分不开两个同解的函数。所以这一条只能查结构：
         参照物的函数体必须**自带一份读表逻辑**（提到 SEASON_DUSK），且不许出现 src 那条路径的名字。
         ⚠️ 它拦的是"顺手清理"这一族（本卡目标 B），拦不住先在模块作用域起个别名再调的刻意绕过——
         那一层留在残余局限里，不假称彻底。 */
      const body = String(E.oldPhase);
      asserted++;
      const coupled = /phaseAt|tableBounds|sunBounds|sunOverride/.exec(body);
      if (E.oldPhase === E.phaseAt) failed.push('参照物就是 phaseAt 本身（自己跟自己比，等价性永远成立 = 这一格是装饰）');
      else if (coupled) failed.push(`参照物不再独立：它的函数体里出现了 ${coupled[0]}（被 ${E.oldPhase.name || 'arrow'} 调用）。把旧实现"顺手清理"成调用 shipped 那条路，等价性就永远成立，` +
        `于是 tableBounds/phaseAt 哪天真被改错也没人报——这一格会当场变成绿灯装饰（§14 第 14 项目标 B 那一族）。参照物必须自己读表、自带那五行 if`);
      else if (!/SEASON_DUSK/.test(body)) failed.push('参照物没有自己读 SEASON_DUSK（一段不含旧表读法的"旧实现"不是参照物）');
      /* (iii) 太阳路径分离性：拿 ③ 里"表 vs 太阳差得最远"的时刻问一遍，两条路径必须**给出过不同档**。 */
      const pool = E.rows.flatMap(r => r.cells || []).sort((x, y) => Math.abs(y.dv) - Math.abs(x.dv));
      const probes = pool.slice(0, 6);
      let sep = 0;
      for (const p of probes) {
        asserted++;
        if (E.phaseAt(p.mid, p.sb) !== E.phaseAt(p.mid, p.tbBounds)) sep++;
      }
      out.push(`      参照物独立性：结构 ✓（函数体自带读表、不叫 phaseAt/tableBounds）；太阳路径分离 ${sep}/${probes.length} 枚"最远时刻"给出不同档`);
      if (!probes.length) failed.push('① 拿不到差值表里任何一个时刻做分离性探针（太阳那条路从来没被验过是否真的在动）');
      else if (!sep) {
        const p = probes[0];
        failed.push(`太阳路径分离性失败：${p.name} ${p.m + 1}/${p.d} ${CUT_NAME[p.i]} 的中间时刻 ${hhmm(p.a)}↔${hhmm(p.c)}（|Δ| ${Math.abs(p.dv)} 分钟）上，月份表边界与太阳边界算出**同一个档**，` +
          `${probes.length} 枚探针全同档 —— 要么 sunBounds 已经退化成月份表（这条改动的全部价值是 0，③ 也会一起红），要么探针时刻全落在两档重合的区间里（扫描口径没吃到位）`);
      }
      return { asserted, failed, out };
    },
    contra: [
      /* 目标 B 那一族的原形状：有人"顺手清理"，把参照物换成 shipped 实现 ⇒ 等价性永远成立 ⇒ 必须由 (ii) 红。 */
      {
        name: '把参照物换成 shipped 实现（OLD_phaseOf 的函数体改成调用 phaseAt + tableBounds）',
        env: () => ({ ...REAL, oldPhase: function OLD_phaseOf(d) { return phaseAt(d, tableBounds(d)); } }),
      },
      /* 另一族：参照物仍然独立，但**答案**被改坏一格（dawn 窗口写歪 1 小时）。素材不是编的：
         乌鲁木齐 1/15 入dawn 05:00→07:40 是 ③ 差值表里 |Δ| 最大的一格（161 分钟），
         两档的中间时刻 06:20 上旧表判 dawn、太阳判 night ⇒ 这格必须有本事报出 mism。 */
      {
        name: '参照物的 dawn 窗口被"顺手改"成 6–9（06:20 那一枚真实分档时刻必须报 mism）',
        env: () => ({
          ...REAL,
          oldPhase: d => {
            const h = d.getHours() + d.getMinutes() / 60;
            if (h >= 6 && h < 9) return 'dawn';
            const [ds, de] = SEASON_DUSK[seasonOf(d.getMonth())];
            if (h >= ds && h < de) return 'dusk';
            if (h >= 9 && h < ds) return 'day';
            return 'night';
          },
        }),
      },
    ],
    narrow: [
      /* 朝窄：参照物**换一种写法**（整数分钟比较而不是小数小时）仍然逐分钟等价 ⇒ 不许误红。
         它同时是一枚合法的独立参照物：写法独立、判出的档与 shipped 旧表一致。 */
      {
        name: '参照物改写成整数分钟算术（等价但不同形），必须仍然全绿',
        env: () => ({
          ...REAL,
          oldPhase: d => {
            const mm = d.getHours() * 60 + d.getMinutes();
            if (mm >= 300 && mm < 540) return 'dawn';
            const [ds, de] = SEASON_DUSK[seasonOf(d.getMonth())];
            if (mm >= ds * 60 && mm < de * 60) return 'dusk';
            if (mm >= 540 && mm < ds * 60) return 'day';
            return 'night';
          },
        }),
      },
    ],
  },

  /* ---------- ② ---------- */
  {
    id: '②', name: '边界不变式（高纬度全扫）',
    run(E) {
      let asserted = 0, n = 0, broken = 0, clamped = 0; const failed = [], out = [];
      const why = { polar: 0, wrap: 0, tooTight: 0 };
      const triggers = { polar: [], wrap: [], tooTight: [] };
      const MIN_S = Math.max(E.MIN_SPAN.dawn / (2 * E.DAWN_HALF), E.MIN_SPAN.dusk / (2 * E.DUSK_HALF));
      const g = E.grid;
      for (let lon = -180; lon <= 180; lon += g.lonStep) {
        process.env.TZ = zoneFor(lon);                 /* 钟表与该经度对齐，剩下的失败才是几何给的 */
        for (let lat = g.latFrom; lat <= g.latTo; lat += g.latStep)
          for (const [m, d] of E.months) {
            const day = D(m, d);
            n++;
            const b = E.sunBounds(day, lat, lon);
            asserted++;
            if (b) {
              if (b.s < 1) clamped++;
              if (!E.assertBounds(b)) { broken++; if (broken < 4) failed.push(`夹完之后仍然倒挂：lat${lat} lon${lon} ${m + 1}/${d} → ${JSON.stringify(b)}`); }
              continue;
            }
            const s = E.sunHours(day, lat, lon);
            const tag = `lat${lat} lon${lon} ${m + 1}/${d}（钟表 ${zoneFor(lon)}）`;
            const k = !s ? 'polar' : (s.set - s.rise <= 0 ? 'wrap' : 'tooTight');
            why[k]++;
            if (triggers[k].length < 3) triggers[k].push(tag + (s ? ` rise ${hhmm(s.rise)} set ${hhmm(s.set)} 昼长 ${(s.set - s.rise).toFixed(2)}h，s=${String(E.clampScale(s.rise, s.set)?.toFixed(3) ?? 'null')} < 下限 ${MIN_S.toFixed(3)}` : ' acos 定义域外'));
          }
      }
      restoreTZ();
      if (!n) failed.push('高纬度扫描一格都没跑（判据空转）');
      const back = why.polar + why.wrap + why.tooTight;
      out.push(`  ② 不变式  扫 ${n} 组（经度配同带钟表）：夹完仍倒挂 ${broken} 组、窗口被夹窄 s<1 共 ${clamped} 组、退回月份表 ${back} 组（${n ? (100 * back / n).toFixed(1) : '—'}%，全在 |lat|>66 那一圈）`);
      out.push(`      退表死因分开算：极昼极夜 ${why.polar} 组 / 四档装不下 ${why.tooTight} 组 / 跨日或倒挂 ${why.wrap} 组`);
      for (const k of ['polar', 'tooTight', 'wrap']) for (const t of triggers[k]) out.push(`      · [${k === 'polar' ? '极昼极夜' : k === 'tooTight' ? '夹不住' : '跨日'}] ${t}`);
      if (!broken && !back) failed.push('这一格一个退表/夹窄都没扫到 —— 扫描口径没吃到位（判据空转）');
      if (broken) failed.push(`有 ${broken} 组夹完之后仍然倒挂`);
      /* 另一个方向也要看一眼：钟表与经度**不**匹配（出差、时钟设错）时必须退表，不许硬算出一个跨日的档 */
      process.env.TZ = 'Asia/Shanghai';
      const mismatch = E.sunBounds(D(6, 15), 40.7, -74);          /* 上海钟表读纽约的日出 */
      restoreTZ();
      asserted++;
      if (mismatch) failed.push(`上海钟表 + 纽约位置本该判成"跨日/退表"，却算出了边界 ${JSON.stringify(mismatch)} —— 不变式没守住`);
      else out.push('      ✓ 反向一格：上海钟表读纽约日出（跨日）被挡成退表，没有硬算');
      return { asserted, failed, out };
    },
    contra: [{
      /* 边界生成器换成"永远交回一份倒挂的边界"（不夹了）——这格必须当场数出"夹完仍倒挂 N 组"。
         它是 M3 的形状（拆掉 clampScale），但用**坏边界**喂，不去复制 src 里那 20 行数学。 */
      name: '边界生成器永远交出倒挂的四边（不夹了），必须被逐组抓出来',
      env: () => ({
        ...REAL,
        sunBounds: () => ({ dawnStart: 20, dawnEnd: 5, duskStart: 7, duskEnd: 3, src: 'sun', s: 1 }),
        grid: { lonStep: 60, latFrom: -60, latTo: 60, latStep: 30 },   /* 反例不必全扫，够用即可（全扫留给日常那一跑） */
      }),
    }],
    narrow: [{
      /* 朝窄：只扫 |lat|>66 那一圈——那里必然退表，但**退表不是判红的理由**。 */
      name: '只扫极圈那一圈（|lat|≥67）：必须落进退表分支而不是判红',
      env: () => ({ ...REAL, grid: { lonStep: 30, latFrom: 67, latTo: 80, latStep: 1 } }),
    }],
  },

  /* ---------- ③ ---------- */
  {
    id: '③', name: '差值表：表 vs NOAA（这条值不值得上）',
    run(E) {
      let asserted = 0, n = 0, cells = 0, sum = 0, max = 0, maxAt = '', clamped = 0;
      const failed = [], out = [];
      /* 变体：只让傍晚跟太阳走、dawn 保持 05–09（旧表本来就只有 dusk 在动）。
         把这一列并排放，是为了分清"平均 63 分钟"里有多少来自 dawn 重定位、多少来自傍晚跟日落到。 */
      let vSum = 0, vMax = 0;
      if (SHOW_TABLE) {
        out.push('\n  差值表（左＝现有月份表；右＝NOAA 真太阳。差值正=太阳比表更晚，单位分钟）');
        out.push('  地点        月日 季 │ 昼长   s    真日出/日落        │ ' + CUT_NAME.map(c => `${c} 表→太阳`).join(' │ '));
      }
      for (const r of E.rows) {
        if (!r.sb) { failed.push(`${r.name} ${r.m + 1}/${r.d} 算不出边界（三处中国城市都不该触发退表）`); continue; }
        const a = cutsOf(r.tb), c = cutsOf(r.sb);
        const deltas = c.map((v, i) => Math.round((v - a[i]) * 60));
        n++; cells += 4;
        deltas.forEach((dv, i) => {
          asserted++;
          sum += Math.abs(dv);
          if (Math.abs(dv) > max) { max = Math.abs(dv); maxAt = `${r.name} ${r.m + 1}/${r.d} ${CUT_NAME[i]} ${hhmm(a[i]).slice(0, 5)}→${hhmm(c[i]).slice(0, 5)}`; }
          if (i >= 2) { vSum += Math.abs(dv); if (Math.abs(dv) > vMax) vMax = Math.abs(dv); }   /* 只算傍晚那两个切换时刻 */
        });
        if (r.sb.s < 1) clamped++;
        if (SHOW_TABLE)
          out.push(`  ${r.name.padEnd(4)} ${String(r.m + 1).padStart(2)}/${r.d} ${r.season} │ ${(r.sb.set - r.sb.rise).toFixed(2)}h s=${(r.sb.s ?? 1).toFixed(2)} ${hhmm(r.sb.rise)}–${hhmm(r.sb.set)}` +
            ` │ ${deltas.map((dv, i) => `${hhmm(a[i])}→${hhmm(c[i])} ${(dv >= 0 ? '+' : '') + dv}`.padEnd(21)).join(' │ ')}`);
      }
      if (!n || !cells) failed.push('差值表一行都没算出来（判据空转）');
      const mean = cells ? sum / cells : NaN;
      out.push(`  ③ 差值  ${n} 组 × 4 个切换时刻 = ${cells} 格：平均 |Δ| ${Number.isFinite(mean) ? mean.toFixed(1) : '—'} 分钟、最大 |Δ| ${max} 分钟、窗口被夹窄 ${clamped} 组`);
      out.push(`      最紧的一格在 ${maxAt}`);
      out.push(`      只让傍晚跟太阳（dawn 保持 05–09）那一列：平均 |Δ| ${cells ? (vSum / (cells / 2)).toFixed(1) : '—'} 分钟、最大 ${vMax} 分钟`);
      /* "读不读得出来"的判据挂在这里，写死成数不靠事后解释：导航那一格承诺分钟级（§6），
         而访客对"什么时候算傍晚"的容忍度是几十分钟量级——平均值低于这个数就没有体验可读。
         ⚠️ 这一轮从"打印一行 ⚠️"升级成**判红**：一条不会红的阈值不叫判据，叫注释。 */
      const READABLE = 15;
      out.push(`      阈值：平均 |Δ| ≥ ${READABLE} 分钟才算"读得出来" → ${mean >= READABLE ? '读得出来' : '读不出来（那就该判这条不做）'}`);
      if (cells && !(mean >= READABLE)) failed.push(`平均 |Δ| ${mean.toFixed(1)} 分钟 < 阈值 ${READABLE} 分钟 —— 这一格是判据不是提示：低于阈值时这张卡的结论应当是"不值得做"，边界换了等于没换`);
      return { asserted, failed, out };
    },
    contra: [{
      /* 太阳路径退化成月份表（这条改动的全部价值归零，而"表 vs 表"每一格差值都是 0）。
         今天的实现里这一族不会红——它只会打印一句"读不出来"。反例要**重算一遍 rows**，
         否则吃的是 REAL.rows（真太阳那批差值），退化就显现不出来。 */
      name: '太阳边界退化成月份表（差值全为 0，"这条值不值得上"当场否决）',
      env: () => {
        const base = { ...REAL, sunBounds: d => tableBounds(d) };
        return { ...base, rows: buildRows(base) };
      },
    }],
    narrow: [{
      name: '只留 ③ 里 |Δ| 最大那一组（乌鲁木齐 1/15）：一行也够出结论，不许因为样本少就误红',
      env: () => ({ ...REAL, rows: REAL.rows.filter(r => r.name === '乌鲁木齐' && r.m === 0) }),
    }],
  },

  /* ---------- ④ ---------- */
  {
    id: '④', name: '三档授权状态（shipped 的分支真跑一遍）',
    run(E) {
      let asserted = 0, ran = 0; const failed = [], out = [];
      const probes = E.probes;
      out.push(`\n  ④ 三档授权状态（同一个 sunOverride + 同一个 phaseAt；地点乌鲁木齐 43.8/87.6，日期 7/15 长昼）`);
      for (const [label, state, coords] of E.geoCases) {
        const day = D(6, 15);
        const sunB = E.sunOverride(state, coords, day);
        const b = sunB || E.tableBounds(day);
        const src = sunB ? 'sun' : 'table';
        const seq = probes.map(([h, mi]) => {
          const t = new Date(2026, 6, 15, h, mi);
          const p = E.phaseAt(t, b);
          asserted++;
          if (!E.PHASES.includes(p)) failed.push(`${label}：phaseAt 交出了枚举外的档位 ${JSON.stringify(p)} —— 这就是"静默产出 undefined"`);
          return `${p2(h)}:${p2(mi)}=${p ? p[0] : '?'}`;
        });
        ran++;
        /* 四档在这一组边界下是否都可达：拿每个区间的中点去问一遍。塌成三档＝偷偷改了档位而不是改边界 */
        const reach = new Set();
        for (const [x, y] of [[b.dawnStart, b.dawnEnd], [b.dawnEnd, b.duskStart], [b.duskStart, b.duskEnd], [b.duskEnd, b.dawnStart + 24]]) {
          const t = new Date(2026, 6, 15, 0, 0);
          t.setSeconds(Math.round(((((x + y) / 2) % 24) + 24) % 24 * 3600));
          const p = E.phaseAt(t, b);
          asserted++;
          reach.add(p);
        }
        if (reach.size !== 4) failed.push(`${label}：这一档边界下只有 ${reach.size} 个档位可达（应 4 个）—— ${[...reach].join('/')}`);
        out.push(`    ${label.padEnd(11)} 生效路径 ${src.padEnd(5)} 界 ${hhmm(b.dawnStart).slice(0, 5)}/${hhmm(b.dawnEnd).slice(0, 5)}/${hhmm(b.duskStart).slice(0, 5)}/${hhmm(b.duskEnd).slice(0, 5)} 可达 ${reach.size} 档  ${seq.join(' ')}`);
      }
      if (!ran) failed.push('三档授权状态一格都没跑（判据空转）');
      /* 拒绝/超时/无定位三档必须**逐字节回到月份表**：拿北京 1/15 的表边界逐个对 */
      for (const state of E.fallbackStates) {
        const ref = E.tableBounds(D(0, 15));
        const got = E.sunOverride(state, { latitude: 39.9, longitude: 116.4 }, D(0, 15)) || ref;
        asserted++;
        if (JSON.stringify(cutsOf(got)) !== JSON.stringify(cutsOf(ref))) failed.push(`${state} 没有落回月份表：拿到 ${JSON.stringify(got)}`);
      }
      out.push(`    拒绝/超时/无定位三档的边界与月份表逐字节相同 ✓（含 5:00/9:00 那两枚没被太阳碰过的旧边界）`);
      return { asserted, failed, out };
    },
    contra: [{
      /* "忘了判授权状态"那一族：sunOverride 不看 state、直接给太阳边界 ⇒ 被拒授权的访客也被改了色温。
         这一格唯一硬要求就是 denied/unsupported/timeout 逐字节回到月份表，必须当场红。 */
      name: 'sunOverride 不看授权状态（拒绝授权也吃到太阳边界）',
      env: () => ({ ...REAL, sunOverride: (state, coords, d) => sunBounds(d, 43.8, 87.6) }),
    }, {
      /* phaseAt 静默交出枚举外的档（M1 的形状）：这一格的"档位还在四档里"那条断言必须响。 */
      name: 'phaseAt 交出枚举外的档（undefined）',
      env: () => ({ ...REAL, phaseAt: () => undefined }),
    }],
    narrow: [{
      /* 朝窄：`unknown`（GEO_STATES 里那一枚"还没问过"）也是合法状态，必须安静地落回月份表、
         四档仍可达，不许被"未知状态"这种词吓红。 */
      name: '多喂一枚合法状态 unknown（还没问过定位）：必须落回月份表且不误红',
      env: () => ({
        ...REAL,
        geoCases: [...GEO_CASES, ['还没问过', 'unknown', null]],
        fallbackStates: ['denied', 'unsupported', 'timeout', 'unknown'],
      }),
    }],
  },

  /* ---------- ⑤ ---------- */
  {
    id: '⑤', name: '抗静默：坏输入必须死得看得见',
    run(E) {
      let asserted = 0, threw = 0; const failed = [], out = [];
      try { E.phaseAt(D(0, 15), { dawnStart: 0, dawnEnd: NaN, duskStart: 20, duskEnd: 21 }); } catch (e) { threw++; }
      asserted++;
      try { E.phaseAt(D(0, 15), null); } catch (e) { threw++; }
      asserted++;
      try { tableBounds(D(0, 15)) && (() => { const k = Object.keys(E.SEASON_DUSK)[0]; const save = E.SEASON_DUSK[k]; E.SEASON_DUSK[k] = [30, 31]; try { E.tableBounds(D(0, 15)); } finally { E.SEASON_DUSK[k] = save; } })(); } catch (e) { threw++; }
      asserted++;
      const nanB = E.sunBounds(D(6, 15), NaN, NaN);
      const bogusB = E.sunBounds(D(6, 15), 12345, -99999);
      asserted += 2;
      if (nanB || bogusB) failed.push('NaN / 超界纬度算出了边界（该挡在外面）');
      if (threw < 3) failed.push(`坏输入只抛了 ${threw} 次（预期 3 次：NaN 边界、null 边界、表被改坏）——判据没在守门`);
      /* 另一个方向：合法到极点的边界不许抛（贴地 0 点起、24 点止），否则这一格是"越坏越绿"的反面 */
      let legalThrew = 0;
      for (const lb of E.legalBounds) {
        asserted++;
        try { const p = E.phaseAt(D(0, 15), lb); if (!E.PHASES.includes(p)) { failed.push(`合法边界 ${JSON.stringify(lb)} 交出了枚举外的档 ${JSON.stringify(p)}`); legalThrew++; } }
        catch (e) { failed.push(`合法边界 ${JSON.stringify(lb)} 被当成坏输入抛了（${e.message}）—— 这一格开始误红`); legalThrew++; }
      }
      out.push(`  ⑤ 抗静默  ✓ 坏边界/坏表 ${threw} 次都当场抛；NaN 与超界坐标都被挡成 null（落回月份表，绝不产出枚举外的档）；合法极值边界 ${E.legalBounds.length} 枚都没被误伤`);
      return { asserted, failed, out };
    },
    contra: [{
      name: '把 phaseAt 换成"坏输入也照收、统一回 day"（静默兜底那一族）',
      env: () => ({ ...REAL, phaseAt: () => 'day' }),
    }, {
      name: '把 sunBounds 换成"什么坐标都算得出边界"（NaN / 超界纬度不再被挡在外面）',
      env: () => ({ ...REAL, sunBounds: () => ({ dawnStart: 5, dawnEnd: 9, duskStart: 16, duskEnd: 20, src: 'sun', s: 1 }) }),
    }],
    narrow: [{
      name: '贴着不变式两端极值的合法边界（0 点起 / 24 点止）：不许误红',
      env: () => ({
        ...REAL,
        legalBounds: [
          { dawnStart: 0, dawnEnd: 9, duskStart: 16, duskEnd: 24 },
          { dawnStart: 4.99, dawnEnd: 5.01, duskStart: 23.98, duskEnd: 23.99 },
        ],
      }),
    }],
  },

  /* ---------- ⑥ ---------- */
  {
    id: '⑥', name: '物理标定：形状合法但天文算错那一族',
    run(E) {
      const failed = [], out = []; let asserted = 0;
      const RAD2 = 180 / Math.PI;
      const sd = E.shift || 0;
      const at = (m, d) => D(m, d + sd);
      const declAt = (m, d) => E.solarTerms(at(m, d)).decl * RAD2;
      const eqAt = (m, d) => E.solarTerms(at(m, d)).eqtime;
      const sunAt = (m, d, lat, lon) => E.sunHours(at(m, d), lat, lon);

      /* 4：标准经线上的钟表正午。⚠️ 这一格第一版写成了"|正午−12:00| ≤ 17 分钟"，看着在查时差，
         其实**查不出符号**：正午＝(日出+日落)/2，把 eqtime 从减号写成加号只是把偏离从 +8.7 分镜像到 −8.7 分，
         绝对值一个字都没变（实测：翻转符号后 1/15 从 12:14 变 11:46，两个都过 ≤17 分）。
         一个上下对称的量永远测不到符号——所以这里改成查**走向**：日晷在 2 月中最落后（正午最晚）、
         在 11 月初最超前（正午最早），而且两个极值幅度不相等（−14.2′ vs +16.4′）。这是教科书事实，
         不依赖任何城市的时刻表，也不挂在网络上。 */
      const clockNoon = (m, d) => { const s = sunAt(m, d, 30, 120); return s ? (s.rise + s.set) / 2 : null; };
      let noonMax = 0;
      for (let m = 0; m < 12; m++) { const v = clockNoon(m, 15); if (v !== null) noonMax = Math.max(noonMax, Math.abs(v - 12)); }
      const feb = clockNoon(1, 11), nov = clockNoon(10, 2);
      const noonOk = noonMax < 17 / 60 && feb !== null && nov !== null && feb > 12.18 && nov < 11.80 && feb - 12 > 12 - nov - 0.06;
      /* 5：南北半球镜像（40°N 夏至的昼长必须等于 40°S 冬至的昼长） */
      const mA = sunAt(5, 21, 40, 116.4), mB = sunAt(11, 21, -40, 116.4);
      const mirrorOk = !!(mA && mB) && Math.abs((mA.set - mA.rise) - (mB.set - mB.rise)) < 0.05;
      const clock = v => v === null ? '—' : `${p2(Math.floor(v))}:${p2(Math.round((v % 1) * 60))}`;

      const checks = E.checks || [
        ['二至赤纬的极值与方向', declAt(5, 21) > 22.8 && declAt(5, 21) < 24.1 && declAt(11, 21) < -22.8 && declAt(11, 21) > -24.1,
          `6/21 ${declAt(5, 21).toFixed(2)}° / 12/21 ${declAt(11, 21).toFixed(2)}°（黄赤交角 23.44°）`],
        ['二分赤纬过零', Math.abs(declAt(2, 20)) < 1.2 && Math.abs(declAt(8, 22)) < 1.2,
          `3/20 ${declAt(2, 20).toFixed(2)}° / 9/22 ${declAt(8, 22).toFixed(2)}°`],
        ['时差四个极值的日期与符号', eqAt(1, 9) < -13 && eqAt(9, 31) > 13 && eqAt(6, 25) < -5 && eqAt(4, 14) > 2 && eqAt(4, 14) < 6,
          `1/9 ${eqAt(1, 9).toFixed(1)}′(谷≈−14′) 10/31 ${eqAt(9, 31).toFixed(1)}′(峰≈+16′) 7/25 ${eqAt(6, 25).toFixed(1)}′ 4/14 ${eqAt(4, 14).toFixed(1)}′(过零)`],
        ['标准经线上正午的**走向**（2 月中最晚、11 月初最早，且超前侧幅度更大）', noonOk,
          `2/11 正午 ${clock(feb)}（真值≈12:14）/ 11/2 正午 ${clock(nov)}（真值≈11:44）/ 全年 12 采样最大偏离 ${(noonMax * 60).toFixed(1)} 分钟`],
        ['南北半球季节相反（40°N 夏至昼长 = 40°S 冬至昼长）', mirrorOk,
          `${mA ? (mA.set - mA.rise).toFixed(2) : '—'}h vs ${mB ? (mB.set - mB.rise).toFixed(2) : '—'}h`],
      ];
      let ok = 0;
      for (const [name, pass, detail] of checks) {
        asserted++;
        if (pass) ok++;
        else failed.push(`物理标定没过：${name} —— 实测 ${detail}。这一格拦的是"边界形状合法但天文算错"，①–⑤ 原理上看不见它`);
        out.push(`      ${pass ? '✓' : '✗'} ${name.padEnd(26)} ${detail}`);
      }
      out.push(`  ⑥ 物理标定  ${ok}/${checks.length} 条过`);
      if (!checks.length) failed.push('物理标定一条都没有（0/0 也长得像全绿）——这一格的五条天文事实不许被清空');
      return { asserted, failed, out };
    },
    contra: [{
      /* M5 那一族的原形状：年循环错位。这里不复制 src 的数学，而是把**取样日期整体推 7 天**
         （= 把 dayIndex 写成"距 2000-01-01"时年循环错开的量级），赤纬/时差当场对不上。 */
      name: '年循环错位 7 天（M5 那一族的形状：二分赤纬不再过零）',
      env: () => ({ ...REAL, shift: 7 }),
    }, {
      /* "把这五条当噪音清空"的形状：0/0 也长得像全绿，今天它就会静悄悄过去。 */
      name: '五条天文事实被清空成 0 条（0/0 也算全绿那一族）',
      env: () => ({ ...REAL, checks: [] }),
    }],
    narrow: [{
      name: '取样日期只推 1 天（二至二分的带宽本来就有 ±1°、±3′ 的余量）：不许误红',
      env: () => ({ ...REAL, shift: 1 }),
    }],
  },

  /* ---------- ⑦ ---------- */
  {
    id: '⑦', name: '登记表自校：四份清单必须同源',
    run(E) {
      let asserted = 0; const failed = [], out = [];
      const doc = E.specRegistry();
      const lists = [
        ['登记表 CELLS（跑的时候被派生，只有它可以随格数变）', E.registryIds()],
        ['CELL_IDS（日常那一跑必须凑齐的格）', E.cellIds],
        ['CONTRA_IDS（反例清单，selftest 的期望数）', E.contraIds],
        [`docs/设计规范.md 的「${SPEC_MARK}」那一行`, doc.ids],
      ];
      if (doc.why) failed.push(`第四份清单拿不到：${doc.why} —— fail closed，不许"读不到就当没有这一格"`);
      for (const [label, ids] of lists) { asserted++; if (!ids || !ids.length) failed.push(`${label} 是空的 —— 没有清单就等于没有守卫`); }
      const key = a => (a || []).slice().sort().join(' ');
      const base = key(lists[0][1]);
      for (const [label, ids] of lists) {
        asserted++;
        if (key(ids) === base) continue;
        const miss = lists[0][1].filter(x => !ids.includes(x)), extra = (ids || []).filter(x => !lists[0][1].includes(x));
        failed.push(`${label} 与登记表不同源：${miss.length ? `缺 ${miss.join(' ')}` : ''}${miss.length && extra.length ? '、' : ''}${extra.length ? `多 ${extra.join(' ')}` : ''}` +
          ` —— 清单掉了 / 格被删了，两边必有一边是错的那一枚；今天这一格红的正是"删格静默"那个洞（§14 第 14 项）`);
      }
      out.push(`  ⑦ 登记表  ✓ ${lists[0][1].length} 格四份清单同源（${lists[0][1].join(' ')}）；反例清单是独立字面量、不由登记表派生`);
      return { asserted, failed, out };
    },
    contra: [{
      name: '从期望清单里偷偷摘掉 ③（格还在、清单不再要求它 = 删格的另一种写法）',
      env: () => ({ ...REAL, cellIds: CELL_IDS.filter(x => x !== '③') }),
    }, {
      name: '规范里那份清单读不到了（签字文档被挪走 / 那一行被删）—— 必须 fail closed 而不是跳过',
      env: () => ({ ...REAL, specRegistry: () => ({ ids: [], why: '读不到那一行（反例里模拟）' }) }),
    }],
    narrow: [{
      name: '规范那一行的排版换掉（id 顺序颠倒）而集合不变：不许误红',
      env: () => ({
        ...REAL,
        specRegistry: () => ({ ids: specRegistry().ids.slice().reverse(), why: '' }),   /* 顺序无关，只看集合 */
      }),
    }],
  },
];

/* ---------- 默认吃的那一份 = shipped 的那一份 ---------- */
const GEO_CASES = [
  ['拿到定位', 'granted', { latitude: 43.8, longitude: 87.6 }],
  ['拒绝授权', 'denied', null],
  ['无定位能力', 'unsupported', null],
  ['超时', 'timeout', null],
  ['坐标是脏的', 'granted', { latitude: NaN, longitude: NaN }],
  ['拿到定位但极昼', 'granted', { latitude: 78, longitude: 15.6 }],
];
const REAL = {
  SEASON_DUSK, seasonOf, tableBounds, sunBounds, sunOverride, clampScale, phaseAt, assertBounds, PHASES,
  DAWN_HALF, DUSK_HALF, MIN_SPAN, solarTerms, sunHours,
  oldPhase: OLD_phaseOf,
  table: null,                                  /* null = 不碰全局表；反例换成坏表 */
  locs: LOCS, months: MONTHS,
  grid: { lonStep: 10, latFrom: -80, latTo: 80, latStep: 1 },
  probes: [[4, 5], [7, 30], [10, 20], [13, 0], [16, 40], [18, 20], [20, 40], [22, 10], [23, 55]],
  geoCases: GEO_CASES, fallbackStates: ['denied', 'unsupported', 'timeout'],
  legalBounds: [{ dawnStart: 5, dawnEnd: 9, duskStart: 16, duskEnd: 20 }],
  shift: 0,
  registryIds: () => CELLS.map(c => c.id),
  cellIds: CELL_IDS, contraIds: CONTRA_IDS, specRegistry,
};
REAL.rows = buildRows(REAL);

/* ---------- 跑一格的公共外壳：抛了也算红（点名），断言数为 0 也算红 ---------- */
/* quiet = selftest 那一跑：反例**故意**让判据红，所以那些红不许进全局账单（否则 selftest 永远 exit 1）。
   selftest 只把"反例没让那格红 / 朝窄误红 / 清单对不上"这些**元判据**记进 bad。 */
function runCell(cell, E, quiet) {
  let r;
  try { r = withTable(E.table, () => cell.run(E)); }
  catch (e) { r = { asserted: 0, failed: [`${cell.id} 这一格自己抛了（判据没跑完，不是"判红"）：${e && e.message ? e.message : e}`], out: [] }; }
  const red = r.failed.length > 0 || !r.asserted;
  if (!quiet) {
    if (red) console.log(`  ${cell.id} ${cell.name}  ✗ ${!r.asserted ? '一个断言都没跑（空转，绿得完全像全过）' : `红了 ${r.failed.length} 条`}`);
    for (const line of r.out) console.log(line);
    if (red) for (const m of r.failed.slice(0, 3)) console.log(`      · ${m}`);
    for (const m of r.failed) fail(m);
  }
  return r;
}
const report = () => {
  if (bad.length) {
    console.log(`\n✗ phase-check 红了 ${bad.length} 条：`);
    for (const m of bad) console.log(`  · ${m}`);
    process.exit(1);
  }
};

/* ============================ --selftest ============================ */
if (SELFTEST) {
  console.log(`── phase-check --selftest：每格两侧（朝宽=坏输入必须红 / 朝窄=合法边界不许误红）`);
  console.log(`   期望清单 CONTRA_IDS = ${CONTRA_IDS.join(' ')}（独立字面量，不许由登记表派生）`);
  /* 前置：先在**真实登记表**上跑一遍"格跑齐没跑齐 + 四份清单同源"。少了格要在这里就点名，
     否则后面每一格的朝窄侧会一起抖——连锁红会把真凶埋起来（M1 实测到就是这个形状）。 */
  const absent = CELL_IDS.filter(id => !CELLS.some(c => c.id === id));
  const cell7 = CELLS.find(c => c.id === '⑦');
  const pre = cell7 ? runCell(cell7, REAL, true) : { asserted: 0, failed: ['登记表里没有 ⑦ 那一格（守登记表的那格自己没了）'] };
  /* 前置的第二半：把每一格在**真数据**上再跑一遍，要求全绿。少了这一半，`--selftest` 只会验"反例有没有
     力气"，而 shipped 判据本身被改坏时它照样 exit 0（M3 实测到：日常那一跑红了、selftest 却还是绿的）。
     两半合起来才是"这一跑是 check 的超集"——反例证明判据有牙，真实那一跑证明牙还咬在被测物上。 */
  const onReal = CELLS.filter(c => c !== cell7).map(c => [c, runCell(c, REAL, true)]).filter(([, r]) => r.failed.length || !r.asserted);
  for (const [, r] of onReal) for (const m of r.failed) fail(`selftest 前置（真实数据那一跑）：${m}`);
  for (const m of pre.failed) fail(`selftest 前置：${m}`);
  if (absent.length) fail(`selftest 前置：CELL_IDS 要求 ${absent.join(' ')}，登记表里没有这一格`);
  const preRed = pre.failed.length + absent.length + onReal.length;
  if (preRed) {
    for (const m of pre.failed.slice(0, 3)) console.log(`  ✗ 前置：${m}`);
    for (const [c, r] of onReal.slice(0, 3)) console.log(`  ✗ 前置：${c.id} 在真实数据上${r.asserted ? `红了 ${r.failed.length} 条` : '一个断言都没跑'} —— ${r.failed[0] || 'asserted=0'}`);
    console.log(`  ⚠️ 登记表或 shipped 判据自己就不对 —— 下面每一格朝窄侧若报红，那是连锁，不是那一格的错`);
  }
  const missing = [];
  let contraRan = 0, narrowRan = 0;
  for (const id of CONTRA_IDS) {
    const cell = CELLS.find(c => c.id === id);
    if (!cell) {
      /* 删格 ⇒ 反例清单找不到那个 id ⇒ 红，而且**不是跳过**：继续把剩下的跑完，报文里点名这一格 */
      fail(`反例清单要求 ${id}，登记表里却没有这一格 —— 判据被删掉了（§14 第 14 项的原案形状）；"少了"当场红，不许读成"没这一格可跑"`);
      console.log(`  ${id} ✗ 登记表里没有这一格（CONTRA_IDS 仍然要求它 ⇒ 红，不是跳过）`);
      missing.push(id);
      continue;
    }
    if (!cell.contra || !cell.contra.length) fail(`${cell.id} 没有反例（一格里没有坏输入可吃，就等于它从没被验过有牙）`);
    if (!cell.narrow || !cell.narrow.length) fail(`${cell.id} 没有朝窄那一侧（只在坏数据上会红的判据，分不清是严还是空）`);
    for (const con of cell.contra || []) {
      const cr = runCell(cell, con.env(), true);
      contraRan++;
      if (!cr.asserted && !cr.failed.length) {
        fail(`${cell.id} 的反例里这一格一条断言都没跑（asserted=0）—— 反例连代码都没走到，等于没反例：${con.name}`);
        console.log(`  ${cell.id} 反例  ✗ 空转（这一格 asserted=0，反例没喂进去）：${con.name}`);
      } else if (cr.failed.length) {
        console.log(`  ${cell.id} 反例  ✓ 报红：${cr.failed[0]}`);
      } else {
        fail(`${cell.id} 的反例没能让它变红（反例没力气 / 判据是空壳）：${con.name}`);
        console.log(`  ${cell.id} 反例  ✗ 喂了坏输入仍然全绿：${con.name}`);
      }
    }
    for (const nar of cell.narrow || []) {
      const nr = runCell(cell, nar.env(), true);
      narrowRan++;
      if (nr.failed.length) {
        fail(`${cell.id} 的朝窄反例误红了（合法边界被当成坏输入）：${nar.name} —— ${nr.failed[0]}`);
        console.log(`  ${cell.id} 朝窄  ✗ 误红${preRed ? '（前置已经红，这一条可能是连锁）' : ''}：${nr.failed[0]}`);
      } else if (!nr.asserted) {
        fail(`${cell.id} 的朝窄反例一个断言都没跑（这一格只在坏数据上才工作 = 它其实是空转）：${nar.name}`);
        console.log(`  ${cell.id} 朝窄  ✗ 空转（asserted=0）`);
      } else console.log(`  ${cell.id} 朝窄  ✓ 没误红（${nr.asserted} 条断言）：${nar.name}`);
    }
  }
  if (!contraRan || !narrowRan) {
    console.log(`\n✗ selftest 一枚反例都没跑（contraRan=${contraRan} narrowRan=${narrowRan}）—— 这一层自己空转`);
    process.exit(1);
  }
  if (bad.length) {
    console.log(`\n✗ --selftest 红了 ${bad.length} 条（实际跑了 ${contraRan} 枚反例 / ${narrowRan} 枚朝窄；登记表 ${CELLS.length} 格、清单要求 ${CONTRA_IDS.length} 格${missing.length ? `、缺 ${missing.join(' ')}` : ''}）：`);
    for (const m of bad) console.log(`  · ${m}`);
    process.exit(1);
  }
  console.log(`\n✓ 跑了 ${contraRan} 枚反例（${CONTRA_IDS.length} 格，每格至少一枚）全部让对应那格变了红；${narrowRan} 枚朝窄都没误红 —— 判据有牙，也没咬错东西`);
  console.log(`  （这一跑不接进 npm run check：它故意让判据吃坏数据。日常链仍是那四项 + 本工具一次）`);
  process.exit(0);
}

/* ============================ 日常那一跑 ============================ */
console.log(`── phase-check（data-phase 边界：月份表 → 真太阳位置；档位仍是四档，只有边界是算的）`);
console.log(`  本地时区 ${TZNAME}（${-D(0, 15).getTimezoneOffset() / 60 >= 0 ? '+' : ''}${-D(0, 15).getTimezoneOffset() / 60} 于 1/15）；` +
  `半宽沿用今天的窗口：dawn ±${DAWN_HALF}h（表宽 ${2 * DAWN_HALF}h）、dusk ±${DUSK_HALF}h（表中位宽 ${2 * DUSK_HALF}h）`);

const ran = new Map();
for (const c of CELLS) ran.set(c.id, runCell(c, REAL, false));

/* 跑齐没跑齐**由驱动自己判**，不借 ⑦ 的脸色（⑦ 也可能一起被删）。 */
for (const id of CELL_IDS) if (!ran.has(id)) fail(`登记表里没有 ${id} 这一格 —— 判据被删掉了，而"删掉的判据"不会自己报告（§14 第 14 项的原案）。CELL_IDS 是独立字面量，删格必须连它一起删，那就要在 diff 里显形`);
const perCell = CELLS.map(c => `${c.id} ${ran.get(c.id).asserted}`).join(' · ');
const totalAsserted = CELLS.reduce((s, c) => s + ran.get(c.id).asserted, 0);
console.log(`\n  本工具跑了 ${ran.size} 格判据（清单要求 ${CELL_IDS.length} 格）、共 ${totalAsserted} 条断言`);
console.log(`  每格断言数：${perCell}   ← 任何一格是 0 就是空转，这一行现在是判据不是提示`);

if (SHOW_NOW) {
  const now = new Date();
  console.log(`\n  --now  本地 ${p2(now.getHours())}:${p2(now.getMinutes())}（${TZNAME}）`);
  for (const [name, lat, lon] of LOCS) {
    const tb = tableBounds(now), sb = sunOverride('granted', { latitude: lat, longitude: lon }, now);
    console.log(`    ${name.padEnd(5)} 表算 ${phaseAt(now, tb)}（界 ${hhmm(tb.dawnStart)}/${hhmm(tb.dawnEnd)}/${hhmm(tb.duskStart)}/${hhmm(tb.duskEnd)}）` +
      `  太阳算 ${sb ? phaseAt(now, sb) : '退表'}` + (sb ? `（界 ${hhmm(sb.dawnStart)}/${hhmm(sb.dawnEnd)}/${hhmm(sb.duskStart)}/${hhmm(sb.duskEnd)}）` : ''));
  }
}

report();
console.log(`\n✓ 边界可以换算法，四档一个没动：退路逐分钟等价、算出来的边界全部守住 night < dawn < day < dusk`);
