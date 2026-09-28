/* sun.js —— NOAA 太阳位置近似（§2.3 的"边界是算的"那一半）
   只做一件事：给一个本地日历日 + 经纬度，返回**当天真日出与真日落的本地小数小时**。
   返回值是本地钟表时刻，因为时区这件事整个交给 Date：算出来的是 UTC 那一"瞬"，
   再让 .getHours() 按访客机器自己的时区（含夏令时）读回来——本站不猜任何人的时区。

   ⚠️ 三条边界，都是这张卡的硬约束：
   ① 不引依赖、不装包、不发网络请求（下面 30 行就是全部数学）。
   ② 极昼 / 极夜当天太阳不跨地平线 ⇒ acos 的定义域外 ⇒ 返回 null，由调用方退回月份表。
   ③ 位置（经纬度）在**这里**用完就丢：往上只交给调用方两个小数小时。绝不进任何 storage。

   算法是 NOAA 的表格近似（γ 年分数 → 时差 eqtime / 赤纬 decl → 时角 HA），
   官方口径的"日出"取真天顶 90.833°（太阳上边缘 + 大气折射），所以算出来的是**肉眼看见**的日出。
   已知精度：对 NOAA 自己的表格约 ±数分钟。标定实测（2025，本机 node，TZ=Asia/Shanghai）
   北京 1/15 算 07:34 / 17:11，NOAA 表给 07:36 / 17:16；广州 1/15 算 06:46 / 17:35，表给 07:07 / 17:46。
   ⚠️ 两处偏差都朝"更早"同向平移约 10–20 分钟，怀疑是 ①近似式里的 0.01400 年分数偏置（它按 365 天定，
   闰年 1/15 已经偏 0.25 天）与 ②纬度没算海拔/大地水准面。这一档精度对"哪一档色温"完全够用
   （一档窗口 1.5–4 小时），所以**不去补 VSOP87**：为几十分钟引一套星历表，正是 §2.3 否决节气上导航的同一个理由。
   ⚠️ 已知不做：夏令时切换的那一天，"本地日历日"与"UTC 日历日"错位，边界会偏一小时。一年两天，退回不了表
   （因为表也错），登记在此而不是藏起来。 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const SUN_ZENITH = 90.833 * RAD;      /* 90°50′：上边缘 + 34′ 折射，NOAA 口径 */

const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/* ⚠️ 年内序号（1..366），不是"距某个 2000 年基准的天数"。写错成后者时 γ 会多出整数圈，
   年循环整体错位约 7 天——而且**一月二月几乎看不出来**（那两个月赤纬变化慢，日出日落只差几分钟），
   到春分附近就是 2.8° 的赤纬误差。这一条不是假想：本卡真的写成过后者，是 §2.3 末那条物理标定
   （二分赤纬必须过零）当场把它判红的。基准必须是"当年 1 月 1 日"，别再接任何全局历元。 */
const dayIndex = (y, m, d) => Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;

/** 赤纬（弧度）与"时差"eqtime（分钟）。单独露出来是给 `tools/phase-check.mjs` 做**物理标定**用的：
 *  二至的赤纬极值、二分的赤纬过零、时差四个极值的日期与符号——这些是不依赖任何城市时刻表的事实，
 *  把它们钉住之后，"符号写反"这种形状完全合法的错就会当场红（本卡实测：不钉的话翻转 eqtime 符号
 *  能让整条门禁继续全绿，那一格记在 §2.3 末的变异测试里）。 */
export function solarTerms(dateLike) {
  const y = dateLike.getFullYear(), m = dateLike.getMonth(), d = dateLike.getDate();
  const yearDays = isLeap(y) ? 366 : 365;
  const g = (2 * Math.PI / yearDays) * (dayIndex(y, m, d) - 1 + 0.01400);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
    - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
    - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
    - 0.002697 * Math.cos(3 * g) + 0.001480 * Math.sin(3 * g);
  return { eqtime, decl };
}

/**
 * 真日出 / 真日落，**本地小数小时**（0–24，含分钟与秒的分数）。
 * @returns {{rise:number,set:number}|null} null = 当天太阳不跨地平线，或输入不是数
 */
export function sunHours(dateLike, lat, lon) {
  if (!dateLike || typeof dateLike.getTime !== 'function') return null;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;      /* 拒字符串，NaN 走下面的 isFinite */
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90) return null;

  const y = dateLike.getFullYear(), mo = dateLike.getMonth(), d = dateLike.getDate();
  const { eqtime, decl } = solarTerms(dateLike);

  const cl = Math.cos(lat * RAD), cd = Math.cos(decl);
  if (!cl || !cd) return null;
  const cosHa = (Math.cos(SUN_ZENITH) - Math.sin(lat * RAD) * Math.sin(decl)) / (cl * cd);
  if (cosHa > 1 || cosHa < -1) return null;         /* 极昼（<-1）/ 极夜（>1）：没有日出日落可算 */
  const ha = Math.acos(cosHa) * DEG;                /* 时角，度；1° = 4 分钟 */

  /* 真太阳正午，"当天 00:00 UTC 起算的分钟"。⚠️ eqtime 前面是减号：这条符号用 NOAA 表格
     对过三次（北京/广州/奥斯陆 1 月中），写成 + 会把边界整体推 17 分钟、且随季节来回摆。 */
  const noon = 720 - 4 * lon - eqtime;
  const at = min => {
    const dt = new Date(Date.UTC(y, mo, d) + min * 60000);
    return dt.getHours() + dt.getMinutes() / 60 + dt.getSeconds() / 3600;
  };
  const rise = at(noon - 4 * ha), set = at(noon + 4 * ha);
  if (!Number.isFinite(rise) || !Number.isFinite(set)) return null;
  return { rise, set };
}
