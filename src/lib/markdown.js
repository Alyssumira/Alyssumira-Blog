/* 正文排版白名单（§15）：段落 / ## H2 / *em* / `code` / [文字](链接) / ![alt](src "图注")
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
function inlineMd(s){              /* 行内：`code` · *em* · [文字](链接)。图片是块级，不走这里 */
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(LINK_RE, (m, text, h) => link(text, h));
}
function renderMd(md){             /* 块级：段落 / ## H2 / 图片行（整段是图、图包在链接里也算） */
  return md.split(/\n{2,}/).map(block => {
    const t = block.trim();
    if (!t) return '';
    if (t.startsWith('## ')) return '<h2>' + inlineMd(t.slice(3)) + '</h2>';
    const li = t.match(IMG_LINK);
    if (li) return link(figure(li[1], li[2], li[3]), li[4]);
    const one = t.match(IMG_ONE);
    if (one) return figure(one[1], one[2], one[3]);
    let figs = '';                 /* 段里夹的图提到段后落图版：680 栏里没有"行内缩略图"这种位置 */
    const text = t.replace(IMG_RE, (m, alt, s, cap) => { figs += figure(alt, s, cap); return ''; })
                   .replace(/\n/g, ' ').trim();
    return (text ? '<p>' + inlineMd(text) + '</p>' : '') + figs;
  }).join('');
}

/* 日期在 front-matter 里是 ISO，站上按等宽点分格式显示 */
function fmtDate(d){
  return [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join('.');
}

export { renderMd, inlineMd, fmtDate, root };
