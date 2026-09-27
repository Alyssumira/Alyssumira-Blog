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

  /* ---------- 显示设置：雾 / 颗粒 / 萤火 ----------
     值由 <head> 里那段内联脚本先落到 dataset（不然首帧会闪一下错误的雾），这里就把 dataset 当唯一
     真相源读回来，不再第二次解析 localStorage——两处读同一份 JSON 迟早读成两个样子。 */
  const sBtn = document.getElementById('settings-toggle');
  const sPanel = document.getElementById('display-settings');
  const disp = { fog: root.dataset.fog || 'normal', grain: root.dataset.grain || 'on', fireflies: root.dataset.fireflies || 'on', enter: root.dataset.enter || 'auto' };

  function paintSettings(){
    root.dataset.fog = disp.fog;
    root.dataset.grain = disp.grain;
    root.dataset.fireflies = disp.fireflies;
    root.dataset.enter = disp.enter;
    document.querySelectorAll('.settings input[type=radio]').forEach(i => { i.checked = disp[i.name] === i.value; });
    announce();   /* 萤火虫在不在岗，由 hero.js 听这个事件自己决定 */
  }
  function setOpen(v){
    sPanel.classList.toggle('open', v);
    sBtn.setAttribute('aria-expanded', String(v));
    if (v) sPanel.removeAttribute('inert'); else sPanel.setAttribute('inert','');
  }
  paintSettings();
  if (sBtn && sPanel){
    setOpen(false);
    sBtn.addEventListener('click', () => setOpen(!sPanel.classList.contains('open')));
    sPanel.addEventListener('change', e => {
      const i = e.target;
      if (!i || i.type !== 'radio' || !(i.name in disp)) return;
      disp[i.name] = i.value;
      try { localStorage.setItem('mistwood-display', JSON.stringify(disp)); } catch (err) {}
      paintSettings();
    });
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && sPanel.classList.contains('open')){ setOpen(false); sBtn.focus(); }
    });
    addEventListener('click', e => {
      if (!sPanel.classList.contains('open') || e.target.closest('.display')) return;
      setOpen(false);   /* 点外面只收抽屉，不抢焦点：焦点原地不动比跳回去少一次跳动 */
    });
  }

  /* ---------- 时间感知：时钟 + 时段（日循环 + 年循环）+ 天气词 ---------- */
  const clockEl = document.getElementById('clock');
  const weatherEl = document.getElementById('weather-word');
  const dayRing = document.getElementById('day-ring');
  let phase = 'day';

  /* 换季（§2.3）：傍晚的窗口随季节走，别的日子不动。
     只有 dusk 的两端在动，night 从 dusk 结束处接手 ⇒ 四个时段永不重叠、也不需要第二张表。
     幅度按月算最多 3.5 小时，落在"今天和半年前不太一样"那一档，比日变化更弱——
     §6 那句"应感觉今天早上来和下午来不太一样，而不是这网站会变色"同样管着年尺度。 */
  const SEASON_DUSK = {
    winter: [16, 17.5],   // 12·1·2 月
    spring: [17.5, 19],   // 3·4·5 月
    summer: [19.5, 20.5], // 6·7·8 月
    autumn: [17, 19],     // 9·10·11 月
  };
  const seasonOf = m => (m === 11 || m <= 1) ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';

  function phaseOf(d){
    const h = d.getHours() + d.getMinutes() / 60;
    if (h >= 5 && h < 9) return 'dawn';
    const [ds, de] = SEASON_DUSK[seasonOf(d.getMonth())];
    if (h >= ds && h < de) return 'dusk';
    if (h >= 9 && h < ds) return 'day';
    return 'night';
  }
  const weatherWord = { dawn:'fog', day:'light', dusk:'dusk', night:'night' };

  /* 月相（§6）：夜林里的影子与那盏灯归月亮管，所以这里要知道"今晚是月的哪一天"。
     用平月法（synodic 29.530588853 天 + 一个已知的新月基准），**不做真天象计算**：
     平均法与真满月的偏差最大约 ±0.6 天，而这里要的只是"亮一档"这个感觉，窗口给到 ±1.2 天足够宽。
     真天象要引 VSOP87 那类星历表（几百行、还要处理时区），为一个 5px 的圆点不值，而且会把
     "算出来的近似"重新带回分钟级时钟旁边——正是 §2.3 否决节气上导航的同一个理由。 */
  const SYNODIC = 29.530588853;
  const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14) / 86400000;   // 2000-01-06 18:14 UTC 新月
  function moonAge(d){
    const days = d.getTime() / 86400000 - NEW_MOON_EPOCH;
    return ((days % SYNODIC) + SYNODIC) % SYNODIC;
  }
  const isFullMoon = d => Math.abs(moonAge(d) - SYNODIC / 2) <= 1.2;

  /* 苔时弧：实心点是"现在"，外圈那一段是"今天已经走完的多少"。
     它是属性更新不是动画（§6 时钟零动效照样成立），随 15s 一次的 tick 走，一天一圈。
     周长从几何本身要——getTotalLength() 只在这里出现一次，不在 CSS 里再写一个 43.98 */
  function paintDayRing(){
    if (!dayRing) return;
    const len = dayRing.getTotalLength ? dayRing.getTotalLength() : 44;
    const now = new Date();
    const frac = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;   // 一天 86400 秒
    dayRing.style.strokeDasharray = len.toFixed(2);
    dayRing.style.strokeDashoffset = (len * (1 - frac)).toFixed(2);
  }

  function tick(){
    const now = new Date();
    if (clockEl) clockEl.textContent = String(now.getHours()).padStart(2,'0') + ':' +
                                       String(now.getMinutes()).padStart(2,'0');
    paintDayRing();
    const full = isFullMoon(now);
    if ((root.dataset.moon === 'full') !== full){
      if (full) root.setAttribute('data-moon', 'full'); else root.removeAttribute('data-moon');
      announce();
    }
    const p = phaseOf(now);
    if (p !== phase){
      phase = p;
      root.setAttribute('data-phase', p);
      if (weatherEl) weatherEl.textContent = weatherWord[p];
      announce();
    }
  }

  /* 首页的雾灯/萤火虫要看主题与时段脸色，但不想耦合进来——广播一次即可 */
  function announce(){ root.dispatchEvent(new CustomEvent('mistwood:state')); }

  /* ---------- 详情页：进度线 + 身后的雾 + 文末收灯 + 目录高亮 ---------- */
  const postBody = document.getElementById('post-body');
  const progress = document.getElementById('progress');
  const toc = document.getElementById('toc');

  function updateProgress(){
    if (!postBody) return;
    const r = postBody.getBoundingClientRect();
    const total = Math.max(r.height - innerHeight, 1);
    const done = Math.min(Math.max(-r.top, 0), total);
    if (progress) progress.style.transform = `scaleX(${done / total})`;
    /* 身后的雾（§8.7）：雾线钉在视口 30% 那一行（阅读位置之上），换算成正文自己坐标系里的 px 写进 --read-fog。
       坡道从这条线往上游 100vh 才淡到底（那一段已经在屏幕外），所以**屏幕上的最坏值是恒定的**：
       屏顶 5.03:1（亮色正文），到雾线处回到 13.13——正在读的那一屏一个字都不蒙。
       往回滚雾线跟着上移 ⇒ 想重读哪一段，它自己走回清晰。 */
    const edge = innerHeight * .30 - r.top;
    postBody.style.setProperty('--read-fog', edge.toFixed(1) + 'px');
    /* 合上书＝更静：读到文末，让颗粒（这一页唯一还在动的东西）退场，别用一次全屏加深去画"结束" */
    root.dataset.quiet = (r.bottom < innerHeight * .82) ? '1' : '';
  }
  if (postBody){
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { updateProgress(); ticking = false; });
    }, { passive:true });
    addEventListener('resize', updateProgress, { passive:true });
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
  phase = phaseOf(new Date());
  root.setAttribute('data-phase', phase);
  if (weatherEl) weatherEl.textContent = weatherWord[phase];
  tick();
  setInterval(tick, 15000);   /* 15s 校准一次，显示粒度是分钟 */

  /* ---------- 归巢：从详情页回到列表，之前点进来的那一行亮一下（§8.7） ----------
     ⚠️ 挂 pageshow 不挂 DOMContentLoaded：预取和 bfcache 会把文档原地复活，那时后者根本不再触发，
     而"回来"恰恰是这条交互唯一的场合。标记只在详情页写、只在找到行的那一页清掉——
     绕道去了 /about/ 也不算丢，下一次落在有它的页面上照样亮。 */
  const HOMING = 'mistwood-homing';
  function readFlag(k){ try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function writeFlag(k, v){ try { v === null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
  if (/^\/essays\/[^/]+\/$/.test(location.pathname)) writeFlag(HOMING, location.pathname);
  else {
    addEventListener('pageshow', () => {
      const to = readFlag(HOMING);
      const slug = to && /^\/essays\/(.+)\/$/.exec(to);
      if (!slug) return;
      let hit = null;
      document.querySelectorAll('.row[data-slug]').forEach(r => { if (r.dataset.slug === slug[1]) hit = r; });
      if (!hit) return;                       /* 这一页没有那一行：标记留着，别把它悄悄吃掉 */
      hit.classList.add('homing');
      setTimeout(() => hit.classList.remove('homing'), 1700);
      writeFlag(HOMING, null);
    });
  }

  /* ---------- 盖章：分享 = 把这一篇收进手记，回执是一行字不是一枚图形（§15） ----------
     复制没成功就什么都不落——一行"盖于…"的收据配一个没复制到的动作，是 §12 那种假反馈。 */
  const stampBtn = document.getElementById('post-stamp');
  const stampNote = document.getElementById('stamp-note');
  if (stampBtn && stampNote){
    const p2 = n => String(n).padStart(2, '0');
    const fallbackCopy = text => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-200vh;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    };
    stampBtn.addEventListener('click', async () => {
      const url = location.href;
      let ok = false;
      try { await navigator.clipboard.writeText(url); ok = true; }
      catch (e) { ok = fallbackCopy(url); }         /* http 或非安全上下文里 clipboard API 会直接拒 */
      stampBtn.classList.toggle('miss', !ok);
      if (!ok) return;
      const d = new Date();
      stampNote.textContent = `盖于 ${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())} · 本机`;
      stampNote.hidden = false;
    });
  }

  /* ---------- 首屏那一行"此刻的话"：入夜＝守夜、清晨＝初、傍晚＝暮（§6） ----------
     一格、一套机制、一枚键。三个词都只在**本次会话第一次**落进来时说一次，刷新即无；
     读不到 sessionStorage 就永远不说——猜出来的问候不是问候。 */
  const watchEl = document.getElementById('hero-watch');
  const WATCH_WORD = { night:'守夜', dawn:'初', dusk:'暮' };
  if (watchEl && !readFlag('mistwood-greeted')){
    writeFlag('mistwood-greeted', '1');
    const w = WATCH_WORD[phase];
    if (w){ watchEl.textContent = w; watchEl.hidden = false; }
  }
})();
