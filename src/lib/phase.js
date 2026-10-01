/* phase.js —— `data-phase` 的**边界模型**（§2.3）。档位仍然只有四档：dawn / day / dusk / night。
   这一层只回答一件事："此刻在哪一档"。它不知道 DOM、不知道浏览器、不写属性，
   所以 `tools/phase-check.mjs` 能在 node 里跑**同一份**代码——浏览器里那个判定和这张表里那三个
   实测数是同一个函数，不是两份长得像的实现。

   ── 唯一的真值分岔点：边界从哪来 ───────────────────────────────────────────
   · `tableBounds(d)`：**月份表**，逐字节等于本次改动之前 `site.js` 里的 `SEASON_DUSK` 那条路径。
     被拒授权 / 超时 / 无定位能力 / 算不出来 / 夹不住 —— 全都落回这里，落回之后**今天的表现一个字都不变**。
   · `sunBounds(d, lat, lon)`：把真日出日落折成同形状的四个边界。
   两个函数返回**同一个形状**，`phaseAt` 只认这个形状 ⇒ 退路不是"没有 phase"，是另一条算 phase 的路。

   ⚠️ 四档的次序是这一层的不变式：`night < dawn < day < dusk`，而**跨夜的那一段是 night**——
   它写成"三个区间的补集"（见 `phaseAt` 最后那行 return），所以 night 天然可以从 23 点跨到 4 点，
   不需要 wrap 逻辑。这条口径从 `SEASON_DUSK` 时代就有（原注释："night 从 dusk 结束处接手 ⇒ 四个时段永不重叠"）。
   ⚠️ 不许在这里加第五个取值、不许把返回值改成连续量（分数档位）。§2.3 末的暗色三段色温与 §2.1 的方向光
   全部靠 `html[data-phase="dusk"]…` 这类**源码里的 CSS 条件块**存在，`palette-check.mjs` 复算的就是那些块；
   把色温搬到"运行时写自定义属性"会让复算当场掉到 0 档（＝规范点名的空转形状）。这一句是钉给下一轮看的。 */
import { sunHours } from './sun.js';

/* 四个取值：顺序即一天里经过的顺序（night 跨夜补上头尾） */
export const PHASES = ['dawn', 'day', 'dusk', 'night'];

/* 换季月份表：⚠️ 这份表连同它的 seasonOf，是从 src/scripts/site.js 原样搬来的，一个字没改。
   它现在有两个身份：① 拿不到定位时的退路；② 差值表里"现有表"那一列——两处的数必须同源。 */
export const SEASON_DUSK = {
  winter: [16, 17.5],   // 12·1·2 月
  spring: [17.5, 19],   // 3·4·5 月
  summer: [19.5, 20.5], // 6·7·8 月
  autumn: [17, 19],     // 9·10·11 月
};
export const seasonOf = m => (m === 11 || m <= 1) ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';

/* 档位的"宽度"沿用今天的口径，只有"中心"换成太阳：
   dawn 今天恒为 05–09（宽 4h）⇒ 半宽 2；dusk 今天四行宽 1.5/1.5/1/2h ⇒ 取中位 1.5h ⇒ 半宽 0.75。
   ⚠️ 为什么宽度不动：这张卡要量的是"边界换了地方之后体验变了多少"，
   如果同时把窗口也重新设计一遍，差值表里就分不清哪一笔来自中心、哪一笔来自宽度。 */
export const DAWN_HALF = 2;
export const DUSK_HALF = 0.75;

/* 夹不住就退表的下限：每一档都得活着，四档不能塌成三档 */
export const MIN_SPAN = { dawn: 1, day: 1, dusk: 0.5, night: 1 };
const S_FLOOR = Math.max(MIN_SPAN.dawn / (2 * DAWN_HALF), MIN_SPAN.dusk / (2 * DUSK_HALF));

/** 月份表给出的边界。表被删短 / 键写错 ⇒ **当场抛**，不静默兜一个默认窗口进去。 */
export function tableBounds(d) {
  const season = seasonOf(d.getMonth());
  const row = SEASON_DUSK[season];
  if (!Array.isArray(row) || row.length !== 2 || row.some(x => !Number.isFinite(x)))
    throw new Error(`SEASON_DUSK 缺 "${season}" 这一行或行形状不对（拿到 ${JSON.stringify(row)}）—— 退路本身就是坏的，不许装成"退化了但还在跑"`);
  const [duskStart, duskEnd] = row;
  /* 表自己也得守不变式：05 < 09 <= duskStart < duskEnd */
  if (!(9 <= duskStart && duskStart < duskEnd && duskEnd <= 24))
    throw new Error(`SEASON_DUSK.${season} = [${duskStart}, ${duskEnd}] 破坏 night < dawn < day < dusk`);
  return { dawnStart: 5, dawnEnd: 9, duskStart, duskEnd, src: 'table', season };
}

/** 真日出日落 → 四个边界；**夹进不变式** `night < dawn < day < dusk`。
 *  夹的方式是保住两个中心（那是太阳给的信息，也是这次唯一新增的信息量），
 *  只把窗口往**窄**里缩：s 是半宽的缩放因子，见 clampScale。缩到任何一档会跌破 MIN_SPAN ⇒ null。 */
export function sunBounds(d, lat, lon) {
  const sun = sunHours(d, lat, lon);
  if (!sun) return null;                       // 极昼 / 极夜 / 输入不是数 / 纬度超界
  const s = clampScale(sun.rise, sun.set);
  if (!(s !== null && s >= S_FLOOR)) return null;   // 夹不住：有一档会被压死 ⇒ 退表
  const b = boundsAt(sun.rise, sun.set, s);
  if (!assertBounds(b)) throw new Error('sunBounds 内部不变式破了：夹完仍然不满足 night < dawn < day < dusk');
  return b;
}

/** 四个边界由"两个中心 + 一个缩放"唯一决定 */
function boundsAt(rise, set, s) {
  return {
    dawnStart: rise - DAWN_HALF * s,
    dawnEnd: rise + DAWN_HALF * s,
    duskStart: set - DUSK_HALF * s,
    duskEnd: set + DUSK_HALF * s,
    src: 'sun', rise, set, s,
  };
}

/**
 * 满足全部不变式的最大半宽缩放因子 s（**只许缩不许放大**，所以上限是 1）；不可能时返回 null。
 * 四条约束都是 s 的线性函数，解出来取最小即可：
 *   dawnStart >= 0                    s >=?  → s <= rise / DAWN_HALF
 *   dawnEnd + day <= duskStart        s <= (昼长 − MIN_SPAN.day) / (两半宽之和)
 *   night（补集，跨 24 点两段相加）>= MIN_SPAN.night   s <= (24 − MIN_SPAN.night − 昼长) / 两半宽之和
 *   duskEnd <= 24                     s <= (24 − set) / DUSK_HALF
 * ⚠️ 单独把这个函数暴露出去，是为了 `tools/phase-check.mjs` 能报"退表是因为极昼、还是因为夹不住、
 *    还是因为本地时钟和经度不匹配"——三种死法要能分开，否则报告里就只有一句"退回了"。
 */
export function clampScale(rise, set) {
  if (!Number.isFinite(rise) || !Number.isFinite(set)) return null;
  const span = set - rise;
  if (!(span > 0)) return null;                // 跨日或倒挂（时区与经度错得离谱时会出现）
  const sum = DAWN_HALF + DUSK_HALF;
  const s = Math.min(1,
    rise / DAWN_HALF,
    (span - MIN_SPAN.day) / sum,
    (24 - MIN_SPAN.night - span) / sum,
    (24 - set) / DUSK_HALF);
  return Number.isFinite(s) ? s : null;
}


/** 边界形状自校验（供门禁与调用方复查）：不抛，返回布尔；NaN 一律算不过 */
export function assertBounds(b) {
  if (!b) return false;
  const v = [b.dawnStart, b.dawnEnd, b.duskStart, b.duskEnd];
  if (!v.every(Number.isFinite)) return false;
  const [a, c, e, f] = v;
  return 0 <= a && a < c && c < e && e < f && f <= 24;
}

/**
 * 一次定位的结果 → "要不要用太阳边界覆盖月份表"。**分支放在这里而不是放在 site.js 里**，
 * 这样 `tools/phase-check.mjs` 能拿三档授权状态逐个喂给同一个函数，证的是真跑过的那条路，
 * 而不是浏览器里那三段 if 的影子。
 *   · 'granted' + 算得出且夹得住 → 返回边界（内含两个小时数 rise / set）
 *   · 'denied' / 'unsupported' / 'timeout' / coords 为空 / 脏数 / 极昼极夜 / 夹不住 → 返回 null
 * null 的含义**不是"没有 phase"**，是"这一档继续按月份表算"——调用方每次实时读 `tableBounds`，
 * 所以退路连"跨月自动换窗口"这个行为都和改动前一致。
 */
export const GEO_STATES = ['unknown', 'unsupported', 'pending', 'granted', 'denied', 'timeout', 'unreachable'];
export function sunOverride(state, coords, d) {
  if (state !== 'granted' || !coords) return null;
  const la = Number(coords.latitude), lo = Number(coords.longitude);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;      /* 脏数在此就挡掉，不进 acos */
  return sunBounds(d, la, lo);
}

/** 此刻在哪一档。**永不返回 undefined**：最后一行 night 是补集，接住一切没被前三段吃掉的时刻。 */
export function phaseAt(d, b) {
  if (!assertBounds(b)) throw new Error(`phaseAt 收到坏边界 ${JSON.stringify(b)} —— 宁可抛，也不许回退成 'day' 那种假档`);
  const h = d.getHours() + d.getMinutes() / 60;
  /* 与 src/scripts/site.js 改动前那三行 if 逐字同形（dawn 用 5/9、day 用 9/duskStart），
     所以 tableBounds 这条路走下来的结果和今天一致，这是"退路逐字节等价"的落点 */
  if (h >= b.dawnStart && h < b.dawnEnd) return 'dawn';
  if (h >= b.duskStart && h < b.duskEnd) return 'dusk';
  if (h >= b.dawnEnd && h < b.duskStart) return 'day';
  return 'night';
}

/* ── 光柱的"晨昏各一小时"（二轮 §2.1 落地，规范 §5.1）：同一根时钟上的一个**子区间**，不是第五枚档 ──
   ⚠️ 这一格不动 `PHASES`、不动 `phaseAt`、不动任何边界：`data-phase` 仍是上面那句钉死的
   "永远是 dawn / day / dusk / night 四枚枚举值"，:15 那条"不许在这里加第五个取值"也一个字没改。
   它只回答另一件事——"此刻在不在清晨/傍晚那一个小时里"，由 `site.js` 的 tick 写成 `html[data-shaft]`，
   CSS 那一侧用 `html[data-shaft="rise"][data-phase="dawn"]…` 这种**双重条件块**吃它。

   为什么两枚窗口各自还要问档位在场（而不是只看墙钟）：
   · 光柱今天只在 dawn/dusk 两档有值（day 是 .18/.12、night 是 0，见 §5.1 那张表）。只看墙钟就会在
     "17 点还挂在 day 档"的下午把 .18 抬成强档——提案那句"其余时段保持现状"就破了；
   · 边界已改成按真太阳算（§2.3），`dawn` 的窗口在偏东经度能整段挪到 07 点之前，
     挂着档位判据就是"到那一档才亮、不在那一档不亮"，不让一枚子区间去顶掉日循环。
   代价照实登记（月份表退路那一组，四行的窗口都写在上面 `SEASON_DUSK`）：
   · 清晨那一小时（07–08）在冬春夏秋四档退路里都落在 dawn（05–09）⇒ 全年 60 分钟；
   · 傍晚那一小时（17–18）只在冬档（16:00–17:30，落 30 分钟）与秋档（17:00–19:00，落 60 分钟）进得去 dusk，
     春档 17:30 起、夏档 19:30 起 ⇒ 这两档一年里各**整整 0 分钟**。
   ⚠️ 这一枚判据今天没有门禁尺子读它：`tools/phase-check.mjs` 那八格查的是**边界算法与四档枚举**，
   窗口不在它的清单上；把它塞进任何一格都要连 CELL_IDS／CONTRA_IDS／CONTRA_ENTRIES／NARROW_ENTRIES
   和规范里那行机器可读清单一起搬——那是"加档"（B 路）的代价，不该由"加子区间"（A 路）付。
   所以这两枚常量写成可核账面：窗口只按**整点**判，不看分钟尾数、不看月份表、不看经纬度。 */
export const SHAFT_HOURS = { rise: [7, 8], set: [17, 18] };   /* 起点含、终点不含：各恰好一个小时 */

/** 此刻在不在光柱的强档里？返回 'rise' / 'set' / null。**纯函数、不碰 DOM**，与 phaseAt 同一个入参形状。
 *  ⚠️ 它拿 phase 当入参而不是自己算边界：档位归 `phaseAt`，这一枚只管"这一刻在不在那一个小时里"。 */
export function shaftAt(d, phase) {
  const h = d.getHours();
  if (phase === 'dawn' && h >= SHAFT_HOURS.rise[0] && h < SHAFT_HOURS.rise[1]) return 'rise';
  if (phase === 'dusk' && h >= SHAFT_HOURS.set[0] && h < SHAFT_HOURS.set[1]) return 'set';
  return null;
}
