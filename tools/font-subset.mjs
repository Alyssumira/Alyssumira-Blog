/* font-subset.mjs —— CJK 两族的可变字体子集：取回、在册、复验、产物级覆盖判据（规范 §3.3 末与 §12「随滚动微调字重」那一格）
   用法  node tools/font-subset.mjs --make              # 生成档：从产物 dist/ 的可见文本取码点并集，
                                                         #   用本机可变源脸（HKLM 的 Noto{Serif,Sans}SC-VF.ttf，只读）
                                                         #   经 fontTools 切出**保留 wght 轴**的 woff2 子集，落进
                                                         #   public/fonts/noto-*-sc-subset/**，重写 tools/font-subset.manifest.json。
                                                         #   ⚠️ 码点口径＝dist 产物（html/js/json/xml，og 的 PNG 不算——那是栅格化像素不走 face），
                                                         #      不是 src 源文件：源口径实测漏 259 枚屏上真会画的汉字。
              node tools/font-subset.mjs --make --drop=<hex[,hex…]>   # 变异自检专用：从码点集里剔字（产物级红牙由 --check 负责）
              node tools/font-subset.mjs --make --instance=<wght值>   # 变异自检专用：先把源脸实例化成静态再切（拆掉 fvar，演示"轴关掉"）
              node tools/font-subset.mjs --verify        # 源码级复验（不联网、不读 dist）：manifest ⇄ 盘上逐张 sha256/字节/wOF2 帧头
              node tools/font-subset.mjs --check         # 产物级判据（gate 里排在 build 之后）：--verify 全部
                                                         #   ＋ dist 并集逐枚读回子集 cmap 做覆盖（缺字就红，报出缺哪几枚）
                                                         #   ＋ fvar 的 wght 轴必须在场（这条卡的存在理由就是那枚轴）
                                                         #   ⚠️ dist 缺席 = 尺子读不到被测对象 ⇒ 当场红并指路先 build，不许空转装绿（§16 铁律）。

   ── 为什么值得动 §12·「随滚动微调字重」 那格（2026-09-30 实测，三组读数都在规范那一格里）──────────────
   971 原句说"镜像站发的是静态字重、没有可变 wght 轴"——**文件层是错的，结论层是对的**：
   loli.net 的 css2 每张 slice 文件本身就带 fvar wght 200–900（现取一枚 .110 读回），
   但 303 个 @font-face 用**单值描述符** 400/600/700 把同一批文件钉死——单值描述符把轴 clamp 在钉值上，
   `font-variation-settings:'wght' 550` 在这类 face 上读平（canvas 300/400/550 三行逐位相同；700 是合成假粗不是轴）。
   解法只有把 face 的注册权拿到自己手里：自托管子集 + `font-weight:200 900` **区间描述符** ⇒ 四档读数 4/4 互异。
   子集可行性（本卡生死格，先测）：**同一批码点跑两次 pyftsubset 产出逐字节相同**——
   serif sha 450f6026…、sans sha 7d58c339… 两跑全等；head.created/modified 原样继承源脸，brotli 定参，无时间戳无随机表序。

   ── 口径与边界 ──────────────────────────────────────────────────────────────
   - 授权：两枚源脸都是 Google Fonts Noto 项目的 SIL OFL 1.1（与拉丁两族同一登记法——manifest 记 url/sha256 出处，
     站内不留二进制原件，全量 VF 25.1MB/17.8MB 也不进 git；只进子集 269,080B＋208,272B）。
   - 拉丁两族（public/fonts/fraunces、ibm-plex-mono）与 tools/font-selfhost.* 这一张卡一枚都不碰。
   - site.js 的 FONT_FILE_HOSTS throw 判据一枚不动；本工具改的是 site.js 的 `fonts[]` 旗与 base.css 的 face 表。
   - 子集把**产物里出现的一切码点**（拉丁、数字、标点、汉字）都收进来——只切 CJK 会把正文里走 Noto Serif SC
     的拉丁/数字（essay.css 那层"全站唯一数字不走等宽"的度量）掉进回退栈，§3.2 那笔等宽账会连坐。
   - 已知波及（登记不修）：tools/font-fallback-check.mjs 的乙档靠摘 css2 <link> 造"远程取不到"，
     四族全解绑后产物里不再有那枚 link——它那两档的语义要由下一轮改成"404 站内子集文件"才读得到新形状。
*/
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const argv = process.argv.slice(2);
const MODE = argv.includes('--make') ? 'make' : argv.includes('--verify') ? 'verify' : argv.includes('--check') ? 'check' : null;
if (!MODE) die('没给模式：--make / --verify / --check（用法见文件头）');
const dropArg = (argv.find(a => a.startsWith('--drop=')) || '').slice(7);
const instArg = (argv.find(a => a.startsWith('--instance=')) || '').slice(11);
const MANIFEST = join(ROOT, 'tools', 'font-subset.manifest.json');
const PY_CANDIDATES = [process.env.FONT_SUBSET_PY, 'D:\\Python\\Python312\\python.exe', 'python', 'python3'].filter(Boolean);
const FAM = [
  { family: 'Noto Serif SC', src: 'C:/Windows/Fonts/NotoSerifSC-VF.ttf', dir: 'public/fonts/noto-serif-sc-subset', file: 'noto-serif-sc-wght-subset.woff2' },
  { family: 'Noto Sans SC',  src: 'C:/Windows/Fonts/NotoSansSC-VF.ttf',  dir: 'public/fonts/noto-sans-sc-subset',  file: 'noto-sans-sc-wght-subset.woff2' },
];
function die(msg) { console.error(`✗ font-subset：${msg}`); process.exit(1); }
const sha = buf => createHash('sha256').update(buf).digest('hex');
/* 解释器不能钉死一枚绝对路径——这一卡的 --check 已经进了 gate，钉死等于把整条门禁拴在这台机器的 D 盘上。
   候选顺序：env `FONT_SUBSET_PY` → 本机在册那枚 → PATH 上的 python/python3。
   ⚠️ 判"能用"的唯一凭据是真跑一次 `import fontTools` 并读出版本：只查文件在不在，会栽在 Windows 商店那个
   python3 占位程序上（rc=49、零输出，整段静默空转——它连"失败"都不报）。全试不通当场红，不静默跳过。 */
let PY = null, PYFT = null;
for (const cand of PY_CANDIDATES) {
  const r = spawnSync(cand, ['-X', 'utf8', '-c', 'import fontTools;print(fontTools.version)'], { encoding: 'utf8' });
  const v = (r.stdout || '').trim();
  if (r.status === 0 && v !== '') { PY = cand; PYFT = v; break; }
}
if (!PY) die(
  `找不到能 import fontTools 的 Python（依次试过：${PY_CANDIDATES.join(' / ')}）。` +
  `这一卡的覆盖⇄cmap 与 wght 轴在场两格全靠它读表，缺了它就是"尺子读不到被测对象"，所以不静默放行。` +
  `两条出路：设环境变量 FONT_SUBSET_PY=<解释器路径>，或给在用的解释器装上 fontTools（pip install fontTools brotli）。`
);
console.log(`· font-subset 解释器：${PY}（fontTools ${PYFT}）`);

/* ---------- 码点并集：从产物取，不从源文件取（第 0 问的量法） ---------- */
function distUnion() {
  if (!existsSync(join(DIST, 'index.html'))) die(`没有产物 ${DIST}——覆盖判据的尺子读不到被测对象。这不是绿，是"没量"：先 \`npm run build\` 再来（§16 铁律：验收前先证明尺子读得到对象）`);
  const set = new Set();
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (/\.(html|js|json|xml)$/i.test(e.name)) for (const ch of readFileSync(p, 'utf8')) { const c = ch.codePointAt(0); if (c >= 0x20 && c !== 0x7f) set.add(c); }
    }
  })(DIST);
  return set;
}

/* ---------- fontTools 桥 ---------- */
function readFont(p) {
  const out = execFileSync(PY, ['-X', 'utf8', '-c',
    `import json,sys;from fontTools.ttLib import TTFont;f=TTFont(sys.argv[1]);` +
    `axes={a.axisTag:[a.minValue,a.defaultValue,a.maxValue] for a in f['fvar'].axes} if 'fvar' in f else None;` +
    `print(json.dumps({'axes':axes,'numGlyphs':f['maxp'].numGlyphs,'cmap':sorted(f.getBestCmap()),'head':[f['head'].created,f['head'].modified]}))`, p],
    { encoding: 'utf8' });
  return JSON.parse(out);
}
function runSubset(src, unicodes, out) {
  const r = spawnSync(PY, ['-X', 'utf8', '-m', 'fontTools.subset', src, `--unicodes-file=${unicodes}`, '--flavor=woff2', `--output-file=${out}`], { encoding: 'utf8' });
  if (r.status !== 0) die(`pyftsubset 失败（${src}）：` + ((r.stderr || '') + (r.stdout || '')).slice(0, 400));
}
function runInstance(src, wght, outTtf) {
  const r = spawnSync(PY, ['-X', 'utf8', '-m', 'fontTools.varLib.instancer', src, `wght=${wght}`, '-o', outTtf], { encoding: 'utf8' });
  if (r.status !== 0) die(`varLib.instancer 失败：` + ((r.stderr || '') + (r.stdout || '')).slice(0, 400));
}

/* ---------- 生成 ---------- */
/* --make 的并集读的是 dist，不是源文件 ⇒ dist 落后于 src 时切出来的子集"当场成功"、却漏着稿子里的新字，
   要等下一格 --check 才红，作者拿到的是两条互相矛盾的读数。这一拍提前挡掉：src/** 里任何一枚比
   dist/index.html 新 ⇒ 不切，指路先 build。（gate 的天然顺序是 build 在 --check 之前，所以这条只咬手动 --make。） */
function guardStaleDist() {
  const idx = join(DIST, 'index.html');
  if (!existsSync(idx)) return;                       // dist 整枚缺席由 distUnion 红，这里不重复判
  const built = statSync(idx).mtimeMs;
  let newest = 0, newestPath = '';
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(md|astro|js|ts|json|css|ya?ml)$/i.test(e.name)) continue;
      const m = statSync(p).mtimeMs;
      if (m > newest) { newest = m; newestPath = relative(ROOT, p); }
    }
  })(join(ROOT, 'src'));
  if (newest > built) die(`dist 落后于源文件（${newestPath} 比 dist/index.html 新），现在切出来的子集会漏掉这一改带来的字。` +
    `顺序：npm run build → node tools/font-subset.mjs --make → npm run build。并集口径是"产物里真画的字"，不是源文件（第 0 问）。`);
}

if (MODE === 'make') {
  guardStaleDist();
  const union = distUnion();
  if (dropArg) for (const h of dropArg.split(',').map(s => s.trim()).filter(Boolean)) union.delete(parseInt(h.replace(/^U\+/, ''), 16));
  const cps = [...union].sort((a, b) => a - b);
  const uni = join(ROOT, '.tmp-font-subset-unicodes.txt');
  writeFileSync(uni, cps.map(c => c.toString(16).toUpperCase().padStart(4, '0')).join('\n') + '\n');
  const entries = [];
  for (const f of FAM) {
    if (!existsSync(f.src)) die(`源脸不在：${f.src}（本工具只读它，不写它）`);
    const srcBuf = readFileSync(f.src);
    const dir = join(ROOT, f.dir); mkdirSync(dir, { recursive: true });
    const out = join(dir, f.file);
    let input = f.src;
    const tmpTtf = join(ROOT, '.tmp-font-instance.ttf');
    if (instArg) { runInstance(f.src, instArg, tmpTtf); input = tmpTtf; }
    runSubset(input, uni, out);
    rmSync(tmpTtf, { force: true });
    const buf = readFileSync(out);
    if (buf.subarray(0, 4).toString('ascii') !== 'wOF2') die(`${out} 帧头不是 wOF2`);
    const info = readFont(out);
    const srcInfo = readFont(f.src);                                  // 源脸 cmap：定"可画范围"
    const srcSet = new Set(srcInfo.cmap);
    const effective = cps.filter(c => srcSet.has(c));
    const outOfScope = cps.filter(c => !srcSet.has(c));
    if (outOfScope.length) console.log(`  （${f.family}：并集里 ${outOfScope.length} 枚源脸本无字形，点名在册为域外——远程 slice 今天也画不了它们，走系统 emoji/回退，行为不变：${outOfScope.map(c => 'U+' + c.toString(16).toUpperCase()).join(' ')}）`);
    entries.push({
      family: f.family, file: `${f.dir}/${f.file}`, url: `/${f.dir.split('/').slice(1).join('/')}/${f.file}`,
      bytes: buf.length, sha256: sha(buf), uses: `${f.family}/normal@${info.axes ? `${info.axes.wght[0]}-${info.axes.wght[2]}` : 'static(instanced)'}`,
      numGlyphs: info.numGlyphs, fvar_wght: info.axes ? info.axes.wght : null,
      effective_hex: effective.map(c => c.toString(16).toUpperCase().padStart(4, '0')),
      out_of_scope_hex: outOfScope.map(c => c.toString(16).toUpperCase().padStart(4, '0')),
      source: { path: f.src, sha256: sha(srcBuf), license: 'SIL Open Font License 1.1（Google Fonts Noto 项目）' },
    });
    console.log(`✓ ${f.family} 子集 ${buf.length}B，${cps.length} 码点，numGlyphs=${info.numGlyphs}，wght 轴 ${info.axes ? info.axes.wght.join('–') : '（无——被 --instance 拆掉了）'}`);
  }
  const man = {
    note: '由 tools/font-subset.mjs --make 生成（码点并集取自 dist 产物文本）；复验＝--verify（盘上对账）；产物级覆盖与轴判据＝--check（要 dist）。⚠️ --drop/--instance 只为变异自检留的旋钮，正常生成不带。',
    generated: { tool: 'fontTools.subset (flavor=woff2, 默认选项) ＋ 本文件', codepoints: cps.length, drop: dropArg || null, instance: instArg || null },
    union_hex: cps.map(c => c.toString(16).toUpperCase().padStart(4, '0')),
    files: entries,
  };
  writeFileSync(MANIFEST, JSON.stringify(man, null, 1) + '\n');
  rmSync(uni, { force: true });
  console.log(`✓ 清单重写 ${relative(ROOT, MANIFEST)}；合计 ${entries.reduce((a, e) => a + e.bytes, 0)}B。下一步：npm run build（public/ 进 dist/）再 node tools/font-subset.mjs --check`);
  process.exit(0);
}

/* ---------- 复验 / 判据 ---------- */
if (!existsSync(MANIFEST)) die(`没有 ${relative(ROOT, MANIFEST)}（先 --make）`);
const man = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let bad = 0;
for (const e of man.files) {                                   // ①盘上对账（--verify 的全部，--check 的第一段）
  const p = join(ROOT, ...e.file.split('/'));
  if (!existsSync(p)) { console.error(`✗ 盘上缺 ${e.file}`); bad++; continue; }
  const buf = readFileSync(p);
  const h = sha(buf);
  if (!(buf.length === e.bytes && h === e.sha256 && buf.subarray(0, 4).toString('ascii') === 'wOF2')) {
    console.error(`✗ ${e.file}：字节 ${buf.length}/${e.bytes}、sha256 ${h === e.sha256 ? '对' : `对不上（盘上 ${h.slice(0, 16)}… ≠ 在册 ${e.sha256.slice(0, 16)}…）`}`); bad++;
  }
}
if (MODE === 'verify') {
  if (bad) process.exit(1);
  console.log(`✓ font-subset --verify：${man.files.length} 枚子集 SHA256/字节/wOF2 帧头全对（合计 ${man.files.reduce((a, e) => a + e.bytes, 0)}B）`);
  process.exit(0);
}
/* --check：产物级三格——覆盖、轴、码点集在册 */
const union = distUnion();
const want = new Set(man.union_hex.map(s => parseInt(s, 16)));
const unseen = [...union].filter(c => !want.has(c));
if (unseen.length) { console.error(`✗ 产物文本里有 ${unseen.length} 枚码点不在在册并集：${unseen.slice(0, 12).map(c => 'U+' + c.toString(16).toUpperCase() + '「' + String.fromCodePoint(c) + '」').join(' ')}${unseen.length > 12 ? ' …' : ''}\n  救法（顺序别换，并集是读 dist 产物、不是读源文件）：npm run build → node tools/font-subset.mjs --make → npm run build。先 --make 只会拿上一版的 dist 重切，字还是缺的）`); bad++; }
for (const e of man.files) {
  const info = readFont(join(ROOT, ...e.file.split('/')));
  if (!info.axes || !info.axes.wght) { console.error(`✗ ${e.file}：fvar 的 wght 轴不在——这卡切子集就是为了那枚轴，轴没了不如不切（回退远程离散档或维持否决）`); bad++; continue; }
  const cmap = new Set(info.cmap);
  const oos = new Set((e.out_of_scope_hex || []).map(s => parseInt(s, 16)));
  const miss = [...union].filter(c => !cmap.has(c) && !oos.has(c));
  const missCjk = miss.filter(c => (c >= 0x2e80 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xff00 && c <= 0xffef));
  if (miss.length) { console.error(`✗ ${e.file}：产物并集里 ${miss.length} 枚在册码点不在子集 cmap（其中 CJK ${missCjk.length} 枚）：${miss.slice(0, 12).map(c => 'U+' + c.toString(16).toUpperCase() + '「' + String.fromCodePoint(c) + '」').join(' ')}${miss.length > 12 ? ' …' : ''}`); bad++; }
  else console.log(`✓ ${e.file}：覆盖产物并集（域外点名 ${(e.out_of_scope_hex || []).length} 枚：${(e.out_of_scope_hex || []).join(' ') || '无'}），wght 轴 ${info.axes.wght.join('–')}，numGlyphs=${info.numGlyphs}`);
}
if (bad) { console.error(`✗ font-subset --check 红了（${bad} 条）`); process.exit(1); }
console.log(`✓ font-subset --check：盘上对账＋产物覆盖＋wght 轴在场，全绿`);
