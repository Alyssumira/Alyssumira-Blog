/* mistwood 子页面共享脚本：主题 / 时钟 / 内容渲染 / 滚动入场 / 进度线 / 目录 */
(function(){
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 主题 ---------- */
  const toggle = document.getElementById('theme-toggle');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  const saved = localStorage.getItem('mistwood-theme');
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
  let theme = saved || (systemDark ? 'dark' : 'light');

  function applyTheme(t){
    theme = t;
    root.setAttribute('data-theme', t);
    iconSun.style.display  = t === 'light' ? 'block' : 'none';
    iconMoon.style.display = t === 'dark'  ? 'block' : 'none';
  }
  toggle.addEventListener('click', () => {
    const next = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('mistwood-theme', next);
    applyTheme(next);
  });

  /* ---------- 时间感知：时钟 + 时段 + 天气词 ---------- */
  const clockEl = document.getElementById('clock');
  const weatherEl = document.getElementById('weather-word');
  let phase = 'day';

  function phaseOf(h){
    if (h >= 5  && h < 9)  return 'dawn';
    if (h >= 9  && h < 17) return 'day';
    if (h >= 17 && h < 20) return 'dusk';
    return 'night';
  }
  const weatherWord = { dawn:'fog', day:'light', dusk:'dusk', night:'night' };

  function tick(){
    const now = new Date();
    clockEl.textContent = String(now.getHours()).padStart(2,'0') + ':' +
                          String(now.getMinutes()).padStart(2,'0');
    const p = phaseOf(now.getHours());
    if (p !== phase){
      phase = p;
      root.setAttribute('data-phase', p);
      weatherEl.textContent = weatherWord[p];
    }
  }

  /* ---------- 内容渲染（数据在 assets/content.js） ---------- */
  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  /* 进过 esc() 的文本再进属性时只补引号，别把 &amp; 又 Esc 一遍 */
  function attr(s){ return String(s).trim().replace(/"/g,'&quot;'); }
  const OK_LINK = /^(?:https?:|mailto:|#)/i;
  const HAS_SCHEME = /^[a-z][a-z0-9+.\-]*:/i;         /* 带协议头又不被允许 ⇒ javascript:/data:/vbscript: 一律拒绝 */
  function href(s){ const u = String(s).trim(); return (!HAS_SCHEME.test(u) || OK_LINK.test(u)) ? attr(u) : '#'; }
  function imgSrc(s){ const u = String(s).trim(); return (!HAS_SCHEME.test(u) || /^https?:/i.test(u)) ? attr(u) : ''; }

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

  /* 数字：所有 <b data-count="essays|things|notes"> 自动填真实条数 */
  document.querySelectorAll('[data-count]').forEach(el => {
    const k = el.dataset.count;
    if (window.CONTENT && CONTENT[k]) el.textContent = String(CONTENT[k].length).padStart(2,'0');
  });

  /* 文章列表（essays.html）：有 excerpt → B 横条卡，无 → C 纯文字卡；整卡可点 */
  const essayList = document.getElementById('essay-list');
  if (essayList && window.CONTENT){
    essayList.innerHTML = CONTENT.essays.map(e => e.excerpt
      ? `<a class="essay-card card-b reveal" href="essay.html?p=${encodeURIComponent(e.slug)}">
           <div class="cover">${e.cover ? `<img src="${esc(e.cover)}" alt="" loading="lazy">` : ''}</div>
           <div>
             <h3>${esc(e.title)}</h3>
             <p>${esc(e.excerpt)}</p>
             <time>${esc(e.date)}</time>
           </div>
         </a>`
      : `<a class="essay-card card-c reveal" href="essay.html?p=${encodeURIComponent(e.slug)}">
           <h3>${esc(e.title)}</h3>
           <time>${esc(e.date)}</time>
         </a>`
    ).join('');
  }

  /* 小东西网格（things.html） */
  const thingsGrid = document.getElementById('things-grid');
  if (thingsGrid && window.CONTENT){
    thingsGrid.innerHTML = CONTENT.things.map(t =>
      `<a class="thing reveal" href="${esc(t.link)}">
         ${t.shot ? `<img class="shot" src="${esc(t.shot)}" alt="" loading="lazy">` : ''}
         <div class="thing-bar"><h3>${esc(t.name)}</h3><span>${esc(t.tag)}</span></div>
       </a>`
    ).join('');
  }

  /* notes 列表（notes.html） */
  const notesList = document.getElementById('notes-list');
  if (notesList && window.CONTENT){
    notesList.innerHTML = CONTENT.notes.map(n =>
      `<div class="note reveal">
         <time>${esc(n.date)} · ${esc(n.weather)}</time>
         <p>${inlineMd(n.text)}</p>
       </div>`
    ).join('');
  }

  /* 内容位照片：载入完成后散开模糊（§8.4）；取不到图也放行，别留一块永久雾 */
  function fogImages(){
    document.querySelectorAll('.cover img,.thing .shot,.portrait img,.post-body img').forEach(img => {
      const clear = () => img.classList.add('in');
      if (img.complete && img.naturalWidth) clear();
      else { img.addEventListener('load', clear, {once:true}); img.addEventListener('error', clear, {once:true}); }
    });
  }
  fogImages();

  /* ---------- 文章详情（essay.html 模板）：?p=slug → fetch posts/<slug>.md ---------- */
  const postBody = document.getElementById('post-body');
  const progress = document.getElementById('progress');
  const toc = document.getElementById('toc');

  function updateProgress(){
    if (!progress || !postBody) return;
    const r = postBody.getBoundingClientRect();
    const total = Math.max(r.height - innerHeight, 1);
    const done = Math.min(Math.max(-r.top, 0), total);
    progress.style.transform = `scaleX(${done / total})`;
  }
  function bindProgress(){
    if (!progress || !postBody) return;
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { updateProgress(); ticking = false; });
    }, { passive:true });
    updateProgress();   /* 带滚动位置刷新进来时，进度线不该从 0 开始 */
  }

  function buildToc(){
    if (!toc || !postBody) return;
    const heads = Array.from(postBody.querySelectorAll('h2'));
    heads.forEach((h, i) => {
      if (!h.id) h.id = 'sec-' + i;
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      toc.appendChild(a);
    });
    const links = Array.from(toc.children);
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting){
          links.forEach(l => l.classList.toggle('on', l.hash === '#' + e.target.id));
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach(h => spy.observe(h));
  }

  if (postBody && window.CONTENT){
    const slug = new URLSearchParams(location.search).get('p');
    const idx = Math.max(CONTENT.essays.findIndex(e => e.slug === slug), 0);
    const meta = CONTENT.essays[idx];
    document.title = meta.title + ' · mistwood';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', (meta.excerpt || meta.title) + ' · ' + meta.date);
    document.getElementById('post-title').textContent = meta.title;
    document.getElementById('post-meta').textContent = meta.date + ' · essay';
    const sub = document.getElementById('post-sub');
    if (meta.excerpt){ sub.textContent = meta.excerpt; } else { sub.remove(); }
    /* 上下篇 = 数组邻居 */
    const prev = CONTENT.essays[idx - 1], next = CONTENT.essays[idx + 1];
    const prevEl = document.getElementById('post-prev'), nextEl = document.getElementById('post-next');
    if (prev){ prevEl.href = 'essay.html?p=' + encodeURIComponent(prev.slug);
               prevEl.innerHTML = '<span>← prev</span>' + esc(prev.title); }
    else prevEl.remove();
    if (next){ nextEl.href = 'essay.html?p=' + encodeURIComponent(next.slug);
               nextEl.innerHTML = '<span>next →</span>' + esc(next.title); }
    else nextEl.remove();

    fetch('posts/' + encodeURIComponent(meta.slug) + '.md')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(md => {
        postBody.innerHTML = renderMd(md);
        buildToc();
        fogImages();
        updateProgress();
      })
      .catch(() => {
        postBody.innerHTML = '<p>这篇文章还在路上。如果你是用 file:// 直接双击打开的，md 正文取不到——请起个静态服务器预览（如 <code>python -m http.server</code>），部署后无此限制。</p>';
      });
  }
  bindProgress();

  /* ---------- 滚动入场：错落 80ms，只演一次（规范 §8.7） ---------- */
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  if (reduceMotion){
    revealEls.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      const batch = entries.filter(e => e.isIntersecting);
      batch.forEach((e, i) => {
        e.target.style.transitionDelay = (i * 80) + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: .15 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- 启动 ---------- */
  applyTheme(theme);
  phase = phaseOf(new Date().getHours());
  root.setAttribute('data-phase', phase);
  weatherEl.textContent = weatherWord[phase];
  tick();
  setInterval(tick, 15000);
})();
