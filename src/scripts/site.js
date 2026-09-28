/* 子页面与首页共用：主题 / 时钟 / 滚动入场 / 进度线 / 目录
   列表与正文已由 Astro 在构建期渲染成静态 HTML，这里只剩交互 */
/* ⚠️ 这四个档位的判定（几点算 dawn、几点算 dusk）在 ../lib/phase.js，是纯函数：
   浏览器跑它、`tools/phase-check.mjs` 也跑它，差值表里的数和访客看到的档子是同一份代码出的。
   搬去别处写（尤其是搬进 CSS 之外的运行时自定义属性）会拆掉 palette-check 的方向光复算——见 §2.3 末。 */
import { phaseAt, tableBounds, sunOverride } from '../lib/phase.js';

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
    /* 浏览器外壳那一条色带跟着改：Layout 里的 theme-color 写的是亮色基准，内联脚本只在首帧之前
       按系统偏好对一次，用户手动开关是第三个场合——漏掉它就会出现"夜林页面配着晨雾顶栏" */
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', t === 'dark' ? '#0E130D' : '#F2F4EF');
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

  /* 换季与边界（§2.3）：四个档位的**取值**从来没变过，变的只是"什么时刻进哪一档"。
     判定本身搬去了 `src/lib/phase.js`（纯函数、不碰 DOM），因为 `tools/phase-check.mjs` 要在 node 里
     跑**同一个** phaseAt 出那张经纬度×月份的差值表——两份长得像的实现迟早分叉，§17 那笔债就是教训。

     sunB 是"太阳算出来的边界"，只在拿到定位且夹得住时非空；**每次判定实时读月份表**（tableBounds），
     所以退路连"跨月自动换窗口"都和一个字没改之前一致。 */
  let sunB = null;
  const boundsOf = d => sunB || tableBounds(d);
  function phaseOf(d){ return phaseAt(d, boundsOf(d)); }
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
  /* 章节刻度（§6.3 + §7.1①）：右侧目录给名字，这一排给形状。位置只在 `total` 变了的时候重排
     （换视口、图片落地），每帧只判一次"当前章换了没有"——两把尺子必须是同一把，
     所以刻度位置直接拿进度线用的那个 done/total 来换算，不另起一套测量 */
  const marks = document.getElementById('progress-marks');
  let markEls = [], markAt = [], lastTotal = -1, lastMark = -2;

  function updateProgress(){
    if (!postBody) return;
    const r = postBody.getBoundingClientRect();
    const total = Math.max(r.height - innerHeight, 1);
    const done = Math.min(Math.max(-r.top, 0), total);
    if (progress) progress.style.transform = `scaleX(${done / total})`;
    if (markEls.length){
      const short = r.height <= innerHeight + 120;   /* 一屏就读完的稿子没有"走过的一段"，刻度会全挤在右端 */
      marks.classList.toggle('off', short);
      if (!short){
        /* ⚠️ 刻度用**正文总高**这把尺子，不是进度线那把（`总高 − 视口`）。不是省事，是后者算不出来：
           一篇 1283px 的稿子在 819px 视口里，最后三章的 offsetTop 是 264 / 659 / 987，
           除以 total=464 得到 57% / **142% / 213%**——两枚刻度落在屏幕外（实测）。
           "章节走到视口顶"这件事对最后 819px 里的内容**永远不发生**。
           所以：**刻度是地图（这一章占全文的哪一段），点亮才是进度**。两件事分开，各自成立。 */
        if (r.height !== lastTotal){
          lastTotal = r.height;
          for (let i = 0; i < markEls.length; i++) markEls[i].style.left = (markAt[i] / r.height * 100).toFixed(3) + '%';
        }
        let cur = -1;
        /* ⚠️ 用**没被夹过的** raw，不用上面那个 `done`：`done` 的上限是 `total`（正文高 − 视口），
           而滚到底时正文最后 819px 是"在屏幕里"而不是"在视口顶之上"——拿夹过的值算阅读线，
           最后一章永远点不亮（实测：到底时 raw=804 而 done=464，第三章在 987 处，线只到 710）。 */
        const line = Math.max(-r.top, 0) + innerHeight * .30;   /* 阅读线：视口 30% 那一行，与 §8.7 身后那条雾同一个位置 */
        for (let i = 0; i < markAt.length; i++) if (markAt[i] <= line) cur = i;
        if (cur !== lastMark){
          lastMark = cur;
          for (let i = 0; i < markEls.length; i++) markEls[i].classList.toggle('on', i === cur);
        }
      }
    }
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

  /* 刻度的那一排 span：与目录同一批 H2、同一个选择器（`h2:not(.fn-title)`，文末那个"注"字不算章） */
  function measureMarks(){
    if (!marks || !postBody) return;
    const base = postBody.getBoundingClientRect().top + scrollY;
    markAt = Array.from(postBody.querySelectorAll('h2:not(.fn-title)'))
      .map(h => h.getBoundingClientRect().top + scrollY - base);
    lastTotal = -1;                       /* 逼一次重排：图落地之后位置会变 */
  }
  if (marks && postBody){
    markEls = Array.from(postBody.querySelectorAll('h2:not(.fn-title)')).map(() => {
      const m = document.createElement('span');
      marks.appendChild(m);
      return m;
    });
    measureMarks();
    updateProgress();                     /* 首帧：上面那次调用还在 markEls 为空的时候，补一次 */
    /* 内容图把正文撑长之后刻度位置会漂：load 在模块脚本之后触发，正好补这一次 */
    addEventListener('load', measureMarks, { once:true });
  }

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

  /* ---------- 边界按真太阳算：首次载入问一次，算完就把手上的位置丢掉（§2.3）----------
     · 时机：全站只有这一处 getCurrentPosition。不挂滚动、不挂定时器、不在显示设置抽屉里加档位——
       那条抽屉的纪律是"只给往回收的旋钮"（雾/颗粒/萤火/入场全是关东西），一枚"开启定位"是能力扩权。
     · 授权框由浏览器自己弹，本站不写任何"请允许定位"的文案、不做遮罩。
     · 三档拿不到（拒绝 / 超时 / 无 navigator.geolocation）⇒ **什么都不做**，而"什么都不做"在这张卡里
       有明确所指：接着按 SEASON_DUSK 月份表算，四档一枚不少，落回今天的表现（不是"没有 phase"）。
     · 经纬度只活在这次调用栈里：sunOverride 往外交的是两个小时数折出来的边界。不写任何 storage、
       不发任何请求（算法 30 行在 src/lib/sun.js，全部数学都在本地）。
     ⚠️ 判定**没有**搬进 <head> 那段内联脚本，这是有意的：getCurrentPosition 是异步的，内联脚本等不到它；
       而第四类门禁 runtime-check 断言的正是"内联脚本同步落地的五枚显示属性"，往里塞一段异步判定只会多出
       一条永远断言不到的判据（§16 那个假门禁形状）。data-phase 的首帧仍旧由静态 HTML 那枚
       data-phase="day" 顶着、模块脚本一跑就纠正——和改动前同一个写者、同一个时机。 */
  if (navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      pos => { sunB = sunOverride('granted', pos.coords, new Date()); if (sunB) tick(); },
      () => {},                        /* 拒绝 / 超时：停在月份表上，不解释、不提示、不重试 */
      { timeout: 8000, maximumAge: 6 * 3600 * 1000, enableHighAccuracy: false }
    );   /* 精度要"城市级"就够：一档窗口 1.5–4 小时，而边界本身有几分钟的近似误差 */
  }

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
