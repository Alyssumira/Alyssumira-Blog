/* 「改于 <日期>」：详情页那一行第二个日期的来源。
   ⚠️ 数据源是 git，不是 front matter 的手填字段（规范 §15 详情页那一格）。理由和关于页"访问量"那一栏
   空着是同一族做法（§12 禁假数字）：**手填的"改于"会腐烂**——作者改完稿子忘了改这一键，页面就替他说了一句
   过期话；而 git 里"有没有这一次改动"是问出来的，问不到就不说。所以这一格不新增 schema 键，
   `src/content.config.ts` 一个字没动（那条 `z.coerce.date()` 把空串铸成 Invalid Date 的先例就在隔壁，
   手填日期要过同一道 schema，何必再造一枚）。
   与 `stats.js` 同一条铁律：只在构建期跑、不写文件、拿不到就整行不出现——
   这里"拿不到"退的是 `undefined`，不是 0、不是"今天"、不是发布日期。

   ⚠️ 仓库根**不在这儿重新猜一遍**：`ROOT` 从 `stats.js` import 回来，两棵共用同一个"往上找带 package.json 的目录"
   的口径（那条实测坑写在 `stats.js` 头上：Astro 打包 frontmatter 模块时把这份文件搬进 `dist/.prerender/chunks/`，
   `import.meta.dirname` 指的是那儿的副本）。同一件事在两处各算一遍，迟早有一处先改。 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './stats.js';

/* 三类"拿不到"分开判（不许用一次 exit code 把它们糊成一件）：
     'no-git-binary' 这台机器上没有 git 可执行文件
     'no-repo'       有 git，但这棵树不是仓库（从 tarball / 复制出来的 `dist` 之外构建）
     'no-commit'     有仓库、git 也答了，只是答"这个文件没有一次改动型提交"（新稿还没 commit，
                     或者只有把它加进仓库的那一枚 A 型提交）
   外加两类异常：'git-failed'（git 报了别的错）与 'no-path'（拿不到这个文件的相对路径）。
   ⚠️ 判据不看 exit code 一个数就走：ENOENT 是"程序起不来"，非零 + stderr 有字样是"仓库不在"，
      exit 0 + 空串是"没有这一条历史"——第三种尤其不能当失败，它是这一格最常见的正确答案。 */
const runGit = args => new Promise(done => {
  execFile('git', args, {
    cwd: ROOT,
    windowsHide: true,
    encoding: 'utf8',
    maxBuffer: 1 << 20,
    stdio: ['ignore', 'pipe', 'pipe'],
  }, (err, stdout, stderr) => done({ err, out: String(stdout || '').trim(), errText: String(stderr || '').trim() }));
});

const CAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* 取"最后一次**改动**这个文件的提交"的日历日。
   ⚠️ `--diff-filter=M` 不是可有可无的修饰：本仓库三篇稿子的"最后一次触碰"全是 2026-09-27 那枚迁移提交
   （`git log --diff-filter=M -- src/content/posts` 实测 0 行），少了这个筛子，今天三篇都会领到一句
   它们没经历过的"改于 2026.09.27"——§12 假语义的形状。A（新增）不算改。
   ⚠️ 已知偏窄的一面：以 `R`（改名）落进来的改动不在 `M` 里，会被判成"没改过"。宁缺勿滥，登记在 §15。
   ⚠️ `%cd`（committer 日期）而不是 `%ad`：这一格说的是"这一次改动进历史的那一刻"。本机实测三篇稿子
   两枚日期相同（`2026-09-27|2026-09-27`），所以这一字之差今天不改变任何读数——但它是语义差，得写清。 */
export async function lastRevisionDate(relPath){
  const spec = String(relPath || '').split('\\').join('/');
  if (!spec) return { date: undefined, why: 'no-path' };
  /* 先问"这棵树是不是仓库"再动 git：不是仓库时 git 会往**上一层**找，万一本站被嵌在某个大仓库里构建，
     它就会拿那个不相干的仓库的历史来给稿件作证。这一枚短路挡的就是那种串台。 */
  if (!existsSync(join(ROOT, '.git'))) return { date: undefined, why: 'no-repo' };
  const { err, out, errText } = await runGit(['log', '-1', '--diff-filter=M', '--format=%cd', '--date=short', '--', spec]);
  if (err) {
    if (err.code === 'ENOENT') return { date: undefined, why: 'no-git-binary' };
    if (/not a git repository|unknown revision|not a tree/i.test(errText)) return { date: undefined, why: 'no-repo' };
    return { date: undefined, why: 'git-failed', detail: `${err.code ?? err.signal ?? '?'} ${errText.split('\n')[0]}` };
  }
  /* ⚠️ 空值在**解析之前**判掉，别交给类型系统：`new Date('')` 是 `Invalid Date`，
     `String(Invalid Date)` 是 'NaN.NaN.NaN'，一旦让它往下走就会在页面上长出一枚假日期
     （本仓有过同族事故：`z.coerce.date()` 把空串 coerce 成 Invalid Date 混进产物）。
     所以这里只放行 `YYYY-MM-DD` 这一个形状，其余一律 undefined。 */
  if (!CAL_DATE.test(out)) return { date: undefined, why: 'no-commit', raw: out };
  return { date: out, why: 'ok' };
}

/* front matter 的 `date` 在站上是一个**日历日**、没有时刻（YAML 日期落成 UTC 零点，全站按 getUTC* 读，
   见 markdown.js 的 fmtDate 与 §7 的 whenOf），git 给的是提交自己那个时区里的日历日。
   ⚠️ 两边都当字符串比，不做时区换算：换一次算就会把"同一个九月的夜晚"劈成两天，
   而这一格要的判据只是"改于是不是晚于写于那一天"。 */
const publishISO = d => (d instanceof Date && !Number.isNaN(d.getTime()))
  ? [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join('-')
  : '';

/* 同日（或更早）⇒ 不显示。显示一条和"写于"重复的日期是噪音，不是信息。
   ⚠️ 这一格还兼着"拿不到 ⇒ undefined"的下游闸门：进来的 `revISO` 只要不是 undefined 之外的东西都得先过 `CAL_DATE`。 */
export function revisedOn(pubDate, revISO){
  if (typeof revISO !== 'string' || !CAL_DATE.test(revISO)) return undefined;
  const pub = publishISO(pubDate);
  if (!pub) return undefined;
  return revISO > pub ? revISO : undefined;
}

/* 详情页那一行的成品文字：`写于一个九月的深夜` / `改于 2026.09.28` / 两者同在一行用 ` · ` 连着。
   ⚠️ 不新开一块、不新造第二种灰度——落点与排印都是 §7 那行 `.post-when`（14px 宋体 `--ink-2`）。
   点分日期是全站唯一写法（`stats.js` 里那句"档案栏不该有两种写法"同一个理由）。 */
export function whenLine(when, pubDate, revISO){
  const rev = revisedOn(pubDate, revISO);
  return [when, rev ? `改于 ${rev.replace(/-/g, '.')}` : ''].filter(Boolean).join(' · ');
}
