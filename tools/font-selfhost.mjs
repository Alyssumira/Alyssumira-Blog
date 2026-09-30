/* font-selfhost.mjs —— 拉丁两族（Fraunces / IBM Plex Mono）自托管的取回与复验
   用法  node tools/font-selfhost.mjs            # 复验档（默认，不联网）：
                                                 #   逐张核 public/fonts/** 的 SHA256 与字节数 ⇄ tools/font-selfhost.manifest.json
         node tools/font-selfhost.mjs --tables   # 复验再加一道：起 Python/fontTools 逐张读 woff2 帧头、numGlyphs、unitsPerEm
                                                 #   （⚠️ 这台机器的 `python3` 是商店占位符，rc=49 零输出——只用 D:/Python/Python312/python.exe，
                                                 #      缺 brotli 时 woff2 解不开：`…python.exe -m pip install brotli`）
         node tools/font-selfhost.mjs --fetch    # 重取档：按 src/data/site.js 那两枚 `q` 片段现拼 css2（UA 写死 Chrome 120＝woff2 档），
                                                 #   下载唯一文件、重写 manifest、把可贴进 base.css 的 @font-face 片段打到 stdout。
                                                 #   跑完把片段与 base.css「自托管」那节对 diff，人工决定落不落——工具不自动改写样式表。

   ── 为什么只有拉丁两族 ──────────────────────────────────────────────────────
   CJK 两族实测全量：Noto Serif SC 101 枚 5.75MB、Noto Sans SC 101 枚 4.31MB（同一趟下载数出来的）。
   全量自托管不现实，而**按当前稿件用过的字子集化**等于给下一篇稿子挖坑（发了就缺字，与 §12 假语义同族）——
   所以 CJK 维持远程 + 度量回退（见 base.css 的 `-fallback` 那节与规范 §3），这里只解绑拉丁两族：
   Fraunces 6 枚 321,500B ＋ IBM Plex Mono 15 枚 154,588B ＝ 476,088B（0.45MB），逐张记 SHA256。

   ── 口径（与 `q` 片段那条同源）────────────────────────────────────────────
   - 源：`FONT_HOST` 的镜像（默认 fonts.loli.net；本工具读同一份 site.js，env 开关语义一致，不改默认值）。
     取回来的就是远程 css2 当时会发的那批文件——base.css 的表逐字段照抄 css2 的响应（style/weight/unicode-range/display）。
   - 换域名那天的后果（写进 runbook）：⚠️ 2026-09-30 `card/cjk-subset` 之后口径变了——**站内四族全自托管**，
     `FONT_HOST` 换镜像对**产物里渲染出来的字一枚都不影响**（CJK 两族也进了 `/fonts/**`，见 base.css 的「自托管」节）；
     它现在只牵动两件事：本工具将来重新取拉丁那批时的源站，以及 `tools/og-card.html` 那枚手写 css2 URL（不进 dist/，
     后果登记在 base.css:104）。镜像挂了站内照旧在场。
   - 复验不是"下过了"，是**盘上对账**：manifest 里的 sha256/字节 ⇄ public/ 里的真文件逐张相等；
     --tables 那一档再把每枚文件的 woff2 签名、numGlyphs、unitsPerEm 读回来打印（"下下来的就是你引用的那个文件"）。
*/
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const FETCH = argv.includes('--fetch');
const TABLES = argv.includes('--tables');
const PY = 'D:\\Python\\Python312\\python.exe';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const SELF = ['Fraunces', 'IBM Plex Mono'];           // 自托管的两族（与 site.js 的 self:true 同一批）
const MANIFEST = join(ROOT, 'tools', 'font-selfhost.manifest.json');

function die(msg) { console.error(`✗ font-selfhost：${msg}`); process.exit(1); }
const sha = buf => createHash('sha256').update(buf).digest('hex');
const slug = fam => fam.toLowerCase().replace(/\s+/g, '-');

/* ---------- 取回 ---------- */
if (FETCH) {
  const { fonts, FONT_HOST } = await import('../src/data/site.js');
  const mine = fonts.filter(f => SELF.includes(f.name));
  if (mine.length !== SELF.length) die(`site.js 的 fonts 里缺自托管族（找到 ${mine.map(f => f.name).join('/')}）`);
  const url = `${FONT_HOST}/css2?${mine.map(f => 'family=' + f.q).join('&')}&display=swap`;
  console.error(`→ ${url}`);
  const css = await fetch(url, { headers: { 'User-Agent': UA } }).then(r => { if (!r.ok) die(`css2 回 ${r.status}`); return r.text(); });
  /* 逐块解析：子集名注释 + @font-face 描述符，一个字段都不重新发明 */
  const blocks = [];
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const body = m[2];
    const g = k => (body.match(new RegExp(`${k}:\\s*([^;]+);`)) || [])[1]?.trim();
    const u = g('src').match(/url\((https:[^)]+)\)/)?.[1];
    if (!u) die('一枚 @font-face 的 src 里没解出 https url（镜像返回的形状变了，停下别看半截）');
    blocks.push({ tag: m[1], family: g('font-family').replace(/['"]/g, ''), style: g('font-style'), weight: g('font-weight'),
      display: g('font-display'), range: (body.match(/unicode-range:\s*([^;]+);/) || [])[1].trim(), url: u });
  }
  if (!blocks.length) die('css2 响应里一枚 @font-face 都没解析到');
  for (const f of SELF) if (!blocks.some(b => b.family === f)) die(`css2 响应里没有 ${f}`);
  const urls = [...new Set(blocks.map(b => b.url))].sort();
  const files = urls.map(u => {
    const b0 = blocks.find(b => b.url === u);
    const seg = new URL(u).pathname.split('/').filter(Boolean);
    const base = seg[seg.length - 1].replace(/\.woff2$/i, '').replace(/[^\w.-]/g, '_') + '.woff2';
    return { url: u, dir: `public/fonts/${slug(b0.family)}`, name: base };
  });
  if (new Set(files.map(f => f.dir + '/' + f.name)).size !== files.length) die('同族内文件名撞车——重取档不许悄悄覆盖，看 URL 再来一轮');
  const entries = [];
  for (const f of files) {
    const out = join(ROOT, f.dir, f.name);
    mkdirSync(dirname(out), { recursive: true });
    let buf;
    if (existsSync(out)) buf = readFileSync(out);                    // 已在盘上就不重下（sha 对账照样跑）
    else {
      const r = await fetch(f.url, { headers: { 'User-Agent': UA } });
      if (!r.ok) die(`${f.url} 回 ${r.status}——半截不算取到，整轮停下`);
      buf = Buffer.from(await r.arrayBuffer());
      if (buf.subarray(0, 4).toString('ascii') !== 'wOF2') die(`${f.url} 取回的文件帧头不是 wOF2（拿到的是别的东西）`);
      writeFileSync(out, buf);
    }
    entries.push({ file: `${f.dir}/${f.name}`, url: f.url, bytes: buf.length, sha256: sha(buf),
      families: [...new Set(blocks.filter(b => b.url === f.url).map(b => b.family))].join(','),
      uses: blocks.filter(b => b.url === f.url).map(b => `${b.tag}/${b.style}${b.weight}`).sort().join(' ') });
  }
  writeFileSync(MANIFEST, JSON.stringify({ note: '由 tools/font-selfhost.mjs --fetch 生成；复验＝node tools/font-selfhost.mjs', host: FONT_HOST, files: entries }, null, 1) + '\n');
  const lines = blocks.map(b => {
    const f = files.find(x => x.url === b.url);
    return `@font-face{font-family:'${b.family}';font-style:${b.style};font-weight:${b.weight};font-display:${b.display};src:url("/fonts/${slug(b.family)}/${f.name}") format("woff2");unicode-range:${b.range};}`;
  });
  console.log(`/* 由 --fetch 现生成（${blocks.length} 块 / ${files.length} 枚文件）——贴进 base.css 前先与现有节 diff */\n` + lines.join('\n'));
  console.error(`✓ 取了 ${files.length} 枚文件，合计 ${entries.reduce((a, e) => a + e.bytes, 0)} 字节`);
  process.exit(0);
}

/* ---------- 复验 ---------- */
if (!existsSync(MANIFEST)) die(`没有 ${MANIFEST}（先 --fetch 一次）`);
const man = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let bad = 0, total = 0, n = 0;
for (const e of man.files) {
  const p = join(ROOT, ...e.file.split('/'));
  if (!existsSync(p)) { console.error(`✗ 盘上缺 ${e.file}`); bad++; continue; }
  const buf = readFileSync(p);
  const h = sha(buf);
  const ok = buf.length === e.bytes && h === e.sha256 && buf.subarray(0, 4).toString('ascii') === 'wOF2';
  if (!ok) { console.error(`✗ ${e.file}：字节 ${buf.length}/${e.bytes}、sha256 ${h.slice(0, 16)}${h === e.sha256 ? ' ✓' : ' ✗ 应为 ' + e.sha256.slice(0, 16)}`); bad++; continue; }
  total += buf.length; n++;
}
console.log(`SHA256/字节 复验：${n}/${man.files.length} 张全对${bad ? `，✗ 对不上 ${bad} 张` : ''}；合计 ${total} 字节`);
if (bad) process.exit(1);
if (TABLES) {
  const tmpPy = join(ROOT, 'tools', '.tmp-tables.py');
  writeFileSync(tmpPy, [
    'import json, sys, os',
    'from fontTools.ttLib import TTFont',
    'root, manpath = sys.argv[1], sys.argv[2]',
    'man = json.load(open(manpath, encoding="utf-8"))',
    'ok = True',
    'for e in man["files"]:',
    '    p = os.path.join(root, *e["file"].split("/"))',
    '    f = TTFont(p)',
    '    sig = open(p, "rb").read(4).decode("ascii")',
    '    up = f["head"].unitsPerEm; ng = f["maxp"].numGlyphs',
    '    print(f"{e[\'file\']}  sig={sig} numGlyphs={ng} unitsPerEm={up}")',
    '    if sig != "wOF2" or not ng or not up: ok = False',
    'sys.exit(0 if ok else 1)',
  ].join('\n'));
  const r = spawnSync(PY, [tmpPy, ROOT, MANIFEST], { encoding: 'utf8' });
  rmSync(tmpPy, { force: true });
  if (r.status !== 0) die('fontTools 复验没通过/起不来：' + ((r.stderr || '') + (r.stdout || '')).slice(0, 400) + '\n  ⚠️ rc=49 且零输出＝误用 python3 商店占位符的签名；本工具只认 ' + PY);
  console.log(r.stdout.trim());
  console.log('✓ fontTools 逐张读回：帧头 wOF2、numGlyphs/unitsPerEm 全部拿到');
} else {
  console.log('（加 --tables 会再逐张用 fontTools 读 numGlyphs/unitsPerEm 对账）');
}
