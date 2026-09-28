/* 正文排版白名单（§15）：段落 / ## H2 / ### H3 / - 与 1. 列表 / > 引用 / --- 分隔线 /
   *em* / `code` / [文字](链接) / ![alt](src "图注") / [^id] 脚注 / ^[文字] 边注
   解析器从旧版 assets/mistwood.js 原样搬来，规范里的"不超纲"就靠它 */
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
  const p = u.replace(/^(\.\/|\.\.\/)+/, '').replace(/^\/+/, '');
  if (/^[^/?#]+\.html$/.test(p)) return '/' + p.slice(0, -5) + '/';
  return '/' + p;
}
function href(s){ const u = root(String(s).trim()); return (!HAS_SCHEME.test(u) || OK_LINK.test(u)) ? attr(u) : '#'; }
function imgSrc(s){ const u = root(String(s).trim()); return (!HAS_SCHEME.test(u) || /^https?:/i.test(u)) ? attr(u) : ''; }

const U = '((?:[^()\\s]|\\([^()]*\\))*)';           /* 允许 url(Wikipedia) 这种带括号的地址：括号要成对才吃 */
const TITLE = '(?:\\s+"([^"]*)")?';
const IMG_RE   = new RegExp('!\\[([^\\]]*)\\]\\(' + U + TITLE + '\\)', 'g');
const IMG_ONE  = new RegExp('^!\\[([^\\]]*)\\]\\(' + U + TITLE + '\\)$');
const IMG_LINK = new RegExp('^\\[!\\[([^\\]]*)\\]\\(' + U + TITLE + '\\)\\]\\(' + U + '\\)$');
const LINK_RE  = new RegExp('\\[([^\\]]+)\\]\\(' + U + TITLE + '\\)', 'g');

function imgEl(alt, s){
  const u = imgSrc(s);
  return u ? `<img src="${u}" alt="${attr(alt)}" loading="lazy">` : '';
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

function inlineMd(s){              /* 行内：`code` · *em* · [文字](链接) · [^id] · ^[注]。图片是块级，不走这里 */
  /* 反引号先摘出来占位：不这么做，`[^1]` 会在自己被渲染成 code 之前就被当脚注引用吃掉，
     `[a](url)` 也一样——code 里的东西必须按字面出现（§15） */
  const kept = [];
  const codeless = String(s).replace(/`([^`]+)`/g, (m, c) => { kept.push('<code>' + esc(c) + '</code>'); return '\u0000' + (kept.length - 1) + '\u0000'; });
  return esc(codeless)
    /* 边注与脚注必须赶在 LINK_RE 之前：`^[x](y)` 会被链接规则当成 [x](y) 吃掉 */
    .replace(/\^\[([^\]]*)\]/g, (m, t) => (allowRefs ? sideNote(t) : m))
    .replace(/\[\^([^\]]+)\]/g, (m, id) => (allowRefs ? fnRef(id) : m))
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

function renderMd(md0){            /* 块级：段落 / H2 / H3 / 列表 / 引用 / 分隔线 / 图片行（整段是图、图包在链接里也算） */
  /* 行尾不许是输入的一部分：下面整份解析器以 '\n' 为唯一行分隔（/\n{2,}/ 切块、split('\n') 拆引用），
     而 `core.autocrlf=true` 的机器上 `git clone` 会把稿件落成 CRLF —— 那时 '\r\n\r\n' 里两个 '\n' 不相连，
     一篇稿子塌成一整枚 <p>、'## ' 以字面量上屏，而 build 全绿。new-post.mjs 的 read() 早已为同一个坑
     归一成 LF，渲染器漏了：检查归一、渲染不归一 ⇒ 门禁绿得恰恰因为它赦免了同一件事。 */
  const md = String(md0).replace(/\r\n/g, '\n');
  fnDefs.clear(); fnOrder.length = 0; anchored.clear(); sn.n = 0; allowRefs = true;
  /* 两趟：脚注定义习惯写在文末，可引用在开头——先收完定义再渲染，否则第一处引用会当成缺号 */
  const blocks = [];
  for (const raw of md.split(/\n{2,}/)){
    const t = raw.trim();
    if (!t) continue;
    if (FN_LINE.test(t)) { collectDefs(t); continue; }   /* 一整块都是定义：一行一条，续行接上一条 */
    blocks.push(t);
  }
  const html = blocks.map(t => {    if (t.startsWith('### ')) return '<h3>' + inlineMd(t.slice(4)) + '</h3>';
    if (t.startsWith('## ')) return '<h2>' + inlineMd(t.slice(3)) + '</h2>';
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

/* 日期在 front-matter 里是 ISO，站上按等宽点分格式显示 */
function fmtDate(d){
  return [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join('.');
}

export { renderMd, inlineMd, fmtDate, root, safe };
