/* phase-check.mjs —— `data-phase` 边界的第五类判据：**换算法这件事到底改变了多少体验**（§2.3）
   用法  node tools/phase-check.mjs            （断言 + 摘要；接进 npm run check）
         node tools/phase-check.mjs --table    （外加打印那张经纬度×月份的差值表）
         node tools/phase-check.mjs --now      （外加打印"此时此刻"三地的表算档 / 太阳算档）

   ── 它管哪几件事，为什么每件都得有 ──────────────────────────────────────────
   ① **等价性**：拿不到定位时（拒绝授权 / 超时 / 浏览器没这个 API）走的那条退路，必须和本次改动之前
      **逐分钟一致**。判法是把改动前那五行 `phaseOf` 原样抄成 `OLD_phaseOf` 当参照，对 12 个月 × 一天
      每一分钟逐个比。"看着一样"不算，比完全表才算。
   ② **不变式**：算出来的四个边界必须满足 `night < dawn < day < dusk` 且每一档都活着（塌成三档＝少一档
      色温，那是偷偷改了档位而不是改边界）。高纬度夏季的极昼极夜、以及"太阳给的窗口互相吞掉"，都归这里。
   ③ **差值表**：三处经纬度 × 四天，现有表的四个切换时刻 vs NOAA 的四个切换时刻 vs 差多少分钟。
      这张表的用途是**判断这条值不值得上**，不是走过场——所以摘要里直接给"读不读得出来"的判据。
   ④ **三档授权状态**：把 shipped 的那段分支（`sunOverride`）分别喂 granted / denied / unsupported，
      报各自实际生效的边界与档位。浏览器侧另有一跑 --dump-dom 对账，见规范登记。

   ── 防空转（§16 那条"检查静默空转、退出码 0、长得像全绿"）────────────────────
   每一处"没吃到东西"都是 exit 1，并且点名是哪一步死的：月份表被删短 / 键写错、四个经纬度组合一个都没算、
   等价性比对的格数是 0、NaN 喂进去没被挡、坏边界喂进 phaseAt 竟然没抛、档位取值掉出四档枚举。
   ⚠️ 变异测试就是照着这几条做的，逐格记录在规范 §2.3 末。
*/
import { SEASON_DUSK, seasonOf, tableBounds, sunBounds, sunOverride, clampScale, phaseAt, assertBounds, PHASES, DAWN_HALF, DUSK_HALF, MIN_SPAN } from '../src/lib/phase.js';
import { sunHours, solarTerms } from '../src/lib/sun.js';

const argv = process.argv.slice(2);
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

console.log(`── phase-check（data-phase 边界：月份表 → 真太阳位置；档位仍是四档，只有边界是算的）`);
console.log(`  本地时区 ${TZNAME}（${-D(0, 15).getTimezoneOffset() / 60 >= 0 ? '+' : ''}${-D(0, 15).getTimezoneOffset() / 60} 于 1/15）；` +
  `半宽沿用今天的窗口：dawn ±${DAWN_HALF}h（表宽 ${2 * DAWN_HALF}h）、dusk ±${DUSK_HALF}h（表中位宽 ${2 * DUSK_HALF}h）`);

/* ---------- ⓪ 先确认判据吃到了东西：月份表在位、四行齐全 ---------- */
{
  const keys = Object.keys(SEASON_DUSK);
  if (keys.length !== 4) fail(`SEASON_DUSK 只剩 ${keys.length} 行（应为 4：winter/spring/summer/autumn）—— 退路本身就是坏的，等价性比对没有对象`);
  for (const k of ['winter', 'spring', 'summer', 'autumn']) {
    if (!SEASON_DUSK[k]) { fail(`SEASON_DUSK 缺 ${k} 行`); continue; }
    const b = tableBounds(D(k === 'summer' ? 6 : k === 'winter' ? 0 : k === 'spring' ? 3 : 9));
    if (!assertBounds(b)) fail(`SEASON_DUSK.${k} = ${JSON.stringify(SEASON_DUSK[k])} 给出的边界不满足 night < dawn < day < dusk`);
  }
}

/* ---------- ① 退路逐分钟等价：拿改动前那五行原样当参照 ---------- */
/* ⚠️ 这五行是从 `git show HEAD~:src/scripts/site.js` 抄来的**旧实现**，故意保留它自己的 SEASON_DUSK 读法：
   参照物必须独立于被测物，否则"两边一起改错"就查不出来。 */
function OLD_phaseOf(d) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 9) return 'dawn';
  const [ds, de] = SEASON_DUSK[seasonOf(d.getMonth())];
  if (h >= ds && h < de) return 'dusk';
  if (h >= 9 && h < ds) return 'day';
  return 'night';
}
{
  let n = 0, mism = 0;
  for (let m = 0; m < 12; m++) {
    const day = D(m, 15);
    const b = tableBounds(day);
    for (let min = 0; min < 1440; min++) {
      const t = new Date(2026, m, 15, 0, min);
      n++;
      if (phaseAt(t, b) !== OLD_phaseOf(t)) {
        if (mism < 4) fail(`退路不等价：${m + 1}/15 ${hhmm(min / 60)} 旧=${OLD_phaseOf(t)} 新=${phaseAt(t, b)}`);
        mism++;
      }
    }
  }
  if (!n) fail('等价性比对一格都没跑（0 格＝判据空转）');
  if (!mism) console.log(`  ① 退路等价  ✓ ${n} 格（12 个月 × 1440 分钟）逐分钟与改动前的实现同档`);
  else console.log(`  ① 退路等价  ✗ ${mism}/${n} 格不同档`);
}

/* ---------- ② 不变式：高纬度扫描，谁夹不住 ---------- */
/* ⚠️ 这一格差点报出一个假数：第一版在**运行机器的单一时区**下扫全球经度，得到"10848 组退表"，
   看着像算法在广泛失败。其实那是"纽约的日出用上海钟表表示"必然跨日——**是扫描口径错了，不是判定错了**。
   所以按"访客的钟表时区与他所在经度匹配"来扫（这才是真实场合），把不匹配的那一族单列一格报，
   并写清：时钟与位置不符时**退表就是正确答案**。 */
const LOCS = [
  ['北京', 39.9, 116.4],
  ['乌鲁木齐', 43.8, 87.6],
  ['广州', 23.1, 113.3],
];
const MONTHS = [[0, 15, '冬'], [3, 15, '春'], [6, 15, '夏'], [9, 15, '秋']];
const TZ0 = process.env.TZ;
const zoneFor = lon => { const n = Math.round(lon / 15); return n === 0 ? 'UTC' : `Etc/GMT${n > 0 ? '-' : '+'}${Math.abs(n)}`; };
const restoreTZ = () => { if (TZ0 === undefined) delete process.env.TZ; else process.env.TZ = TZ0; };
{
  let n = 0, broken = 0, clamped = 0;
  const why = { polar: 0, wrap: 0, tooTight: 0 };
  const triggers = { polar: [], wrap: [], tooTight: [] };
  const MIN_S = Math.max(MIN_SPAN.dawn / (2 * DAWN_HALF), MIN_SPAN.dusk / (2 * DUSK_HALF));
  for (let lon = -180; lon <= 180; lon += 10) {
    process.env.TZ = zoneFor(lon);                 /* 钟表与该经度对齐，剩下的失败才是几何给的 */
    for (let lat = -80; lat <= 80; lat += 1)
      for (const [m, d] of MONTHS) {
        const day = D(m, d);
        n++;
        const b = sunBounds(day, lat, lon);
        if (b) {
          if (b.s < 1) clamped++;
          if (!assertBounds(b)) { broken++; if (broken < 4) fail(`夹完之后仍然倒挂：lat${lat} lon${lon} ${m + 1}/${d} → ${JSON.stringify(b)}`); }
          continue;
        }
        const s = sunHours(day, lat, lon);
        const tag = `lat${lat} lon${lon} ${m + 1}/${d}（钟表 ${zoneFor(lon)}）`;
        const k = !s ? 'polar' : (s.set - s.rise <= 0 ? 'wrap' : 'tooTight');
        why[k]++;
        if (triggers[k].length < 3) triggers[k].push(tag + (s ? ` rise ${hhmm(s.rise)} set ${hhmm(s.set)} 昼长 ${(s.set - s.rise).toFixed(2)}h，s=${String(clampScale(s.rise, s.set)?.toFixed(3) ?? 'null')} < 下限 ${MIN_S.toFixed(3)}` : ' acos 定义域外'));
      }
  }
  restoreTZ();
  if (!n) fail('高纬度扫描一格都没跑（判据空转）');
  const back = why.polar + why.wrap + why.tooTight;
  console.log(`  ② 不变式  扫 ${n} 组（经度配同带钟表）：夹完仍倒挂 ${broken} 组、窗口被夹窄 s<1 共 ${clamped} 组、退回月份表 ${back} 组（${(100 * back / n).toFixed(1)}%，全在 |lat|>66 那一圈）`);
  console.log(`      退表死因分开算：极昼极夜 ${why.polar} 组 / 四档装不下 ${why.tooTight} 组 / 跨日或倒挂 ${why.wrap} 组`);
  for (const k of ['polar', 'tooTight', 'wrap']) for (const t of triggers[k]) console.log(`      · [${k === 'polar' ? '极昼极夜' : k === 'tooTight' ? '夹不住' : '跨日'}] ${t}`);
  if (!broken && !back) fail('这一格一个退表/夹窄都没扫到 —— 扫描口径没吃到位（判据空转）');
  if (broken) fail(`有 ${broken} 组夹完之后仍然倒挂`);
  /* 另一个方向也要看一眼：钟表与经度**不**匹配（出差、时钟设错）时必须退表，不许硬算出一个跨日的档 */
  process.env.TZ = 'Asia/Shanghai';
  const mismatch = sunBounds(D(6, 15), 40.7, -74);          /* 上海钟表读纽约的日出 */
  restoreTZ();
  if (mismatch) fail(`上海钟表 + 纽约位置本该判成"跨日/退表"，却算出了边界 ${JSON.stringify(mismatch)} —— 不变式没守住`);
  else console.log('      ✓ 反向一格：上海钟表读纽约日出（跨日）被挡成退表，没有硬算');
}

/* ---------- ③ 差值表：这张表就是这张卡的价值所在 ---------- */
const rows = [];
for (const [name, lat, lon] of LOCS) {
  for (const [m, d, season] of MONTHS) {
    const day = D(m, d);
    const tb = tableBounds(day);
    const sb = sunBounds(day, lat, lon);
    rows.push({ name, lat, lon, m, d, season, tb, sb });
  }
}
{
  const cuts = b => [b.dawnStart, b.dawnEnd, b.duskStart, b.duskEnd];
  const CUT_NAME = ['入dawn', '入day', '入dusk', '入night'];
  let n = 0, cells = 0, sum = 0, max = 0, maxAt = '', clamped = 0;
  /* 变体：只让傍晚跟太阳走、dawn 保持 05–09（旧表本来就只有 dusk 在动）。
     把这一列并排放，是为了分清"平均 63 分钟"里有多少来自 dawn 重定位、多少来自傍晚跟日落到。 */
  let vSum = 0, vMax = 0;
  if (SHOW_TABLE) {
    console.log('\n  差值表（左＝现有月份表；右＝NOAA 真太阳。差值正=太阳比表更晚，单位分钟）');
    console.log('  地点        月日 季 │ 昼长   s    真日出/日落        │ ' + CUT_NAME.map(c => `${c} 表→太阳`).join(' │ '));
  }
  for (const r of rows) {
    if (!r.sb) { fail(`${r.name} ${r.m + 1}/${r.d} 算不出边界（三处中国城市都不该触发退表）`); continue; }
    const a = cuts(r.tb), c = cuts(r.sb);
    const deltas = c.map((v, i) => Math.round((v - a[i]) * 60));
    n++; cells += 4;
    deltas.forEach((dv, i) => {
      sum += Math.abs(dv);
      if (Math.abs(dv) > max) { max = Math.abs(dv); maxAt = `${r.name} ${r.m + 1}/${r.d} ${CUT_NAME[i]} ${hhmm(a[i]).slice(0, 5)}→${hhmm(c[i]).slice(0, 5)}`; }
      if (i >= 2) { vSum += Math.abs(dv); if (Math.abs(dv) > vMax) vMax = Math.abs(dv); }   /* 只算傍晚那两个切换时刻 */
    });
    if (r.sb.s < 1) clamped++;
    if (SHOW_TABLE)
      console.log(`  ${r.name.padEnd(4)} ${String(r.m + 1).padStart(2)}/${r.d} ${r.season} │ ${(r.sb.set - r.sb.rise).toFixed(2)}h s=${r.sb.s.toFixed(2)} ${hhmm(r.sb.rise)}–${hhmm(r.sb.set)}` +
        ` │ ${deltas.map((dv, i) => `${hhmm(a[i])}→${hhmm(c[i])} ${(dv >= 0 ? '+' : '') + dv}`.padEnd(21)).join(' │ ')}`);
  }
  if (!n || !cells) fail('差值表一行都没算出来（判据空转）');
  const mean = sum / cells;
  console.log(`  ③ 差值  ${n} 组 × 4 个切换时刻 = ${cells} 格：平均 |Δ| ${mean.toFixed(1)} 分钟、最大 |Δ| ${max} 分钟、窗口被夹窄 ${clamped} 组`);
  console.log(`      最紧的一格在 ${maxAt}`);
  console.log(`      只让傍晚跟太阳（dawn 保持 05–09）那一列：平均 |Δ| ${(vSum / (cells / 2)).toFixed(1)} 分钟、最大 ${vMax} 分钟`);
  /* "读不读得出来"的判据挂在这里，写死成数不靠事后解释：导航那一格承诺分钟级（§6），
     而访客对"什么时候算傍晚"的容忍度是几十分钟量级——平均值低于这个数就没有体验可读。 */
  const READABLE = 15;
  console.log(`      阈值：平均 |Δ| ≥ ${READABLE} 分钟才算"读得出来" → ${mean >= READABLE ? '读得出来' : '读不出来（那就该判这条不做）'}`);
  if (mean < READABLE) console.log(`      ⚠️ 这一格是判据不是提示：低于阈值时这张卡的结论应当是"不值得做"`);
}

/* ---------- ④ 三档授权状态：shipped 的那段分支真跑一遍 ---------- */
{
  let ran = 0;
  const cases = [
    ['拿到定位', 'granted', { latitude: 43.8, longitude: 87.6 }],
    ['拒绝授权', 'denied', null],
    ['无定位能力', 'unsupported', null],
    ['超时', 'timeout', null],
    ['坐标是脏的', 'granted', { latitude: NaN, longitude: NaN }],
    ['拿到定位但极昼', 'granted', { latitude: 78, longitude: 15.6 }],
  ];
  /* 探针时刻：一天里均匀取九个点，看"走的是哪条路"具体落在哪一档上 */
  const probes = [[4, 5], [7, 30], [10, 20], [13, 0], [16, 40], [18, 20], [20, 40], [22, 10], [23, 55]];
  console.log(`\n  ④ 三档授权状态（同一个 sunOverride + 同一个 phaseAt；地点乌鲁木齐 43.8/87.6，日期 7/15 长昼）`);
  for (const [label, state, coords] of cases) {
    const day = D(6, 15);
    const sunB = sunOverride(state, coords, day);
    const b = sunB || tableBounds(day);
    const src = sunB ? 'sun' : 'table';
    const seq = probes.map(([h, mi]) => {
      const t = new Date(2026, 6, 15, h, mi);
      const p = phaseAt(t, b);
      if (!PHASES.includes(p)) fail(`${label}：phaseAt 交出了枚举外的档位 ${JSON.stringify(p)} —— 这就是"静默产出 undefined"`);
      return `${p2(h)}:${p2(mi)}=${p[0]}`;
    });
    ran++;
    /* 四档在这一组边界下是否都可达：拿每个区间的中点去问一遍。塌成三档＝偷偷改了档位而不是改边界 */
    const reach = new Set();
    for (const h of [b.dawnStart, b.dawnEnd, b.duskStart, b.duskEnd]) {
      const mid = h === b.duskEnd ? (h + 24 + b.dawnStart) / 2 - 12 : (h + 0.05);
      const t = new Date(2026, 6, 15, 0, 0);
      t.setSeconds(Math.round((((mid % 24) + 24) % 24) * 3600));
      reach.add(phaseAt(t, b));
    }
    for (const [x, y] of [[b.dawnStart, b.dawnEnd], [b.dawnEnd, b.duskStart], [b.duskStart, b.duskEnd], [b.duskEnd, b.dawnStart + 24]])
      for (const mid of [(x + y) / 2]) {
        const t = new Date(2026, 6, 15, 0, 0);
        t.setSeconds(Math.round((((mid % 24) + 24) % 24) * 3600));
        reach.add(phaseAt(t, b));
      }
    if (reach.size !== 4) fail(`${label}：这一档边界下只有 ${reach.size} 个档位可达（应 4 个）—— ${[...reach].join('/')}`);
    console.log(`    ${label.padEnd(11)} 生效路径 ${src.padEnd(5)} 界 ${hhmm(b.dawnStart).slice(0, 5)}/${hhmm(b.dawnEnd).slice(0, 5)}/${hhmm(b.duskStart).slice(0, 5)}/${hhmm(b.duskEnd).slice(0, 5)} 可达 ${reach.size} 档  ${seq.join(' ')}`);
  }
  if (!ran) fail('三档授权状态一格都没跑（判据空转）');
  /* 拒绝/超时/无定位三档必须**逐字节回到月份表**：拿北京 1/15 的表边界逐个对 */
  const cutsOf = x => [x.dawnStart, x.dawnEnd, x.duskStart, x.duskEnd];
  for (const state of ['denied', 'unsupported', 'timeout']) {
    const ref = tableBounds(D(0, 15));
    const got = sunOverride(state, { latitude: 39.9, longitude: 116.4 }, D(0, 15)) || ref;
    if (JSON.stringify(cutsOf(got)) !== JSON.stringify(cutsOf(ref))) fail(`${state} 没有落回月份表：拿到 ${JSON.stringify(got)}`);
  }
  console.log(`    拒绝/超时/无定位三档的边界与月份表逐字节相同 ✓（含 5:00/9:00 那两枚没被太阳碰过的旧边界）`);
}

/* ---------- ⑤ 抗"静默不跑"：坏输入必须死得看得见 ---------- */
{
  let threw = 0;
  try { phaseAt(D(0, 15), { dawnStart: 0, dawnEnd: NaN, duskStart: 20, duskEnd: 21 }); } catch (e) { threw++; }
  try { phaseAt(D(0, 15), null); } catch (e) { threw++; }
  try { tableBounds(D(0, 15)) && (() => { const k = Object.keys(SEASON_DUSK)[0]; const save = SEASON_DUSK[k]; SEASON_DUSK[k] = [30, 31]; try { tableBounds(D(0, 15)); } finally { SEASON_DUSK[k] = save; } })(); } catch (e) { threw++; }
  const nanB = sunBounds(D(6, 15), NaN, NaN);
  const bogusB = sunBounds(D(6, 15), 12345, -99999);
  if (nanB || bogusB) fail('NaN / 超界纬度算出了边界（该挡在外面）');
  if (threw < 3) fail(`坏输入只抛了 ${threw} 次（预期 3 次：NaN 边界、null 边界、表被改坏）——判据没在守门`);
  console.log(`  ⑤ 抗静默  ✓ 坏边界/坏表 ${threw} 次都当场抛；NaN 与超界坐标都被挡成 null（落回月份表，绝不产出枚举外的档）`);
}

/* ---------- ⑥ 算法的物理标定：把"形状全合法但天文算错了"这一族也拦下来 ----------
   ①–⑤ 只判退路与不变式，**不判算法的绝对正确性**——本卡实测过：把 NOAA 时差项的符号翻过来
   （`- eqtime` 写成 `+ eqtime`），①②③④⑤ 全绿、差值表只从 63.0 分钟变成 61.0 分钟，
   没有任何一格红。那是一个"长得像全绿"的洞，所以这一格补上，且只依赖**不随城市、不随我记忆**的天文事实。
   ⚠️ 这些参照值不是"从哪个网站抄的北京今天几点日出"（那会把门禁挂在网络上），是四条几何事实。 */
{
  const RAD2 = 180 / Math.PI;
  const declAt = (m, d) => solarTerms(D(m, d)).decl * RAD2;
  const eqAt = (m, d) => solarTerms(D(m, d)).eqtime;
  const sunAt = (m, d, lat, lon) => sunHours(D(m, d), lat, lon);

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

  const checks = [
    ['二至赤纬的极值与方向', declAt(5, 21) > 22.8 && declAt(5, 21) < 24.1 && declAt(11, 21) < -22.8 && declAt(11, 21) > -24.1,
      `6/21 ${declAt(5, 21).toFixed(2)}° / 12/21 ${declAt(11, 21).toFixed(2)}°（黄赤交角 23.44°）`],
    ['二分赤纬过零', Math.abs(declAt(2, 20)) < 1.2 && Math.abs(declAt(8, 22)) < 1.2,
      `3/20 ${declAt(2, 20).toFixed(2)}° / 9/22 ${declAt(8, 22).toFixed(2)}°`],
    ['时差四个极值的日期与符号', eqAt(1, 9) < -13 && eqAt(9, 31) > 13 && eqAt(6, 25) < -5 && eqAt(4, 14) > 2 && eqAt(4, 14) < 6,
      `1/9 ${eqAt(1, 9).toFixed(1)}′(谷≈−14′) 10/31 ${eqAt(9, 31).toFixed(1)}′(峰≈+16′) 7/25 ${eqAt(6, 25).toFixed(1)}′ 4/14 ${eqAt(4, 14).toFixed(1)}′(过零)`],
    ['标准经线上正午的**走向**（2 月中最晚、11 月初最早，且超前侧幅度更大）', noonOk,
      `2/11 正午 ${feb === null ? '—' : `${p2(Math.floor(feb))}:${p2(Math.round((feb % 1) * 60))}`}（真值≈12:14）/ 11/2 正午 ${nov === null ? '—' : `${p2(Math.floor(nov))}:${p2(Math.round((nov % 1) * 60))}`}（真值≈11:44）/ 全年 12 采样最大偏离 ${(noonMax * 60).toFixed(1)} 分钟`],
    ['南北半球季节相反（40°N 夏至昼长 = 40°S 冬至昼长）', mirrorOk,
      `${mA ? (mA.set - mA.rise).toFixed(2) : '—'}h vs ${mB ? (mB.set - mB.rise).toFixed(2) : '—'}h`],
  ];
  let ok = 0;
  for (const [name, pass, detail] of checks) {
    if (pass) ok++;
    else fail(`物理标定没过：${name} —— 实测 ${detail}。这一格拦的是"边界形状合法但天文算错"，①–⑤ 原理上看不见它`);
    console.log(`      ${pass ? '✓' : '✗'} ${name.padEnd(26)} ${detail}`);
  }
  console.log(`  ⑥ 物理标定  ${ok}/${checks.length} 条过`);
}

/* ---------- 附：此时此刻三地对照（给浏览器侧 --dump-dom 对账用）---------- */
if (SHOW_NOW) {
  const now = new Date();
  console.log(`\n  --now  本地 ${p2(now.getHours())}:${p2(now.getMinutes())}（${TZNAME}）`);
  for (const [name, lat, lon] of LOCS) {
    const tb = tableBounds(now), sb = sunOverride('granted', { latitude: lat, longitude: lon }, now);
    console.log(`    ${name.padEnd(5)} 表算 ${phaseAt(now, tb)}（界 ${hhmm(tb.dawnStart)}/${hhmm(tb.dawnEnd)}/${hhmm(tb.duskStart)}/${hhmm(tb.duskEnd)}）` +
      `  太阳算 ${sb ? phaseAt(now, sb) : '退表'}` + (sb ? `（界 ${hhmm(sb.dawnStart)}/${hhmm(sb.dawnEnd)}/${hhmm(sb.duskStart)}/${hhmm(sb.duskEnd)}）` : ''));
  }
}

if (bad.length) {
  console.log(`\n✗ phase-check 红了 ${bad.length} 条：`);
  for (const m of bad) console.log(`  · ${m}`);
  process.exit(1);
}
console.log(`\n✓ 边界可以换算法，四档一个没动：退路逐分钟等价、算出来的边界全部守住 night < dawn < day < dusk`);
