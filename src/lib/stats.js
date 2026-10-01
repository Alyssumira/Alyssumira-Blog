/* 构建期站点事实：关于页的"站点档案"和列表页的阅读时长共用这一份算法。
   铁律（§12 禁假数字）：这里只准出现**能从仓库里数出来**的东西。
   访问量、UV、PV 一类没有数据来源的数字一律不写——本站没有服务端，也没有统计脚本。
   ⚠️ 第十轮起还有一条：`siteFacts()` 吃进来的那份 posts 只准是 `lib/posts.js` 的 `visiblePosts()`。
   这几个数（篇数 / 字数 / 通读分钟）和列表页报的是同一件事，喂整份集合进去就等于把草稿数进档案——
   那一笔由 runtime-check 拿产物对账（关于页的"N 篇" ⇄ 可见稿件数）。 */
import { execSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

/* Astro 打包 frontmatter 模块时会把这份文件搬进 dist/.prerender/chunks/，
   import.meta.dirname 指向的是那儿的副本——数出来的就是 dist 了。仓库根只能从 cwd 往上找：
   npm run build / dev 的 cwd 就是项目根，往上第一个带 package.json 的目录即根。
   ⚠️ export 是给 `revised.js` 复用同一个口径（第九轮）：找根这件事在两棵树里各算一遍，迟早有一处先改。
   这一行只多了 `export` 五个字母，siteFacts / readMinutes / tone 的输出一个都没动。 */
export const ROOT = (() => {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++){
    if (existsSync(join(dir, 'package.json'))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return process.cwd();
})();
const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g;

/* 阅读时长：中日韩按字（400 字/分）、拉丁按词（220 词/分），向上取整——宁可报长也不报短 */
export function readMinutes(body){
  return Math.max(1, Math.ceil(cjkCount(body) / 400 + latinWords(body) / 220));
}
/* 手记的呼吸（§15）：一条 note 的行距按它的长短走三档——短句松（1.95）、中句照基准、长句挤（1.75）。
   和 readMinutes 同一把尺子（同一套 CJK 正则），所以"这条多长"全站只有一个算法。
   阈值 22 / 38 是拿现有三条量出来的：21 / 38 / 21 个单位——中间那条**正好压在 38 的边界上**，
   再多一个字就换成 tight 档。所以这一档不是稳态：加 note 时要重新量一次，别顺手改成 20/40 那种整数。
   ⚠️ 构建期算，不是运行时、更不是随机数：版式是作者写下的东西决定的，不是访客的浏览器决定的。 */
export function tone(text){
  const n = bodyLen(text);
  return n <= 22 ? 'tone-breath' : n <= 38 ? 'tone-plain' : 'tone-tight';
}
export const cjkCount = body => (String(body).match(CJK) || []).length;
export const latinWords = body => (String(body).replace(CJK, ' ').match(/[A-Za-z0-9'’-]+/g) || []).length;
/* 单篇字数：全站只有这一把尺（`siteFacts` 那个总数就是逐篇相加它）。列表页那两枚新图形
   （写作年轮／每行字数尺）吃的也是它——尺子不许由渲染器自己出。 */
export const bodyLen = body => cjkCount(body) + latinWords(body);

const git = cmd => {
  try { return execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return ''; }        /* 从 tarball 构建时没有 .git：宁可不显示这一行，也不显示 0 */
};

const p2 = n => String(n).padStart(2, '0');
/* 构建戳用本机时钟：这是"这份 HTML 是什么时候生成的"，不是给访客看的时刻表，所以不做时区换算 */
const stamp = d => `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;

/* 年度弧（关于页 colophon，规范 §6 苔时弧那套画法的第二次使用）：只交形状、不交读数。
   返回的是描边该画到哪（dasharray / dashoffset 一对），不返回"第 N 天"或百分比——
   页面上出现的读数都得有人为它负责（§12），而这里连 `frac` 都不往外给，就是为了不给它长成一格数字的机会。

   ⚠️ 比值向日历本身要：分母是"今年 1 月 1 日 → 明年 1 月 1 日"的真实毫秒差，于是
   闰年 366 天、年初年末的边界都由日历算完，代码里不写 365/366 这类常量、也不判断边界。
   两端都用本机时钟（和上面 `stamp` 同一个口径：本站不承诺访客时刻表，§6），
   所以 DST 那一两个小时也自动落在真实的年长度里。

   ⚠️ 几何只在这一处定义（`box` / `cx` / `r`），about.astro 从返回的对象里拿、CSS 只管 24px 那个尺寸与描边档。
   这是苔时弧"周长不写死在 CSS 里，向几何本身要"的构建期版本：那边有 DOM 可以用 `getTotalLength()`，
   这边没有 DOM，就向同一个 `r` 算——同一个数写两处迟早分叉。 */
const ARC = { box: 24, r: 11 };
export function yearArc(d){
  const y = d.getFullYear();
  const from = new Date(y, 0, 1).getTime();
  const to = new Date(y + 1, 0, 1).getTime();
  const frac = Math.min(1, Math.max(0, (d.getTime() - from) / (to - from)));
  const len = 2 * Math.PI * ARC.r;
  return {
    box: ARC.box, cx: ARC.box / 2, r: ARC.r,
    dasharray: len.toFixed(2),
    dashoffset: (len * (1 - frac)).toFixed(2),
  };
}

export function siteFacts(posts){
  const styles = readdirSync(join(ROOT, 'src', 'styles')).filter(f => f.endsWith('.css'));
  const cssBytes = styles.reduce((n, f) => n + statSync(join(ROOT, 'src', 'styles', f)).size, 0);
  const templates = (function walk(dir){
    return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
      e.isDirectory() ? walk(join(dir, e.name)) : (extname(e.name) === '.astro' ? [e.name] : []));
  })(join(ROOT, 'src', 'pages'));

  const commits = Number(git('git rev-list --count HEAD') || 0);
  /* git 给的是 2026-09-27，站点里所有日期都是 2026.09.27：档案栏不该有两种写法 */
  const dot = s => s.replace(/-/g, '.');
  const first = dot(git('git log --reverse --format=%ad --date=short').split('\n')[0]);
  const last = dot(git('git log -1 --format=%ad --date=short'));

  /* ⚠️ 一个页面只许有一个构建时刻（规范 §16）：整份档案里取时刻只许下面这一行，
     构建戳与年度弧都吃同一个对象。两处各求一次就会在跨秒的那一次构建里自相打脸——
     而 colophon 正是一页专门摆数字的地方，读者有权假定那两行说的是同一刻。
     ⚠️ 这段注释与规范里都不许把这串调用抄成字面量：§16 那条判据是"数这一份文件里带空括号的那个构造"，
     注释里写一遍，计数就自己变 2（本轮实测踩过——同一个坑在 about.astro 那条反例上踩过第二次）。 */
  const now = new Date();

  return {
    posts: posts.length,
    words: posts.reduce((n, p) => n + bodyLen(p.body), 0),
    minutes: posts.reduce((n, p) => n + readMinutes(p.body), 0),
    templates: templates.length,
    cssFiles: styles.length,
    cssKb: +(cssBytes / 1024).toFixed(1),
    commits: commits || null,
    tended: commits && first ? { first, last } : null,
    built: stamp(now),
    arc: yearArc(now),
    /* 同一枚 `now` 原样交回（`card/lifegrid`）：关于页"一生格子"那一块算的是"到构建这一刻走过多少格"，
       它必须和上面"构建于"那一行说的是同一刻——§16 那条"一页只许有一个构建时刻"管的就是这一族。
       ⚠️ 这里只是把**已经求过的那一次**递出去，没有第二次取时钟（这段文件里带空括号的那个构造仍然只有一处）。 */
    now,
  };
}
