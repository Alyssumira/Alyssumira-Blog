/* pointer-check.mjs —— 「指针」这一族的尺：符号锚落空即红 ＋ 裸行号枚数棘轮
   （`w2w/pointers` 2026-10-03 新立；挂进 `npm run check` 作**第 ⑩ 项**——链从九项长成十项，
    理由与位置在"为什么挂在链尾"那一格）

   用法  node tools/pointer-check.mjs                （门禁跑这一条：源码级，零依赖，不起浏览器、不读 dist）
         node tools/pointer-check.mjs --anchors      （外加逐枚打印今天认出的每一枚锚与它的判决）
         node tools/pointer-check.mjs --root <目录>   （把扫描面与靶文件都改指到别的树上——**只为本卡那枚
                                                "空转侧"变异而活**：正常门禁永远不带你）

   ── 为什么要有这一枚（本卡的起点是一格实测出来的零牙）────────────────────────
   仓里到处是指向样式表的"指针"。以前是裸行号（形如「某张表第 504 行」），一天动几十行就集体过期。
   `w2r/anchors` 把 31 枚已确证指错的换成了符号锚（文件名＋选择器／`@media` 条件／令牌名＋那条声明的片段，
   行号一律去掉）。但那枚卡自己做了两枚变异，结论难看：
     · 把一枚锚改成盘上**根本不存在**的选择器名 ⇒ `npm run check` rc=0，整本输出与干净态逐字符相同；
     · 把一枚裸行号加回去 ⇒ 同样 rc=0，唯一有反应的是人肉 grep。
   ⇒ 锚会不会落空、行号会不会重新长回来，今天全靠人眼。**这一枚就是那把尺**。

   ── 它钉住的三件事 ──────────────────────────────────────────────────────────
   ① **锚必落空即红**：扫出所有符号锚，逐枚到目标表里复算那枚选择器／`@media` 条件／令牌名／声明在不在。
      复算一律吃**抹掉注释之后**的文本并按规则树切块——选择器只认规则前导、声明只认块体，所以注释里抄的
      那串字永远不会被当成真声明（那是 `pixel-probe` 文件头点过的老病：`indexOf` 抓到注释里的字，量一具尸体）。
   ② **裸行号只许减不许涨（棘轮）**：盘上读到的枚数与下面那枚**字面量登记值**比。多一枚 ⇒ 红（有人把
      行号埋回去了）；读到 0 枚 ⇒ 红（尺子失去靶＝空转，本仓踩过 `font-fallback-check --gate` 那一回）；
      **少若干枚必须绿**——那是有人继续把行号换成锚，棘轮就是要它绿着往前走，不是快照。
   ③ **两处同源都要在**：登记枚数是本文件里一枚独立字面量，绝不从扫描结果推导（"全集与靶同趟生成＝自证，
      永远绿"是本仓明令的形状）。这条自己也有尺：启动时回读本文件源码，登记值那行必须仍长得像
      `const BARE_RATCHET = <整数>;`，被改成推导 ⇒ 红。

   ── 五条红话（原文照抄，别改字再去找代码）───────────────────────────────────
   ① `✗ 锚落空  <来源>:<行> ⇄ \`<锚>\`  → src/styles/<表>  [<判据>]  <到底在找什么>`
      末了那半句按判据各自说：选择器 ⇒ "没有以 … 为前导的规则（近似前导：…）"；声明 ⇒ "表里没有声明 …"
      或"那几枚声明各自在表里，但**不在同一格里**"；条件块 ⇒ "没有前导等于 @media (…) 的条件块"。
   ② `✗ 裸行号涨回来了  盘上 N 枚 > 登记值 121 枚（多出的 K 枚见 --bare 清单）`
   ③ `✗ 尺子空转  扫描面读到 0 枚裸行号指针（登记值 121）——靶没了，这一判据现在什么也验不出来`
   ④ `✗ 尺子空转  扫描面读到 0 枚符号锚——锚那一半没靶，落空即红这条现在什么也验不出来`
   ⑤ `✗ 登记值不再是字面量  本文件里找不到 \`const BARE_RATCHET = <整数>;\`——登记枚数一旦从扫描结果
      推导，这一格就永绿（自证）`
   另两条守的是自己：`✗ 豁免过期  …今天没被任何一枚锚读到`（豁免表不许长成第二本死账）、
   `✗ 扫描面塌了  tools/ 与 src/ 一共只读到 N 枚文件`。

   ── 文法（先普查、后定义：盘上数出来什么形状，就收什么形状）──────────────────
   一枚锚 = 一枚**样式表文件名**（`X.css`，反引号包住或裸写都算，但 basename 必须是 `src/styles/`
   下真存在的那几张表）＋ 其后**一段连接词** ＋ 一枚**反引号 CSS 片段**。三段都住在同一行里。
     · 连接词：长度 ≤ 14，只由中日韩文字／空白／左括号／全角冒号组成，且必须含一枚指示词
       （那／这／的／里／中／在／己）。这一条是把「，」「。」「；」这类句子级标点挡在外面的关键：
       `…那一格），进 ` 那种是**下一句话**的开头，不是绑定；` 改成 ` 那种是**变异叙述**里的一枚假想值
       （`palette-check` 文件头就有两枚），也不许当成锚。**开头是左括号的也不收**——括注里那枚片段
       绑的多半是括号后面才点名的表名，硬绑前面最近的会把好锚读成落空（本卡实测：essay.css 那行
       "被覆写的 `.grain` 本体在 base.css"）。
     · 允许**续绑**：一枚已认下的锚后面还能带出同一张表的下一枚片段（`X.css` 的 `.a` 那格 `--b`），
       每跳都要自带一段干净的连接词。
     · 片段判据（按形状分五档，各自复算，全部吃**抹掉注释后**的规则树）：
         at       `@media (…)` / `@supports (…)` —— 与规则树的 at 前导逐字符比
         block    `sel{ prop:value }` —— 前导比选择器、块体比声明；带 `…` 省略号吞掉的那半截丢掉不装牙
         decl     `prop:value[; prop:value]` —— 必须在**同一格**里全部命中（锚写的是"那一格"不是"那张表"）
         token    `--x` —— 在抹注释后的表体里出现（声明或引用都算）
         selector `.a b` / `html[data-x] .c` —— 只与规则前导比；逗号分隔的名单按集合比，必须全在
       声明那一档比的是**可识别片段**：盘上 `transition:opacity .8s cubic-bezier(.22,1,.36,1)` 吃得起
       锚写的 `transition:opacity .8s`（`w2r/anchors` 原话就是"那条声明的可识别片段"），反过来不许——
       锚写得比盘上多一个字符就落空。
     · 明确**不收**的形状（收了就假红，宁可登记成没牙的账，见汇报）：指向非样式表文件名的指针、
       `文件:行` 同形串、半截名字（`-fallback` 那种）、`——` 或 `；` 接在表名后面的、
       一枚锚跨两行被折断的、以及值字面量（`.6em` 那种）。


   ── 为什么挂在链尾、且落地必须 rc=0 ───────────────────────────────────────────
   `check` 是 `&&` 串：中间任何一枚红就截断后面全部。本尺扫的是源码、不吃 dist，放哪儿都跑得动；
   挂在链尾是因为它最便宜（读 5 张表 + 若干行文本，毫秒级），而链上前面那九枚各有自己的靶。
   ⚠️ 一枚新尺落地当天必须绿——所以本文件**自己也不许往注释里写 `表名:行号` 同形串**，
   也不许写一枚读不到的假锚：那会把棘轮读数弄脏成 122，或者让 ① 当场红在自己的文件头上。

   ── 今天管到哪、管不到哪（在册退化面，写在这里而不是藏在正则里）──────────────
   · ② 只数枚数、不复算行号指的地方——121 枚里绝大多数指向的是**注释散文**，旁注里没有可机械复算的
     名字（`w2r/anchors` 原话），给它们装牙得先把注释改写成锚，那是另一族活。
   · 连接词那一条是"同一行内"的绑定：一枚锚如果跨两行写（文件名在上一行末尾、片段在下一行），本尺读不到。
   · 一枚锚的**语义绑定**不查：`@media (min-width:1240px)` 与 `.post-body .sidenote` 在同一行里是**各自**
     复算的——两张都在表里、但那条声明其实不在那个 @media 里，这种错今天还漏（要收它得把锚升成一棵
     两级路径，形如 `在 @media(…) 里 sel{…}`，那是下一枚卡的事）。
   · 非样式表的裸行号指针（指 `.mjs`／`.astro`／`.ts`／`docs/*.md` 的）今天 124 枚，**一枚不在射程里**：
     那族文件比 CSS 稳，且换锚要引"符号"这个新概念，先把 CSS 这一族验通再说。
   · `tools/palette-check.mjs` 整枚文件是另一张卡的靶，本卡一枚字没动它；它里面那些指针（14 枚裸行号 +
     若干枚锚）照本尺的口径读数，读出问题一律进 backlog（见汇报），不在本卡改。
*/
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ── ③ 登记值：独立字面量，与扫描同源不同体 ─────────────────────────────────
   2026-10-03 `w2w/pointers` 落地时盘上读到的枚数（`grep -roE` 同口径复算过两遍）。
   往小调＝允许（那是行号在少）；往大调＝只有真的又长出裸行号才准动它。 */
const BARE_RATCHET = 121;

const argv = process.argv.slice(2);
const FLAGS = new Set(argv.filter((a) => a.startsWith('--') && !a.startsWith('--root')));
const rootIdx = argv.indexOf('--root');
const SCAN_ROOT = rootIdx >= 0 ? argv[rootIdx + 1] : join(HERE, '..');
if (rootIdx >= 0 && !SCAN_ROOT) { console.error('✗ --root 后面缺一枚目录'); process.exit(2); }

const SHEET_DIR = join(SCAN_ROOT, 'src', 'styles');
const SHEETS = new Set(
  existsSync(SHEET_DIR) ? readdirSync(SHEET_DIR).filter((f) => f.endsWith('.css')) : []
);

const BARE_RE = /[A-Za-z0-9_.-]+\.css:[0-9]+/g;
const HEAD_RE = /`[A-Za-z0-9_./-]*\.css`|[A-Za-z0-9_./-]+\.css/g;
const SNIP_RE = /`([^`\n]{1,400})`/g;
const CONN_OK = /^[\u3400-\u4dbf\u4e00-\u9fff\s（(「『：]*$/;
const CONN_BIND = /[那这的里中在己]/;
const MAX_GAP = 14;

const flat = (s) => s.replace(/\s+/g, ' ').trim();
const tight = (s) => s.replace(/\s+/g, '');

/* ── 抹注释：字符串感知的，别把 content:"/*" 那种字面量当注释开头 ── */
function stripComments(s) {
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] === '/' && s[i + 1] === '*') {
      const found = s.indexOf('*/', i + 2);
      const stop = found < 0 ? s.length : found + 2;
      for (let k = i; k < stop; k++) out += s[k] === '\n' ? '\n' : ' ';
      i = stop;
      continue;
    }
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i];
      let k = i + 1;
      while (k < s.length && s[k] !== q) { if (s[k] === '\\') k++; k++; }
      out += s.slice(i, Math.min(k + 1, s.length));
      i = k + 1;
      continue;
    }
    out += s[i++];
  }
  return out;
}

/* ── 规则树：{prelude, decls[], children[]}，at 规则的前导带 @xxx ── */
function parseRules(text) {
  const root = { prelude: '(root)', decls: [], children: [], parent: null };
  const stack = [root];
  let buf = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      const node = { prelude: flat(buf), decls: [], children: [], parent: stack[stack.length - 1] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
      buf = '';
    } else if (c === '}') {
      if (flat(buf)) stack[stack.length - 1].decls.push(flat(buf));
      buf = '';
      if (stack.length > 1) stack.pop();
    } else if (c === ';') {
      if (flat(buf)) stack[stack.length - 1].decls.push(flat(buf));
      buf = '';
    } else buf += c;
  }
  const all = [];
  const walk = (n) => { for (const c of n.children) { all.push(c); walk(c); } };
  walk(root);
  return all;
}

const sheetCache = new Map();
function sheet(name) {
  if (!sheetCache.has(name)) {
    const p = join(SHEET_DIR, name);
    if (!existsSync(p)) { sheetCache.set(name, null); return null; }
    const stripped = stripComments(readFileSync(p, 'utf8').replace(/\r\n/g, '\n'));
    sheetCache.set(name, { stripped, rules: parseRules(stripped), tight: tight(stripped) });
  }
  return sheetCache.get(name);
}

const splitDecls = (s) => s.split(/;(?![^(]*\))/).map(flat).filter(Boolean);
const selSet = (s) => tight(String(s).replace(/\{[^]*$/, '')).split(',').filter(Boolean);
function sameSel(prelude, want) {
  const A = selSet(prelude), B = selSet(want);
  return B.length > 0 && B.every((x) => A.includes(x));
}
function declProp(s) {
  const i = s.indexOf(':');
  if (i < 0) return null;
  return [tight(s.slice(0, i)).toLowerCase(), tight(s.slice(i + 1)).replace(/!important$/i, '')];
}
function sameDecl(a, b) {
  const A = declProp(a), B = declProp(b);
  if (!A || !B) return false;
  return A[0] === B[0] && (A[1] === B[1] || A[1].includes(B[1]));
}
const ELIDED = /[…]|\.{3}/;

function classify(s) {
  const t = flat(s);
  if (t.startsWith('@')) return 'at';
  if (t.includes('{')) return 'block';
  if (/^--[\w-]+$/.test(t)) return 'token';
  if (/^--[\w-]+\s*:/i.test(t) || /^[a-z][a-z-]*\s*:/i.test(t)) return 'decl';
  if (/^[a-z][a-z-]*(\s+[.#:*[a-z>])/i.test(t)) return 'selector';
  return 'selector';
}

/* 复算一枚锚：返回 {kind, hit, why}——why 是红话里点名"到底在找什么" */
function verify(name, snip) {
  const sh = sheet(name);
  if (!sh) return { kind: '?', hit: false, why: `目标文件 src/styles/${name} 不在盘上` };
  const kind = classify(snip);
  const body = flat(snip);
  const inStr = (s) => sh.tight.includes(tight(s));

  if (kind === 'token') {
    const tok = body.replace(/^--/, '--');
    return { kind, hit: inStr(tok), why: `令牌 --${tok.replace(/^--/, '')} 未被声明也没被引用` };
  }
  if (kind === 'at') {
    const pre = body.replace(/\{[^]*$/, '').trim();
    const ok = sh.rules.some((r) => tight(r.prelude) === tight(pre));
    return { kind, hit: ok || inStr(pre), why: `没有前导等于 ${pre} 的条件块` };
  }
  if (kind === 'decl') {
    const parts = splitDecls(body).filter((d) => !ELIDED.test(d));
    if (!parts.length) return { kind, hit: false, why: '片段里全是被省略号吞掉的声明，复算不出东西' };
    const one = sh.rules.find((r) => parts.every((d) => r.decls.some((x) => sameDecl(x, d))));
    if (one) return { kind, hit: true };
    if (parts.every((d) => sh.rules.some((r) => r.decls.some((x) => sameDecl(x, d))))) {
      return { kind, hit: false, why: '那几枚声明各自在表里，但**不在同一格里**' };
    }
    const miss = parts.filter((d) => !sh.rules.some((r) => r.decls.some((x) => sameDecl(x, d))));
    return { kind, hit: false, why: `表里没有声明 ${miss.join(' / ')}` };
  }
  if (kind === 'block') {
    const brace = body.indexOf('{');
    const pre = body.slice(0, brace).trim();
    const inner = body.slice(brace + 1).replace(/\}\s*$/, '').trim();
    if (pre.startsWith('@')) {
      const kids = sh.rules.filter((r) => tight(r.prelude) === tight(pre));
      const subs = [...inner.matchAll(/([^{}]+)\{([^}]*)\}/g)];
      const okAt = kids.length > 0;
      const okBody = subs.every((m) => kids.some((k) => k.children.some((c) =>
        sameSel(c.prelude, m[1]) && splitDecls(m[2]).filter((d) => !ELIDED.test(d))
          .every((d) => k.children.find((c) => sameSel(c.prelude, m[1])).decls.some((x) => sameDecl(x, d))))));
      return { kind, hit: okAt && okBody, why: !okAt ? `没有前导等于 ${pre} 的条件块` : `那个条件块里没有 ${subs.map((m) => flat(m[1])).join(' / ')} 那一格` };
    }
    const parts = splitDecls(inner).filter((d) => !ELIDED.test(d));
    const ok = sh.rules.some((r) => sameSel(r.prelude, pre) && parts.every((d) => r.decls.some((x) => sameDecl(x, d))));
    if (ok) return { kind, hit: true };
    const selOk = sh.rules.some((r) => sameSel(r.prelude, pre));
    if (!selOk) return { kind, hit: false, why: `没有前导含 ${pre} 的规则` };
    const miss = parts.filter((d) => !sh.rules.find((r) => sameSel(r.prelude, pre)).decls.some((x) => sameDecl(x, d)));
    return { kind, hit: false, why: `${pre} 那一格里没有声明 ${miss.join(' / ')}` };
  }
  const ok = sh.rules.some((r) => sameSel(r.prelude, snip));
  if (ok) return { kind, hit: true };
  const near = sh.rules.map((r) => r.prelude).find((p) => selSet(snip).some((x) => tight(p).includes(x)));
  return { kind, hit: false, why: `没有以 ${flat(snip)} 为前导的规则${near ? `（近似前导：${near}）` : ''}` };
}

/* 片段长得像 CSS 吗——不像的一律不收（收了就是假红） */
function snippetEligible(s) {
  const t = flat(s);
  if (!t || !/[A-Za-z]/.test(t)) return false;
  if (/\.[a-z]{2,4}:[0-9]+$/i.test(t)) return false;            // 文件:行 同形串
  if (/\.(astro|js|mjs|ts|json|html|css|md|ps1|py|sh|pyc|txt|xml|svg|png|jpg)$/i.test(t)) return false;
  if (/^\.[0-9]/.test(t)) return false;                          // .6em 那种长度字面量
  if (/^-/.test(t) && !/^-[\w-]+\s*:/i.test(t)) return false;    // -fallback 那种半截名字
  if (/^[.#*@[:[]/.test(t)) return true;
  if (/^[a-z][a-z-]*\s*:/i.test(t)) return true;                 // prop:value
  if (/^--[\w-]+/.test(t)) return true;
  if (/^[a-z][a-z0-9-]*(\s*[.#[:>~+{])/.test(t)) return true;   // 后代选择器 html .x；`(` 故意不在边界里——
                                                                 // `light-dark(…)` 那种函数值不是锚，收了就是假红
  if (/^[a-z][a-z-]*\s*\{/.test(t)) return true;                 // body{}
  return false;
}

/* 从一行的文本里取出锚。两件事叠在一起：
   · 每枚片段绑到它前面**最近**的一枚表名（basename 必须是 src/styles/ 下真存在的那几张）；
   · 允许**续绑**：一枚已认下的锚后面还能带出同一张表的下一枚片段（`X.css` 的 `.a` 那格 `--b`）。
   绑得上的唯一凭据是中间那段连接词：长度 ≤ 14、只由中日韩文字／空白／左括号／冒号组成、
   且含一枚指示词。反引号、半角点号、「，」「。」「；」「）」全不在 charset 里——
   这一条同时挡掉三种假锚：下一句话的开头（`…那一格），进 `）、变异叙述里的假想值（` 改成 `）、
   以及句子被分号劈开的两件事（`；首页的纱罩 `）。 */
function anchorsInLine(ln) {
  const heads = [];
  let m;
  HEAD_RE.lastIndex = 0;
  while ((m = HEAD_RE.exec(ln))) {
    const raw = m[0].replace(/`/g, '');
    const bn = basename(posix.normalize(raw.replace(/\\/g, '/')));
    if (SHEETS.has(bn)) heads.push({ name: bn, end: HEAD_RE.lastIndex });
  }
  if (!heads.length) return [];
  const out = [];
  SNIP_RE.lastIndex = 0;
  while ((m = SNIP_RE.exec(ln))) {
    let point = null;                       // {name, at}：能绑上来的最近一处
    for (const h of heads) if (h.end <= m.index) point = { name: h.name, at: h.end };
    for (const a of out) if (a.end <= m.index && a.end > (point ? point.at : -1)) point = { name: a.file, at: a.end };
    if (!point) continue;
    const gap = flat(ln.slice(point.at, m.index));
    if (gap.length > MAX_GAP || !CONN_OK.test(gap) || !CONN_BIND.test(gap)) continue;
    /* 括注开头不收：`…（被覆写的 … \`.grain\` 本体在 base.css …）` 那种括号里，片段绑的是**括号后面**
       才点名的那枚表名，不是前面最近的——绑错了会把一枚好锚读成落空（本卡实测：essay.css 那一行）。 */
    if (/^[（(「『：]/.test(gap)) continue;
    const snip = m[1];
    if (!snippetEligible(snip)) continue;
    out.push({ file: point.name, gap, snip, end: SNIP_RE.lastIndex });
  }
  for (const a of out) delete a.end;
  return out;
}

function listFiles(dir, acc) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e === '.git') continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) listFiles(p, acc);
    else if (st.isFile()) acc.push(p);
  }
  return acc;
}

/* ── 登记在册的豁免：认得出、但**故意不按活指针复算**的那些。
   键 =（来源文件 ⇄ 锚片段），不写行号——行号正是本卡要消灭的东西。
   每一条都得在盘上真的对得上，否则红在"豁免过期"（豁免表也不许空转）。 */
const WAIVERS = [
  { src: 'tools/gap-check.mjs', file: 'essay.css', snip: '.post-seal{margin:14px auto 0}',
    why: '过去时历史句（`w2u/seal` 那一轮落地时那格写作简写），盘上今天拆成了 margin-top/bottom/left/right 四条——它说的不是现在的盘' },
  { src: 'src/pages/essays/[slug].astro', file: 'base.css', snip: '.post-tail{display:none}',
    why: '锚少写了一枚 `html ` 祖先：打印段那条真身是 `html .post-tail, html .post-nav, …{display:none}`；同一句里另两枚带 html 前缀的锚照复算。修它＝动 src，本卡不许' },
];

const rel = (p) => posix.join(...p.slice(SCAN_ROOT.length + 1).split(sep));
const faces = [join(SCAN_ROOT, 'tools'), join(SCAN_ROOT, 'src')];
const files = [];
for (const f of faces) listFiles(f, files);
files.sort();

const bare = [];
const anchors = [];
for (const p of files) {
  const raw = readFileSync(p, 'utf8');
  if (/\0/.test(raw)) continue;
  const lines = raw.split(/\r?\n/);
  lines.forEach((ln, i) => {
    BARE_RE.lastIndex = 0;
    let m;
    while ((m = BARE_RE.exec(ln))) bare.push({ src: `${rel(p)}:${i + 1}`, text: m[0] });
    for (const a of anchorsInLine(ln)) anchors.push({ src: `${rel(p)}:${i + 1}`, ...a });
  });
}
const waived = new Set();
const live = anchors.filter((a) => {
  const w = WAIVERS.find((w) => w.src === a.src.split(':')[0] && w.file === a.file && w.snip === a.snip);
  if (!w) return true;
  waived.add(w);
  return false;
});

const reds = [];

/* ① 锚落空即红 */
const misses = [];
for (const a of live) {
  const r = verify(a.file, a.snip);
  a.kind = r.kind;
  if (!r.hit) misses.push({ ...a, why: r.why });
}
for (const x of misses) {
  reds.push(`✗ 锚落空  ${x.src} ⇄ \`${x.snip}\`  → src/styles/${x.file}  [${x.kind}]  ${x.why}`);
}

/* ② 棘轮 */
if (bare.length > BARE_RATCHET) {
  reds.push(`✗ 裸行号涨回来了  盘上 ${bare.length} 枚 > 登记值 ${BARE_RATCHET} 枚（多出的 ${bare.length - BARE_RATCHET} 枚见 --bare 清单）`);
}
if (bare.length === 0) {
  reds.push(`✗ 尺子空转  扫描面读到 0 枚裸行号指针（登记值 ${BARE_RATCHET}）——靶没了，这一判据现在什么也验不出来`);
}
if (anchors.length === 0) {
  reds.push('✗ 尺子空转  扫描面读到 0 枚符号锚——锚那一半没靶，落空即红这条现在什么也验不出来');
}

/* ③ 登记值必须是字面量（反自证） */
const self = readFileSync(join(HERE, 'pointer-check.mjs'), 'utf8');
if (!/\nconst BARE_RATCHET = \d+;/.test('\n' + self)) {
  reds.push('✗ 登记值不再是字面量  本文件里找不到 `const BARE_RATCHET = <整数>;`——登记枚数一旦从扫描结果推导，这一格就永绿（自证）');
}

/* 豁免表也不许空转 */
for (const w of WAIVERS) if (!waived.has(w)) reds.push(`✗ 豁免过期  ${w.src} ⇄ \`${w.snip}\` 今天没被任何一枚锚读到——这条豁免该删（留着就是把一格失效藏进表里）`);

/* 扫描面自己也要有靶 */
if (files.length < 20) reds.push(`✗ 扫描面塌了  tools/ 与 src/ 一共只读到 ${files.length} 枚文件`);

console.log('pointer-check —— 指针这一族的尺（锚落空即红 ＋ 裸行号棘轮）');
console.log(`· 扫描面 ${files.length} 枚文件（tools/ 与 src/），符号锚 ${live.length} 枚${waived.size ? ` ＋ 豁免 ${waived.size} 枚` : ''}`);
console.log(`· 锚复算：吃抹掉注释后的规则树，选择器只认前导、声明只认块体、条件块只认 at 前导`);
const byKind = {};
for (const a of live) byKind[a.kind] = (byKind[a.kind] || 0) + 1;
console.log(`· 判据分布 ${Object.entries(byKind).sort().map(([k, v]) => `${k} ${v}`).join('／')}`);
if (FLAGS.has('--anchors')) {
  for (const a of live) {
    const bad = misses.find((x) => x.src === a.src && x.snip === a.snip);
    console.log(`   ${bad ? '✗' : '✓'} ${a.src}  → ${a.file}  ⇐${a.gap}⇒  [${a.kind}] ${a.snip}`);
  }
  for (const w of WAIVERS) console.log(`   ⊘ 豁免 ${w.src} → ${w.file} [${w.snip}] ${w.why}`);
}
if (FLAGS.has('--bare')) {
  const g = {};
  for (const b of bare) { const t = b.text.replace(/:[0-9]+$/, ''); g[t] = (g[t] || 0) + 1; }
  console.log('· 裸行号按目标表：' + Object.entries(g).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('／'));
  for (const b of bare) console.log(`   · ${b.src}  ${b.text}`);
}
/* 只报不红：行号越过表尾／指到一张不在盘上的表——这是人眼今天唯一还能读到的那半格真相，
   棘轮只管枚数，所以这里读数进回执、不进判决。 */
const ends = {};
let past = 0, ghost = 0;
for (const b of bare) {
  const t = b.text.replace(/:[0-9]+$/, '');
  const n = Number(b.text.split(':').pop());
  const p = join(SHEET_DIR, t);
  if (!existsSync(p)) { ghost++; continue; }
  if (ends[t] === undefined) ends[t] = readFileSync(p, 'utf8').split(/\r?\n/).length;
  if (n > ends[t]) past++;
}
const aside = [
  past ? `${past} 枚行号已越过目标表尾` : null,
  ghost ? `${ghost} 枚指到一张不在盘上的表` : null,
].filter(Boolean).join('／');
console.log(`· 裸行号读到 ${bare.length} 枚（登记值 ${BARE_RATCHET}）`
  + (aside ? `，其中 ${aside}（只报不红：棘轮只管枚数）` : '')
  + (bare.length > 0 && bare.length < BARE_RATCHET ? `；比登记值少 ${BARE_RATCHET - bare.length} 枚——棘轮就是要让它绿着往下走，下一次把登记值往小里滑一格是那一族的账` : ''));
for (const x of reds) console.log(x);
if (reds.length) { console.log(`✗ pointer-check：${reds.length} 句红`); process.exit(1); }
console.log(`✓ 指针：${live.length} 枚符号锚枚枚落到位，裸行号 ${bare.length} 枚未涨过登记值 ${BARE_RATCHET}，两处同源都在`);
