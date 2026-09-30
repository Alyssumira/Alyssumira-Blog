/* og-cards.mjs —— 逐篇社交分享卡的出图链（`npm run og`，作者 2026-09-29 点头收进 package.json）
   用法  node tools/og-cards.mjs                 为每篇**已发布**的稿子出 public/og/<slug>.png（1200×630）
         node tools/og-cards.mjs --slug=<s>      只出这一篇
         node tools/og-cards.mjs --site          顺手重出站点级 public/og.png（默认不动它：那张已经在了，
                                                 重出一遍就是往 git 里塞一枚改过的二进制）
         node tools/og-cards.mjs --probe=<文本>   只跑"装不装得下"那一趟，不出图不写盘——改标题之前先问一句
         node tools/og-cards.mjs --twice         每张连出两遍并比 md5（同一台机器同一份输入应当逐字节相同；
                                                 这是"字体真落地了、画面不是碰运气"那一半的复验）
   落位之后本脚本还会往 tools/og-cards.manifest.json 落一笔账（每枚卡：出图那一次的 title ＋ 落位后回读的 sha256/bytes）；
   读者是 tools/og-check.mjs（npm run gate 的末步，排在 build 之后）。清单没有第二支笔会写它——手改它等于伪造出图记录。
   两个方向都验过（§16 那一族"判据不许空转"）：
     朝宽 --probe=<九十个汉字> ⇒ exit 1、一张图都不写；
     朝窄 现有三篇的标题（5 / 11 / 6 字）⇒ exit 0、不误报。

   三条立场，写在这儿是因为它们决定了代码长什么样：
   ① **色值一枚都不抄**：卡片上那六个色全部在出图前从 `src/styles/base.css` 的 :root 现读现注入。
      工具里出现一枚 hex 就是给色板添第二处真值（§12:816 那枚"第五色"要签字才许破，这张卡一张也没破）。
   ② **Edge 说"成功"不算成功**：headless Edge 报 `N bytes written` 且 exit 0，那 N 枚字节仍可能不是
      一张能解码的图。所以每张产物过两道独立复验：Node 自己读 PNG 的 IHDR/IEND（帧头、几何、位深、
      真的收尾），再用 GDI+（`tools/og-verify.ps1`，System.Drawing 真解码一遍像素）复取宽高与像素格式。
      再加上逐张 md5 互不相同、也与站点级那张不同——"标题真的进去了"才谈得上。
   ③ **不合格就不出图**：标题超出字号梯度（模板文件头那四档）时，这一篇**报错**，不裁字、不缩到看不见、
      也不让字压在树线上；而且**整轮什么都不写盘**（两阶段：全部出完、全部复验过，才一次落位），
      免得半新半旧的卡混在一起被人转发。宁缺毋滥在这一格是安全的，因为 `Layout.astro` 那侧
      "盘上没有就退回站点级 /og.png"，缺一枚卡不会做出一个 404 的 og:image。
   ④ **落位之后要落一笔账**：全部卡复验通过、写进 `public/og/` 之后，本脚本再往 `tools/og-cards.manifest.json`
      写"这一张是按哪一句题面画的 ＋ 落位后回读的那枚字节的 sha256"，读者是 `tools/og-check.mjs`
      （`npm run gate` 的末步，排在 build 之后）。为什么这一笔必须由出图的这一侧落、而不是由检查的那一侧推：
      改过 `title` 却不重跑本脚本时，盘上那枚 PNG **一个字节都没变、文件照样在**——"存在性"读不出任何事，
      判据会绿着放行一张写着旧标题的卡（`card/ogcheck` 2026-09-30 实测了这一档假绿，读数在 §13a）。
      清单跟着卡一起走：卡没重出，题面就没落笔，那一格当场红。 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, mkdtempSync, statSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { splitFm, readTaxonomy } from './frontmatter.mjs';
import { resolveBrowser, browserCandidates, spawnBrowser } from './browser-bin.mjs';
import { sortPosts, isDraft } from '../src/lib/taxonomy.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'tools', 'og-card.html');
const BASE_CSS = join(ROOT, 'src', 'styles', 'base.css');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const PUBLIC_OG = join(ROOT, 'public', 'og');
const SITE_PNG = join(ROOT, 'public', 'og.png');
const PS1 = join(ROOT, 'tools', 'og-verify.ps1');
/* 题面⇄字节的清单：写者只有这一支笔（出完、复验过、落位之后才写）。读者是 tools/og-check.mjs。
   为什么必须有这一份而不是"文件在不在"：改过 title 却不重跑 npm run og，盘上那枚 PNG 一个字节没变、文件照样在，
   存在性判据当场绿——转发出去的是一张写着旧标题的卡。mtime 那一档更不能用：git 不存 mtime，
   干净检出上卡与稿件的先后由 checkout 顺序决定（实测：与 HEAD 逐字节相同时稿件 mtime 仍比卡新 2ms ⇒ 恒假红）。 */
const MANIFEST = join(ROOT, 'tools', 'og-cards.manifest.json');
const MANIFEST_NOTE = '逐篇社交卡的题面与字节清单。**写者只有 `tools/og-cards.mjs`**（全部卡出完、Node 帧头与 GDI+ 两道复验通过、落位之后才写这一份）；读者是 `tools/og-check.mjs`（`npm run gate` 的末步，排在 build 之后）。手工改这份文件＝伪造出图记录：把它改成「当前题面 ＋ 旧卡的 sha256」就能骗过判据，所以清单不许手改，改卡只许走 `npm run og`。口径与未验到的那两笔登记在 `docs/设计规范.md` §13a 与 §16。';
const MANIFEST_GENERATED = '这一份由 npm run og（tools/og-cards.mjs）在卡落位之后写：题面是出图那一次的 front matter title，sha256/bytes 是落位后回读那枚文件算的。逐条 stamped 记的是这一条是谁落的笔——og-cards＝出图链当场盖的章，bootstrap＝就地起的账（题面⇄像素那一道没当众跑过出图链，见 §13a 本轮登记）；下一轮全量 npm run og 会把它们换掉。';
const W = 1200, H = 630;                       /* 卡面尺寸：与模板、与 og:image:width/height 同一枚 */
const TOKENS = ['--bg-top', '--bg-base', '--ink', '--ink-2', '--moss', '--moss-deep'];
const RUN_TIMEOUT = 180_000;                   /* 一次浏览器调用最多等多久（含字体那几个请求） */

/* ---------- 0. 参数 ---------- */
const argv = process.argv.slice(2);
const opt = k => { const m = argv.find(a => a.startsWith(`--${k}=`)); return m ? m.slice(k.length + 3) : null; };
/* 带值的开关（--probe=…）也是"给了这一枚"：只比字面量的 has() 会把 --probe=xxx 读成"没给"，
   于是探针静默不跑、脚本转身把全部卡出了一遍——那是最坏的一种假绿（你以为在量，其实在写盘）。 */
const has = k => argv.some(a => a === `--${k}` || a.startsWith(`--${k}=`));
if (has('help')){
  console.log('用法见文件头：node tools/og-cards.mjs [--slug=<s>] [--site] [--probe=<文本>] [--twice]');
  process.exit(0);
}

function die(msg, hint){
  console.log(`\n✗ og-cards：${msg}`);
  if (hint) console.log(`  ${hint}`);
  console.log('  本轮一张图都没写盘（public/og/ 里还是上一版）——这一条是刻意的：半新半旧的卡比没卡更坏');
  process.exit(1);
}

/* ---------- 1. 色板：从 base.css 的 :root 现读 ---------- */
/* 只读 :root 那一段（亮色），不读 html[data-theme="dark"]：社交卡的读者是没有 JS 的爬虫与聊天软件，
   它们看到的站就是 §13a 那格说的"无 JS 时 data-theme 本来就是 light"那一版。 */
function rootBlock(css){
  const at = css.indexOf(':root{');
  if (at < 0) die(`${basename(BASE_CSS)} 里找不到 :root{ —— 色板不在这份文件里了，注入这一步不能猜`);
  let depth = 0, end = at;
  for (let i = at + 5; i < css.length; i++){
    if (css[i] === '{') depth++;
    else if (css[i] === '}'){ depth--; if (!depth){ end = i; break; } }
  }
  return css.slice(at + 6, end);
}
function readTokens(){
  const block = rootBlock(readFileSync(BASE_CSS, 'utf8').replace(/\r\n/g, '\n'));
  const found = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]*?)\s*;/g)){
    if (TOKENS.includes(m[1])) found[m[1]] = m[2];
  }
  const missing = TOKENS.filter(t => !found[t]);
  if (missing.length) die(`base.css 的 :root 里读不到 ${missing.join(' / ')} —— 卡面上的色就是这几枚，读不到不许退回"随便给一个"`,
    '  要么那几枚令牌改了名，要么这份工具的口径过期了；两种都是改工具，不是加 hex');
  const bad = TOKENS.filter(t => !/^#[0-9A-Fa-f]{6}$/.test(found[t]));
  if (bad.length) die(`${bad.join(' / ')} 不是一枚 6 位 hex（读到的是 ${bad.map(t => JSON.stringify(found[t])).join(' / ')}）`,
    '  卡面只有十六进制色，渐变与 alpha 那几枚令牌这张卡用不到，也不许在这儿现算');
  return found;
}
const tokenCss = t => `:root{${TOKENS.map(k => `${k}:${t[k]}`).join(';')}}`;

/* ---------- 2. 稿件清单：与站上同一套读法 ---------- */
/* front matter 走工具侧那一份解析器（new-post --check / taxonomy-check / runtime-check 吃的是同一个实现），
   草稿过滤与顺序走 shipped 的 isDraft / sortPosts——门禁一套、页面一套那种分叉不许在这里重演。 */
function collect(){
  if (!existsSync(POSTS_DIR)) die(`${POSTS_DIR} 不存在 —— 连稿件目录都没有，这一轮没有可出的卡`);
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  if (!files.length) die('src/content/posts 里一篇稿子都没有 —— 判据在这儿停住，不对着空目录打勾');
  const out = [], drafts = [];
  for (const f of files){
    const slug = f.slice(0, -3);
    const parsed = splitFm(readFileSync(join(POSTS_DIR, f), 'utf8'));
    if (!parsed) die(`${f} 的 front matter 不成形 —— 出图脚本不替你猜标题`);
    const tax = readTaxonomy(parsed.fmText);
    if (tax.errors.length) die(`${f}：${tax.errors[0]}`, '  这是 --check 那一格本来就该拦下的写法，卡不能比稿子先跑');
    const title = parsed.fm.title;
    if (!title || !title.trim()) die(`${f} 的 front matter 没有 title —— 卡面上写什么没有依据，不出这一张`);
    const post = { id: slug, data: { title, date: new Date(parsed.fm.date), draft: tax.draft, pinned: tax.pinned } };
    if (isDraft(post)) { drafts.push(slug); continue; }   /* 草稿不出卡：卡上的地址是站上读不到的地址 */
    out.push(post);
  }
  return { posts: sortPosts(out), drafts };
}

/* ---------- 3. 模板 → 一张页 ---------- */
function esc(s){
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function buildHtml(template, tokens, title){
  /* 槽在不在、有几处，判的都是**模板**：替换成功之后产物里当然没有那枚标记，拿产物去查就是查了个永远绿的假判据。
     枚数必须是 1：文件头那条坑（把槽的字面量抄进说明注释里）就是"第一处命中落在注释里、真正该注的那处没动"，
     而它长得完全像成功——色板注进了注释、卡面变成没有色的那张，浏览器不报错，只有对账那一道拦得住。 */
  let html = replaceOnce(template, /\/\*OG:TOKENS\*\//, tokenCss(tokens), 'OG:TOKENS 那枚色板槽');
  if (title !== null){
    html = replaceOnce(html, /<!--OG:TITLE-->[\s\S]*?<!--OG:TITLE\/-->/, () => esc(title), 'OG:TITLE 那对文案槽');
  }
  return html;
}
function replaceOnce(src, re, to, what){
  const n = src.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
  const count = n ? n.length : 0;
  if (count !== 1) die(`模板里 ${what} 数到 ${count} 处，要的是不多不少一枚`,
    '  两枚就是"有一处真值抄了两遍"（§16 那一族），零枚就是槽被删了——两种都不许"挑第一处凑合"');
  return src.replace(re, typeof to === 'function' ? to : () => to);
}

/* ---------- 4. 起浏览器（异步！runtime-check 文件头钉过的坑：spawnSync 冻住事件循环）---------- */
/* 用哪一枚浏览器不在这里判——站内唯一一处是 `tools/browser-bin.mjs`（2026-09-30 `card/browserbin`）：
   判据是**探得到靶**（交回的 DOM 里带着只有 JS 跑过才存在的标记），不是"msedge 的文件在不在盘上"。 */
const browserSkips = [];
const BROWSER = await resolveBrowser({ flag: opt('browser') || opt('edge'), label: 'og-cards', log: s => browserSkips.push(s.trim()) });
const EDGE = BROWSER && BROWSER.bin;
const EDGE_CANDIDATES = browserCandidates(opt('browser') || opt('edge')).map(c => c.bin);
if (!EDGE) die(`没有一枚浏览器探得到靶（试过：${EDGE_CANDIDATES.join(' / ')}）\n${browserSkips.map(s => '  ' + s).join('\n')}`,
  '  换浏览器传 --browser=<路径>（旧名 --edge= 也认）或设环境变量 MISTWOOD_BROWSER；这一条不降级、不跳过');

let profiles = [];
function newProfile(tag){
  let dir;
  try { dir = mkdtempSync(join(tmpdir(), `mistwood-og-${tag}-`)); }
  catch (e){ die(`临时 profile 目录建不出来（${e.message}）`, `  tmpdir=${tmpdir()}`); }
  profiles.push(dir);
  return dir;
}
/* 站点级那张卡的出处就是模板文件头那一条命令，参数一字不动（多一个 flag 就多一处"画出来不是那一张"的可能）。
   --virtual-time-budget=20000 那 20 秒是给 fonts.loli.net 四枚字体落地的，砍掉拿到的是系统默认字。 */
const FLAGS = (profile, budget) => [
  '--headless=new', `--user-data-dir=${profile}`, '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--disable-sync',
  '--force-device-scale-factor=1', `--window-size=${W},${H}`, `--virtual-time-budget=${budget || 20000}`,
];
function runEdge(args){
  return new Promise(res => {
    let child;
    try { child = spawnBrowser(EDGE, args, { cwd: dirname(EDGE), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e){ return res({ fail: `spawn ${EDGE} 抛了：${e.message}` }); }
    let out = '', err = '', done = false;
    child.stdout.on('data', d => { out = (out + d.toString('utf8')).slice(-400_000); });
    child.stderr.on('data', d => { err = (err + d.toString('utf8')).slice(-4000); });
    child.on('error', e => { if (!done){ done = true; res({ fail: `起浏览器失败：${e.code || e.message}` }); } });
    const timer = setTimeout(() => { if (done) return; try { child.kill(); } catch { /* 已经退了 */ } }, RUN_TIMEOUT);
    child.on('close', (code, signal) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      res({ out, err, code, signal, killed: signal != null });
    });
  });
}

/* ---------- 5. 第一趟：量标题装不装得下 + 字体落没落地（同一趟，同一个引擎）---------- */
/* 回报那一行是模板里的脚本写的，量的是**真画这张卡的那台浏览器**的断行结果。
   不在 Node 里用"一个汉字一 em"去猜：猜错就是"脚本以为两行、浏览器画成三行、第三行压在树上"。 */
function parseFit(dom){
  const m = /OGFIT status=(\S+)([^\n<]*)/.exec(dom);
  if (!m) return null;
  const fields = { status: m[1] };
  for (const kv of m[2].matchAll(/(\w+)=([^\s]+)/g)) fields[kv[1]] = kv[2];
  return fields;
}
async function fitPass(url, htmlPath, label){
  const profile = newProfile('fit');
  const r = await runEdge([...FLAGS(profile), '--dump-dom', url]);
  if (r.fail) die(`${label}：${r.fail}`);
  if (r.killed) die(`${label}：浏览器跑了 ${RUN_TIMEOUT / 1000}s 还没退就被杀了`, `  ${r.err.slice(-300)}`);
  const f = parseFit(r.out || '');
  if (!f || f.status === 'pending' || f.status === 'ERROR'){
    die(`${label}：没拿到页面的 OGFIT 终态（读到 ${f ? f.status : '没有那一行'}）`,
      '  多半是字体那几个请求挂在那儿没回来：这一条就是"静默降级成系统默认字"的形状，判它死而不判它过');
  }
  /* 字体那一半的证据：check(spec, text) 问的是"画这句字要用到的那些 face 落地了没"。
     fonts.status 不算证据——它只说"没有正在进行的加载"，一个都没用上的 face 也算它完事了。
     ⚠️ 实测（把字体站的域名换成一枚不存在的再跑）：三枚 check() 仍旧全报 true——一枚 face 都没注册时
     它是**空真**。所以下面那句 facesloaded>0 不是"再加一道保险"，它是这一格里唯一真咬得住的那枚牙；
     两条来自不同算法，一起才算数（§13a 那格登记了这个读数）。 */
  const soft = [];
  if (f.noto !== 'true') soft.push('Noto Serif SC');
  if (f.mono !== 'true') soft.push('IBM Plex Mono');
  if (f.fraunces !== 'true') soft.push('Fraunces');
  if (soft.length) die(`${label}：字体没落地（${soft.join(' / ')}），出图就是静默降级成系统默认字`,
    `  回报原样：${JSON.stringify(f)}\n  网络不通/字体站换域名时就是这一条挡着；它挡的是"不许交一张降级图"，不是不许你查`);
  if (Number(f.facesloaded) <= 0) die(`${label}：document.fonts 里一枚 face 都不是 loaded（facesloaded=${f.facesloaded}）—— check() 报 true 也没用`,
    '  这是防一手"两个证据只剩一个证据"：facesloaded 与 check() 来自不同的算法，一起才算数');
  if (f.status !== 'OK') die(`${label}：标题装不进这张卡（${f.why || '不合格'}）`,
    `  量到的读数：size=${f.size} lines=${f.lines} bottom=${f.bottom} 上限 floor=${f.floor} 盒子=${f.boxw}px；梯度 ${f.ladder}\n`
    + `  规则在 tools/og-card.html 文件头：四档都不合格 ⇒ 这一篇不出图（不裁字、不缩到看不见、不让字压在树线上）。\n`
    + `  要么把标题改短到 3 行 × 25 字以内，要么改那四档并连同规则一起重签字——脚本不替你选。`);
  if (Number(f.bottom) > Number(f.floor)) die(`${label}：回报自相矛盾（status=OK 却 bottom=${f.bottom} > floor=${f.floor}）`, '  模板里那条判定坏了，别看图，先修模板');
  if (Number(f.maxw) > Number(f.boxw)) die(`${label}：某一行宽 ${f.maxw} 超出盒子 ${f.boxw}`);
  if (Number(f.wordw) > Number(f.boxw)) die(`${label}：一个不可断的长词宽 ${f.wordw} 超出盒子 ${f.boxw}`);
  return f;
}

/* ---------- 6. 第二趟：截图 ---------- */
async function shotPass(url, png, label){
  const profile = newProfile('shot');
  const r = await runEdge([...FLAGS(profile), `--screenshot=${png}`, url]);
  if (r.fail) die(`${label}：${r.fail}`);
  if (r.killed) die(`${label}：截图这一跑被超时杀了`, `  ${r.err.slice(-300)}`);
  /* Edge 打的那句"bytes written"只是它自己的说法，进不进判据都不算证据；下面两道才算。 */
  if (!existsSync(png)) die(`${label}：Edge 退出码 ${r.code}，可文件根本没写出来`, `  stderr 尾巴：${r.err.slice(-300)}`);
  return r;
}

/* ---------- 7. 复验一：Node 自己读 PNG 的帧头（不依赖任何编解码器）---------- */
function sniffPng(buf, label){
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 33 || !SIG.every((b, i) => buf[i] === b)) die(`${label}：连 PNG 签名都不是（前 8 字节 ${buf.subarray(0, 8).toString('hex')}）`);
  if (buf.subarray(12, 16).toString('ascii') !== 'IHDR') die(`${label}：第一段块不是 IHDR`);
  const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20);
  const depth = buf[24], color = buf[25], interlace = buf[28];
  if (buf.subarray(-8, -4).toString('ascii') !== 'IEND') die(`${label}：文件末尾没有 IEND —— 这是一张被截断的图，看着像图而已`);
  return { width, height, depth, color, interlace };
}

/* ---------- 8. 复验二：GDI+ 真解码一遍（System.Drawing，独立于浏览器）---------- */
function psPath(){
  const sys = process.env.SystemRoot || 'C:\\Windows';
  const p = join(sys, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  return existsSync(p) ? p : 'powershell.exe';
}
function gdiVerify(files, label){
  if (!existsSync(PS1)) die(`${PS1} 不在 —— 少一道独立复验就是假绿，不许跳过`, '  这一条是 GDI+ 那枚唯一能证伪帧头的编解码器，缺文件就是缺判据');
  const r = gdiRun(files);
  const lines = r.out.split(/\r?\n/).filter(x => x.startsWith('FILE=') || x.startsWith('GDIPLUS'));
  if (r.code !== 0) die(`${label}：GDI+ 复验没过（powershell exit ${r.code}）`, `  它打的：\n${lines.join('\n  ')}\n  stderr：${r.err.slice(-400)}`);
  const rows = lines.filter(l => l.startsWith('FILE=')).map(l => {
    const f = {};
    for (const kv of l.matchAll(/(\w+)=([^\s]+)/g)) f[kv[1]] = kv[2];
    return f;
  });
  if (rows.length !== files.length) die(`${label}：GDI+ 只报了 ${rows.length} 行，可我要 ${files.length} 张逐张读数`, '  少一行就是有一张没被真解码过——这比报错更坏，因为它长得像绿');
  const byPath = {};
  for (const row of rows){
    const key = row.FILE.replace(/\\/g, '/').toLowerCase();
    byPath[key] = row;
    if (Number(row.WIDTH) !== W || Number(row.HEIGHT) !== H) die(`${label}：GDI+ 读到 ${row.WIDTH}×${row.HEIGHT}，不是 ${W}×${H}`);
    if (!/^Format(24bppRgb|32bppArgb)$/.test(row.PIXFMT)) die(`${label}：像素格式是 ${row.PIXFMT}，不是 8-bit RGB/RGBA —— 这张卡不是它说的那张`);
    if (Number(row.BYTES) <= 4096) die(`${label}：GDI+ 只看到 ${row.BYTES} 字节 —— 一张有字的卡不可能这么小，八成是空图`);
  }
  return { rows, byPath, count: rows.length };
}
/* GDI+ 这一路用 spawnSync 是安全的：runtime-check 文件头钉的那个坑是"浏览器与 HTTP 服务在同一个进程里，
   spawnSync 冻住事件循环"，这里既不起服务也不起浏览器，只是一个同步的外壳调用。 */
function gdiRun(files){
  const r = spawnSync(psPath(), ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS1, ...files],
    { windowsHide: true, encoding: 'utf8', timeout: 120_000 });
  if (r.error) die(`起 powershell 失败：${r.error.message}`, `  路径 ${psPath()}；GDI+ 这一道复验没有替代品，不许跳过`);
  return { out: r.stdout || '', err: r.stderr || '', code: r.status };
}

/* ---------- 9. 一张卡的两阶段：先全出全验，再一次落位 ---------- */
function md5(p){ return createHash('md5').update(readFileSync(p)).digest('hex'); }
function sha256(p){ return createHash('sha256').update(readFileSync(p)).digest('hex'); }

const template = readFileSync(TEMPLATE, 'utf8');
if (!template.includes('/*OG:TOKENS*/')) die(`${TEMPLATE} 里没有 /*OG:TOKENS*/ 槽 —— 色板注入这一步已经不存在了，卡面上的色就成了没人管的孤儿`);
const tokens = readTokens();

const scratch = mkdtempSync(join(tmpdir(), 'mistwood-og-build-'));
console.log(`  模板 ${TEMPLATE}`);
console.log(`  注入的色板（逐枚取自 base.css 的 :root）：${TOKENS.map(t => `${t}=${tokens[t]}`).join(' ')}`);
console.log(`  工作目录（构建出的页与临时图，都在仓库外）：${scratch}`);

/* 9a 站点级那枚先对账：同一套注入、同一个模板，与已提交的 public/og.png 逐字节比。
   对上了就同时买到三件证据——母题没被我这次改动碰坏、色板注入等价、字体真的落了地
   （字没落地的话字形与字距都会变，md5 不可能还相等）。 */
const siteHtml = join(scratch, '_site.html');
writeFileSync(siteHtml, buildHtml(template, tokens, null), 'utf8');

/* --probe=<文本>：只跑"装不装得下"那一趟，不截图不落位——改标题之前先问一句，也是变异自检
   朝宽/朝窄那两侧的门（喂一枚会撑爆的标题 ⇒ exit 1 且一张图都不写）。 */
if (has('probe')){
  const title = opt('probe');
  const probeHtml = join(scratch, '_probe.html');
  writeFileSync(probeHtml, buildHtml(template, tokens, title), 'utf8');
  const f = await fitPass(pathToFileURL(probeHtml).href, probeHtml, `探针标题「${title}」`);
  console.log(`  探针标题量到的读数：size=${f.size} lines=${f.lines} bottom=${f.bottom}/${f.floor} boxw=${f.boxw} wordw=${f.wordw}`);
  console.log('  （--probe 只量不画：没截图、没写盘）');
  process.exit(0);
}

let siteMd5 = null;
{
  const png = join(scratch, '_site.png');
  await shotPass(pathToFileURL(siteHtml).href, png, '站点级母题');
  siteMd5 = md5(png);
  const sniff = sniffPng(readFileSync(png), '站点级母题');
  console.log(`  母题重出：${sniff.width}×${sniff.height} ${sniff.depth}bit color=${sniff.color} md5=${siteMd5.slice(0, 8)}`);
  if (existsSync(SITE_PNG)){
    const committed = md5(SITE_PNG);
    if (siteMd5 !== committed){
      die('母题重出的那一张与 public/og.png 不是逐字节相同',
        `  临时那张 md5=${siteMd5.slice(0, 8)}，盘上的 md5=${committed.slice(0, 8)}\n`
        + '  两种可能：字体/网络这次和当年出图那次不一样（那逐篇卡也别出），或者这次动的就是母题本身\n'
        + '  后一种就回一句真话：public/og.png 该用 npm run og -- --site 重出，先确认新母题是要的再重出');
    }
    console.log('  ✓ 母题与 public/og.png 逐字节相同 ⇒ 注入等价、字体落地、这次改动没碰画出来的那一面');
  } else {
    console.log('  ⚠ public/og.png 不在盘上：母题那一格对账**没验到**，逐篇卡照常出，但"注入等价"这条本轮无据');
  }
}

/* 9b 逐篇：全部出完、全部复验，才一次落位 */
const { posts, drafts } = collect();
const only = opt('slug');
const picked = only ? posts.filter(p => p.id === only) : posts;
if (only && !picked.length) die(`--slug=${only} 不在已发布清单里（现有：${posts.map(p => p.id).join(', ')}；草稿：${drafts.join(', ') || '无'}）`);
console.log(`  稿件：${picked.length} 篇要出卡（已发布 ${posts.length}，草稿 ${drafts.length} 枚不出卡：${drafts.join(', ') || '无'}）`);

const staged = [];
for (const p of picked){
  const label = `${p.id}「${p.data.title}」`;
  const htmlPath = join(scratch, `${p.id}.html`);
  const url = pathToFileURL(htmlPath).href;
  writeFileSync(htmlPath, buildHtml(template, tokens, p.data.title), 'utf8');
  const f = await fitPass(url, htmlPath, label);
  console.log(`  量 ${label}：size=${f.size} lines=${f.lines} bottom=${f.bottom}/${f.floor} boxw=${f.boxw} wordw=${f.wordw} faces=${f.faces}/${f.facesloaded}`);
  let png = join(scratch, `${p.id}.png`);
  await shotPass(url, png, label);
  const pass1 = md5(png);
  let pass2 = null;
  if (has('twice')){
    /* 同一条命令跑两遍：两次逐字节相同才说明这张图不是碰运气画出来的（字体时机、断行、动画都停得住） */
    const again = join(scratch, `${p.id}.again.png`);
    await shotPass(url, again, `${label}（第二遍）`);
    pass2 = md5(again);
    if (pass2 !== pass1) die(`${label}：两遍出的图不一样（${pass1.slice(0, 8)} vs ${pass2.slice(0, 8)}）`,
      '  画面里有不确定的东西（未归零的动画、字体落地时机）——这种卡不能交，先让它在同一台机器上稳定复现');
  }
  const head = sniffPng(readFileSync(png), label);
  if (head.width !== W || head.height !== H) die(`${label}：帧头写的是 ${head.width}×${head.height}，不是 ${W}×${H}`);
  if (head.interlace !== 0) die(`${label}：interlace=${head.interlace}，社交卡的产物应当是一遍扫过的非交错图`);
  staged.push({ post: p, png, htmlPath, head, md5: pass1, twice: pass2, fit: f });
}

/* 逐张 GDI+：一次调用报全部，但判据是**逐张**的（少一行就是有一张没真解码过） */
const gdi = gdiVerify(staged.map(s => s.png), '逐篇卡');
const seen = new Map();
for (const s of staged){
  const key = s.png.replace(/\\/g, '/').toLowerCase();
  const row = gdi.byPath[key];
  const size = statSync(s.png).size;
  if (row.BYTES !== undefined && Number(row.BYTES) !== size) die(`${s.post.id}：GDI+ 数到 ${row.BYTES} 字节，Node 数是 ${size} —— 两边看的不是同一枚文件`);
  if (row.MD5 && row.MD5.toLowerCase() !== s.md5.slice(0, 8)) die(`${s.post.id}：GDI+ 的 md5 前 8 位是 ${row.MD5}，Node 算的是 ${s.md5.slice(0, 8).toUpperCase()} —— 复验对不上`);
  if (siteMd5 && s.md5 === siteMd5) die(`${s.post.id}：这张卡与站点级那张逐字节相同 —— 标题根本没进去`);
  const dup = seen.get(s.md5);
  if (dup) die(`${s.post.id} 与 ${dup} 的卡逐字节相同 —— 两篇不同的标题画出同一张图，等于标题没参与出图`);
  seen.set(s.md5, s.post.id);
}

/* 9c 落位 */
if (!existsSync(PUBLIC_OG)) mkdirSync(PUBLIC_OG, { recursive: true });
const table = [];
for (const s of staged){
  const dest = join(PUBLIC_OG, `${s.post.id}.png`);
  const old = existsSync(dest) ? md5(dest) : null;
  writeFileSync(dest, readFileSync(s.png));
  const after = md5(dest);
  if (after !== s.md5) die(`${s.post.id}：落位后回读的 md5 变了（${s.md5.slice(0, 8)} → ${after.slice(0, 8)}）`, '  拷贝这一步在骗人，或盘上有东西在改它');
  table.push({ id: s.post.id, title: s.post.data.title, dest, size: statSync(dest).size, md5: after, old,
               head: `${s.head.width}×${s.head.height} ${s.head.depth}bit color=${s.head.color}`,
               gdi: gdi.byPath[s.png.replace(/\\/g, '/').toLowerCase()], fit: s.fit, twice: s.twice });
}
console.log('');
for (const r of table){
  console.log(`  ✓ public/og/${r.id}.png  ${r.size} 字节  md5=${r.md5.slice(0, 8)}  GDI+ ${r.gdi.WIDTH}×${r.gdi.HEIGHT} ${r.gdi.PIXFMT}  字号=${r.fit.size} 行数=${r.fit.lines} 盒底=${r.fit.bottom}/${r.fit.floor}`);
  console.log(`      标题「${r.title}」${r.old ? (r.old === r.md5 ? '（与上一版逐字节相同：这篇的标题没改过）' : '（覆盖了上一版 ' + r.old.slice(0, 8) + '）') : '（新卡）'}${r.twice ? `  第二遍 md5=${r.twice.slice(0, 8)} 相同` : ''}`);
}
/* 9d 清单落笔：卡真的落位了才写，写的就是"这一张是按哪一句题面画的、落位后回读的那枚字节的 sha256"。
   为什么放在落位之后而不是之前：清单先写、图后炸，仓库里就留下一条"按新题面出过图"的假记录——
   判据拿它去比题面，比出来的是绿，而卡还是旧的。这一族与 die() 那句"本轮一张图都没写盘"是同一立场。
   全量跑（不带 --slug）顺手清掉稿子已经不在了的那几条：③ 那一格会点名盘上残留的 png，"重跑全量 og"那句红话
   说的就是这里——留着它们不会多拦住什么，只会让清单自己腐烂。--slug 只改那一条，其余原样。 */
function readPrevManifest(){
  if (!existsSync(MANIFEST)) return { cards: {} };
  let j;
  try { j = JSON.parse(readFileSync(MANIFEST, 'utf8')); }
  catch (e){ die(`${basename(MANIFEST)} 不是合法 JSON（${e.message}）—— 出图这一趟要往里落笔，读不回来就别往下写`,
    '  这一份的写者只有本脚本：手动编辑改坏了就 git checkout -- 它，再重跑 npm run og'); }
  if (!j || typeof j !== 'object' || !j.cards || typeof j.cards !== 'object')
    die(`${basename(MANIFEST)} 里没有 cards 那一格 —— 清单形状不是本脚本写的那一种，不猜`, '  要么改坏了，要么 tools/og-check.mjs 与本脚本的口径分叉了，两处一起改');
  return j;
}
function writeManifest(prev){
  const cards = prev.cards && typeof prev.cards === 'object' ? { ...prev.cards } : {};
  if (!only) for (const s of Object.keys(cards)) if (!posts.some(p => p.id === s)) delete cards[s];
  for (const r of table){
    cards[r.id] = { title: r.title, sha256: sha256(r.dest), bytes: statSync(r.dest).size, stamped: 'og-cards' };
  }
  /* generated 里不写日期：写了日期，"重跑一遍但题面没变"也会造出一枚清单 diff，
     而这一份文件的不变量恰恰是——题面与字节没变时它逐字节不动（og-check ④⑤ 量的就是这两枚值） */
  const json = JSON.stringify({ note: MANIFEST_NOTE, generated: MANIFEST_GENERATED, cards }, null, 2) + '\n';
  writeFileSync(MANIFEST, json, 'utf8');
  const back = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  if (!back.cards || Object.keys(back.cards).length !== Object.keys(cards).length)
    die(`${basename(MANIFEST)} 落位后回读的条目数变了（写 ${Object.keys(cards).length}，读回 ${back.cards ? Object.keys(back.cards).length : '没有 cards'}）`,
      '  与逐张卡那条"落位后回读 md5"同一个道理：写进去与读回来的不是同一份，就别当它存在');
  const stamped = Object.values(back.cards).filter(c => c.stamped === 'og-cards').length;
  console.log(`  ✓ ${basename(MANIFEST)}：本次落笔 ${table.length} 条（stamped=og-cards 共 ${stamped} 条／清单总条目 ${Object.keys(back.cards).length} 条）`);
}
writeManifest(readPrevManifest());

if (has('site')){
  writeFileSync(SITE_PNG, readFileSync(join(scratch, '_site.png')));
  console.log(`  ✓ public/og.png 重出（md5=${md5(SITE_PNG).slice(0, 8)}）——注意这是往 git 里改一枚二进制`);
}
/* 盘上有卡但没有对应的稿子：不静默删（产物要等复验之后才删这一族的纪律），只点名。 */
const live = new Set(posts.map(p => `${p.id}.png`));
const orphans = readdirSync(PUBLIC_OG).filter(f => f.endsWith('.png') && !live.has(f));
if (orphans.length) console.log(`  ⚠ public/og/ 里有 ${orphans.length} 枚没有稿子指它：${orphans.join(', ')} —— 站上的页面不会引用它，删不删由人决定，脚本不动手`);
console.log(`\n✓ og-cards：${table.length} 张逐篇卡出完并逐张复验过（Node 帧头 + GDI+ 解码 + 逐张 md5 互不相同）`);

for (const dir of profiles){ try { rmSync(dir, { recursive: true, force: true }); } catch { /* Edge 还在往里写：留着不判死 */ } }
process.exit(0);
