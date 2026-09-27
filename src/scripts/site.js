/* 子页面与首页共用：主题 / 时钟 / 滚动入场 / 进度线 / 目录
   列表与正文已由 Astro 在构建期渲染成静态 HTML，这里只剩交互 */
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
    if (iconSun) iconSun.style.display = t === 'light' ? 'block' : 'none';
    if (iconMoon) iconMoon.style.display = t === 'dark' ? 'block' : 'none';
    announce();
  }
  if (toggle) toggle.addEventListener('click', () => {
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
    if (clockEl) clockEl.textContent = String(now.getHours()).padStart(2,'0') + ':' +
                                       String(now.getMinutes()).padStart(2,'0');
    const p = phaseOf(now.getHours());
    if (p !== phase){
      phase = p;
      root.setAttribute('data-phase', p);
      if (weatherEl) weatherEl.textContent = weatherWord[p];
      announce();
    }
  }

  /* 首页的雾灯/萤火虫要看主题与时段脸色，但不想耦合进来——广播一次即可 */
  function announce(){ root.dispatchEvent(new CustomEvent('mistwood:state')); }

  /* ---------- 详情页：进度线 + 目录高亮 ---------- */
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
  if (progress && postBody){
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { updateProgress(); ticking = false; });
    }, { passive:true });
    updateProgress();
  }

  function buildToc(){
    if (!toc || !postBody) return;
    const heads = Array.from(postBody.querySelectorAll('h2:not(.fn-title)'));
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
        if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.hash === '#' + e.target.id));
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach(h => spy.observe(h));
  }
  buildToc();

  /* ---------- 内容位照片：载入完成后散开雾（§8.4），取不到图也放行 ---------- */
  document.querySelectorAll('.cover img,.thing .shot,.portrait img,.post-body img').forEach(img => {
    const clear = () => img.classList.add('in');
    if (img.complete && img.naturalWidth) clear();
    else { img.addEventListener('load', clear, {once:true}); img.addEventListener('error', clear, {once:true}); }
  });

  /* ---------- 滚动入场：错落 80ms，只演一次（规范 §8.7） ---------- */
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  if (reduceMotion){
    revealEls.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      const batch = entries.filter(e => e.isIntersecting);
      batch.forEach((e, i) => {
        /* JS 只交序号，节拍交给 CSS：80ms 这个值写在 .reveal 的 calc 里（§8.7） */
        e.target.style.setProperty('--cascade', i);
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: .15 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---------- 本机载入次数：关于页那一行数字的唯一来源 ----------
     全站每次文档载入 +1（站内跳转也算），只在 /about/ 上有地方显示。
     读不到就当没有——隐私模式里显示"第 0 次"是个假数字（§12），整行不出现才是对的。 */
  let opens = null;
  try {
    opens = Number(localStorage.getItem('mistwood-opens') || 0) + 1;
    localStorage.setItem('mistwood-opens', String(opens));
  } catch (e) { opens = null; }
  const visitEl = document.getElementById('col-visit');
  if (visitEl && opens) {
    visitEl.textContent = `本机 · 第 ${opens} 次载入（站内跳转也算一次）`;
    visitEl.hidden = false;
  }

  /* ---------- 启动 ---------- */
  applyTheme(theme);
  phase = phaseOf(new Date().getHours());
  root.setAttribute('data-phase', phase);
  if (weatherEl) weatherEl.textContent = weatherWord[phase];
  tick();
  setInterval(tick, 15000);   /* 15s 校准一次，显示粒度是分钟 */
})();
