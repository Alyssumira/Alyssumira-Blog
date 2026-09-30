/* browser-bin.mjs —— 站内**唯一一处**"这轮用哪枚浏览器"的判定（2026-09-30 `card/browserbin`）
   用法  import { resolveBrowser } from './browser-bin.mjs';
         const B = await resolveBrowser({ flag: opt('browser') || opt('edge'), label: 'search-check' });
         if (!B) die(...);                     // 交回 null ⇒ 调用方按自己原有的"不降级、不跳过"口径红
         node tools/browser-bin.mjs            // 只想看"这轮会选中谁"时直接跑这一条

   ── 为什么要有这一枚（第 0 问：判据读得到被测对象吗？）────────────────────────
   六把尺子（`search-check`／`runtime-check`／`pixel-probe`／`visited-probe`／`font-fallback-check`／`og-cards`）
   过去各自复制一份 `EDGE_CANDIDATES` + `existsSync`，"找到了浏览器"这一步读的是**文件在不在盘上**。
   本机 2026-09-30 实测：`msedge 154.0.4258.37 --headless=new --dump-dom` 交回 **rc=0、stdout 0 字节**
   （`--version` 也打印不出东西）——文件当然在盘上，于是"找到了浏览器"照样绿，而三格浏览器判据
   拿到的永远是空串 ⇒ `一档都没量成交回来的数 ⇒ 这一格的判据正在空转`。
   ⇒ 判据必须读**被测对象本身**：这一枚模块成立的最低要求是"**这把尺子的靶在场**"，也就是
   **交回的 DOM 里必须有只有 JS 跑过才会出现的那个标记**（`#probe` 的文本被脚本改成了 `PROBE_OK`）。
   空串判不通；"静态 HTML 原样交回但标记不在"也判不通（那正是 `--virtual-time-budget` 没推进脚本、
   或引擎压根不执行 JS 的死法）。`existsSync` 从来不是可用性的证据，这里一个字都不靠它当判据。

   ── 候选顺序（前面命中就不再探后面）────────────────────────────────────────
     ① 命令行 `--browser=`／兼容旧的 `--edge=`（两个名字都认；调用方传进来的 flag 优先）
     ② 环境变量 `MISTWOOD_BROWSER`
     ③ headless shell：`%LOCALAPPDATA%/ms-playwright/chromium_headless_shell-〈后缀〉/chrome-headless-shell-win64/chrome-headless-shell.exe`
        —— **目录是 glob 出来的**（代码里用的是"以 chromium_headless_shell- 开头"这一条），
        `-1234` 那枚后缀 playwright 升版会改，写死就是给自己埋雷
     ④ 用户 Chrome：`%LOCALAPPDATA%/Google/Chrome/Application/chrome.exe`
     ⑤ playwright 完整版 chromium：`%LOCALAPPDATA%/ms-playwright/chromium-〈后缀〉/chrome-win64/chrome.exe`
     ⑥ msedge 三枚路径**放最后**：用户 2026-09-30 的"别用 edge"落在**顺序**上，不是落在"删掉 Edge 支持"
        —— 别的机器上 Edge 可能正是唯一能用的，那一枚候选得留着
   每一枚都要过能力探针才算"可用"，全不通 ⇒ 交回 `null`（调用方自己红，这里绝不替它决定"跳过"）。

   ── 三枚真踩过的坑，钉在这里 ────────────────────────────────────────────────
   ⚠️ **超时的那一枚必须连子树杀掉**，不然留孤儿进程（playwright 完整版 chromium 在这一档就是挂住不退出，
      实测会留下 11 枚进程）。win32 走 `taskkill /F /T /PID`——**单斜杠**：Node 的 `spawn` 不经过 MSYS，
      没有路径转换，`//F` 反而被 taskkill 自己判成"无效参数/选项"（当场实测：`//F` → `code 1`，`/F` → 正常执行）。
      只杀**自己 spawn 出来的那一棵**，按 PID 树杀，绝不按 IMAGENAME 通杀（这台机器用户自己的 Chrome 有 25+ 枚在跑）。
   ⚠️ **profile 是一次的**：`mkdtemp(tmpdir())`，探完删。⚠️ `/tmp` 在 Git Bash 与 Node 里不是同一个路径
      （node 眼里的 `/tmp` 是本仓 §5 那枚故障签名点名的 `D:\tmp`），所以一律用 Node 的 `os.tmpdir()`。
      探针的临时 HTML 也落在同一枚一次性目录里，**不进仓库、不进 `dist/`**。
   ⚠️ **Windows 上 `spawn('x.cmd')` 直接抛 EINVAL**（Node 24 实测 `spawn EINVAL`，因为 .cmd/.bat 需要 shell）。
      `.cmd`／`.bat` 包装在别的脚本里是**合法的浏览器替身形状**（有人用 .cmd 转发到真浏览器），所以这里
      按扩展名带 `shell: true`，其余仍直 spawn；两档都测过，见下面 probeOne 的注释。
*/
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROBE_MARKER = 'PROBE_OK';        // 只有脚本真的跑过才存在的产物
export const PROBE_PENDING = 'PROBE_PENDING';  // 静态 HTML 里的起手文本：还在原位 ⇒ JS 没跑
/* 硬超时：调用方口径是 ≤25s。取 20s 是留 5s 给"进程收尾 + profile 删除"，不是随手写的整数。 */
export const PROBE_TIMEOUT_MS = 20000;

const argvOf = () => process.argv.slice(2);
const argOf = n => { const h = argvOf().find(a => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };

/* ---------- 1. 候选清单 ---------- */
const ls = dir => { try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; } };
/* 版本号后缀大的排前面（`chromium-1234` 比 `chromium-1181` 新）；没有数字的排最后、按名字稳定。 */
/* 版本号后缀大的排前面（`chromium-1234` 比 `chromium-1181` 新）；没有数字的排最后、按名字稳定。
   ⚠️ 前缀是**含连字符**的：`chromium-` 不会命中 `chromium_headless_shell-1234`（`_` ≠ `-`），
   所以 ③ 与 ⑤ 两档的 glob 天然不重叠，不需要额外的排除项。 */
function versionedDirs(root, prefix) {
  return ls(root)
    .filter(d => d.isDirectory() && d.name.startsWith(prefix))
    .map(d => ({ p: join(root, d.name), n: Number((/(\d+)$/.exec(d.name) || [])[1] ?? -1), name: d.name }))
    .sort((a, b) => b.n - a.n || (a.name < b.name ? -1 : 1))
    .map(x => x.p);
}
/* 只在 root 与 root 的直接子目录里找（不递归整棵树：那会把 playwright 的 .links 之类翻进来）。 */
function exeIn(dir, names) {
  for (const n of names) { const p = join(dir, n); if (existsSync(p)) return p; }
  for (const d of ls(dir)) if (d.isDirectory()) for (const n of names) { const p = join(dir, d.name, n); if (existsSync(p)) return p; }
  return null;
}
const EXE = base => process.platform === 'win32' ? [`${base}.exe`, base] : [base, `${base}.exe`];
const PW_ROOT = () => process.env['PLAYWRIGHT_BROWSERS_PATH']
  || (process.env['LOCALAPPDATA'] && join(process.env['LOCALAPPDATA'], 'ms-playwright'))
  || (process.env['HOME'] && join(process.env['HOME'], '.cache', 'ms-playwright'));

/* 候选 = 一枚一枚"来源 + 路径"，顺序就是这一张表；探不到就往下走。 */
export function browserCandidates(flag = null) {
  const out = [];
  const push = (bin, source) => { if (bin) out.push({ bin, source }); };
  const LA = process.env['LOCALAPPDATA'];
  push(flag && resolve(flag), '① 命令行 --browser=／--edge=');
  push(process.env['MISTWOOD_BROWSER'] && resolve(process.env['MISTWOOD_BROWSER']), '② 环境变量 MISTWOOD_BROWSER');
  const pw = PW_ROOT();
  if (pw) {
    for (const d of versionedDirs(pw, 'chromium_headless_shell-')) push(exeIn(d, EXE('chrome-headless-shell')), `③ headless shell（glob ${d.split(/[\\/]/).slice(-2).join('/')}）`);
  }
  if (LA) push(join(LA, 'Google', 'Chrome', 'Application', 'chrome.exe'), '④ 用户 Chrome（%LOCALAPPDATA%\\Google\\Chrome）');
  if (pw) {
    for (const d of versionedDirs(pw, 'chromium-')) push(exeIn(d, EXE('chrome')), `⑤ playwright 完整版 chromium（glob ${d.split(/[\\/]/).slice(-1)[0]}）`);
  }
  /* ⑥ Edge 在末位是**顺序**上的裁决，不是删支持：用户 2026-09-30 当面"别用 edge"，
     而本机那枚故障签名（rc=0/0 字节）正是这一档现在不可用的原因；别的机器上它可能仍是唯一出路。 */
  for (const [dir, source] of [
    [process.env['PROGRAMFILES'], '⑥ msedge（%PROGRAMFILES%）'],
    [process.env['PROGRAMFILES(X86)'], '⑥ msedge（%PROGRAMFILES(X86)%）'],
    [LA, '⑥ msedge（%LOCALAPPDATA%）'],
  ]) if (dir) push(join(dir, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), source);

  const seen = new Set();
  return out.filter(c => (c.bin = resolve(c.bin), !seen.has(c.bin) && (seen.add(c.bin), true)));
}

/* ---------- 2. 能力探针 ---------- */
/* 标记**不写死在静态 HTML 里**：脚本把 `['PROBE','OK'].join('_')` 拼出来再塞进 #probe。
   所以"引擎把 HTML 原样交回、但一个字都没执行"那种读数里根本不存在 `PROBE_OK` 这三枚字符的连续体
   ——探针判的确实是"JS 跑过之后才存在的产物"，不是"文件非空"，也不是"dump 里有这个单词"。 */
function probeHtml() {
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>browser-bin probe</title></head>
<body><p id="probe">${PROBE_PENDING}</p>
<script>document.getElementById('probe').textContent = ['PROBE', 'OK'].join('_');</script>
</body></html>\n`;
}
/* 认的是"#probe 那个元素的文本节点就是标记"这一整段序列化结果，不是"整篇 dump 里含这七个字符"——
   后者会被一句注释、一段内嵌的 JSON 读数糊过去（那正是本卡要堵的"长得像跑过"）。 */
const MARKER_RE = /<p[^>]*\bid=["']?probe["']?[^>]*>\s*PROBE_OK\s*<\/p/i;

/* 与六把尺子现在用的那组 flag 同一套（少了 --window-size 的宽度由各调用方自定，这里给 800）：
   靶要以"尺子真正用它的那副样子"来探，多一个 flag 就少一分对得上。 */
export const PROBE_FLAGS = (profile, fileUrl) => [
  '--headless=new', `--user-data-dir=${profile}`, '--disable-gpu', '--hide-scrollbars',
  '--no-first-run', '--no-default-browser-check', '--window-size=800,900',
  '--virtual-time-budget=3000', '--dump-dom', fileUrl,
];

function wait0(ms) { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { } }
function rmdirRetry(dir) {
  for (let i = 0; i < 6; i++) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* 引擎还在往里写 */ }
    wait0(150 + i * 150);
    if (!existsSync(dir)) return true;
  }
  return !existsSync(dir);
}
/* 只杀自己 spawn 出来的那一棵。win32 用 taskkill /F /T /PID（单斜杠，见文件头那条实测）；
   其余平台直杀。整段包 try/catch：探针不能因为收尾失败而把自己判成通或判成红以外的第三种样子。 */
function killTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    try {
      const k = spawn('taskkill', ['/F', '/T', '/PID', String(pid)], {
        windowsHide: true, stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' },
      });
      k.on('error', () => { /* 没有这枚 PID 就是已经退了 */ });
      return;
    } catch { /* 落回直杀 */ }
  }
  try { process.kill(pid, 'SIGKILL'); } catch { /* 已经退了 */ }
}

/* 一枚候选的探针：临时 HTML + 一次性 profile + 那组 flag + 硬超时。
   返回 { ok, ms, reason }；reason 在不通时点名是哪种死法（0 字节／没标记／spawn 抛了／超时）。 */
export function probeBrowser(bin, { label = 'probe', timeoutMs = PROBE_TIMEOUT_MS } = {}) {
  return new Promise(resolveP => {
    const t0 = Date.now();
    let dir;
    try { dir = mkdtempSync(join(tmpdir(), `mistwood-browser-probe-${label}-`)); }
    catch (e) { return resolveP({ ok: false, ms: 0, reason: `临时目录都建不出来（${e.message}）；tmpdir=${tmpdir()}` }); }
    const profile = join(dir, 'profile');
    const html = join(dir, 'probe.html');
    const finish = r => {
      r.ms = Date.now() - t0;
      rmdirRetry(dir);
      resolveP(r);
    };
    try { mkdirSync(profile, { recursive: true }); writeFileSync(html, probeHtml(), 'utf8'); }
    catch (e) { return finish({ ok: false, reason: `探针自己的临时文件写不下去（${e.message}）` }); }

    const args = PROBE_FLAGS(profile, pathToFileURL(html).href);
    /* .cmd/.bat 在 Windows 上不能直 spawn（实测 `spawn EINVAL`）；带 shell:true 让它作为"浏览器替身"
       仍然可探（有人就是把真浏览器包在一枚 .cmd 里转发的）。其余一律直 spawn。
       ⚠️ shell:true 时**不传 args 数组**：Node 只拼接不转义（DEP0190 警告的就是这件事），
       自己逐枚加引号拼一条命令行——参数全是本模块生成的固定 flag + 临时路径，没有外部输入。 */
    const needsShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(bin);
    let child;
    try {
      child = needsShell
        ? spawn([bin, ...args].map(a => `"${a}"`).join(' '), { cwd: tmpdir(), windowsHide: true, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
        : spawn(bin, args, { cwd: tmpdir(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { return finish({ ok: false, reason: `spawn 抛了：${e.code || e.message}` }); }

    let stdout = '', stderr = '', killed = false, done = false;
    child.stdout.on('data', d => { stdout += d; if (stdout.length > 4_000_000) stdout = stdout.slice(0, 4_000_000); });
    child.stderr.on('data', d => { stderr = (stderr + d.toString('utf8')).slice(-1200); });
    child.on('error', e => { if (!done) { done = true; killTree(child.pid); finish({ ok: false, reason: `spawn ${bin}：${e.code || e.message}` }); } });
    const timer = setTimeout(() => {
      if (done) return; done = true; killed = true;
      killTree(child.pid);
      finish({ ok: false, reason: `${timeoutMs / 1000}s 硬超时，连子树杀掉了（挂住不退出的引擎就死在这一档）` });
    }, timeoutMs);
    child.on('close', code => {
      if (done) return; done = true; clearTimeout(timer);
      if (killed) return;
      if (!stdout.trim()) {
        return finish({ ok: false, reason: `rc=${code} 但交回 0 字节 —— 就是本机 msedge 那枚故障签名，existsSync 挡不住这种死法${stderr ? `；stderr: ${stderr.slice(-120)}` : ''}` });
      }
      if (MARKER_RE.test(stdout)) return finish({ ok: true, reason: `交回 ${stdout.length} 字节，#probe 里是 ${PROBE_MARKER}（JS 确实跑过）` });
      const pending = stdout.includes(PROBE_PENDING);
      return finish({ ok: false, reason: `交回 ${stdout.length} 字节，但 #probe 里没有 ${PROBE_MARKER}${pending ? `（还是起手文本 ${PROBE_PENDING} ⇒ 静态 HTML 交回来了、脚本一个字都没跑）` : '（连 #probe 那一段都没交回来）'} —— 空转的尺子就这么长` });
    });
  });
}

/* ---------- 3. 对外的唯一入口 ---------- */
/**
 * @param {{flag?:string|null, label?:string, timeoutMs?:number, log?:(s:string)=>void}} o
 *   `flag`＝命令行 `--browser=`／兼容旧的 `--edge=`（调用方把自己那枚 opt 传进来；没传就自己扫 process.argv，两个名字都认）。
 *   `log`＝逐枚探针的实时回调。默认**不打印**——打印归调用方（见 browserReadout），免得同一行出两遍。
 * @returns {Promise<null|{bin,note,source,ms,tried}>} 命中 ⇒ `{bin, note}`；**全不通 ⇒ `null`**，
 *   由调用方按自己原有的"不降级、不跳过"口径 die——这一枚模块绝不替门禁决定"跳过"。
 */
export async function resolveBrowser({ flag = null, label = 'probe', timeoutMs = PROBE_TIMEOUT_MS, log = null } = {}) {
  const say = log || (() => { });
  const list = browserCandidates(flag ?? argOf('browser') ?? argOf('edge'));
  const tried = [];
  for (const c of list) {
    if (!existsSync(c.bin)) { tried.push({ ...c, ok: false, ms: 0, reason: '文件不在盘上' }); say(`       跳过 ${c.source} ${c.bin} —— 文件不在盘上`); continue; }
    const r = await probeBrowser(c.bin, { label, timeoutMs });
    tried.push({ ...c, ...r });
    if (r.ok) return { bin: c.bin, source: c.source, ms: r.ms, tried, note: `${c.source} · 探针 ${(r.ms / 1000).toFixed(2)}s · ${r.reason}` };
    say(`       跳过 ${c.source} ${c.bin} —— ${r.reason}`);
  }
  return null;
}

/* 打印用：选中那一枚 + 被跳过候选各一行（只有真被探过的才有一行，别刷屏）。两把尺子与四把探针都走这一枚，
   "用的是哪枚路径、它为什么排到前面"与"前面那几枚为什么不算"要在同一处生成。 */
export function browserReadout(B) {
  if (!B || !B.bin) return ['浏览器 ——（一枚候选都没探过靶 ⇒ 浏览器那几格没有对象，按"没跑"算，不许报成已验到）'];
  const skipped = (B.tried || []).filter(t => !t.ok);
  const lines = [`浏览器 ${B.bin}`, `        为什么是它：${B.note}`];
  for (const t of skipped) lines.push(`        跳过 ${t.source} ${t.bin} —— ${t.reason}`);
  return lines;
}
/* 全不通时给 die 文案用的"试过哪些"清单（逐枚带一句为什么不通；顶上那批路径本来就是它）。 */
export function triedList(tried) {
  return (tried || []).map(t => `${t.bin}（${t.reason}）`).join(' / ');
}

/* ---------- 4. CLI：node tools/browser-bin.mjs —— 只想看这轮选中谁、为什么 ---------- */
const invokedAsCli = process.argv[1]
  && import.meta.url.toLowerCase() === pathToFileURL(resolve(process.argv[1])).href.toLowerCase();
if (invokedAsCli) {
  /* --selftest＝能力探针自己的两侧格子：交回空串的引擎、只交回静态 HTML 的引擎、挂住不退出的引擎都必须判**不通**，
     真引擎必须判**通**。假浏览器落在这里的临时目录里（不进仓库、不进 dist/）：
     ⚠️ Windows 上 `spawn('x.cmd')` 直抛 EINVAL（Node 24 实测），所以 .cmd 包装一律带 `shell: true`——
     这就是"退路"那一枚：`.cmd` 转发到 `node <一枚 .mjs>`，由那枚 .mjs 决定交回什么读数。
     朝宽那一格（把 `PROBE_OK` 的要求摘掉）不在这里——那要手改本文件跑一次，读数登记在规范 §16 与部署文档。 */
  if (process.argv.includes('--selftest')) {
    const dir = mkdtempSync(join(tmpdir(), 'mistwood-browser-bin-selftest-'));
    const mk = (name, body) => { const p = join(dir, name); writeFileSync(p, body, 'utf8'); return p; };
    const markFile = join(dir, 'hang.pid');
    const runner = mk('fake-runner.mjs', `import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
const mode = process.env.MISTWOOD_FAKE_MODE;
const last = process.argv[process.argv.length - 1];
if (mode === 'empty') { /* 交回 0 字节、rc=0：本机 msedge 那枚故障签名 */ }
else if (mode === 'static') process.stdout.write(readFileSync(fileURLToPath(last), 'utf8'));  // 静态 HTML 原样吐 ⇒ 脚本一个字没跑
else if (mode === 'hang') { writeFileSync(process.env.MISTWOOD_FAKE_MARK, String(process.pid)); setTimeout(() => { }, 9e5); }
`);
    /* .cmd 只做"设环境变量 + 转给 node"，读数由那枚 .mjs 决定（见上面那条 EINVAL 实测）。 */
    const fakeCmd = mode => mk(`${mode}.cmd`,
      `@echo off\r\nset MISTWOOD_FAKE_MODE=${mode}\r\nset MISTWOOD_FAKE_MARK=${markFile}\r\n"${process.execPath}" "${runner}" %*\r\nexit /b 0\r\n`);
    const cases = [
      { bin: fakeCmd('empty'), want: false, why: '假浏览器交回空串（本机 msedge 的读数形状）' },
      { bin: fakeCmd('static'), want: false, why: '假浏览器交回静态 HTML、#probe 里没有标记（＝JS 没跑）' },
      { bin: fakeCmd('hang'), want: false, why: '假浏览器挂住不退出（playwright 完整版那一档的死法）⇒ 硬超时必须把它连子树杀掉', timeoutMs: 4000 },
    ];
    let bad = 0;
    for (const c of cases) {
      const r = await probeBrowser(c.bin, { label: 'selftest', timeoutMs: c.timeoutMs || 8000 });
      if (r.ok !== c.want) bad++;
      console.log(`  ${r.ok === c.want ? '✓' : '✗'} ${c.why}\n      探针判=${r.ok ? '通' : '不通'} —— ${r.reason}`);
      if (c.bin === cases[2].bin) {
        wait0(1500);
        const pid = existsSync(markFile) ? readFileSync(markFile, 'utf8').trim() : null;
        let alive = false;
        try {
          const k = spawnSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], { encoding: 'utf8' });
          alive = !!pid && /node\.exe/i.test(k.stdout || '');
        } catch { /* 查不到就当没活着，但下面仍打 PID */ }
        if (alive) { bad++; console.log(`      ✗ 超时之后那棵子树还活着（PID ${pid} 仍在 tasklist 里）—— 会留孤儿进程`); }
        else console.log(`      ✓ 超时后按 PID 树杀干净（tasklist 查不到 PID ${pid} 那枚 node.exe）`);
      }
    }
    const real = await resolveBrowser({ label: 'selftest' });
    if (!real) { bad++; console.log('  ✗ 真引擎也没探过靶（这一条红的是候选清单，不是探针的判据）'); }
    else console.log(`  ✓ 真引擎判通（探针把"有靶"读成了"有靶"）\n      ${real.note}`);
    for (let i = 0; i < 6 && existsSync(dir); i++) { try { rmSync(dir, { recursive: true, force: true }); } catch { } wait0(200); }
    if (bad) { console.error(`\n✗ browser-bin --selftest 红 ${bad} 条：能力探针把"没有靶"读成了"有靶"（或反之）`); process.exit(1); }
    console.log('\n✓ 能力探针两侧都对：空串、"静态 HTML 里没标记"、挂住不退出三种都判不通，真引擎判通');
    process.exit(0);
  }
  const B = await resolveBrowser({ label: argOf('label') || 'cli', timeoutMs: Number(argOf('timeout')) || PROBE_TIMEOUT_MS, log: s => console.log(s) });
  if (!B) { console.error('\n✗ 六档候选全不通（上面逐枚点名了为什么）—— 交回 null，调用方按"没跑"的口径红，不降级不跳过'); process.exit(1); }
  console.log(`\n✓ 这轮用的浏览器：${B.bin}\n  ${B.note}`);
  process.exit(0);
}
