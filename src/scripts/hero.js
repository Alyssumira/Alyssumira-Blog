/* 首页专属：全景视差 + 雾灯 + 萤火虫（规范 §8.5 / §8.6）
   主题与时钟归 site.js；它广播 mistwood:state，我们只读 data-theme / data-phase */
/* 夜林配比那一条雾带在不在场要问相位（home.css 那条：dawn 档把 b3 退回来）。
   用 `src/lib/phase.js` 那个**同一个** phaseAt：浏览器里这次判定与 `tools/phase-check.mjs` 八格跑的是
   同一份代码，不在这里另长一份长得像的表（§17 那笔"两份长得像的实现迟早分叉"的债就是这么欠下的）。
   边界仍旧取月份表 `tableBounds`——与 `site.js` 那行同一个写法，**不吃访客定位**：
   这一枚只决定一条装饰性雾带要不要少一次，不碰文字、不碰 §2.4 的地板，也不给隐私那条链添新用途。 */
import { phaseAt, tableBounds } from '../lib/phase.js';
(function(){
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width:720px)');
  const box = document.getElementById('fireflies');
  if (!box) return;

  const style = document.createElement('style');
  style.textContent = `@keyframes firefly-live{
    0%,100%{ opacity:0; transform:translate(0,0); }
    12%{ opacity:.9; } 22%{ opacity:.15; }
    38%{ opacity:.7; transform:translate(2.5vw,-3vh); }
    55%{ opacity:.1; } 72%{ opacity:.85; transform:translate(-2vw,-5vh); }
    88%{ opacity:.05; }
  }`;
  document.head.appendChild(style);

  /* ---------- 萤火虫：夜林 6 / 亮色深夜 3；首页末尾那块 200px 收尾已撤，守夜的 3 只随之一起退场；窄屏一律不上岗 ---------- */
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
    if (reduceMotion || narrow.matches) return;
    if (root.dataset.fireflies === 'off') return;   /* 抽屉里关了：连"惊起"的对象都不留，而不是留着一群不许动 */
    const dark = root.dataset.theme === 'dark';
    const night = root.dataset.phase === 'night';
    /* 枚数账（§5 那张分层表与 §11 降级表都写着 6/3）：**这一行一个数没改**——夜林要的不是更多只，
       是提案那格标题写的"萤火虫数量与亮度在夜林各加一档"里的两半：亮度落在 `home.css` 那枚光晕 α，
       数量那一半落在让出一条雾带（§1 预算表那行）。
       同一条口径也钉着下面那颗种子的平移：dusk/day/night 档 b3 不在场，落进 b3 那条带子的种子
       平移到 b2；dawn 档三条都在，不平移。 */
    spawn(box, dark ? 6 : (night ? 3 : 0), 55, 35);
    if (dark && root.dataset.fireflies === 'on' && !narrow.matches && !reduceMotion &&
        phaseAt(new Date(), tableBounds(new Date())) !== 'dawn') {
      /* 27 ＝ b3 的带中心 91 减 b2 的带中心 64（两条带各自的 top/height 就写在上面那两条规则里：
         b2 是 55vh+18vh ⇒ 55–73、b3 是 85vh+12vh ⇒ 85–97）。平移后 58–63%，整段落在 b2 那条带子里。
         `dataset.base` 是惊起之后归位用的那一份，改了 top 必须把它一起改，否则一次惊起就把种子送回 b3。 */
      for (const el of box.querySelectorAll('.firefly')) {
        const t = parseFloat(el.style.top);
        if (t >= 85) {
          el.style.top = (t - 27) + '%';
          el.dataset.base = el.style.cssText;
        }
      }
    }
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

  /* ---------- 雾灯：三种"指向"——鼠标跟着手、触屏按住不放、键盘跟着焦点（§8.5） ----------
     视差仍旧只属于细指针（§11），但灯不再只属于细指针：降级不等于缺席。
     触屏只亮在按住的那一下，不跟手——跟手就要读 touchmove，那正好和滚动抢同一根手指。 */
  if (reduceMotion) return;
  const scene = document.querySelector('.scene');
  if (!scene) return;
  const nav = document.querySelector('.nav');
  const fine = matchMedia('(pointer: fine)').matches;
  const layers = Array.from(document.querySelectorAll('[data-depth]'));
  let tx = 0, ty = 0, cx = 0, cy = 0;
  let tlx = 0, tly = 0, lx = 0, ly = 0, lanternOn = false, everLit = false, idleT = 0;
  let lastX = 0, lastY = 0, lastT = 0;
  const IDLE_MS = 700;                       /* 手停了 0.7s，灯就该熄（§8.5） */
  /* 光柱的呼吸（二轮 §7.1）：读的是 `tx`（下面那行 mousemove 已经算好的水平位置，-1..1），
     不新读一次坐标、不新增监听、不新增环——它跟在下面那个 rAF 里 `lanternOn` 那一块，一次乘加一次写。
     BREATH 是提案那格给的幅度（相对 ±4%）；BREATH_K 是**每帧**的插值系数，
     "2–3s" 不是写在盘上的一枚时长，而是 帧数×系数 的等效时间常数（读数在规范 §8.5 与 §5.1 那两格）。
     熄灯时把它一次性写回 1：静止态必须逐字等于 §5.1 那 12 枚字面量，不留一处偏掉的余值。 */
  const BREATH = .04, BREATH_K = .017;
  let bs = 1;
  const inRange = el => !!(el && el.closest && el.closest('.nav a,.nav button,.hero a,.hero button'));

  function blowOut(){
    if (!lanternOn) return;
    lanternOn = false;
    scene.classList.remove('lantern-on');    /* --hole 回到 1：雾合上，rim/glow 同时淡掉 */
    /* 呼吸也一并交回初值：环只跟着亮着的灯跑，所以这里不写就永远停在被搅动的那一档上（§7.1）。
       落回的过程由 `home.css` 那条已有的 `transition:opacity .8s` 淡着走，没为它新立时长。 */
    bs = 1;
    scene.style.setProperty('--shaft-breath', '1');
    setNavLit(false);
  }
  /* 灯照到导航那一段玻璃时，玻璃稍微变实一点——一枚灯、两种被照到的材质（§8.5 的"拨雾"并到这里）。
     只翻一个类，颜色走 .nav 已有的 background-color 过渡，不新增可 animatable 的属性、也不引第二枚灯 */
  function setNavLit(on){ if (nav) nav.classList.toggle('lit', on); }
  function nearNav(x, y){
    if (!nav) return false;
    const r = nav.getBoundingClientRect();
    /* 半径不写死：CSS 里那枚 --lantern-r 注册成了 <length>，computed value 就是解析后的 px，
       所以 JS 用同一个数，不在这里重抄一遍 clamp() */
    const raw = parseFloat(getComputedStyle(scene).getPropertyValue('--lantern-r'));
    const pad = (isNaN(raw) ? 200 : raw) * .55;
    const top = r.top + scrollY, bottom = r.bottom + scrollY;
    return y > top - pad && y < bottom + pad && x > r.left - pad && x < r.right + pad;
  }
  function put(){
    scene.style.setProperty('--lx', lx.toFixed(1) + 'px');
    scene.style.setProperty('--ly', ly.toFixed(1) + 'px');
    scene.style.setProperty('--shaft-breath', bs.toFixed(4));   /* 第三枚写在同一处、同一个帧里（§7.1） */
    setNavLit(nearNav(lx, ly));
  }
  function light(x, y, snap, hold){
    tlx = x; tly = y;
    if (!lanternOn){
      lanternOn = true;
      if (!everLit){ everLit = true; lx = tlx; ly = tly; }   /* 只有首次不飞过来，之后从熄灯的位置走回来 */
      scene.classList.add('lantern-on');
    }
    /* 没有 rAF 的那两条路（触屏 / 键盘）就地落位，不然灯会停在上一处 */
    if (snap && !fine){ lx = tlx; ly = tly; put(); }
    clearTimeout(idleT);
    if (!hold) idleT = setTimeout(blowOut, IDLE_MS);          /* 按住与聚焦期间不计时，松手 / 移焦才熄 */
  }

  if (fine){
    addEventListener('mousemove', e => {
      tx = (e.clientX / innerWidth  - .5) * 2;
      ty = (e.clientY / innerHeight - .5) * 2;
      light(e.clientX, e.clientY + scrollY, false, false);
      const now = performance.now();
      if (lastT){
        const v = Math.hypot(e.clientX - lastX, e.clientY - lastY) / (now - lastT);
        if (v > 1.2) maybeStartle(e.clientX, e.clientY);   /* 慢速靠近不惊动 */
      }
      lastX = e.clientX;  lastY = e.clientY;  lastT = now;
    });
    /* 光标离开窗口：不等空闲，直接熄 */
    document.documentElement.addEventListener('mouseleave', blowOut);
    (function loop(){
      cx += (tx - cx) * .04;  cy += (ty - cy) * .04;
      for (const el of layers){
        const d = parseFloat(el.dataset.depth);
        el.style.transform = `translate(${cx * d * 100}px, ${cy * d * 60}px)`;
      }
      if (lanternOn){
        lx += (tlx - lx) * .06;  ly += (tly - ly) * .06;   /* 灯总比手慢半拍 */
        bs += (1 + tx * BREATH - bs) * BREATH_K;          /* 光柱比灯还慢一档：跟的不是手，是慢跟随（§7.1） */
        put();
      }
      requestAnimationFrame(loop);
    })();
  }

  /* 触屏：整屏只有首屏那 100vh 有纱罩可拨，所以只在场景范围内上岗；不 preventDefault，滚动照滚 */
  addEventListener('touchstart', e => {
    const t = e.target;
    if (inRange(t)) return;                                  /* 手落在导航/链接上：那是按钮，不是灯 */
    const p = e.touches && e.touches[0];
    if (!p || p.clientY > innerHeight) return;
    light(p.clientX, p.clientY + scrollY, true, true);
  }, { passive:true });
  addEventListener('touchend', blowOut, { passive:true });
  addEventListener('touchcancel', blowOut, { passive:true });

  /* 键盘：Tab 到哪，灯就照到哪——灯的本意是"指向"，焦点就是一次指向 */
  addEventListener('focusin', e => {
    if (!inRange(e.target)) return;
    const r = e.target.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    light(r.left + r.width / 2, r.top + r.height / 2 + scrollY, true, true);
  });
  addEventListener('focusout', e => {
    if (inRange(e.relatedTarget)) return;   /* 从一枚链接走到下一枚：灯跟着走，不熄了再点 */
    blowOut();
  });
})();
