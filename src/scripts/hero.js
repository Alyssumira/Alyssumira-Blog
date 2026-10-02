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
  /* 细指针这一枚从原来的位置搬上来了：停泊那一段（下面「萤火落在链接上」）与离屏闸门都要读它，
     而它读的只是"这台设备有没有光标"，与雾灯那一段同一个口径、同一份 matchMedia。 */
  const fine = matchMedia('(pointer: fine)').matches;
  const box = document.getElementById('fireflies');
  if (!box) return;
  /* ---------- 萤火一族今天有两个宿主（第 ㉖ 轮 c11a）：首页那一屏，与 404「走进雾里了」 ----------
     两档共用同一份 `spawn`、同一枚注入的关键帧（下面那段 `firefly-live`）、同一族几何与光晕
     （`.firefly` 在 `home.css`，404 也载那一份表），差别只有三样：容器坐标怎么定、枚数、飘向哪里。
     ⚠️ 404 那一档**不是**"跟着萤火才找得到路"：那六条地址（含萤火飘向的三条）照旧全量、常显地
     列在 `.lost-list` 里，一行没撤、一处没藏（§12 那格"把 404 的地址藏起来让人找"判不进，这次没碰它）。
     判它 0 枚的三档与首页同一条：`reduceMotion`／`narrow`（≤720）／抽屉关掉萤火 ⇒ 同一个 return。 */
  const lostList = document.querySelector('.lost-list');
  /* 停泊（首页：光标停满 3s）与飘行（404：三枚各飘向一条在册地址）共用的几枚常量。
     声明必须在 `sync()` 那一次调用之前——`sync()` 会调 `releaseSettle()`，404 那一档还会调 `settleTo()`，
     而 `let`／`const` 有暂时性死区。它们各自为什么是这一个数，写在下面「停泊与飘行」那一段的头上。 */
  const LINK_SET = '.nav a,.nav button,.hero a,.hero button';   /* 与雾灯那枚 inRange 同一份名单，不两处各写一遍 */
  const SETTLE_MS = 3000;      /* 提案原话 idles for 3 seconds。与雾灯那枚 IDLE_MS=700 各管各的：0.7s 先熄灯，3s 才是"人停下来了" */
  const SETTLE_DRIFT = 900;    /* 落定那一段的平移：时长与缓动都照惊起第二段那一档（.9s／cubic-bezier(.22,1,.36,1)），不发明第三种 */
  const LOST_DRIFT = 9000;     /* 404「缓缓飘向」：一次性入场、不是常驻循环 ⇒ 不吃 §1.3 那枚"循环周期 ≥15s"地板；落定后的吐纳照 breath 16s */
  const BREATH_CYCLE = 16;     /* `mistwood.css` 已在册那一族（`.about-now .dot`）的周期，不另起一档 */
  let settleT = 0, settleSeq = 0;

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
    releaseSettle();          /* 盒子要重铺：停泊／飘行那几枚已经不在了，迟到的两帧也不该再写回去 */
    if (reduceMotion || narrow.matches) return;
    if (root.dataset.fireflies === 'off') return;   /* 抽屉里关了：连"惊起"的对象都不留，而不是留着一群不许动 */
    if (lostList){ spawnLost(); return; }           /* 404：三枚飘向三条在册地址，不走首页那本 6/3/0 的账 */
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
  /* 404 那一档的三枚：落点取自页面上**已经看得见**的那三条地址（提案点名 Essays／Notes／Things）。
     ⚠️ 三条地址的清单在页面上（`src/pages/404.astro` 那六枚 `<a>`），这里只是从里面挑出三枚来飘，
     既没有把任何一条藏起来，也没有造出一枚页面之外的地址：`LOST_TARGETS` 写的就是 href 本身，
     对不上任何一枚在册 `<a>` 时这一档少一枚（filter(Boolean)）——绝不飘向一枚页面里没有的链接（§12 死锚点那一族）。
     ⚠️ 起势压在页面下半段（58–84%），往上飘到那一串地址上；首页那一档是 55/35，跟着两条雾带走。 */
  const LOST_TARGETS = ['/essays/', '/things/', '/notes/'];
  function spawnLost(){
    const targets = LOST_TARGETS.map(h => lostList.querySelector(`a[href="${h}"]`)).filter(Boolean);
    if (!targets.length) return;
    spawn(box, Math.min(3, targets.length), 58, 26);
    Array.from(box.querySelectorAll('.firefly')).forEach((f, i) => { if (targets[i]) settleTo(f, targets[i], LOST_DRIFT); });
  }
  root.addEventListener('mistwood:state', sync);
  narrow.addEventListener('change', sync);
  sync();

  /* ---------- 离屏与隐藏：真停帧（提案「Fireflies … Pause them off-screen」里的那一半） ----------
     首屏滚出视野、或标签页不可见 ⇒ ① 雾灯那一枚 rAF **不再排下一帧**（连已经排上的那一帧也撤掉），
     不是"跑着但不写"；② 萤火的常驻循环当场冻住（`home.css` 新那条 `#fireflies.paused .firefly`）。
     回到首屏／重新可见 ⇒ 两族一起恢复。
     ⚠️ 数量与景深那两半不归这一格：6/3/0 是已签字的档，抬到 8–12 撞的是首屏常驻循环名额那一格，调度侧另裁。
     ⚠️ 同一枚环还挂着雾灯跟手、视差与光柱呼吸（`--shaft-breath`）——它们与萤火同生共死：首屏不在场
     就没有可算的，暂停它们是可接受的。恢复那一帧走**保留累积值**：`cx`/`cy`、`lx`/`ly`、`bs` 三枚平滑量
     用的都是**每帧固定系数**（.04 / .06 / .017），式子里没有 dt ⇒ 停多久都不改变下一帧的步长，接着跑就是
     连续的；反过来把它们归回初值，恢复的第一帧就会从"上一帧的位置"跳回起手位，那才是真要跳一帧。
     ⚠️ 可见性那一路走 `document.onvisibilitychange =` 这枚**单写者赋值**，不新开第十枚 addEventListener：
     `phase-check` 第 ⑨ 格在册的"addEventListener 9 枚"数的是跟随光标的那一族，标签页可见性不在那一族里，
     而改那把尺的登记值是调度侧的事、不在这一卡（要并回去请连那一格的句子一起改，别在这里偷改判据）。
     ⚠️ 首页盯 `.scene`（absolute，随页滚走＝"首屏滚出视野"），404 没有 `.scene` ⇒ 盯盒子自己；
     盒子在 404 上铺满那一整块内容，所以那一档实际只由"标签页不可见"这一路闸住——设计如此，不是漏。 */
  let inView = true, onScreen = document.visibilityState !== 'hidden', rafPump = null;
  const awake = () => inView && onScreen;
  function syncPause(){
    const want = awake();
    box.classList.toggle('paused', !want);
    if (rafPump) rafPump(want);
    if (!want && !lostList) releaseSettle();   /* 离场时不许有谁停在链接上：没有观众的时候不做"落点"这件事 */
    else if (want) armSettle();                /* 回场：那 3s 的空闲钟从头数（离场期间没人动鼠标，不补账） */
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(es => {
    for (const e of es) inView = e.isIntersecting;
    syncPause();
  }, { threshold: 0 }).observe(document.querySelector('.scene') || box);
  document.onvisibilitychange = () => { onScreen = document.visibilityState !== 'hidden'; syncPause(); };

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
      if (f.dataset.busy || f.dataset.settled) continue;   /* 正在惊起的不许半路改主意；停泊中的那一枚也不受惊（它落点是链接，不是路障） */
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

  /* 停泊／飘行那几枚常量声明在上面（`lostList` 那一组之后）：`sync()` 在这一段之前就会被调用一次，
     而它要调 `releaseSettle()`（404 那一档还要在同一趟里调 `settleTo()`），`let`／`const` 有暂时性死区——
     声明落在使用处之后就是"第一次 sync 当场抛 ReferenceError、整段 hero.js 一个字都不执行"。
     这一段的判据与口径：
     「They could settle near the CTA when the cursor is idle.」＋「…when the cursor idles for 3 seconds,
     the firefly lands on the nearest link and slowly pulses.」——落点是页面上**已经有**的链接
     （`LINK_SET` 那族可点面，与雾灯那枚 `inRange` 同一份名单），`data-settled` 写的就是那一枚链接自己的
     href，可核对；**这不是鼠标轨迹撒点**（❌ 落叶／花瓣那一格：撒点的落点是空气，这里的落点是地址）。
     ⚠️ 三条在册边界：`prefers-reduced-motion` 那一档整段不上岗（上面 :11 那个 return 是这一段的闸，
     `armSettle`／`settleNearest` 里各再问一次——上面那道离屏闸门挂得比那个 return 更早，为的是 404 也吃得着）；
     `narrow`（≤720）与触屏一律不参与（`!fine` 就回，那一档本来也连萤火都不生成）；
     404 那一档没有"光标空闲"这件事，三枚是**一次性入场**的飘行，不受这一格的计时器管。
     ⚠️ 吐纳复用 `mistwood.css` 已在册的 `breath` 一族（关于页 `.about-now .dot` 那枚点：`16s linear infinite`，
     keyframes 只碰 `opacity` ⇒ 与这里写在同一枚元素上的 inline `transform` 不打架），没新写第三种关键帧。 */
  function settling(){ let n = 0; for (const f of box.querySelectorAll('.firefly[data-settled]')) n++; return n > 0; }
  /* 落点的身份：有地址就写地址，没地址（导航里那两枚 `<button>`）就写它的 id —— 这一枚字符串是
     `data-settled` 的值，读数侧拿它回来能唯一指到页面上那一枚真可点面。落点是别人家已经画好的控件，
     不是这里新长出来的东西，也不是轨迹上撒的一粒。 */
  function linkMark(el){
    const href = el.getAttribute && el.getAttribute('href');
    if (href) return href;
    return el.id ? '#' + el.id : el.tagName.toLowerCase();
  }
  function visibleLinks(){
    const out = [];
    for (const el of document.querySelectorAll(LINK_SET)){
      const r = el.getBoundingClientRect();
      /* 只落向屏幕上真看得见的链接：看不见的链接落上去就是"萤火指着一处不存在的地方"（§12 那一族） */
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) continue;
      out.push(el);
    }
    return out;
  }
  /* 落到"离它最近的那一枚链接"：在（在岗萤火 × 可见链接）这一整组配对里取距离最小的一对，
     所以上岗的永远是当前屏幕上最近的那枚萤火，而不是清单里的第一枚。 */
  function settleNearest(){
    if (settling() || reduceMotion || lostList || !fine || narrow.matches || !awake()) return;
    const links = visibleLinks();
    if (!links.length) return;
    let fly = null, link = null, best = Infinity;
    for (const f of box.querySelectorAll('.firefly')){
      if (f.dataset.busy || f.dataset.settled) continue;      /* 惊起中的不许半路改主意 */
      const r = f.getBoundingClientRect(), fx = r.left + 1.5, fy = r.top + 1.5;
      for (const el of links){
        const t = el.getBoundingClientRect();
        const d = Math.hypot(fx - (t.left + t.width / 2), fy - (t.top + t.height / 2));
        if (d < best){ best = d; fly = f; link = el; }
      }
    }
    if (fly) settleTo(fly, link, SETTLE_DRIFT);
  }
  function armSettle(){
    clearTimeout(settleT);
    if (reduceMotion || lostList || !fine || narrow.matches || !awake()) return;
    if (root.dataset.fireflies === 'off') return;
    if (!box.querySelectorAll('.firefly:not([data-settled])').length) return;   /* 亮色白天那一档本来就没有萤火 */
    settleT = setTimeout(settleNearest, SETTLE_MS);
  }
  function releaseSettle(){
    clearTimeout(settleT);
    for (const f of Array.from(box.querySelectorAll('.firefly[data-settled]'))){
      f.style.cssText = f.dataset.base;   /* 归位：连原来那条 firefly-live 一起恢复（与惊起 4050ms 那一步同一条写法） */
      delete f.dataset.settled; delete f.dataset.settledSeq;
    }
  }
  /* 飘向一枚真链接：先按惊起那一段同一条"原地冻结、不跳"的走法杀掉动画、量出动画当时把它抬起了多少，
     再一次性平移过去（`transform` ＋ 已在册那枚 cubic-bezier(.22,1,.36,1)），落定后换上 `breath` 那一族吐纳。
     两档共用它：首页是"光标停满 3s 落一枚"，404 是"三枚各飘向三条在册地址"。
     ⚠️ 落点取的是**起势那一帧**的链接矩形：飘行途中若发生换字重排或窗口缩放，落点会差出一段——
     这一格没做重钉（登记在卡回执的"未验到"里）。 */
  function settleTo(f, link, ms){
    if (f.dataset.busy || f.dataset.settled) return;
    const href = linkMark(link);
    f.dataset.settled = href;                                 /* 落点可核对：这枚字符串能指回页面上那一枚真可点面 */
    const seq = ++settleSeq; f.dataset.settledSeq = String(seq);
    const keep = () => f.dataset.settledSeq === String(seq);   /* 期间被解除／被重铺 ⇒ 迟到的两帧都不许写回去 */
    const r = f.getBoundingClientRect();
    f.style.animation = 'none';
    const b = f.getBoundingClientRect();
    const dx = r.left - b.left, dy = r.top - b.top;
    f.style.transform = `translate(${dx}px,${dy}px)`;          /* 原地冻结，不跳（§8.6 同一条） */
    const t = link.getBoundingClientRect();
    const ox = (t.left + t.width / 2) - (r.left + 1.5);
    const oy = (t.top + t.height / 2) - (r.top + 1.5);
    setTimeout(() => {
      if (!keep()) return;
      f.style.transition = `transform ${ms}ms cubic-bezier(.22,1,.36,1)`;
      f.style.transform = `translate(${dx + ox}px,${dy + oy}px)`;
      f.style.opacity = '.85';      /* `.firefly` 起手 opacity:0（home.css:281），不写这一句就是"落了但看不见"；.85 照惊起重新亮起那一档 */
    }, 60);
    setTimeout(() => {
      if (!keep()) return;
      f.style.transition = 'none';
      f.style.animation = `breath ${BREATH_CYCLE}s linear ${-Math.random() * BREATH_CYCLE}s infinite`;   /* 负延时只是让它与同页其它几枚不同步，周期与缓动一个没改 */
    }, 60 + ms);
  }

  /* ---------- 雾灯：三种"指向"——鼠标跟着手、触屏按住不放、键盘跟着焦点（§8.5） ----------
     视差仍旧只属于细指针（§11），但灯不再只属于细指针：降级不等于缺席。
     触屏只亮在按住的那一下，不跟手——跟手就要读 touchmove，那正好和滚动抢同一根手指。 */
  if (reduceMotion) return;
  const scene = document.querySelector('.scene');
  if (!scene) return;
  const nav = document.querySelector('.nav');
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
  const inRange = el => !!(el && el.closest && el.closest(LINK_SET));   /* 名单与停泊那一格同一份，不两处各写一遍 */

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
      releaseSettle();                        /* 手动一下：停泊立刻解除并归位（提案那句"a cursor that behaves"） */
      tx = (e.clientX / innerWidth  - .5) * 2;
      ty = (e.clientY / innerHeight - .5) * 2;
      light(e.clientX, e.clientY + scrollY, false, false);
      const now = performance.now();
      if (lastT){
        const v = Math.hypot(e.clientX - lastX, e.clientY - lastY) / (now - lastT);
        if (v > 1.2) maybeStartle(e.clientX, e.clientY);   /* 慢速靠近不惊动 */
      }
      lastX = e.clientX;  lastY = e.clientY;  lastT = now;
      armSettle();                            /* 那 3s 从头数：上一次动鼠标是这一刻 */
    });
    /* 光标离开窗口：不等空闲，直接熄；停泊的那一枚也一并放回去（它等的就是这根光标） */
    document.documentElement.addEventListener('mouseleave', () => { releaseSettle(); blowOut(); });
    /* 这一枚环是首屏唯一的那一枚（§7.1 第 ⑨ 格钉着 `requestAnimationFrame(` 只许 1 枚），
       离屏闸门（上面那一段）关的就是它：停 = 不再排下一帧，并且把已经排上的那一帧撤掉。 */
    let looping = false, rafId = 0;
    function loop(){
      rafId = 0;
      if (!looping) return;
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
      rafId = requestAnimationFrame(loop);
    }
    rafPump = on => {
      looping = on;
      /* 恢复：累积值一个都不重置，直接接着跑下一帧（式子里没有 dt，停过的时长不改变步长） */
      if (on){ if (!rafId) loop(); }
      else if (rafId){ cancelAnimationFrame(rafId); rafId = 0; }
    };
    rafPump(awake());
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
