/* 首页专属：全景视差 + 雾灯 + 萤火虫（规范 §8.5 / §8.6）
   主题与时钟归 site.js；它广播 mistwood:state，我们只读 data-theme / data-phase */
(function(){
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width:720px)');
  const box = document.getElementById('fireflies');
  const footBox = document.getElementById('fireflies-footer');
  if (!box || !footBox) return;

  const style = document.createElement('style');
  style.textContent = `@keyframes firefly-live{
    0%,100%{ opacity:0; transform:translate(0,0); }
    12%{ opacity:.9; } 22%{ opacity:.15; }
    38%{ opacity:.7; transform:translate(2.5vw,-3vh); }
    55%{ opacity:.1; } 72%{ opacity:.85; transform:translate(-2vw,-5vh); }
    88%{ opacity:.05; }
  }`;
  document.head.appendChild(style);

  /* ---------- 萤火虫：夜林 6 / 亮色深夜 3，页脚再守 3（仅暗色）；窄屏一律不上岗 ---------- */
  function spawn(box, count, topMin, topSpan){
    for (let i = 0; i < count; i++){
      const f = document.createElement('span');
      f.className = 'firefly';
      f.style.left = (8 + Math.random() * 84) + 'vw';
      f.style.top  = (topMin + Math.random() * topSpan) + '%';
      const dur = 16 + Math.random() * 8;   /* 常驻循环周期 ≥15s（§1.3） */
      f.style.animation = `firefly-live ${dur}s linear ${-Math.random()*dur}s infinite`;
      f.dataset.base = f.style.cssText;     /* 惊起后归位用（§8.6） */
      box.appendChild(f);
    }
  }
  function sync(){
    box.innerHTML = '';
    footBox.innerHTML = '';
    if (reduceMotion || narrow.matches) return;
    const dark = root.dataset.theme === 'dark';
    const night = root.dataset.phase === 'night';
    spawn(box, dark ? 6 : (night ? 3 : 0), 55, 35);
    if (dark) spawn(footBox, 3, 15, 70);
  }
  root.addEventListener('mistwood:state', sync);
  narrow.addEventListener('change', sync);
  sync();

  /* ---------- 惊起：快速划过 → 熄灭 → 两段弧线逃逸 → 途中重新亮起 → 归位 ---------- */
  function startle(f, awayX, awayY){
    if (f.dataset.busy) return;
    f.dataset.busy = '1';
    const r = f.getBoundingClientRect();
    f.style.animation = 'none';
    const b = f.getBoundingClientRect();              /* 杀掉动画后的基准位 */
    const dx = r.left - b.left, dy = r.top - b.top;
    f.style.transform = `translate(${dx}px,${dy}px)`; /* 原地冻结，不跳 */
    f.style.transition = 'opacity .25s cubic-bezier(.22,1,.36,1)';
    f.style.opacity = '0';
    setTimeout(() => {                                 /* 第一段：横着弹开 */
      f.style.transition = 'transform .5s cubic-bezier(.22,1,.36,1)';
      f.style.transform = `translate(${dx + awayX * .72}px,${dy + awayY * .3}px)`;
    }, 260);
    setTimeout(() => {                                 /* 第二段：继续飘出去并上抬，两段合起来才是弧 */
      f.style.transition = 'transform .9s cubic-bezier(.22,1,.36,1)';
      f.style.transform = `translate(${dx + awayX}px,${dy + awayY}px)`;
    }, 760);
    setTimeout(() => { f.style.transition = 'opacity .8s cubic-bezier(.22,1,.36,1)'; f.style.opacity = '.85'; }, 1200);
    setTimeout(() => { f.style.transition = 'opacity .4s cubic-bezier(.22,1,.36,1)'; f.style.opacity = '0'; }, 3600);
    setTimeout(() => { f.style.cssText = f.dataset.base; delete f.dataset.busy; }, 4050);
  }
  function maybeStartle(mx, my){
    const flies = document.querySelectorAll('.firefly');
    if (!flies.length) return;
    let active = 0;
    for (const f of flies) if (f.dataset.busy) active++;
    for (const f of flies){
      if (active >= 3) break;                          /* 同屏至多惊起 3 颗 */
      if (f.dataset.busy) continue;
      const r = f.getBoundingClientRect();
      const fx = r.left + 1.5, fy = r.top + 1.5;
      const d = Math.hypot(fx - mx, fy - my);
      if (d < 130){
        const m = (60 + Math.random() * 50) / (d || 1);
        startle(f, (fx - mx) * m, (fy - my) * m - 30);
        active++;
      }
    }
  }

  /* ---------- 鼠标：全景视差 + 雾灯（共用一个 rAF） ---------- */
  if (reduceMotion || !matchMedia('(pointer: fine)').matches) return;
  const layers = Array.from(document.querySelectorAll('[data-depth]'));
  const scene = document.querySelector('.scene');
  let tx = 0, ty = 0, cx = 0, cy = 0;
  let tlx = 0, tly = 0, lx = 0, ly = 0, lanternOn = false;
  let lastX = 0, lastY = 0, lastT = 0;
  addEventListener('mousemove', e => {
    tx = (e.clientX / innerWidth  - .5) * 2;
    ty = (e.clientY / innerHeight - .5) * 2;
    tlx = e.clientX;  tly = e.clientY + scrollY;
    if (!lanternOn){
      lanternOn = true;
      lx = tlx;  ly = tly;              /* 首次点亮：灯直接出现在手边，不飞过来 */
      scene.classList.add('lantern-on');
    }
    const now = performance.now();
    if (lastT){
      const v = Math.hypot(e.clientX - lastX, e.clientY - lastY) / (now - lastT);
      if (v > 1.2) maybeStartle(e.clientX, e.clientY);   /* 慢速靠近不惊动 */
    }
    lastX = e.clientX;  lastY = e.clientY;  lastT = now;
  });
  (function loop(){
    cx += (tx - cx) * .04;  cy += (ty - cy) * .04;
    for (const el of layers){
      const d = parseFloat(el.dataset.depth);
      el.style.transform = `translate(${cx * d * 100}px, ${cy * d * 60}px)`;
    }
    if (lanternOn){
      lx += (tlx - lx) * .06;  ly += (tly - ly) * .06;   /* 灯总比手慢半拍 */
      scene.style.setProperty('--lx', lx.toFixed(1) + 'px');
      scene.style.setProperty('--ly', ly.toFixed(1) + 'px');
    }
    requestAnimationFrame(loop);
  })();
})();
