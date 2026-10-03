/* 正文排版白名单（§15）：段落 / ## H2 / ### H3 / - 与 1. 列表 / > 引用 / --- 分隔线 /
   *em* 与 **strong** 与 ***粗斜*** / `code` / 围栏代码块 ```lang / |a|b| 表格 / [文字](链接) /
   ![alt](src "图注") / [^id] 脚注 / ^[文字] 边注 / {底|注} 双语注（四轮 §2-1：`<ruby>`，中文为底、拉丁为注）
   解析器从旧版 assets/mistwood.js 原样搬来，规范里的"不超纲"就靠它 */
import { intrinsicAttrs } from './image-dims.js';
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
/* 进过 esc() 的文本再进属性时只补引号，别把 &amp; 又 Esc 一遍 */
function attr(s){ return String(s).trim().replace(/"/g,'&quot;'); }
const OK_LINK = /^(?:https?:|mailto:|#)/i;
const HAS_SCHEME = /^[a-z][a-z0-9+.\-]*:/i;         /* 带协议头又不被允许 ⇒ javascript:/data:/vbscript: 一律拒绝 */
/* 正文里的相对路径一律钉到站点根：详情页在 /essays/<slug>/，照着文件位置写会解析成 /essays/assets/…；
   旧站习惯写的 things.html 顺手换成 Astro 的目录式 URL */
function root(u){
  if (HAS_SCHEME.test(u) || /^[#?]/.test(u)) return u;
  let p = u.replace(/^(\.\/|\.\.\/)+/, '').replace(/^\/+/, '');
  /* Obsidian 的库根是仓库根，它给的绝对路径因此多一层 `public/`；这枚前缀不进任何站上 URL，
     没有合法住户 ⇒ 只剥第一枚、且后面必须有东西（规范 §15「路径一律钉到站点根」那一格） */
  p = p.replace(/^public\/(?=.)/, '');
  if (/^[^/?#]+\.html$/.test(p)) return '/' + p.slice(0, -5) + '/';
  return '/' + p;
}
function href(s){ const u = root(String(s).trim()); return (!HAS_SCHEME.test(u) || OK_LINK.test(u)) ? attr(u) : '#'; }
function strictHref(s){ const u = String(s).trim(); if (!HAS_SCHEME.test(u)) return ''; const h = href(u); return h === '#' ? '' : h; }   /* front matter 那两枚 URL 键要的读法：要么能用、要么没有。协议判据仍然只有 :10-11 那两枚正则加 href()，这里不新开第三份白名单；为什么要有它——见文件末导出表那一格 */
function imgSrc(s){ const u = root(String(s).trim()); return (!HAS_SCHEME.test(u) || /^https?:/i.test(u)) ? attr(u) : ''; }

const U = '((?:[^()\\s]|\\([^()]*\\))*)';           /* 允许 url(Wikipedia) 这种带括号的地址：括号要成对才吃 */
const TITLE = '(?:\\s+"([^"]*)")?';
const IMG_RE   = new RegExp('!\\[([^\\]]*)\\]\\(' + U + TITLE + '\\)', 'g');
const IMG_ONE  = new RegExp('^!\\[([^\\]]*)\\]\\(' + U + TITLE + '\\)$');
const IMG_LINK = new RegExp('^\\[!\\[([^\\]]*)\\]\\(' + U + TITLE + '\\)\\]\\(' + U + '\\)$');
const LINK_RE  = new RegExp('\\[([^\\]]+)\\]\\(' + U + TITLE + '\\)', 'g');

/* 正文里那一枚 `<img>` 发什么属性（`card/imgpipe`，2026-09-30）。一枚一枚交代，因为这仓对"顺手加"敏感：
   · `width` / `height`——**构建期从真文件头读**（`src/lib/image-dims.js`，零依赖）。落点是 `essay.css`
     那条 `.post-body figure.shot img{ display:block; width:100%; height:auto }`：`height:auto` 在没有固有尺寸的
     img 上取图前量不出高 ⇒ 解码完成那一瞬间布局盒从 0 长到几百 px，那是 CLS 的教科书形状。有了这两枚，UA 样式表
     的 `aspect-ratio: attr(w)/attr(h)` 让盒子在取图之前就对。**读不到就不发**（远端／盘上没有／格式认不出），
     绝不猜数——错数比缺档贵：缺数只是那一格没修，错数会让盒子先按错的长、解码后再跳一次。
   · `decoding="async"`——只跟着 `loading="lazy"` 发，不跟着首屏那两张照片发。三条理由：
       ① 内容位（正文图／封面／图鉴截图）今天与将来都是 `loading="lazy"`，而 **Blink 对 lazy 图的 `decoding`
          默认值本来就是 `async`**（规范上 `auto` 在延迟载入时按 async 解）⇒ 这一枚是把浏览器已经在做的事**写下来**，
          不是让它改做另一件事；
       ② 它改的是"解码在不在主线程上等一帧"，不改布局盒、不改 §8.4 那条散雾链——`.in` 那一步挂在 `load` 事件上
          （`src/scripts/site.js`），`decoding` 不动 `load` 的时机；
       ③ 首屏那两张 `bg-*.jpg` **不加**：它们是 eager 载入的，那里 `auto` 解到的是"sync"一侧，改成 async 会
          把"第一帧有影"推迟到解码之后，而 §8.2 那张时间轴（照片 1.2s 起、2.2s 走完、3.4s 收口）是按现在的解码
          时机签过字的——要动它得连那串数一起复量，不在这一卡的格子里。 */
function imgEl(alt, s){
  const u = imgSrc(s);
  return u ? `<img src="${u}" alt="${attr(alt)}"${intrinsicAttrs(u)} loading="lazy" decoding="async">` : '';
}
function figure(alt, s, cap){
  const el = imgEl(alt, s);
  if (!el) return '';
  return `<figure class="shot"><span class="frame">${el}</span>`
       + (cap ? `<figcaption>${esc(cap)}</figcaption>` : '') + `</figure>`;
}
function link(text, h){
  const raw = String(h).trim();
  return `<a href="${href(raw)}"` + (/^https?:/i.test(raw) ? ' target="_blank" rel="noopener noreferrer"' : '') + `>${text}</a>`;
}

/* ---- 脚注 [^id] 与边注 ^[文字]：编号按"正文里第一次出现"排，不按定义顺序 ----
   两者都是单来源、零 JS：脚注落到文末列表 + ↩ 回链；边注宽屏浮进左缘，窄屏就地留在句间 */
const FN_LINE = /^\[\^([^\]]+)\]:/;
const FN_DEF = /^\[\^([^\]]+)\]:[ \t]*(.*)$/;
/* 脚注 id 要进 URL 片段和 id 属性：先按 Unicode 字母/数字/连字符白名单过一遍，再限长。
   白名单不是装饰——`[^注一]` 与 `[^注二]` 若都被清成空串，两条定义会合并成一条、锚点还会撞车 */
const safe = s => String(s).replace(/[^\p{L}\p{N}-]/gu, '-').replace(/^-+|-+$/g, '').slice(0, 32);
/* 作者会把定义连着写在文末：一块多行时一行算一条，不以 [^ 开头的行接回上一条 */
function collectDefs(block){
  let cur = '';
  for (const line of block.split('\n')){
    const m = line.match(FN_DEF);
    if (m){ cur = safe(m[1]); fnDefs.set(cur, m[2].trim()); }
    else if (cur) fnDefs.set(cur, (fnDefs.get(cur) + ' ' + line.trim()).trim());
  }
}
/* 模块级而不是 renderMd 的局部：notes 那类页面直接调 inlineMd，状态得一直在那儿。
   allowRefs 决定这套语法在不在——它只属于整篇渲染，碎碎念那种"一段走 inlineMd"不该长出文末注 */
const fnDefs = new Map(), fnOrder = [], anchored = new Set(), sn = { n: 0 };
let allowRefs = false;

function fnRef(raw){
  const id = safe(raw);
  if (!id || !fnDefs.has(id)) return '<sup class="fnref fn-missing">∗</sup>';   /* 引用了却没定义：不给号、不给链接，免得造出死锚点（§12） */
  let at = fnOrder.indexOf(id);
  if (at < 0){ fnOrder.push(id); at = fnOrder.length - 1; }
  const n = at + 1;
  /* 同一处脚注被引用两次：号数复用，但 ↩ 的落点只能有一个，id 给第一次 */
  const first = !anchored.has(id);
  if (first) anchored.add(id);
  return `<sup class="fnref"${first ? ` id="fnref-${id}"` : ''}><a href="#fn-${id}">${n}</a></sup>`;
}
function sideNote(text){          /* text 已经过 esc()，这里只包壳，不再 Esc 一遍 */
  return `<span class="sidenote"><span class="sn-mark">${++sn.n}</span>${text}</span>`;
}
function footnotes(){
  if (!fnOrder.length) return '';
  const items = fnOrder.map((id, i) => {
    const back = `<a class="backref" href="#fnref-${id}" aria-label="回到正文第 ${i + 1} 处">&#8617;</a>`;
    return `<li id="fn-${id}">${inlineMd(fnDefs.get(id))} ${back}</li>`;
  }).join('');
  return `<section class="footnotes"><h2 class="fn-title">注</h2><ol>${items}</ol></section>`;
}

/* ---- {底|注}：双语层（四轮 §2-1，"两种声音"那一枚身份项在一句话里看得见）----
   形状：底＝中文、注＝拉丁 → `<ruby>底<rp>(</rp><rt>注</rt><rp>)</rp></ruby>`。
   为什么是这一枚记法：`{底|注}` 与已在册的 `^[x]`／`[^x]`／`|a|b|` 三族同形（一对记号夹一段字、一枚分隔符
   分两半），且不撞现有任何一条规则——`{` 在正文里今天没有任何构造认领它，而 `|` 的那一枚主人在**块级**
   （表格要整块才认），行内这一层它是自由的。

   ⚠️ 封闭清单（文件头那三行）就是这一枚新构造的入账处；`src/lib/feed.js` 的 `ALLOW` 同步收了 ruby／rt／rp
   三枚壳（各允许的属性＝无），`tools/feed-check.mjs` ③ 那一格的直方图也把它们算进页面 ⇄ feed 的对账。

   边界五判（每一判在 `tools/check-markdown.mjs` 那一族的格子里都有名字）：
   ① 注为空（`{雾退|}`）⇒ **不出半截壳**：交回"只有底、无 ruby 壳"，与 schema 那一份 `blankSlot` 同一口径
      （没填＝那一层不存在，而不是留一枚空壳在纸上）；壳不发，rt 因此也不会以空元素出现。
   ② 底为空（`{|x}`，含只有空白底的 `{ |x }`）⇒ 整枚按字面留在纸上（连花括号一起）：注音没有可挂的底，
      发一枚没有底只有注的 ruby 就是凭空在行上方画一字。
   ③ 未闭合（缺右花括号）⇒ 不匹配、按字面。两半的字符类都不含换行、也不含花括号自己，所以一枚坏记号
      最多把它自己那一串留在纸上，绝不与后文配对、绝不把整段吞掉——这是本构造最容易做成"看着绿其实炸了"
      的一格；先例是引用署名识别曾用 `[—-]{1,2}` 把「> 我们用 1.0-beta 发布」从中间劈开（判据现在住在
      `quoteMd`，同一条教训）。
   ④ 注里带竖线（`{a|b|c}`）⇒ 三段形状不算注音，整枚按字面：两半的字符类都排除竖线，于是匹配**不成立**，
      而不是"取前两段、把第三段吞掉"。
   ⑤ 注里带换行 ⇒ 字符类排除换行符，同上按字面。段落在 `renderMd` 里已先把换行换成空格，所以这一判管的是
      `inlineMd` 被单独调用的那几处（碎碎念／首页那一条），它们吃的可以是多行原句。

   嵌套的裁决：**注不进排印容器**。花括号之内（底与注两半都算）不再解析任何行内构造——注是**注音**，不是又
   一层 em／code 的宿主；底是被注音的那几个字，也不是容器。落地方式＝渲染好的整枚壳进 kept 占位符、
   最后一步才还原（与反引号 code 同一机制），于是「{a**b**|c}」里的星号按字面、「{a|[^b]}」里的
   中括号不会长成脚注引用。反过来「*斜* 里套 {底|注}」成立：em 那一步在外层，壳里壳外互不干涉。

   ⚠️ 残余照登（与既有 code 占位符同一条路，不是新造的路）：作者把 {x|y} 写进链接地址里（`[文字](/a{x|y})`）
   时，还原那一步会把壳落进 href 的值里——今天「[t](/a`y`z)」对 code 元素已经是同一行为。它逃不出属性：
   三枚壳零属性、字面里没有引号，而 esc() 走在最前，`check-markdown.mjs` 那一族"引号成对"的不变式在这一格
   同样钉着。 */
const RUBY_RE = /\{([^|\n{}\u0000]+)\|([^|\n{}\u0000]*)\}/g;
function rubyEl(base, gloss, raw){
  const b = base.trim(), g = gloss.trim();
  if (!b) return raw;        /* 判②：底为空 ⇒ 原样交回整枚字面（不走占位符，与"根本没匹配"同一读法） */
  if (!g) return b;          /* 判①：注为空 ⇒ 只有底、无壳（blankSlot 口径；底此时就是普通行文，照走后面那几条行内规则） */
  return `<ruby>${b}<rp>(</rp><rt>${g}</rt><rp>)</rp></ruby>`;
}

function inlineMd(s){              /* 行内：`code` · *em* · **strong** · [文字](链接) · [^id] · ^[注] · {底|注}。图片是块级，不走这里 */
  /* 反引号先摘出来占位：不这么做，`[^1]` 会在自己被渲染成 code 之前就被当脚注引用吃掉，
     `[a](url)` 也一样——code 里的东西必须按字面出现（§15） */
  const kept = [];
  const codeless = String(s).replace(/`([^`]+)`/g, (m, c) => { kept.push('<code>' + esc(c) + '</code>'); return '\u0000' + (kept.length - 1) + '\u0000'; });
  return esc(codeless)
    /* 双语注走在最前，而且渲染好的壳立刻进 kept 占位符（与反引号 code 同一机制）：
       占位符是"字面里没有一条行内规则读得懂的一串字符"，所以壳里的星号、中括号、脱字符都到不了
       下面那几条规则跟前 ——「注不进排印容器」这一句就是靠这一步落地的，不靠前端的什么约定。 */
    .replace(RUBY_RE, (m, base, gloss) => {
      const el = rubyEl(base, gloss, m);
      if (el === m) return m;                                  /* 判②：底为空，整枚按字面留纸，不占位、不吞后文 */
      kept.push(el); return '\u0000' + (kept.length - 1) + '\u0000';
    })
    /* 边注与脚注必须赶在 LINK_RE 之前：`^[x](y)` 会被链接规则当成 [x](y) 吃掉 */
    .replace(/\^\[([^\]]*)\]/g, (m, t) => (allowRefs ? sideNote(t) : m))
    .replace(/\[\^([^\]]+)\]/g, (m, id) => (allowRefs ? fnRef(id) : m))
    /* 加粗必须赶在斜体之前，而且分两枚模式：先 `***粗斜***`（它含着一枚 `**`，晚一步就被下面那条劈开），
       再 `**粗**`。倒过来的旧行为是：`**加粗**` 从第 2 枚星号起被斜体吃掉一半、屏幕上剩一枚裸 `*`。
       惰性 `[\s\S]+?` 不写 `[^*]+`——后者撞上 `**a *b* c**` 里那对单星号就断在半路，整条粗体匹配不上，
       剩下的 `**` 又会落回斜体那一枚规则里（§15 两侧格子各钉一条）。 */
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(LINK_RE, (m, text, h) => link(text, h))
    .replace(/\u0000(\d+)\u0000/g, (m, i) => kept[i]);
}

/* ---- 块级新面孔：一次只认"整块都是这个形状"，不做嵌套 ---- */
const allMatch = (lines, re) => lines.every(l => re.test(l));
function listMd(t, ordered){
  const re = ordered ? /^(\d+)[.)][ \t]+/ : /^[-*][ \t]+/;
  const lines = t.split('\n').map(l => l.replace(re, ''));
  const start = ordered ? (t.match(/^(\d+)/) || [,'1'])[1] : null;
  const items = lines.map(l => '<li>' + inlineMd(l.trim()) + '</li>').join('');
  return ordered ? `<ol start="${start}">${items}</ol>` : `<ul>${items}</ul>`;
}
function quoteMd(t){
  const body = t.split('\n').map(l => l.replace(/^>[ \t]?/, '')).join('\n');
  /* 署名必须是独立一行的 —— 或 --。原先写成 [—-]{1,2}，一个半角连字符也算，
     于是「> 我们用 1.0-beta 发布」被从中间劈成正文 + footer */
  const who = body.match(/\n[ \t]*(?:—{1,2}|--)[ \t]*([^\n]+)$/);
  const text = who ? body.slice(0, who.index) : body;
  return '<blockquote>' + text.trim().split(/\n{2,}/).map(p => '<p>' + inlineMd(p.replace(/\n/g, ' ').trim()) + '</p>').join('')
       + (who ? `<footer>${inlineMd(who[1].trim())}</footer>` : '') + '</blockquote>';
}

/* ---- 围栏代码块 ```lang：整块只过 esc()，一枚字节都不许进 inlineMd ----
   和行内 `code` 同一条理由（§15"code 里的东西一律按字面出现"），只是范围扩到整块：
   围栏里写 [^1]、写 **x**、写 |a|b| 都必须原样落进 <pre>，因为它们是"被读的代码"不是"被排版的散文"。 */
const FENCE_IN = /^ {0,3}(`{3,})[ \t]*([^\n]*)$/;     /* 开栏：至多三枚前导空格（第四枚就进代码了） */
const FENCE_OUT = /^(`{3,})[ \t]*([^\n]*)\n?([\s\S]*?)(?:\n {0,3}`{3,}[ \t]*)?$/;
function codeMd(t){
  const m = t.match(FENCE_OUT);
  if (!m) return null;
  /* 语言标识要进 data-lang（后面那张卡靠它挂复制钮），所以只收白名单形状：
     收不下就整个不要这一枚属性——宁可没有标签，不许拿作者的说明串去拼属性 */
  const one = m[2].trim().split(/\s+/)[0];
  const lang = /^[A-Za-z0-9._+-]{1,24}$/.test(one) ? one.toLowerCase() : '';   /* 小写：§12 禁大写标签 */
  /* 未闭合的围栏一路吃到文末（CommonMark 同一口径），尾随空行不算内容 */
  const body = m[3].replace(/\n+$/, '');
  return `<div class="codeblock"${lang ? ` data-lang="${lang}"` : ''}>`
       + `<pre class="code"><code>${esc(body)}</code></pre></div>`;
}

/* ---- 表格 |a|b| + 分隔行 ----
   认不认一枚块，判据全在第二行：那一行必须含竖线、且每一格都是 `:?-+:?`。
   含竖线这一条有牙——`标题\n---` 那种 setext 写法（白名单里没有）不许被重新解释成一列表格，
   那等于把作者的一行标题换成一块空表。 */
const T_CELL = /^:?-+:?$/;
function splitRow(line){
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const out = [];
  let buf = '';
  for (let i = 0; i < s.length; i++){
    if (s[i] === '\\' && s[i + 1] === '|'){ buf += '|'; i++; continue; }   /* \| 是内容里的竖线，不是分格 */
    if (s[i] === '|'){ out.push(buf); buf = ''; continue; }
    buf += s[i];
  }
  out.push(buf);
  return out;
}
function sepCols(line){
  if (!line.includes('|')) return null;
  const cols = splitRow(line).map(c => c.trim());
  if (!cols.length || !cols.every(c => T_CELL.test(c))) return null;
  /* 对齐只由冒号的位置决定：`:---:` 中、`---:` 右、`---` 与 `:---` 左。
     `:---` 不落 class——左对齐是这张表的默认读法，写它等于什么都不改。 */
  return cols.map(c => {
    const l = c.startsWith(':'), r = c.endsWith(':');
    return l && r ? 'c' : r ? 'r' : '';
  });
}
function tableMd(t){
  const lines = t.split('\n');
  if (lines.length < 2) return null;                  /* 只有表头没有分隔行 ⇒ 不是表格，退回段落 */
  const cols = sepCols(lines[1]);
  if (!cols) return null;
  const head = splitRow(lines[0]);
  if (head.length !== cols.length) return null;       /* 表头与分隔行格数不等：作者写坏了，不猜 */
  const cells = line => {
    const c = splitRow(line);
    return c.length > cols.length ? c.slice(0, cols.length) : c.concat(Array(cols.length - c.length).fill(''));
  };
  const row = (arr, tag) => '<tr>' + arr.map((c, i) => {
    const al = cols[i] === 'c' ? ' class="al-c"' : cols[i] === 'r' ? ' class="al-r"' : '';
    return `<${tag}${al}>${inlineMd(c.trim())}</${tag}>`;      /* 格子里要能放链接与行内 code，所以走 inlineMd */
  }).join('') + '</tr>';
  const body = lines.slice(2).map(cells).filter(r => r.some(c => c.trim() !== ''))
                    .map(r => row(r, 'td')).join('');
  return `<div class="tablewrap"><table><thead>${row(head, 'th')}</thead><tbody>${body}</tbody></table></div>`;
}

/* ---- 块切分：围栏之内不切 ----
   原先这里是一句 `md.split(/\n{2,}/)`，而代码块内部**允许有空行**，一枚围栏会被劈成两半、
   前半尾巴上还带着那枚裸 ``` 上屏。改成逐行游标：空行只有在"不在围栏里"时才算分块。
   ⚠️ 它是 `split(/\n{2,}/)` 的**替身不是改写**——交回给上层的那串块，在没有围栏的稿子里与旧写法
   逐块相同（check-markdown 第四轮拿三篇 fixture 逐元素比过），所以下面那两趟 collectDefs
   （脚注定义习惯写在文末、引用却在开头）读的块序列一个字没变，脚注编号与缺号判据都不受牵动。
   归一 CRLF 之后才走这里：围栏识别按 '\n' 分行，'\r' 会把 ` ``` ` 那行读成带尾字符的一行。 */
function splitBlocks(md){
  const out = [];
  let buf = [], fence = 0;
  for (const line of md.split('\n')){
    if (fence){                                       /* 在栏里：空行不算分块，只有同等长度的反引号独行才关栏 */
      buf.push(line);
      const c = line.match(/^ {0,3}(`+)\s*$/);
      if (c && c[1].length >= fence) fence = 0;
      continue;
    }
    const open = line.match(FENCE_IN);
    if (open){ buf.push(line); fence = open[1].length; continue; }
    if (line === ''){ if (buf.length){ out.push(buf.join('\n')); buf = []; } continue; }
    buf.push(line);
  }
  if (buf.length) out.push(buf.join('\n'));
  return out;
}

/* ---- 章的 id：构建期就落在正文里（`card/anchors`，§15 详情页那一格 / §19.3 那格陷阱的同族）----
   规则一句话可复算：**id = safe( 行首记号之后的整串原文 )**，`safe`（:52）就是脚注 id 一直在用的
   那一份函数（Unicode 字母/数字/连字符留下、其余换 `-`、首尾不留、限长 32），这里不新开第二份规范化。
   ⚠️ 原料是**原文**而不是渲染结果：`inlineMd` 的输出带着 `&amp;` 与 `<em>` 这类壳，拿它当原料就会把
      标记名混进地址（`## 用 *斜体*` → 渲染串里会数出 `em`）。可见文字仍走 `inlineMd`。
   ⚠️ 重名（同一篇里两枚同名标题）⇒ 第一枚拿裸值，第二枚起加 `-2`、`-3`…（`headTaken` 按章序推进，
      所以后缀是一枚**确定性行为**，不是"谁先谁后看运气"；集合里查过了才放行，产物内绝不出现两枚同值 id）。
   ⚠️ 归一化之后是空串（`## ！？` 那种纯标点章）⇒ 退 `sec-<章序>`，**不许发空 id**：空串是一枚点不开的
      活锚（§12 死锚点），而 `id=""` 也会让第二枚空串撞车。 */
const headsOut = [];
const headTaken = new Set();
function headId(raw, idx){
  const base = safe(raw) || ('sec-' + idx);
  let id = base, n = 2;
  while (headTaken.has(id)) id = base + '-' + (n++);   /* 后缀一路试到没被占过的那枚 ⇒ 唯一性由集合保证 */
  headTaken.add(id);
  return id;
}
/* 一枚标题只在这里成形一次：正文那个标签、目录那一行的字、刻度那一排的位置，全吃同一次调用的产物 */
function headBlock(level, raw){
  const id = headId(raw, headsOut.length);
  const inner = inlineMd(raw);
  headsOut.push({ level, id, text: inner.replace(/<[^>]+>/g, '') });
  /* 一轮 §C1 那枚**结构性锚**（规范 §15·「标题的锚点记号（一轮 §C1）」那一格预先签的形状，判成"纯链接版"）：
     · 只在这里发，不在模板里对渲染结果再跑一遍正则插锚——那一格把那条方案判否了，理由是它让"标题成形"
       从一处变成两处真值；
     · `href` 吃的就是上面那一枚既有 `id`（片段与 id 同源 ⇒ §12 死锚点禁令的正面，不是第二次取值）；
     · 字面只有 `#` 一个字符（§9·「井号 `#` 这枚记号在站内的归属」：这一枚**用字不用图形**，不许长成线、不许长成点）；
     · 类名 `headref` 与 `fnref`／`backref` 同族（那一族都住在正文里、都由这里发），三处同源＝这一行 /
       `essay.css` 那三条规则 / 规范那一格；`tools/check-markdown.mjs` 的 `auditHeadAnchors()` 钉的是**结构**
       （至多一枚锚／href 逐字等于 `#`+本级 id／字面单字符），**没有**把类名钉进尺子，所以名字归本格管；
     · 锚**不进** `heads[].text`（上面那行先去壳再交回）：目录那一行与窄屏刻度的 `data-label` 吃的就是那份字，
       带上它同一件事会在页面上出现两枚 `#`，而目录那枚本来就在说"跳这一节"。
     零脚本：点下去的行为是浏览器自己的（写地址栏、入历史、滚过去），与文末 `top · 回到这一篇的开头` 同一族。 */
  return `<h${level} id="${id}">${inner}<a class="headref" href="#${id}">#</a></h${level}>`;
}

function renderMd(md0){            /* 块级：段落 / H2 / H3 / 列表 / 引用 / 分隔线 / 代码围栏 / 表格 / 图片行（整段是图、图包在链接里也算） */
  /* 行尾不许是输入的一部分：下面整份解析器以 '\n' 为唯一行分隔（splitBlocks 切块、split('\n') 拆引用），
     而 `core.autocrlf=true` 的机器上 `git clone` 会把稿件落成 CRLF —— 那时 '\r\n\r\n' 里两个 '\n' 不相连，
     一篇稿子塌成一整枚 <p>、'## ' 以字面量上屏，而 build 全绿。new-post.mjs 的 read() 早已为同一个坑
     归一成 LF，渲染器漏了：检查归一、渲染不归一 ⇒ 门禁绿得恰恰因为它赦免了同一件事。 */
  const md = String(md0).replace(/\r\n/g, '\n');
  fnDefs.clear(); fnOrder.length = 0; anchored.clear(); sn.n = 0; allowRefs = true;
  headsOut.length = 0; headTaken.clear();   /* 章的 id 与去重集合是**一篇一份**：不清就会把上一篇的后缀账带进来 */
  /* 两趟：脚注定义习惯写在文末，可引用在开头——先收完定义再渲染，否则第一处引用会当成缺号 */
  const blocks = [];
  for (const raw of splitBlocks(md)){
    const t = raw.trim();
    if (!t) continue;
    if (FN_LINE.test(t)) { collectDefs(t); continue; }   /* 一整块都是定义：一行一条，续行接上一条 */
    blocks.push(t);
  }
  const html = blocks.map(t => {    if (t.startsWith('```')) { const code = codeMd(t); if (code) return code; }
    const tbl = tableMd(t);
    if (tbl) return tbl;
    if (t.startsWith('### ')) return headBlock(3, t.slice(4));
    if (t.startsWith('## ')) return headBlock(2, t.slice(3));
    if (/^(?:-{3,}|\*{3,})$/.test(t)) return '<hr>';
    const lines = t.split('\n');
    if (allMatch(lines, /^[-*][ \t]+/)) return listMd(t, false);
    if (allMatch(lines, /^\d+[.)][ \t]+/)) return listMd(t, true);
    if (allMatch(lines, /^>/)) return quoteMd(t);
    const li = t.match(IMG_LINK);
    if (li) return link(figure(li[1], li[2], li[3]), li[4]);
    const one = t.match(IMG_ONE);
    if (one) return figure(one[1], one[2], one[3]);
    let figs = '';                 /* 段里夹的图提到段后落图版：680 栏里没有"行内缩略图"这种位置 */
    const text = t.replace(IMG_RE, (m, alt, s, cap) => { figs += figure(alt, s, cap); return ''; })
                   .replace(/\n/g, ' ').trim();
    return (text ? '<p>' + inlineMd(text) + '</p>' : '') + figs;
  }).join('');
  const all = html + footnotes();
  allowRefs = false;               /* 这套语法只属于整篇渲染：inlineMd 单独被别处调用时不该留下注号 */
  return all;
}

/* 详情页要的读法：正文与那一页的章**同一次调用交回来**。
   ⚠️ 为什么不叫 `renderMd` 之后再问一枚 `heads()` 全局：那样"渲染"与"取章"是两步，中间插进第二篇的
   渲染就会读到别人的账（模块级状态本来就是为脚注那套"一处渲染全程"留的，见 :64 那段说明）。
   一步交回两样，页面上就没有"拿错那一篇的目录"这条路；目录、刻度、正文那一排 id 因此同源。 */
function renderArticle(md0){
  const html = renderMd(md0);
  return { html, heads: headsOut.map(h => ({ level: h.level, id: h.id, text: h.text })) };
}

/* 日期在 front-matter 里是 ISO，站上按等宽点分格式显示 */
function fmtDate(d){
  return [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join('.');
}

/* `href` 自第十五轮 `card/permit` 起对外导出：详情页页脚那一行要消毒 front matter 里的两枚 URL
   （`sourceLink` / `licenseUrl`），而**协议白名单只许有一处真值**——`OK_LINK` 与 `HAS_SCHEME` 就住在上面
   :10-11，`link()` 与页面消费的是同一枚函数。渲染逻辑一个字没改，改的只有这一行导出表。
   `strictHref()`（:21，同一轮的补丁 `card/permitfix` 多导出的那一枚）为什么存在——`href()` 有两副坏形状，
   正文里都是对的、页脚那一行里都不许留：① 协议不合格（`javascript:`／`data:`／`vbscript:`）时它交回**字面量 `'#'`**，
   那是正文链接要的兜底（句子里那枚坏地址仍要留在纸上），却正是 §12 死锚点禁令的 canonical 形状；
   ② **缺协议头**（`example.com/x`）时 `root()` 把它当站内相对路径钉到站点根（⇒ `/example.com/x`），
   长出一枚看着像真链接、点开 404 的活锚，比 `#` 更隐蔽。front matter 这两枚键要的是"**要么能用、要么没有**"，
   所以在这里多导出第二枚函数，而不是让页面或 `tools/` 各写一份协议判据。正文那条路（`link()` / `href()`）
   一个字没动——改的只有导出表这一行与它上面这段说明。
   ⚠️ `attr()`（:10）自 `v7a/reading`（窄屏"在读哪一章"那一枚替身）起也对外导出：详情页 `#progress-marks`
   那一排 `<span>` 现在各带一枚 `data-label`，值是**章名**，而章名只有 `heads[].text` 这一份出处——它已经过
   `esc()`，直接进 Astro 的属性表达式会被**再转义一遍**（`&amp;` 长成 `&amp;amp;`，屏上出现字面 `&amp;`，
   `[slug].astro` 目录那一格为同一枚坑写着 `set:html`）。属性要的是"只补引号、不重 Esc"，那句判据本来就住在这
   一枚函数里（`:9` 那句注释就是它的原文），所以这里导出它，而不是在模板里抄一遍 `.replace(/"/g,'&quot;')`
   ——抄的那份改了没人知道（§13a）。渲染逻辑仍一个字没改。 */
export { renderMd, renderArticle, inlineMd, fmtDate, root, safe, splitBlocks, href, strictHref, attr };
