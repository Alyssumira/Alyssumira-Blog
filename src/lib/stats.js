/* 构建期站点事实：关于页的"站点档案"和列表页的阅读时长共用这一份算法。
   铁律（§12 禁假数字）：这里只准出现**能从仓库里数出来**的东西。
   访问量、UV、PV 一类没有数据来源的数字一律不写——本站没有服务端，也没有统计脚本。 */
import { execSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';

/* Astro 打包 frontmatter 模块时会把这份文件搬进 dist/.prerender/chunks/，
   import.meta.dirname 指向的是那儿的副本——数出来的就是 dist 了。仓库根只能从 cwd 往上找：
   npm run build / dev 的 cwd 就是项目根，往上第一个带 package.json 的目录即根。 */
const ROOT = (() => {
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
export const cjkCount = body => (String(body).match(CJK) || []).length;
export const latinWords = body => (String(body).replace(CJK, ' ').match(/[A-Za-z0-9'’-]+/g) || []).length;

const git = cmd => {
  try { return execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return ''; }        /* 从 tarball 构建时没有 .git：宁可不显示这一行，也不显示 0 */
};

const p2 = n => String(n).padStart(2, '0');
/* 构建戳用本机时钟：这是"这份 HTML 是什么时候生成的"，不是给访客看的时刻表，所以不做时区换算 */
const stamp = d => `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;

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

  return {
    posts: posts.length,
    words: posts.reduce((n, p) => n + cjkCount(p.body) + latinWords(p.body), 0),
    minutes: posts.reduce((n, p) => n + readMinutes(p.body), 0),
    templates: templates.length,
    cssFiles: styles.length,
    cssKb: +(cssBytes / 1024).toFixed(1),
    commits: commits || null,
    tended: commits && first ? { first, last } : null,
    built: stamp(new Date()),
  };
}
