/* 子页面与首页共用：主题 / 时钟 / 滚动入场 / 进度线 / 目录
   列表与正文已由 Astro 在构建期渲染成静态 HTML，这里只剩交互 */
/* ⚠️ 这四个档位的判定（几点算 dawn、几点算 dusk）在 ../lib/phase.js，是纯函数：
   浏览器跑它、`tools/phase-check.mjs` 也跑它，差值表里的数和访客看到的档子是同一份代码出的。
   搬去别处写（尤其是搬进 CSS 之外的运行时自定义属性）会拆掉 palette-check 的方向光复算——见 §2.3 末。 */
import { phaseAt, tableBounds, sunOverride, shaftAt } from '../lib/phase.js';
/* 搜索的检索口径与构建期那份是**同一份代码**（`lib/search.js` 文件头第①条讲的三处同跑），
   这里只吃它两个函数：比对、以及标出字面连续的那几枚字。 */
import { searchDoc, queryTerms, markRanges, INDEX_VERSION } from '../lib/search.js';

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
    if (tc) tc.setAttribute('content', t === 'dark' ? '#0B100A' : '#EBEDE8');
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
    /* 两枚弹层同向、不许同开。⚠️ 这一条的理由在第十一轮末换过一次：原先它们并排挂在胶囊里
       那两枚 30px 圆钮下面（右缘对齐、宽度同一份 236、两枚钮之间只差 40px ⇒ 同开就是两块玻璃
       叠在同一片区域），现在搜索面板搬到扉页那一行了，几何上未必还叠着（第 ⑤/⑦ 格逐档量过，
       读数登记在 §11）。**判据留着**，因为买的不是"不重叠"而是"全站同一时刻只许一块玻璃压在内容上"：
       两块同开时读屏与 Tab 序都会同时把访客带进两个方向。
       setSearchOpen 是同一作用域里的函数声明（提升），所以这里能直接叫它；
       它只在真开的时候才反手叫回来（v 为假不叫），两条路都不构成回环。 */
    if (v) setSearchOpen(false);
    if (v) hideKbdHint();   /* 一轮 §C2 那条提示让位：真开的时候才撤（同上一行不成对，见那段注释④） */
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

  /* ---------- 站内搜索（§9 在册组件，第十一轮）----------
     四条口径写在这里，因为它们都是"看不见但一毁就全毁"的那类：
     ① **入口只由这段显形**：`<div class="search">`（`src/components/SearchEntry.astro`）在静态产物里带
        `hidden`，而 `.search` 自己写了 `display:inline-flex`（一个块级元素挂成原子性内联盒，
        于是它就住在宿主那一行的文字流末尾、不另起一行；压得过 UA 那条 `[hidden]{display:none}`），
        所以 `base.css` 那条 `.search[hidden]{display:none}` 是"没有脚本就没有这一格"的唯一承重点。
        口径抄 `[slug].astro` 那枚 post-focus（显形只由打包脚本做，见上面 :348 那段）与 404 那枚纯 JS 的
        `li`——无 JS / 这段没跑 ⇒ 扉页那一行末尾连分隔点都不出现，更不会有一枚点了没反应的字（§12）。
        ⚠️ 不许退化成 `<a href="/search/">`：本站没有 /search/ 这一页，指向它的锚点就是 §12 那种死锚点。
     ② **检索不住在这里**：切词、比对、标高亮全在 `lib/search.js` 那一处，构建期与门禁跑的是同一份。
        这里只做三件事：取 JSON、把结果画成 DOM、把状态说清楚。
     ③ **说明行不许空着**：没输东西 / 零条 / 输入里没有可搜的字 / 索引没取到，四种场合各一句实话。
        空白不是"还没搜"，是 §12 刚在 404 那格否决过的"许愿输入框"——回车什么都不发生。
     ④ **宿主是"内容页扉页那一行字"，不是右上角那枚圆钮**：入口与面板都在 `#search` 这一块里，
        打开/收起/归还焦点这条链上的三个对象（`#search-toggle` 那枚文字动作、`#search-panel`、
        点外面时判归属的 `.search` 类）一个都没换 id——**换的是它们的宿主位置**。⚠️ 所以 Esc 归还的
        那枚 `seBtn.focus()` 现在落回的是"扉页那一行的那枚字"：它必须真的在页面上（上一版的入口在导航里，
        焦点还回一枚右上角圆钮；宿主搬走而归还对象不改，就会把焦点还进一个不存在的位置——
        第 ⑤ 格判的就是 `document.activeElement.id === 'search-toggle'`，跟着宿主漂的那一档会当场红）。
        这一页没有那一格（详情页 / 分类与标签的落地页 / 404）⇒ `#search` 整个不存在，
        下面每一处都在 `if (searchWrap && …)` 里，`/` 也在那里面：**按了不做事，也不假装做事**。 */
  const searchWrap = document.getElementById('search');
  const seBtn = document.getElementById('search-toggle');
  const sePanel = document.getElementById('search-panel');
  const seInput = document.getElementById('search-input');
  const seHint = document.getElementById('search-hint');
  const seList = document.getElementById('search-results');
  const INDEX_URL = '/search.json';
  let seIndex = null;            // 取到过一次就留着：抽屉开合与逐字输入都不该再发第二次请求
  let seLoading = null;          // 同一个请求只发一次（并发 input 事件会同时进来）
  let seSeq = 0;                 // 只认最后一次输入的读数：慢回来的那一批必须被丢掉

  function setSearchOpen(v){
    if (!sePanel || !seBtn) return;
    sePanel.classList.toggle('open', v);
    seBtn.setAttribute('aria-expanded', String(v));
    if (v) sePanel.removeAttribute('inert'); else sePanel.setAttribute('inert','');
    if (v){
      seInput.focus();
      if (sPanel && sPanel.classList.contains('open')) setOpen(false);   /* 与上面 setOpen 里那一条成对 */
      hideKbdHint();   /* 一轮 §C2 那条提示让位（与 setOpen 里那一枚成对的另一半：两扇门都要撤） */
    }
  }

  function loadIndex(){
    if (seIndex) return Promise.resolve(seIndex);
    /* ⚠️ 失败要把 seLoading 清空：否则第一次网络失败会永久留下一个已 reject 的 promise，
       这个会话里再也不会重发——那一档就是"搜索框永远搜不到东西"，而它看起来只是没结果。 */
    seLoading ??= fetch(INDEX_URL)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(j => {
        /* 形状不对就算红，不算"零条"：一枚空的、上一轮留下的、或者被 CDN 换成首页 HTML 的响应，
           在 `searchDoc()` 里都会干干净净地返回 [] —— 那时"没有这一篇稿子"和"索引坏了"
           长得一模一样，而只有后者需要报告。 */
        if (!j || j.v !== INDEX_VERSION || !Array.isArray(j.docs) || !j.docs.length)
          throw new Error('shape v=' + (j && j.v) + ' n=' + (j && j.docs && j.docs.length));
        seIndex = j.docs;
        return seIndex;
      })
      .catch(e => { seLoading = null; throw e; });
    return seLoading;
  }

  /* 命中高亮：只把**字面连着出现过**的那几段裹进 <mark>（`markRanges` 里那条口径）。
     走 createTextNode / createElement ⇒ 标题与摘要里的任何尖括号都只是字，永远闭不掉这一格的壳。 */
  function markedInto(node, text, query){
    let at = 0;
    for (const [a, b] of markRanges(text, query)){
      if (a > at) node.appendChild(document.createTextNode(text.slice(at, a)));
      const m = document.createElement('mark');
      m.textContent = text.slice(a, b);
      node.appendChild(m);
      at = b;
    }
    if (at < text.length) node.appendChild(document.createTextNode(text.slice(at)));
  }

  function paintHits(hits, query){
    seList.textContent = '';
    for (const h of hits){
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'search-row';
      a.href = h.u;
      const t = document.createElement('span');
      t.className = 'search-row-t';
      markedInto(t, h.t, query);
      a.appendChild(t);
      if (h.e){
        const e = document.createElement('span');
        e.className = 'search-row-e';
        markedInto(e, h.e, query);
        a.appendChild(e);
      }
      li.appendChild(a);
      seList.appendChild(li);
    }
  }

  function runSearch(){
    const q = seInput.value.trim();
    const mine = ++seSeq;
    if (!q){
      seList.textContent = '';
      seHint.textContent = seIndex ? `${seIndex.length} 篇可搜 · 标题 / 摘要 / 正文` : '正在取索引…';
      return;
    }
    loadIndex().then(docs => {
      if (mine !== seSeq) return;                     /* 已经有更新的一次输入在跑了 */
      /* 输入里一个可搜的字都没有（整串是标点 / 空白 / emoji）——这不是"查无此词"，是"没查"。
         两种场合必须分两句说：拿"没有一篇里出现过「…」"去回一句根本没被切出词元的输入，
         就是把一次失败读成一次成功的零结果，而这两种下一步要做的事完全相反。 */
      if (!queryTerms(q).want.length){
        seList.textContent = '';
        seHint.textContent = `「${q}」里没有可搜的字：要至少一个字或一个字母`;
        return;
      }
      const hits = searchDoc(docs, q);
      paintHits(hits, q);
      /* 零条那一句必须**带着访客刚打的那串字**：只说"没有找到"读起来像没搜，
         而把查询词回显出来才说明"搜过了，搜的就是这几个字"。 */
      seHint.textContent = hits.length
        ? `${hits.length} 篇命中`
        : `没有一篇里出现过「${q}」`;
    }).catch(() => {
      if (mine !== seSeq) return;
      seList.textContent = '';
      seHint.textContent = '索引没取到，这一格现在搜不了。刷新一次试试。';
    });
  }

  if (searchWrap && seBtn && sePanel && seInput && seHint && seList){
    searchWrap.hidden = false;          /* ← 入口在这一步才存在，见本节开头那条① */
    seBtn.addEventListener('click', () => setSearchOpen(!sePanel.classList.contains('open')));
    seInput.addEventListener('input', runSearch);
    /* 回车要有事可做：只有一条命中的时候，回车就是"去那一页"。
       多条命中时回车不做跳转——跳哪一篇都是替访客决定，那时该做的是把清单摆在他面前。 */
    seInput.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const only = seList.children.length === 1 && seList.firstElementChild.firstElementChild;
      if (only) only.click();   /* 走那枚真 <a> 的 click，不写 location.href：语义同一件事，
          但测试面能把这一次导航截下来读数（tools/search-check.mjs 第 ⑤ 格） */
    });
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && sePanel.classList.contains('open')){ setSearchOpen(false); seBtn.focus(); }
      /* ↑ 焦点还给**触发它的那枚文字动作**（`#search-toggle` 现在是扉页那一行里的 `search — 搜全文`，
         不再是右上角那枚圆钮）——id 没换、宿主换了，所以这一句跟着换宿主的正是它的**指向对象**：
         还回一枚不存在的元素就等于把焦点丢回 `<body>`，键盘用户下一次 Tab 从页头重新走一遍。 */
    });
    /* 键盘 `/` 全站直达这一格。四条"不抢"是这一句的全部难度：
       ① 输入框与可编辑区里的那个斜杠是**正在打的字**，不是命令（`<input type=search>` 里打 `/`
          必须落进框里——这一档第 ⑤ 格专门判：焦点在输入框里时把 `/` 打进去，值必须长出那一枚字符，
          而面板不许被第二次"打开"）；
       ② 带任何修饰键都不算（`Ctrl+/`、`Cmd+/` 是浏览器与编辑器的）；
       ③ 原生 `<dialog>` 开着（灯箱 `showModal()`）时不抢——那是一个焦点陷阱，在它上面再开一块玻璃
          就是把焦点从陷阱里拽走，模态语义当场作废；
       ④ 这一页没有那一格（详情页 / 分类与标签的落地页 / 404）⇒ 这一段整块住在 `if (searchWrap && …)`
          里面，按 `/` 与改动前逐字相同：什么都不发生，也不"打开一枚不存在的面板"。
       `preventDefault` 要写：那几个浏览器把裸 `/` 认成"快速查找"，不拦就会同时弹浏览器的找字条。 */
    addEventListener('keydown', e => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (document.querySelector('dialog[open]')) return;
      e.preventDefault();
      setSearchOpen(true);
    });
    addEventListener('click', e => {
      if (!sePanel.classList.contains('open') || e.target.closest('.search')) return;
      setSearchOpen(false);   /* 点外面只收面板，不抢焦点——与抽屉同一条（:73 那句） */
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
    /* 光柱的"晨昏各一小时"（二轮 §2.1，规范 §5.1）：同一根时钟上的**子区间**，写成 `data-shaft`。
       ⚠️ 上面 :5 那格警告的是"搬进 CSS 之外的运行时自定义属性"会拆掉方向光复算——这一枚不碰那三枚：
       `--lit` / `--lit-at` / `--lit-r` 与暗色三段色温仍旧只住在 CSS 的 `html[data-phase=…]` 条件块里，
       palette-check 复算读的还是那些块。这里搬出去的是 `.bg-photo::after` 的 **opacity**，
       而 §5.1 签的是"opacity 是普通属性、不进色板闸"——它今天本来就没有尺子在读（欠量登记在 §5.1）。
       ⚠️ 不 `announce()`：这一枚属性只有 CSS 吃，广播一次会把 `hero.js` 的萤火那一族 innerHTML 清掉重排
       （惊起路径的随机位与节律白丢一次），而它要的只是到点换一档 opacity。 */
    const sh = shaftAt(now, p);
    if ((root.dataset.shaft || null) !== sh){
      if (sh) root.setAttribute('data-shaft', sh); else root.removeAttribute('data-shaft');
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
  /* 阅读弧（三轮 §5.1，规格与四条口径签在 essay.css 那一格＋§15 那一行）：右上角那枚 28px 的弧只画"这一篇
     走了多少"，不取代刻度带的"在读哪一章"，#progress／#progress-marks 的在册取值一个字节没动。
     ⚠️ 只窄屏那一档的判据与 CSS **同一枚数字**：下面 `narrowArc` 写的 1240 必须与 `essay.css` 那条
        `@media (max-width:1240px)`（以及 `#toc` 整块消失那一条）同值。两处各写一个数，就会长出"弧在屏幕上
        却不再更新"／"更新了却看不见"那一族两边都像绿的病（§17"两把尺子必须是同一把"）。本卡不发明第三个断点。
     ⚠️ 零新监听：写它的仍是下面那趟已在册的 rAF 滚动帧（`updateProgress()`），本卡一个 addEventListener 都没添。
     ⚠️ 减弱偏好那一档"整枚不渲染"的承重点在 CSS（essay.css 末尾那条 `html #read-arc{ display:none }`），
        这里 `reduceMotion` 只是连写都不写。无 JS 时弧的起手态是构建期烘的 `stroke-dashoffset`＝周长 ⇒ 画 0 像素。
     周长从几何本身要（`getTotalLength()`，先例 `#day-ring` 同一条口径），CSS 与这里都不再抄一遍 81.68。 */
  const readArc = document.getElementById('read-arc');
  const readRing = document.getElementById('read-ring');
  const narrowArc = matchMedia('(max-width: 1240px)');
  const arcLen = readRing && readRing.getTotalLength ? readRing.getTotalLength() : 0;
  let arcLast = -1;

  function updateProgress(){
    if (!postBody) return;
    const r = postBody.getBoundingClientRect();
    const total = Math.max(r.height - innerHeight, 1);
    const done = Math.min(Math.max(-r.top, 0), total);
    if (progress) progress.style.transform = `scaleX(${done / total})`;
    /* 一屏就读完的稿子没有"走过的一段"，刻度会全挤在右端 */
    const short = r.height <= innerHeight + 120;
    /* 阅读弧（三轮 §5.1）：与上面那道 scaleX 同一趟帧、同一个 done/total，零新尺、零新监听。
       不画的那三档各有一条在册理由：`short`＝一屏读完（刻度带整排撤那一族）、`!narrowArc.matches`＝宽屏那档
       归目录、`reduceMotion`＝整枚不渲染（CSS 已经把它 display:none 了，这里只是不去写）。
       比值没变就不落属性（同下面 `lastMark` 那一族"每帧只判一次"）。 */
    if (readArc && readRing && arcLen){
      const arcOff = short || !narrowArc.matches || reduceMotion;
      readArc.classList.toggle('off', arcOff);
      if (!arcOff){
        const arcFrac = done / total;
        if (arcFrac !== arcLast){
          arcLast = arcFrac;
          /* 两枚都从几何本身要（`getTotalLength()`），与 `paintDayRing()` 逐字同一写法：浏览器对 `<circle>`
             的周长是近似值（本机 375 档实测 81.16，而 2πr 的构建期值是 81.68），只写 offset 的话起手那几帧
             会先露出 0.6% 的一小截。dasharray 跟着 len 一起写，可见弧长就正好等于 len × 比值。 */
          readRing.style.strokeDasharray = arcLen.toFixed(2);
          readRing.style.strokeDashoffset = (arcLen * (1 - arcFrac)).toFixed(2);
        }
      }
    }
    if (markEls.length){
      marks.classList.toggle('off', short);
      if (!short){
        /* ⚠️ 刻度用**正文总高**这把尺子，不是进度线那把（`总高 − 视口`）。不是省事，是后者算不出来：
           一篇 1283px 的稿子在 819px 视口里，最后三章的 offsetTop 是 264 / 659 / 987，
           除以 total=464 得到 57% / **142% / 213%**——两枚刻度落在屏幕外（实测）。
           "章节走到视口顶"这件事对最后 819px 里的内容**永远不发生**。
           所以：**刻度是地图（这一章占全文的哪一段），点亮才是进度**。两件事分开，各自成立。 */
        if (r.height !== lastTotal){
          lastTotal = r.height;
          const n = Math.min(markEls.length, markAt.length);
          for (let i = 0; i < n; i++) markEls[i].style.left = (markAt[i] / r.height * 100).toFixed(3) + '%';
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

  /* ⚠️ 目录与章节刻度**吃同一枚选择器，而且从这一行起只有一个出处**：原先 :204/:226/:231 三处
     各写一遍字面量 `'h2:not(.fn-title)'`，注释还写着"两把尺子必须是同一把"——一句注释守不住的东西，
     挪成一份常量才守得住。第十一轮把 H3 一起收进来（§15 详情页那一格），三处同向变：
     只改目录不改刻度就是当场制造分叉，而那种分叉两边都长得像"对的"。
     文末那枚"注"（.fn-title）仍旧不算章——它是那一块的标题，不是一章。
     ⚠️ `card/anchors` 之后这一枚选择器的身份变了：它**不再决定目录里有几条**（那批 `<a>` 与 `<span>`
     由 `[slug].astro` 在构建期烘进 HTML，与正文那排 id 同源于 `markdown.js` 的 `renderArticle`），
     它只管"给哪一枚标题做高亮/点亮"。选择器仍然只有这一份出处，两边（高亮与刻度点亮）不许各写一遍。 */
  const HEAD_SEL = 'h2:not(.fn-title), h3';
  const headsOf = () => Array.from(postBody ? postBody.querySelectorAll(HEAD_SEL) : []);

  /* 高亮"正在读的那一章"——目录剩下的唯一一件真·运行时职责（§1：无 JS 时目录仍然在、仍然能跳）。
     ⚠️ 这里**不再补 id、不再造 `<a>`**：正文那排 id 与目录那批 href 都是构建期产物、同一批字符串，
     运行期再补一枚就是给「目录⇄正文 id」那条对账判据造第二真值（§12 死锚点那一族的成因）。
     ⚠️ 比对走 `getAttribute('href')` 而不是 `a.hash`：`a.hash` 是 **IDL 属性**，按 WHATWG URL 序列化
     把非 ASCII 逐字节百分号化（`#日志是灯` → `#%E6%97%A5…`），而 `'#' + h.id` 拿到的是原文 ⇒
     本站的章名是 CJK，两边永远比不中、高亮恒不亮。旧代码没撞上这一条，是因为它用
     `a.href = '#'+id` 赋值，反射回属性时两侧都已编码过一遍——同一枚坑换了来源就现形。
     内容属性（盘上那串字节）与正文的 id 逐字符相同，所以这一枚比对与产物级对账读的是同一个值。 */
  function highlightToc(){
    if (!toc || !postBody) return;
    const links = Array.from(toc.querySelectorAll('a'));
    const heads = headsOf();
    if (!links.length || !heads.length) return;
    const spy = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    heads.forEach(h => spy.observe(h));
  }
  highlightToc();

  /* 刻度的那一排 span：与目录同一批标题、同一个选择器（上面那枚 `HEAD_SEL`）。
     ⚠️ `card/anchors` 之后 span 本身是构建期烘进 HTML 的（`[slug].astro`），脚本只量位置、只点亮；
     这里取 `Math.min(枚数, 位置数)` 不是兜底，是**不给"两边各数各的"留活路**——真分叉了产物级对账先红。 */
  function measureMarks(){
    if (!marks || !postBody) return;
    const base = postBody.getBoundingClientRect().top + scrollY;
    markAt = headsOf().map(h => h.getBoundingClientRect().top + scrollY - base);
    lastTotal = -1;                       /* 逼一次重排：图落地之后位置会变 */
  }
  if (marks && postBody){
    markEls = Array.from(marks.children);
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
    /* ⚠️ 这一枚**不许回到 `threshold: .15`**（2026-10-02 修的一起线上故障：正文整块就是一枚 `.reveal`，
       作者那篇长稿在 1440×900 下量到 **9,149px** 高 ⇒ "露出 15%" 要一次看见 1,372px，比任何真实视口都高，
       于是那一块永远不进 `.in`、永远 `opacity:0`——访客看到的是一页空白，而构建、门禁、控制台全干净。
       手机同一枚账：390×844 下那块 7,073px，门槛 1,061px > 844。三篇演示稿当年最高那篇只有 1,249px
       （门槛 187px，随便一屏就过），所以这枚牙在真语料里从没咬过——语料前提那一族，见 runbook §3.13 第 ㉒ 格。）
       现在这枚写法管的是"顶边进了首屏就演"，与那块有多高无关：`threshold: 0` ＋ 底边内缩 12% 的 rootMargin
       （内缩那 12% 是留给"刚露头就点亮"的一点余量，不参与错落节拍——节拍仍住在 CSS 的 `--cascade` 里）。 */
      }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
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

  /* ---------- 键盘导航提示（一轮 §C2，2026-10-02 `v5b/heads`）----------
     首次按 Tab 浮出的一条薄玻璃，3s 后淡出、淡完自己把节点收掉；形状与全部视觉理由在 `base.css` 那一格。
     五条口径，逐条都在这段代码里落着：
     ① **只有键盘真的动过才算**：判据是 `keydown` 里 `key === 'Tab'` 那一条，没有 click／pointerdown 任何
        旁路 ⇒ "只显示给键盘用户"是**结构**保证的，不是靠藏（鼠标与触屏访客在这一段上一次都不触发）。
     ② **一次性**：`sessionStorage.mistwood-kbdhint` 那枚**新键**（写法照 `mistwood-greeted`，吃的就是
        下面那一对现成的 `readFlag`／`writeFlag`）——站内跳转不重播，一次会话最多出现一次；读不到就当
        已经说过（隐私模式下不说，而不是猜一句要说的）。⚠️ 站内已有的那些键（`mistwood-theme`／
        `mistwood-display`／`mistwood-opens`／`mistwood-focus`／`mistwood-seen`／`mistwood-homing`／
        `mistwood-greeted`）一枚不清、一枚不改写：那是访客自己的应用状态，不是我们的账。
     ③ **减弱动态偏好下整块不出现**（这一档选的是"不出现"，不是"出现但不淡出"）：§1 预算表末行签的是
        "必须 `animation:none` 并**直接落到终态**"，而这一条走完整段序列之后的终态就是"不在屏上"——
        它是一次性提示、不是一个可以停在终态的状态位。留下它再让它在 .2s 里硬现硬撤，读起来正是那一格
        点名的"比不降级更闪"。**代价照登**：减动效的键盘用户拿不到这句提示，但 `:focus-visible` 那圈
        苔绿描边与 Tab 序本身一枚不少（`base.css` 在册）——他失去的是"有人提醒可以按 Tab"，不是"按了没反应"。
     ④ **让位**：任一弹层在场就不出现，已经出现而弹层随后被打开就当场撤（`setOpen`／`setSearchOpen` 里各
        点名一次）。买的是上面 :59 那一格签下的"全站同一时刻只许一块玻璃压在内容上"；needle 用
        `.settings.open`（抽屉与搜索面板共用那一族类名）与 `dialog[open]`（灯箱，`/` 那一格同一枚）。
     ⑤ **落点是这一份打包脚本，不是 `<head>` 里那两段 `<script is:inline>`**：§16 第四类门禁断言的对象是
        "内联脚本在首帧之前同步落地的五枚显示属性"，往里塞一段要等 keydown 的代码只会多出一条永远断言不到
        的判据（`mistwood-focus` 那一格为同一件事记过两次）。后果说清楚：`tools/runtime-check.mjs` 的
        **内联隔离档**（对任何 `.js` 回 404）里这一整段不跑 ⇒ 那一档读到的是"屏上没有这条提示"，
        与无 JS 的访客同一档——而那正是渐进增强要的那一面：**无 JS ⇒ 没有这条提示，但 Tab 照样走、
        `:focus-visible` 照样描边**（`:focus-visible` 是 CSS，不需要这段脚本）。 */
  const HINT_KEY = 'mistwood-kbdhint';
  const HINT_TEXT = 'tab 逐项 · enter 打开 · / 搜索';
  const HINT_DWELL = 3000;        /* 停在屏上的**时长**，不是"动多久"：动只有那 .6s（§1.3 新签这一档的账在那儿） */
  const HINT_FADE = 600;          /* ＝ base.css 那条 transition 的 .6s，在册 0.3–0.6s 交互档 */
  function hideKbdHint(){ const h = document.querySelector('.kbd-hint'); if (h) h.remove(); }
  if (!reduceMotion && !readFlag(HINT_KEY)){
    addEventListener('keydown', function onFirstTab(e){
      if (e.key !== 'Tab') return;
      removeEventListener('keydown', onFirstTab);                 /* 一次文档最多问一次；说过就不再挂着听 */
      if (document.querySelector('.settings.open, dialog[open]')) return;   /* ④ 让位：这一档不出现，也不占那枚新键 */
      writeFlag(HINT_KEY, '1');                                   /* 先记账再画：画到一半被打断也不重播 */
      const bar = document.createElement('p');
      bar.className = 'kbd-hint';
      bar.setAttribute('role', 'status');                          /* 它是递给读者的一句话，不是背景装饰 */
      bar.textContent = HINT_TEXT;
      document.body.appendChild(bar);
      /* 起手态 opacity:0 要先提交一帧，淡入才走得到帧。这里用 20ms 的定时器而不是 requestAnimationFrame：
         差别是**能不能被量具读到**——`--dump-dom` 那一档在不产帧的场合 rAF 永不落地（§8.2 那条
         "visibilityState=hidden 时 CSS 动画不走帧"的同族），那一档读回来的 opacity 会一路停在 0，
         红的是量具不是页面。定时器照样落在下一帧之后，肉眼无差别。 */
      setTimeout(() => bar.classList.add('in'), 20);
      setTimeout(() => {
        bar.classList.remove('in');
        setTimeout(() => bar.remove(), HINT_FADE + 100);           /* 淡完收节点：`opacity:0` 仍在可读树里，留着它就是留一句屏上没有的话 */
      }, HINT_DWELL);
    });
  }

  /* ---------- 专注模式（§15 第九轮）：正文末段那一行的第二枚文字钮 ----------
     按下去撤两层：身后的雾（.post-body 的滚动 mask）+ 方向光落在正文上的部分。两条声明与全部
     理由在 `essay.css` 里，这里只管状态。三条口径：
     · **阅读页级**：只有有 `#post-body` 的文档才写 `html[data-focus]`，首页与其他子页拿到那枚键
       也不动——抽屉那种全站级旋钮的语义不参与（为什么不进抽屉、为什么它不算"氛围旋钮作废地板"，
       §15 那一格逐条写了；撤完正文回到 §2.4 那笔按纯色底算的账，是往上抬不是往下吃）。
     · **存储跟 mistwood-* 那一族同旗**：值只有 '1'（开）与"键不存在"（关），和 mistwood-seen /
       mistwood-greeted 一个写法。读不到（隐私模式 / 被禁）就当关：不猜、不提示、不预留空位（§12）。
     · **显形只在这里发生**：按钮在静态 HTML 里带 `hidden`，所以无 JS / 这段没跑 ⇒ 这一页与今天
       逐字节相同；而那时雾本来也不出现（`--read-fog` 起始 -9999px 只有下面 `updateProgress()` 会写）。
       ⚠️ 故意不搬到 `<head>` 那段 `<script is:inline>`：那是 §16 第四类门禁"内联脚本同步落地五枚
       属性"的断言对象，往里加一枚阅读页级的活只会多出一条永远断言不到的判据。
       应用与显形都在 `updateProgress()` 之后、同一个同步执行里 ⇒ 中间没有一帧被画出去，
       存着"开"进来的人不会先看见一次雾再看见它撤掉。 */
  const FOCUS = 'mistwood-focus';
  const focusBtn = document.getElementById('post-focus');
  const readFocus = () => { try { return localStorage.getItem(FOCUS) === '1'; } catch (e) { return false; } };
  function applyFocus(on){
    if (on) root.setAttribute('data-focus', '1'); else root.removeAttribute('data-focus');
    if (focusBtn){
      /* 标签不写机制：reduced-motion 下没有雾可撤，写"撤掉身后的雾"就是假语义（§12） */
      focusBtn.textContent = on ? 'focus · 退出专注' : 'focus · 只看字';
      focusBtn.setAttribute('aria-pressed', String(on));
    }
  }
  if (focusBtn && postBody){
    let focus = readFocus();
    applyFocus(focus);
    focusBtn.hidden = false;
    focusBtn.addEventListener('click', () => {
      focus = !focus;
      applyFocus(focus);
      try { focus ? localStorage.setItem(FOCUS, '1') : localStorage.removeItem(FOCUS); } catch (e) {}
    });
  }

  /* ---------- 复制到剪贴板：全站唯一一把尺子（两个调用点：盖章 ＋ 代码块复制钮） ----------
     两条都试、都不成才算失败：`navigator.clipboard.writeText` 在 http/非安全上下文里直接拒
     （那一档 `navigator.clipboard` 整个是 undefined，所以这句连 property 都取不到），
     `execCommand('copy')` 是那一退路。返回值就是"到底复制上没有"，调用点只准吃这一枚布尔——
     §9 盖章那一格签的纪律（"复制没成功就什么都不落"）管的是**判定**，不是某一句文案，
     所以第二个调用点进来时这段必须搬出来共用，而不是在旁边再写一份 textarea+execCommand。
     ⚠️ 这段原先住在盖章那个 if 块里（:372，函数名 fallbackCopy）：搬动只是换宿主，
     两条路的先后、catch 的形状、execCommand 抛异常时回 false 都一个字没改。 */
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
  async function copyText(text){
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) { return fallbackCopy(text); }
  }

  /* ---------- 盖章：分享 = 把这一篇收进手记，回执是一行字不是一枚图形（§15） ----------
     复制没成功就什么都不落——一行"盖于…"的收据配一个没复制到的动作，是 §12 那种假反馈。 */
  const stampBtn = document.getElementById('post-stamp');
  const stampNote = document.getElementById('stamp-note');
  if (stampBtn && stampNote){
    const p2 = n => String(n).padStart(2, '0');
    stampBtn.addEventListener('click', async () => {
      const url = location.href;
      const ok = await copyText(url);
      stampBtn.classList.toggle('miss', !ok);
      if (!ok) return;
      const d = new Date();
      stampNote.textContent = `盖于 ${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())} · 本机`;
      stampNote.hidden = false;
    });
  }

  /* ---------- 正文代码块的复制钮（§15，card/render 留给这一张卡的那半件） ----------
     挂点：`.codeblock[data-lang]` 那一行小标签所在的**行**——外壳 `position:relative` 是上一张卡
     特意留给"不跟随滚动的定位父级"的（`overflow-x:auto` 开在 `pre` 上，钮挂进滚动容器就会跟着跑）。
     ⚠️ 三条"整块不出现"：
       · 代码块一枚都没有 ⇒ 这个 forEach 一个节点都不造（今天三篇稿子就是这一态，产物里零字节）；
       · 围栏没带语言标识（或标识过不了 `[A-Za-z0-9._+-]{1,24}` 那层白名单）⇒ 渲染器不写 data-lang ⇒
         那一行标签本来就不存在，钮也没有可以并进去的那一行；宁可不给复制，不新造一行版面占位；
       · 无 JS / 这段没跑 ⇒ 页面上没有这一枚钮，与改动前逐字节相同（同 post-focus 那枚的显形口径）。
     ⚠️ 故意**不**把这段搬进 `Layout.astro:103-105` 与 `:106-119` 那两段 `<script is:inline>`：那是第四类门禁
       （runtime-check"内联脚本同步落地五枚属性"）的断言对象，往里塞东西要另开一卡。
     取值走 `<code>` 的 textContent：那里面是渲染器整块 esc() 出来的字面代码，没有一枚子元素，
     所以不必再剥标签；钮在 `<code>` 之外（`.codeblock` 的直接子元素），不会把自己复制进去。 */
  document.querySelectorAll('.post-body .codeblock[data-lang]').forEach(block => {
    const code = block.querySelector('code');
    if (!code) return;                        /* 形状不对（渲染器不会发这种）就不装钮，宁缺不假 */
    const btn = document.createElement('button');
    btn.type = 'button';                      /* 真按钮：§12 那枚死锚点 href="#" 在这里没有藏身处 */
    btn.className = 'post-act code-copy';     /* 与盖章、专注同一族那条声明，零新按钮形状（§9） */
    btn.textContent = 'copy';
    block.appendChild(btn);
    btn.addEventListener('click', async () => {
      /* 回执是**同一枚字位换成另一种字**，不是新增一块图形：成了＝copied，没成＝那句真话。
         与 focus 那枚钮 '只看字' / '退出专注' 同一个做法（§9·「当前页的记号」 判的是"同一个符号表达两种状态"，
         这里一格只表达一种状态，翻页靠字本身）。不做"1.7s 之后自己淡回 copy"——那是给一行
         已经说过的收据装定时器，盖章那行 `盖于…` 也没这么办。 */
      btn.textContent = (await copyText(code.textContent)) ? 'copied' : '没能复制';
    });
  });

  /* ---------- 正文配图灯箱（§15 / §8.4 那条"先铺雾、载入后散开"的第二次使用） ----------
     ⚠️ 在场态由**构建期**决定：`[slug].astro` 数过正文里有没有 `figure.shot`，没图就不发那枚
       `<dialog>`（本站最一致的那条模式——"没填 ⇒ 整块不出现"，不是 `display:none` 留着）。
       脚本这一侧再兜一道：`#lightbox` 不在 ⇒ 整段不跑，也不给任何图版装可点语义。
     ⚠️ 用原生 `<dialog>` + `showModal()`：焦点陷阱与 Esc 是浏览器给的，不是我们模仿的。
       图版本身靠 `tabindex`+`role=button`+键盘 Enter/Space 补齐——§12·「把 404 的地址藏起来让人找」 那条教训（"光标接近才浮现"
       对键盘/触屏不是降级而是页面失效）在这儿反着用：能点开的东西必须也能 Tab 到、也能按下去。
     ⚠️ 放大件是**新建的一枚 `<img>`**，src 从被点的那张取：图版在正文里已经走完 §8.4 那条链，
       再复用同一个节点就是让大图"没有载入却演一次散雾"——那是假反馈。新节点真走一次 load/error，
       散开那一下（mistwood.css 那条 filter 声明，第五个使用点）才有出处；第二次打开时缓存已经就位，
       走 `img.complete` 那条同步分支，不再演一遍。 */
  const lightbox = document.getElementById('lightbox');
  const shots = Array.from(document.querySelectorAll('.post-body figure.shot'));
  if (lightbox && shots.length){
    const big = document.createElement('img');
    big.className = 'lightbox-img';
    const capEl = document.createElement('p');
    capEl.className = 'lightbox-cap';
    capEl.hidden = true;                          /* 没有图注就没有这一行，不留一个只会显示空缺的位置（§12） */
    lightbox.insertBefore(capEl, lightbox.firstElementChild);
    lightbox.insertBefore(big, capEl);
    const clear = () => big.classList.add('in');  /* 与 :243 那一族同一个 .in、同一条 0.6s 吐纳 */
    big.addEventListener('load', clear, {once:true});
    big.addEventListener('error', clear, {once:true});   /* 取不到图也放行——留一块永久雾比留一个空位更糟 */
    const lbClose = lightbox.querySelector('.lightbox-close');
    for (const fig of shots){
      const src = fig.querySelector('img');
      if (!src) continue;
      fig.classList.add('zoomable');
      fig.tabIndex = 0;
      fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', `放大这一张：${src.alt || '正文配图'}`);
      const open = () => {
        const cap = fig.querySelector('figcaption');
        big.classList.remove('in');
        capEl.textContent = cap ? cap.textContent : '';
        capEl.hidden = !capEl.textContent;
        big.alt = src.alt;
        big.src = src.currentSrc || src.src;
        lightbox.showModal();
        if (big.complete && big.naturalWidth) clear();   /* 缓存命中：load 不会再来的那一档 */
      };
      fig.addEventListener('click', open);
      fig.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }   /* role=button 的键盘语义要自己补：Tab 到得了不等于按得下 */
      });
    }
    if (lbClose) lbClose.addEventListener('click', () => lightbox.close());
    /* 点图版外面那片雾也收：backdrop 的事件落在 dialog 自己身上，所以 target 是它＝点在框外 */
    lightbox.addEventListener('click', e => { if (e.target === lightbox) lightbox.close(); });
  }

  /* ---------- 404：退回你来处（§15 第九轮）----------
     判据只有 `history.length > 1` 这一条——浏览器确实有一段可退的历史，才谈得上"退回你来处"。
     ⚠️ 那一枚 li 整枚在这里 createElement，**静态产物里没有它的任何一个字节**，于是两头都干净：
       · JS 关掉 ⇒ 这一页与改动前逐字相同（没有"藏着等显形"的节点，也就没有"显形失败就留个空位"）；
       · 判据不满足 ⇒ 页面上一个节点都不留，不是 `display:none` 之后留着（§12"不许预留一个只会显示空缺的位置"）。
     ⚠️ 不用 `<script is:inline>` 做这件事：那两段内联脚本有自己的门禁判据（§16"语法合法但整段不执行"那一族），
       牵动它要另开一卡。这里也不写存储键——判据读的是浏览器自己那段会话历史，一次性的东西不留痕。
     ⚠️ `runtime-check` 读的是 `--dump-dom`，一个 profile 只有一次导航 ⇒ 入口永远是 hist=1 那一档，
       看不见这条路；所以门禁里**没有**它的断言（写了就是一条永远断言不到的判据），实测走 CDP。 */
  const lostList = document.querySelector('.lost-list');
  if (lostList && history.length > 1){
    const li = document.createElement('li');
    const back = document.createElement('button');
    back.type = 'button';                       /* 真按钮 + 真动作：§12 那枚死锚点 href="#" 在这里没有藏身处 */
    const gloss = document.createElement('span');
    gloss.textContent = '上一跳那一页';
    back.append(document.createTextNode('退回你来处'), gloss);
    li.append(back);
    lostList.append(li);   /* 挂在六条地址**之后**（提案原话是"再加一行：或者 · …"，"或者"是列表末尾的
       接续词，不是列表开头的；且 append 才是真的"六条一条不挪位"——prepend 会把首页那条推到第 2 行，
       那才是动了 §12 那句话所保护的东西）。它说"回到你来处"、`/` 那条说"从头再走"，两枚 gloss 各指
       各的方向，不构成同义。 */
    back.addEventListener('click', () => history.back());
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
