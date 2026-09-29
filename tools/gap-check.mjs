/* 间距尺子 ＋ 圆角尺子：把 §4 那句"区块间距 120–160px"换成盘上真正在跑的三档，并且钉住第三档；
   第二轮又给圆角立了一把同构的尺子（`card/radiuscheck`），两族住在同一个文件里、共用同一套块栈走法与两侧对账。
   用法  node tools/gap-check.mjs            （门禁跑这一条：注册表 ⇄ 盘上，两个方向都要对得上）
         node tools/gap-check.mjs --list     （把整张量表打出来，给人复核 / 抄进规范）
   背景：外部提案「间距基准化（8px 网格）」的前提是读规范读出来的，而规范那两行是过期的——
   盘上从来就没有 120–160px 这一档，垂直间距分三种机制在走（§4 现在把它们分开写）。
   本工具不判"该不该上网格"，它只守两件事：
     ① **盘上每一枚固定 px 的垂直间距（含视口比例那一半）必须在注册表里被认领，并写明它属于哪一档**
        —— 防的是"以后有人新增一枚间距，没交代它是哪一类"；
     ② **C 档（纯块间距·已上格）在册值必须是 8 的倍数**；纯块间距里还没上格的那一半登记为 X，
        枚数冻结（§4 点名"把已经是 8 的倍数的钉住，不是全站过一遍"）。
   第二族（圆角尺子，2026-09-29 本卡 `card/radiuscheck` 新加，判据 ③④ 是它的两条）：
     ③ **盘上每一枚 `border-radius` 字面都必须在圆角梯子登记表上在册**——逐枚认领、两侧对账（在册却扫不到 ⇒ 红，
        扫到却不在册 ⇒ 红），并钉一枚 needle（`mistwood.css` 的 `.thing-bar` 那枚 `12px`）防这一族空转；
     ④ **逐档枚数必须与登记一致**——梯子上那一档登记几枚、盘上就扫到几枚，注册表里也就得认几枚；
        梯子外冒出一枚新写法（哪怕它换算后等于某一档）也红。
     为什么要这一族：参照站 Firefly（克隆在 `D:/ref/firefly`，只读）定了 7 档圆角令牌，而全盘 89 处
     `border-radius` 里只有 14 处走 `var(--radius…)`，余下 28 种字面写法混排（`0.125rem` ×8、`999px` 与
     `9999px` 并存）⇒ 有一根梯子不等于梯子上有人，后者要靠尺子。本站 §4 签了一根 11 档梯子，
     那一格末尾自己写着"一枚圆角都没改，也没给圆角立新尺子"——本族就是把那把尺子立起来。
     ⚠️ **这一族一枚圆角数值都不许改**：它只登记现值、只拦以后冒出来的新写法；真要动哪一档，那是另立一张卡的事。
   ⚠️ **两张表、两把尺**：下面 `REGISTERED` 那 142 枚是**垂直间距**的账，`RADIUS_LADDER` 那 30 枚／12 种写法是
     **圆角**的账，两本互不相干、谁也不许并进谁（142 这个数字这一轮一个都不动）。
   档位口径（注册表里那一格是判断，机器不推）：
     A 视口比例 ＝ 槽位值是 vh/vw/vmin/vmax，或一枚解析为 vh 的自定义属性（`var(--head-top)`）；不参与基准化。
     B 行距派生 ＝ 文字流里"行与行／条目与条目"之间的那枚 px，出处是所在块 font-size × line-height 的行盒；不参与基准化。
     C 纯块间距 ＝ 其余固定 px，且已在 8 的格子上 → 受判据②。
     X 纯块间距·在册偏差 ＝ 同一类里还没上 8 格的那些 → 不判 8 的倍数，判"枚数不许悄悄变"（要动就动那枚登记值，
                             那是 §16 说的三处同源：规范那一格 / 本文件字面量 / 盘上的声明）。
   在册枚数（顶部这一行、下面 `REGISTERED` 那枚字面量、§16 那一格、§4 那三行是同一句话的四处，动一处必红）：
     **A 14 ／ B 10 ／ C 52 ／ X 66 ＝ 142 枚垂直间距槽位，覆盖 src/styles/ 五份样式表。**
   ⚠️ 防空转是硬要求（§16 记过一次"rgba 漂移检查静默空转、退出码 0、长得像全绿"）：
     注册表为空 ⇒ 红；扫描器一枚都没抓到 ⇒ 红并打印"判据正在空转"；
     注册表里一条盘上找不到（幻影）⇒ 红；盘上一枚没人认领 ⇒ 红；
     再钉一枚 needle：`essay.css` 的 `.post-body h2{margin:64px 0 24px}` 那枚 64px 必须在册且扫得到。
   ⚠️ 拆值口径：`margin`/`padding` 的 1–2 值写法取第 1 值（上下）、3–4 值写法取第 1 与第 3 值；
     `gap` 双值取第 1 值＝row＝垂直（第 2 值是列＝水平，不计入），单值写法同时是行距与列距、这里认它行距那一半；
     `*-top`/`*-bottom`/`row-gap` 整条即垂直。`margin-left`/`padding-left`/`column-gap` 一概不看。
     零／auto 槽位不认领（那是重置与居中，不是间距决策）；`em`/`mm`/百分比不认领（不是固定 px，量具边界写在 §16 与回执的未验到里）。 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['base.css', 'mistwood.css', 'home.css', 'essay.css', 'notes.css'];
const VPROPS = ['margin', 'margin-top', 'margin-bottom', 'padding', 'padding-top', 'padding-bottom', 'gap', 'row-gap'];
const TIERS = { A: '视口比例', B: '行距派生', C: '纯块间距·已上格', X: '纯块间距·在册偏差' };
/* ⚠️ 在册枚数（§16 那一格与 §4 那三行说的就是这几个数，三处同源，动一处必红）：
   A 14 / B 10 / C 52 / X 66 ＝ 142 枚垂直间距槽位，覆盖 5 份样式表。
   ⚠️ 这一串是 `node tools/gap-check.mjs` **实跑打印**的那一串，不是相加出来的：
   第十一轮末把搜索面板窄屏那一档（`@media (max-width:720px)` 的 `padding:16px`，C 档一枚）
   连同入口宿主一起撤掉，C 53→52、总数 143→142（§11 那一格的账在规范里）。 */
const REGISTERED = { A: 14, B: 10, C: 52, X: 66 };
/* needle：盘上扫不到这一条就是判据空转，不是"这一档刚好没东西" */
const NEEDLE = ['essay.css', '', '.post-body h2', 'margin', '64px', 'C'];

/* ---------- 注册表：文件 / 上下文 / 选择器 / 属性 / 槽位值 / 档位 / 这一枚是谁的呼吸 ---------- */
/* 按文件与盘上顺序排，逐枚一行；改盘上的间距就得改这里，这就是"以后不会再漂"的代价与牙。 */
const REGISTRY = [
  /* ===== base.css：全站基础层（含打印层那一档）===== */
  ['base.css', '', '.nav-clock', 'gap', '8px', 'C', '导航里"现在"那点与时钟文字之间'],
  /* ===== 站内搜索那一格（第十一轮 `card/search`）：四枚，全部落在 base.css 那一份新组件里 =====
     ⚠️ 第五枚（`@media (max-width:720px)` 里 `.settings.search-panel` 的 `padding:16px`）随那一档
     整个分支一起删了：入口的宿主从导航胶囊换成扉页那一行之后，`position:fixed` 的包含块变成视口，
     同一份 `top:calc(100% + 14px)` 会解成 `100vh + 14` ⇒ 面板掉出屏幕，那一档两头都不成立（理由在 base.css）。 */
  ['base.css', '', '.search-box', 'margin-top', '14px', 'X', '输入行与其下"说明 + 结果"那一组之间：与抽屉/图注/副题那一族 14px 同值（面板本身的内垫与错落都复用 .settings 那一份，所以这一格只多出这一枚）'],
  ['base.css', '', '.search-input', 'padding', '8px', 'C', '输入框上下内垫：与 .seg 的 gap、代码块语言标签那枚 8px 同档，行内 code 那 2px 的放大版'],
  ['base.css', '', '.search-row', 'padding', '16px', 'C', '结果行上下内垫：与代码面、灯箱面板那两枚 16px 同一档（一块面的内衬，不新开留白档）'],
  ['base.css', '', '.search-row-e', 'margin-top', '2px', 'X', '结果行里标题与摘要之间：与 .nav-links a 的 2px、行内 code 的 2px 同一族，撑的是命中与呼吸，不是留白档'],
  ['base.css', '@media print', 'html header.post-head', 'padding', '32px', 'C', '纸上标题与其下正文：屏幕那 24vh 在纸上归零后留下的唯一一段（§19.6）'],
  ['base.css', '@media print', 'html footer.print-foot', 'margin-top', '56px', 'C', '纸上一页脚，沿用 .post-tail 那枚收尾 56（注释登记过）'],
  ['base.css', '@media print', 'html footer.print-foot', 'padding-top', '16px', 'C', '页脚与它那 1px 封口线之间'],
  /* ===== mistwood.css：子页那一层 ===== */
  ['mistwood.css', '', '.nav', 'gap', '28px', 'X', '玻璃胶囊横排 flex-wrap:nowrap ⇒ row 槽位平时不显形，值仍在册（§17：home.css 有一份逐字同值的）'],
  ['mistwood.css', '', '.nav', 'padding', '10px', 'X', '胶囊上下内垫（与 22px 左右内垫同一条，只认上下那一半）'],
  ['mistwood.css', '', '.dayring', 'margin', '-7.5px', 'X', '绝对对中的负自身半径（15/2），不是间距决策'],
  ['mistwood.css', '', '.nav-links', 'gap', '22px', 'X', '导航三项之间，nowrap ⇒ row 槽位不显形'],
  ['mistwood.css', '', '.nav-links a', 'padding', '2px', 'X', '命中区上下各 2px：撑可点面积，不是留白'],
  ['mistwood.css', '', '.nav-links a.here::before', 'margin-top', '-2.5px', 'X', '5px 实心点垂直对中（§11 那枚"我在哪儿"）'],
  ['mistwood.css', '', '.display::before', 'margin-top', '-4px', 'X', '8px 竖分隔垂直对中'],
  ['mistwood.css', '', '.settings', 'padding', '14px', 'X', '显示设置抽屉上内垫'],
  ['mistwood.css', '', '.settings', 'padding', '12px', 'X', '显示设置抽屉下内垫（上下不等是刻意的：标题行重、收边轻）'],
  ['mistwood.css', '', '.settings-cap', 'margin-bottom', '12px', 'X', '抽屉标题与第一行旋钮之间'],
  ['mistwood.css', '', '.seg', 'gap', '8px', 'C', '旋钮行 grid 42px 1fr 的单值 gap（两列一行，row 那一半不显形）'],
  ['mistwood.css', '', '.seg', 'margin-bottom', '9px', 'X', '旋钮行与行之间：四行 40ms 错落那一族的既有节奏'],
  ['mistwood.css', '', '.seg:last-child', 'margin-bottom', '2px', 'X', '最后一行收边，抵掉下内垫的视觉余量'],
  ['mistwood.css', '', '.seg-opts', 'gap', '4px', 'X', '三个选项 chip 之间'],
  ['mistwood.css', '', '.seg-c', 'padding', '5px', 'X', 'chip 上下内垫（13px 宋体那一档）'],
  ['mistwood.css', '', '.page-head', 'padding', 'var(--head-top)', 'A', '子页开场三档：look 30vh / read 22vh / lost 14vh（本文件 :263/:264/:270），窄屏各压一档（:579/:582/:583）——"内容越要沉下来，开场越高"（§15）'],
  ['mistwood.css', '', '.page-head', 'padding', '64px', 'C', '开场与它下面第一块内容之间的收尾段'],
  ['mistwood.css', '', '.page-head .sec-label', 'margin-top', '16px', 'C', '页标题与那一行 sec-label 之间'],
  ['mistwood.css', '', '.year-block', 'margin-bottom', '96px', 'C', '/essays/ 年份块之间（§15 目录那一格）'],
  ['mistwood.css', '', '.year-mark', 'margin-bottom', '6px', 'X', '年份标记与它下面那张目录表之间'],
  ['mistwood.css', '', '.essay-index', 'margin', '24px', 'C', '目录表与密度条之间'],
  ['mistwood.css', '', '.row', 'gap', '24px', 'C', '目录行内编号／标题／日期之间（单值 gap，行距那一半在 nowrap 下不显形）'],
  ['mistwood.css', '', '.row', 'padding', '26px', 'X', '目录行上下内垫：一行的呼吸由它自己定，不走上格'],
  ['mistwood.css', '', '.row-ex', 'margin-top', '8px', 'C', '行标题与摘要之间（摘要常驻两行位、只切透明度，§8.8）'],
  ['mistwood.css', '', '.row-side', 'gap', '6px', 'X', '日期列 flex-column ⇒ 这是真的行距'],
  ['mistwood.css', '', '.density-wrap', 'gap', '14px', 'X', '密度条与它的图例之间'],
  ['mistwood.css', '', '.density-wrap', 'margin-top', '22px', 'X', '目录与密度条之间'],
  ['mistwood.css', '', '.lost', 'padding-bottom', '22vh', 'A', '404 页底部留给雾的呼吸（§15：这一页是全站雾最浓的一档）'],
  ['mistwood.css', '', '.lost-note', 'margin', '40px', 'C', '404 说明句与那串地址之间'],
  ['mistwood.css', '', '.lost-list a,.lost-list button', 'gap', '18px', 'X', '404 行内编号与地址之间，baseline 横排 ⇒ row 槽位不显形'],
  ['mistwood.css', '', '.lost-list a,.lost-list button', 'padding', '20px', 'X', '404 行上下内垫'],
  ['mistwood.css', '', '.chip-row', 'gap', '8px', 'C', '标签胶囊之间（§9 那条在册候选第十轮启用）：单值 gap，row 那一半；与 .seg 的 8px 同一档'],
  ['mistwood.css', '', '.chip-row', 'margin-top', '16px', 'C', '胶囊排与它上面那一块之间（详情页页头 / 分类索引页页头之下）：与 .page-head .sec-label 那枚 16px 同档'],
  ['mistwood.css', '', '.chip', 'padding', '4px', 'X', '胶囊上下内垫（12px 等宽那一档）：撑命中与呼吸，不是留白档——与 .seg-c 的 5px、.nav-links a 的 2px 同一族'],
  ['mistwood.css', '', '.things-grid', 'gap', '32px', 'C', '图鉴卡间距——§4 那句"卡片间距 32"的真值就在这一行'],
  ['mistwood.css', '', '.things-grid', 'padding-bottom', '16vh', 'A', '/things/ 底部呼吸'],
  ['mistwood.css', '', '.thing-bar', 'gap', '16px', 'C', '玻璃条内标题与标签之间（space-between 横排）'],
  ['mistwood.css', '', '.thing-bar', 'padding', '12px', 'X', '玻璃条上下内垫'],
  ['mistwood.css', '', '.about-inner', 'gap', '40px', 'C', '/about/ 各块之间：§4"每个区块只讲一件事"就是这一枚'],
  ['mistwood.css', '', '.about-inner', 'padding-bottom', '16vh', 'A', '/about/ 底部呼吸'],
  ['mistwood.css', '', '.about-lede', 'gap', '40px', 'C', '扉页竖排档下人像与简介之间（≥1024 换成 column-gap:60px，那一枚是水平、不在此列）'],
  ['mistwood.css', '', '.about-text p', 'margin-bottom', '20px', 'B', '关于页正文段距：所在块走 body 的 17px × 1.85（行盒 31.45），它跟行盒走不跟网格走'],
  ['mistwood.css', '', '.about-now summary', 'gap', '8px', 'C', '"现在在做"那行里点与文字之间'],
  ['mistwood.css', '', '.now-list', 'margin', '14px', 'X', '披露件标题行与其列表之间'],
  ['mistwood.css', '', '.now-list li', 'margin-bottom', '10px', 'B', '列表条目距：所在块 15px × 1.8（行盒 27）'],
  ['mistwood.css', '', '.contact', 'margin-top', '96px', 'C', '关于页正文与联系方式之间（与 .year-block 同值不同职）'],
  ['mistwood.css', '', '.contact-links', 'gap', '28px', 'X', '三枚大号链接之间：它贴的是 32px 宋体的行盒，不在 8 的格子上'],
  ['mistwood.css', '', '.contact-links', 'margin-bottom', '32px', 'C', '联系方式与"最近一次散步"那一行之间'],
  ['mistwood.css', '', '.colophon', 'margin-top', '8px', 'C', 'colophon 与它上面那一块之间'],
  ['mistwood.css', '', '.colophon', 'padding-top', '30px', 'X', '封口线与 colophon 内容之间'],
  ['mistwood.css', '', '.col-title', 'gap', '10px', 'X', 'colophon 标题行内两块之间'],
  ['mistwood.css', '', '.col-grid', 'gap', '20px', 'X', '档案网格的行距（同一声明里的 32px 是列距＝水平，不计）'],
  ['mistwood.css', '', '.col-grid', 'margin', '24px', 'C', '标题与档案网格之间'],
  ['mistwood.css', '', '.col-grid > div', 'gap', '5px', 'X', '一格内 dt 与 dd 之间'],
  ['mistwood.css', '', '.col-year', 'gap', '10px', 'X', '年度弧那一行：文字与 SVG 弧之间'],
  ['mistwood.css', '', '.col-year', 'margin', '22px', 'X', '档案网格与年度弧之间'],
  ['mistwood.css', '', '.col-note', 'margin-top', '26px', 'X', '年度弧与那段说明之间'],
  ['mistwood.css', '', '.col-visit', 'margin-top', '14px', 'X', '说明与"回访"那一行之间'],
  ['mistwood.css', '@media (max-width:720px)', '.nav', 'gap', '14px', 'X', '窄屏胶囊：§11 降级表那一档'],
  ['mistwood.css', '@media (max-width:720px)', '.nav', 'padding', '9px', 'X', '窄屏胶囊上下内垫（§17 点了名：home.css 那一份 16px 被打包顺序压住，说话算数的是这一份）'],
  ['mistwood.css', '@media (max-width:720px)', '.nav-links', 'gap', '10px', 'X', '窄屏导航三项之间'],
  ['mistwood.css', '@media (max-width:720px)', '.page-head', 'padding-bottom', '48px', 'C', '窄屏开场收尾段（桌面 64 → 48，两档都是 C）'],
  ['mistwood.css', '@media (max-width:720px)', '.row', 'gap', '14px', 'X', '窄屏目录行内'],
  ['mistwood.css', '@media (max-width:720px)', '.row', 'padding', '20px', 'X', '窄屏目录行上下内垫'],
  ['mistwood.css', '@media (max-width:720px)', '.year-block', 'margin-bottom', '64px', 'C', '窄屏年份块之间'],
  ['mistwood.css', '@media (max-width:720px)', '.contact', 'margin-top', '72px', 'C', '窄屏联系方式那一段'],
  ['mistwood.css', '@media (max-width:720px)', '.col-grid', 'gap', '16px', 'C', '窄屏档案收成单栏（§11：375px 上两栏会把字挤断）'],
  ['mistwood.css', '@media (max-width:340px)', '.nav', 'padding', '9px', 'X', '320 那一档只收横向（12px），上下仍旧 9px'],
  ['mistwood.css', '@media (max-width:340px)', '.nav-links', 'gap', '8px', 'C', '320 那一档的导航间距'],
  /* ===== home.css：只有首页 ===== */
  ['home.css', '', '.nav', 'gap', '28px', 'X', '与 mistwood.css 那份逐字符同值（§17：这一族两份都要改）'],
  ['home.css', '', '.nav', 'padding', '10px', 'X', '同上'],
  ['home.css', '', '.hero-name', 'margin-top', '17vh', 'A', '首屏站名的落点：按视口摆，不按 px 摆（§8.2 入场时间轴）'],
  ['home.css', '', '.hero-name', 'margin-bottom', '28px', 'X', '站名与标题之间'],
  ['home.css', '', '.hero-log', 'margin-bottom', '8vh', 'A', '日志行与视口底的呼吸（margin-top:auto 把它推到底端）'],
  ['home.css', '', '.hero-watch', 'margin-top', '-4.5vh', 'A', '负 8vh 的一半：守夜那一行是日志的下半句，不是新的一段'],
  ['home.css', '', '.hero-watch', 'margin-bottom', '8vh', 'A', '与日志同一档呼吸'],
  ['home.css', '', '.home-lower', 'padding', '22vh', 'A', '首页下半段底部（§15"首页现在是一屏 Hero ＋ 一段内容区"）'],
  ['home.css', '', '.home-lower .sec-label', 'margin-bottom', '22px', 'X', '首页"03 essays"那一行与三行实例之间'],
  ['home.css', '', '.home-lower .essay-index', 'margin', '88px', 'C', '三行目录与最新那条 note 之间'],
  ['home.css', '', '.home-lower .row', 'padding', '18px', 'X', '首页目录行上下内垫（子页 26 的那一档在首页收薄）'],
  ['home.css', '', '.home-note', 'padding-top', '32px', 'C', '封口线与那条 note 之间'],
  ['home.css', '', '.home-note time', 'padding-top', '5px', 'X', '日期与句子首行的光学生对位（≤720 归零，见下面那条）'],
  ['home.css', '@media (max-width:720px)', '.nav', 'gap', '14px', 'X', '窄屏胶囊（与 mistwood.css 同值）'],
  ['home.css', '@media (max-width:720px)', '.nav', 'padding', '9px', 'X', '这一份现在被 Layout.css 的排列顺序压住（§17 实测：真正生效的是 mistwood 那 14px），留着它是保险不是现状'],
  ['home.css', '@media (max-width:720px)', '.home-lower', 'padding', '16vh', 'A', '窄屏首页下半段底部'],
  ['home.css', '@media (max-width:720px)', '.home-lower .row', 'padding', '16px', 'C', '窄屏首页目录行'],
  ['home.css', '@media (max-width:720px)', '.home-note', 'gap', '4px', 'X', '日期从一列改成一行之后，两行之间'],
  ['home.css', '@media (max-width:340px)', '.nav', 'padding', '9px', 'X', '320 那一档（横向 12，上下仍旧 9）'],
  /* ===== essay.css：详情页那一层 ===== */
  ['essay.css', '', '.post-tail', 'margin', '56px', 'C', '正文与盖章／专注那一排之间'],
  ['essay.css', '', '.stamp-note', 'margin-top', '14px', 'X', '回执行与盖章钮之间：注释写了"沿用这一行自己的既有节奏，不新开一档间距（§1.5）"'],
  ['essay.css', '', '.post-head', 'padding', '24vh', 'A', '详情页开场（§15 的 read 档；打印时这一枚在纸上归零，base.css 那条 32px 接手）'],
  ['essay.css', '', '.post-head', 'padding', '56px', 'C', '开场与正文之间的收尾段'],
  ['essay.css', '', '.post-meta', 'margin-bottom', '20px', 'X', '元数据行与标题之间'],
  ['essay.css', '', '.post-sub', 'margin-top', '18px', 'X', '标题与副题之间'],
  ['essay.css', '', '.post-when', 'margin-top', '14px', 'X', '副题与"写作时辰"那一行之间（§3 的说明 14 档）'],
  ['essay.css', '', '#toc', 'gap', '12px', 'X', '目录各行之间（12px 等宽标签的行盒档，flex column ⇒ 真行距）'],
  ['essay.css', '', '.post-body p', 'margin-bottom', '28px', 'B', '正文段距：§3 签过字的那一枚，出处是 .post-body 的 18px × 1.9（行盒 34.2）'],
  ['essay.css', '', '.post-body h2', 'margin', '64px', 'C', '章前留白（needle 就钉在这一枚）'],
  ['essay.css', '', '.post-body h2', 'margin', '24px', 'C', '章名与它下面第一段之间'],
  ['essay.css', '', '.post-body h2::before', 'margin-bottom', '16px', 'C', '那枚 32px 苔绿短线与章名之间'],
  ['essay.css', '', '.post-body code', 'padding', '2px', 'X', '行内 code 上下内垫（.85em 等宽，撑的是命中与呼吸，不是留白档）'],
  ['essay.css', '', '.post-body .codeblock', 'margin', '40px', 'C', '围栏代码块整块上下：与引用块那一枚 40 同一档——"一整块"就是一整块，不新开档位（§15 第五轮）'],
  ['essay.css', '', '.post-body .codeblock[data-lang]::before', 'margin-bottom', '8px', 'C', '语言标签行与代码面之间：上格最小的一档；它上面不是行，所以不是 B 档'],
  ['essay.css', '', '.post-body pre', 'padding', '16px', 'C', '代码面上下内垫：行内 code 那 2px 的放大版——放大的是面，不是命中区'],
  ['essay.css', '', '.post-body .tablewrap', 'margin', '40px', 'C', '表格整块上下：与引用块、代码块同一枚 40（§4 的"纯块间距·已上格"）'],
  ['essay.css', '', '.post-body th,.post-body td', 'padding', '8px', 'C', '格子上下内垫：一行的呼吸走上格最小一档，12px 是横向、不计'],
  ['essay.css', '', '.post-body h3', 'margin', '48px', 'C', '小节前留白：比 h2 矮一档（48 对 64）'],
  ['essay.css', '', '.post-body h3', 'margin', '18px', 'X', 'h3 矮一档，它下面那段的距离也跟着收，但没走上格'],
  ['essay.css', '', '.post-body ul,.post-body ol', 'margin', '28px', 'B', '列表收口 = 段距那一档（同一个 18px/1.9 行盒）'],
  ['essay.css', '', '.post-body li', 'margin-bottom', '10px', 'B', '条目距：§4 点名的行距派生样本'],
  ['essay.css', '', '.post-body blockquote', 'margin', '40px', 'C', '引用块作为一整块的上下留白'],
  ['essay.css', '', '.post-body blockquote p', 'margin-bottom', '14px', 'B', '引用内部段距：比正文紧一档，仍按行盒走'],
  ['essay.css', '', '.post-body blockquote footer', 'margin-top', '14px', 'B', '署名行与引用最后一行之间，与上一枚同一档呼吸'],
  ['essay.css', '', '.post-body hr', 'margin', '56px', 'C', '三个点那条分隔线的上下'],
  ['essay.css', '', '.footnotes', 'margin-top', '72px', 'C', '正文与脚注块之间（比 h2 的 64 再高一档：这是一次转场不是一章）'],
  ['essay.css', '', '.footnotes', 'padding-top', '28px', 'X', '封口线与脚注块之间：沿用段距那一档 28，但它不在 8 的格子上'],
  ['essay.css', '', '.footnotes .fn-title', 'margin', '18px', 'X', '"注"那一行与脚注列表之间'],
  ['essay.css', '', '.footnotes li', 'margin-bottom', '8px', 'B', '脚注条目距：所在块 14px × 1.85（行盒 25.9）；顺带说，这一枚本来就在格子上'],
  ['essay.css', '@media (min-width:1240px)', '.post-body .sidenote', 'margin', '2px', 'X', '浮进留白时与正文第一行的对位微调（不是栏间距）'],
  ['essay.css', '@media (min-width:1240px)', '.post-body .sidenote', 'margin', '20px', 'B', '两条边注之间：边注自己那 14px × 1.75 的行盒档（§4 边注栏那一格）'],
  ['essay.css', '@media (min-width:1240px)', '.post-body .sn-mark', 'margin', '2px', 'X', '上标号与浮注对位'],
  ['essay.css', '', '.post-body figure.shot', 'margin', '44px', 'X', '图版上下：比段距宽、比小节窄，那一档是图自己的'],
  ['essay.css', '', '.post-body figcaption', 'margin-top', '14px', 'X', '图注与其图版之间（值与引用内段距同档，机制不同：它上头不是行）'],
  ['essay.css', '', '.post-nav', 'margin', '14vh', 'A', '上下篇与正文之间按视口走（§15：读完这一篇要有一段"抬头"的距离）'],
  ['essay.css', '', '.post-nav', 'gap', '32px', 'C', '左右两枚链接之间（≤720 转竖排时这一枚就是行距）'],
  ['essay.css', '', '.post-nav', 'padding-top', '48px', 'C', '封口线与"上一篇／下一篇"之间'],
  ['essay.css', '', '.post-nav span', 'margin-bottom', '10px', 'X', '标签行与其下那枚 22px 标题之间（值与 li 同档，机制不同）'],
  ['essay.css', '', '.lightbox', 'padding', '16px', 'C', '灯箱面板的上下内垫：与代码面那枚 16 同一档（一张面的内衬，不是新的留白档）'],
  ['essay.css', '', '.lightbox', 'gap', '14px', 'X', '大图／图注／收起钮三者之间：沿用这一页那族 14px（图注、副题、回执行都是它），flex column ⇒ 真行距'],
  ['essay.css', '@media (max-width:720px)', '.post-head', 'padding', '18vh', 'A', '窄屏开场降一档（24vh → 18vh）'],
  ['essay.css', '@media (max-width:720px)', '.post-head', 'padding', '40px', 'C', '窄屏收尾段（56 → 40）'],
  /* ===== notes.css：/notes/ ===== */
  ['notes.css', '', '.notes-list', 'padding-bottom', '16vh', 'A', '手记页底部呼吸：与 /things/ /about/ 同一档'],
  ['notes.css', '', '.note', 'gap', '10px', 'B', '一条 note 里日期行与句子之间：所在块走 body 的 17px × 1.85'],
  ['notes.css', '', '.note', 'margin-bottom', '56px', 'C', '两条 note 之间'],
];

/* ---------- 第二族的登记表：圆角梯子 ---------- */
/* 口径三条，写死在这里（改口径要连 §4 那一行一起改，别只动这里）：
   ① **按字面比，不做语义归一**。梯子登记的是字面写法本身，不是换算后的数——`0` 与 `0px` 是两种写法，
      `0.78rem` 与 `12.48px` 也是。归一会把 Firefly 那种混排（`0.125rem` ×8、`999px` 与 `9999px` 并存）
      读成都算在册，而那正是本尺子要拦的病：一根换算后合法的梯子照样能长出 28 种写法。
      ⇒ 后果（朝宽那一格就是这么定的）：把 `0` 挪成 `0px` 会红，因为它是一枚没登记过的字面，尽管语义相同。
   ② **整条值算一枚字面**。今天盘上 30 条 `border-radius` 全是单值写法；真出现四角分写
      （`border-radius:16px 16px 0 0`）也算一种新字面 ⇒ 红，要人先上梯子登记那一串写法并交代为什么四角不等，
      机器不替你把它拆成两档、也不许它悄悄过关。
   ③ **只认 `border-radius` 简写、只认字面**：全站 `grep -rn radius src/` 只命中 `border-radius`，
      没有任何 `--radius…` 令牌。将来若有人上令牌，那是**改梯子的形状**（§4 那一行与这张表一起动），另立卡。
   ⚠️ 关于 `0` 那一枚：§4 签的是一根 **11 档**梯子（3／4／6／8／9／10／12／14／16／50%／999px），而盘上有 **12 种写法**——
      多出来的一枚是 `essay.css` 的 `.post-body figure.shot img{ border-radius:0 }`。本表把它登记成 **抹平** 那一档，
      理由是 `0` 不是第 12 档半径而是**把圆角取消**：图版框 `.frame` 自己带 16px 并用 `overflow:hidden` 裁切，
      img 走满栏宽再圆一次就是同一张图圆两角、还会露出方角。⇒ 它在册、有名字、有枚数，不是漏值；
      而 §4 那句"11 档的梯子"讲的仍是**有圆角**的那些档，本卡一个字不改那一行。 */
const RPROP = 'border-radius';
/* 梯子登记表：字面写法 / 在册枚数 / 档名 / 这一档是谁（落点按 §4 那一行的说法，枚数以本工具打印为准） */
const RADIUS_LADDER = [
  ['3px', 1, '滚动条 thumb', '§4 梯子最小那一档：6px 宽的滚动条 thumb'],
  ['4px', 1, '焦点环', '`:focus-visible` 那圈描边的四角'],
  ['6px', 1, '行内 code', '行内代码片那一点圆'],
  ['8px', 3, '正文里的小面', '正文这一层的三面：裸图／代码面／灯箱里的图'],
  ['9px', 4, 'chip 与列表行', '可点的小面族：抽屉选项 chip／标签胶囊／搜索输入框／搜索结果行'],
  ['10px', 1, '92px 缩略图', '目录行里那枚 92px 缩略图（贴在文字版面里，从 16 收一档）'],
  ['12px', 2, '玻璃条与悬停铺面', '图鉴玻璃条与目录行的悬停铺面（薄板族，两份同值）'],
  ['14px', 1, '显示设置抽屉', '抽屉那一块面（今天全站只有它用 14）'],
  ['16px', 5, '图与卡的那一面', '§4 那句 卡片是 16 不是 20 说的那一族：封面框／图鉴卡／人像／图版框／灯箱面板'],
  ['50%', 8, '圆与椭圆', '整圆与椭圆：两枚 30px 圆钮／四枚状态点／萤火虫／首页雾带那条椭圆'],
  ['999px', 2, '胶囊', '导航玻璃胶囊，`home.css` 与 `mistwood.css` 各一份（§17 那条在册重复）'],
  ['0', 1, '抹平', '把圆角取消那一枚，不是第 12 档半径（见上面口径 ③ 末那段）'],
];
/* 在册总数与种数（与 `RADIUS_LADDER` 逐档枚数、盘上的声明三处同源，动一处必红）：
   这一轮立尺时盘上是 12 种写法共 30 枚 —— 50%×8、16px×5、9px×4、8px×3、999px×2、12px×2、
   6px／4px／3px／14px／10px／0 各 1 枚；垂直那本 142 枚的账与它无关。 */
const RADIUS_REGISTERED = { hits: 30, kinds: 12 };
/* needle：盘上扫不到这一条就是这一族在空转，不是"这一档刚好没东西" */
const RADIUS_NEEDLE = ['mistwood.css', '', '.thing-bar', RPROP, '12px', '玻璃条与悬停铺面'];

/* ---------- 圆角逐枚认领：文件 / 上下文 / 选择器 / 属性 / 字面 / 档名 / 这一枚是谁的圆 ---------- */
const RADIUS_REGISTRY = [
  /* ===== base.css：全站基础层 ===== */
  ['base.css', '', '::-webkit-scrollbar-thumb', RPROP, '3px', '滚动条 thumb', '6px 宽滚动条的 thumb：§4 梯子最小那一档'],
  ['base.css', '', ':focus-visible', RPROP, '4px', '焦点环', '键盘焦点那圈 2px 描边的四角；`outline-offset` 也是 4px，同值不同职'],
  ['base.css', '', '.nav-clock .dot', RPROP, '50%', '圆与椭圆', '时钟那枚 5px 状态点（§6 时钟零动效：实心、不呼吸）'],
  ['base.css', '', '.theme-toggle', RPROP, '50%', '圆与椭圆', '30px 圆钮（主题切换）：全站两枚同尺寸圆钮之一，另一枚在 mistwood.css'],
  ['base.css', '', '.search-input', RPROP, '9px', 'chip 与列表行', '搜索输入框：复用抽屉选项 chip 那一档，不为新组件开新档（§9 复用那一整套）'],
  ['base.css', '', '.search-row', RPROP, '9px', 'chip 与列表行', '搜索结果行：同上，一块可点的小面'],
  /* ===== essay.css：详情页那一层 ===== */
  ['essay.css', '', '.post-body code', RPROP, '6px', '行内 code', '行内代码片（`.85em` 等宽那一块）'],
  ['essay.css', '', '.post-body pre', RPROP, '8px', '正文里的小面', '代码面：与正文裸图、灯箱里的图同一档'],
  ['essay.css', '', 'article.post-body img', RPROP, '8px', '正文里的小面', '正文裸图：§4 那一行点名的 8px 落点'],
  ['essay.css', '', '.post-body figure.shot .frame', RPROP, '16px', '图与卡的那一面', '图版框：与封面框／图鉴卡／人像／灯箱面板同一枚 16'],
  ['essay.css', '', '.post-body figure.shot img', RPROP, '0', '抹平', '图版框已经带 16px 并用 `overflow:hidden` 裁切，img 再圆就是同一张图圆两角 —— 这一枚是取消圆角，不是第 12 档半径'],
  ['essay.css', '', '.lightbox', RPROP, '16px', '图与卡的那一面', '灯箱那块面：复用图与卡那一族的 16，零新档'],
  ['essay.css', '', '.lightbox img', RPROP, '8px', '正文里的小面', '灯箱里的大图走正文那一档 8，不跟面板的 16（面板是容器、图是内容）'],
  /* ===== home.css：只有首页 ===== */
  ['home.css', '', '.mist-band', RPROP, '50%', '圆与椭圆', '首页雾带那条椭圆（160vw 宽、`left:-30vw`）'],
  ['home.css', '', '.firefly', RPROP, '50%', '圆与椭圆', '3px 萤火虫（仅夜林／深夜）'],
  ['home.css', '', '.nav', RPROP, '999px', '胶囊', '导航玻璃胶囊：与 mistwood.css 那份逐字符同值（§17 在册重复，两份各记一条）'],
  /* ===== mistwood.css：子页那一层 ===== */
  ['mistwood.css', '', '.nav', RPROP, '999px', '胶囊', '子页导航胶囊：home.css 那一份的同值重复，改就要两份一起改（§17）'],
  ['mistwood.css', '', '.nav-links a.here::before', RPROP, '50%', '圆与椭圆', '导航"我在哪儿"那枚 5px 实心点'],
  ['mistwood.css', '', '.settings-toggle', RPROP, '50%', '圆与椭圆', '30px 圆钮（显示设置）'],
  ['mistwood.css', '', '.settings', RPROP, '14px', '显示设置抽屉', '抽屉那块面：14px 今天全站只有它用（§4 那一行的落点）'],
  ['mistwood.css', '', '.seg-c', RPROP, '9px', 'chip 与列表行', '抽屉里的选项 chip：§4 那一行点名的 9px 落点'],
  ['mistwood.css', '', '.row::before', RPROP, '12px', '玻璃条与悬停铺面', '目录行悬停铺面（§8.3 第 0 问那一格）：复用玻璃条的 12，不新开档'],
  ['mistwood.css', '', '.cover', RPROP, '16px', '图与卡的那一面', '封面位那只框'],
  ['mistwood.css', '', '.row .cover', RPROP, '10px', '92px 缩略图', '目录行里那枚 92px 缩略图：从 16 收一档，因为它贴在文字版面里'],
  ['mistwood.css', '', '.chip', RPROP, '9px', 'chip 与列表行', '标签胶囊（§9 候选启用那一格：同族同档，不为胶囊开新档）'],
  ['mistwood.css', '', '.thing', RPROP, '16px', '图与卡的那一面', '图鉴卡那张面（§4：卡片是 16 不是 20）'],
  ['mistwood.css', '', '.thing-bar', RPROP, '12px', '玻璃条与悬停铺面', '图鉴玻璃条（needle 就钉在这一枚）'],
  ['mistwood.css', '', '.portrait', RPROP, '16px', '图与卡的那一面', '关于页人像框（真图进来只撤描边、几何一格不动，§9 那一格）'],
  ['mistwood.css', '', '.about-now .dot', RPROP, '50%', '圆与椭圆', '"现在在做"那枚 16s 呼吸点'],
  ['mistwood.css', '', '.col-visit::before', RPROP, '50%', '圆与椭圆', 'colophon 回访行前那枚 5px 点'],
];

/* ---------- 扫描：与注册表同一套拆值口径 ---------- */
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
function lineIndexer(clean) {
  const nl = [];
  for (let i = 0; i < clean.length; i++) if (clean[i] === '\n') nl.push(i);
  return i => { let lo = 0, hi = nl.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < i) lo = mid + 1; else hi = mid; } return lo + 1; };
}
function tokens(value) {
  const out = []; let buf = '', depth = 0;
  for (const ch of value) {
    if (ch === '(') depth++; else if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) { if (buf) out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}
const hasPx = t => /\d(?:\.\d+)?px/.test(t);
const hasVp = t => /\d(?:\.\d+)?(?:vh|vw|vmin|vmax)/.test(t);
const isVar = t => /^var\(-[a-z0-9-]+\)$/i.test(t);
const NUM = t => { const m = /^(-?\d+(?:\.\d+)?)px$/.exec(t); return m ? Number(m[1]) : null; };

/* 垂直槽位（唯一的一份口径，注册表与扫描共用） */
function verticalSlots(prop, value) {
  const t = tokens(value);
  if (!t.length) return [];
  if (['margin-top', 'margin-bottom', 'padding-top', 'padding-bottom', 'row-gap'].includes(prop)) return [t.join(' ')];
  if (prop === 'gap') return [t[0]];                                     /* 第 2 值是列＝水平，不计 */
  if (prop === 'margin' || prop === 'padding') {
    const idx = (t.length === 1 || t.length === 2) ? [0] : [0, 2];       /* 3／4 值写法上下不同，两枚都取 */
    return idx.map(i => t[i]).filter(Boolean);
  }
  return [];
}
/* 块栈走法（唯一的一份，两族共用）：逐条声明吐出来，属性名在 props 名单里才算。
   ⚠️ 两族读的是同一段 CSS 语法，所以走法只有一份——CSS 写法变了改一处就够，不会两把尺子各自漂。 */
function walkDecls(props) {
  const out = [];
  for (const f of FILES) {
    const path = join(ROOT, 'src', 'styles', f);
    if (!existsSync(path)) continue;
    const clean = strip(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'));
    const lineOf = lineIndexer(clean);
    const stack = []; let start = 0;
    const skipWs = i => { while (i < clean.length && /\s/.test(clean[i])) i++; return i; };
    const emit = (s0, s1) => {
      const s = skipWs(s0); if (s >= s1) return;
      const m = /^\s*([a-z-]+)\s*:\s*([\s\S]*)$/i.exec(clean.slice(s, s1));
      if (!m) return;
      const prop = m[1].toLowerCase(), value = m[2].trim().replace(/\s+/g, ' ');
      if (!props.includes(prop)) return;
      const sel = stack.length ? stack[stack.length - 1].sel : '(顶层)';
      const ctx = stack.slice(0, -1).map(b => b.sel).join(' / ');
      out.push({ file: f, ctx, sel, prop, value, line: lineOf(s) });
    };
    for (let i = 0; i < clean.length; i++) {
      const c = clean[i];
      if (c === '{') { stack.push({ sel: clean.slice(start, i).trim().replace(/\s+/g, ' '), start }); start = i + 1; }
      else if (c === '}') {
        const body = clean.slice(start, i); let seg = start, depth = 0;
        for (let j = 0; j < body.length; j++) {
          const ch = body[j];
          if (ch === '(') depth++; else if (ch === ')') depth--;
          else if (ch === ';' && depth === 0) { emit(seg, start + j); seg = start + j + 1; }
        }
        if (body.slice(seg - start).trim()) emit(seg, i);
        stack.pop(); start = i + 1;
      } else if (c === ';' && !stack.length) start = i + 1;
    }
  }
  return out;
}
function scan() {
  const rows = [];
  for (const d of walkDecls(VPROPS)) {
    for (const tok of verticalSlots(d.prop, d.value)) {
      if (hasPx(tok)) rows.push({ ...d, tok, kind: 'px' });
      else if (hasVp(tok) || isVar(tok)) rows.push({ ...d, tok, kind: 'vp' });
      /* 其余（0 / auto / em / mm / % / 关键字）＝不认领，见文件头的量具边界 */
    }
  }
  return rows;
}
/* 圆角扫描：整条值就是一枚字面（口径 ②），不拆槽位、不换算 */
function scanRadius() {
  return walkDecls([RPROP]).map(d => ({ ...d, tok: d.value }));
}
/* 扫描名单完备性：`src/styles/` 里冒出一份没进 `FILES` 的表就红——两族都会跟着漏检，
   而漏检的样子和全绿一模一样（§16 那条静默空转的老形状，只是这次漏的是文件不是判据）。 */
function unscannedCss() {
  const dir = join(ROOT, 'src', 'styles');
  if (!existsSync(dir)) return ['src/styles/ 这一层没了'];
  return readdirSync(dir).filter(n => n.endsWith('.css') && !FILES.includes(n));
}

const args = process.argv.slice(2);
const K = (file, ctx, sel, prop, tok) => `${file}|${ctx}|${sel}|${prop}|${tok}`;
const key = r => K(r.file, r.ctx, r.sel, r.prop, r.tok);          /* 盘上的一枚槽位 */
const rkey = r => K(r[0], r[1], r[2], r[3], r[4]);                /* 注册表里的一条记录 */
const NEEDLE_KEY = NEEDLE.slice(0, 5).join('|');                   /* 注册表那一条的前五格就是键 */
const RNEEDLE_KEY = RADIUS_NEEDLE.slice(0, 5).join('|');           /* 圆角那一族同构 */

/* ---------- 防空转闸：放在所有表之前（两族各一套）---------- */
if (!REGISTRY.length){ console.log('✗ 注册表是空的 —— 间距尺子正在空转'); process.exit(1); }
const disk = scan();
if (!disk.length){ console.log('✗ 五份样式表里一枚垂直间距都没扫到 —— 判据正在空转（拆值口径或文件名单坏了）'); process.exit(1); }
{
  const files = new Set(disk.map(d => d.file));
  if (files.size < 2){ console.log(`✗ 只扫到 ${[...files].join(', ') || '零'} 一份样式表 —— 判据正在空转`); process.exit(1); }
  if (!REGISTRY.some(r => rkey(r) === NEEDLE_KEY)){ console.log(`✗ 注册表里没有 needle 那一条（${NEEDLE[0]} ${NEEDLE[2]} ${NEEDLE[3]}:${NEEDLE[4]}）—— 这一关的牙被拔了`); process.exit(1); }
}
/* 圆角一族的空转闸：注册表侧的 needle 在这里，盘侧的 needle 在下面对账之后（照间距那一族的顺序规矩，
   免得早闸把两条真诊断压在下面——§16 记过这一次） */
if (!RADIUS_REGISTRY.length){ console.log(`✗ 圆角注册表是空的 —— ${RPROP} 那一族尺子正在空转`); process.exit(1); }
if (!RADIUS_LADDER.length){ console.log('✗ 圆角梯子是空的 —— 这一族没有尺子，只有形状'); process.exit(1); }
const rdisk = scanRadius();
if (!rdisk.length){ console.log(`✗ 五份样式表里一枚 ${RPROP} 字面都没扫到 —— 圆角判据正在空转（属性名或文件名单坏了）`); process.exit(1); }
{
  const files = new Set(rdisk.map(d => d.file));
  if (files.size < 2){ console.log(`✗ 圆角只扫到 ${[...files].join(', ') || '零'} 一份样式表 —— 判据正在空转`); process.exit(1); }
  if (!RADIUS_REGISTRY.some(r => rkey(r) === RNEEDLE_KEY)){ console.log(`✗ 圆角注册表里没有 needle 那一条（${RADIUS_NEEDLE[0]} ${RADIUS_NEEDLE[2]} ${RADIUS_NEEDLE[3]}:${RADIUS_NEEDLE[4]}）—— 这一关的牙被拔了`); process.exit(1); }
}
const missed = unscannedCss();
if (missed.length){ console.log(`✗ src/styles/ 里有没进 FILES 的样式表：${missed.join(', ')} —— 两把尺子都会漏检它（加文件要上名单）`); process.exit(1); }

/* ---------- 对账 ---------- */
let bad = 0;
const regMap = new Map(), diskMap = new Map();
for (const r of REGISTRY){ const k = rkey(r); if (regMap.has(k)){ console.log(`  ✗ 注册表里 ${k} 写了两遍 —— 认领关系不再是一一对应`); bad++; } regMap.set(k, r); }
for (const d of disk){ const k = key(d); if (diskMap.has(k)){ console.log(`  ✗ 盘上 ${d.file} ${d.sel} ${d.prop} 的 ${d.tok} 扫出两枚同键槽位（:${d.line} 与 :${diskMap.get(k).line}）—— 键不够用，得把上下文加进去`); bad++; } diskMap.set(k, d); }

const unclaimed = [...diskMap.keys()].filter(k => !regMap.has(k));
const phantom = [...regMap.keys()].filter(k => !diskMap.has(k));
for (const k of unclaimed){ const d = diskMap.get(k); console.log(`  ✗ 盘上没人认领：${d.file}:${d.line}  ${d.ctx ? d.ctx + ' › ' : ''}${d.sel}  ${d.prop}: …${d.tok}… —— 新增间距要交代它属于哪一档（A 视口比例 / B 行距派生 / C 纯块间距·已上格 / X 在册偏差）`); bad++; }
for (const k of phantom){ const r = regMap.get(k); console.log(`  ✗ 注册表里有一条盘上找不到：${r[0]}  ${r[1] ? r[1] + ' › ' : ''}${r[2]}  ${r[3]}: ${r[4]}（登记为 ${r[5]}）—— 值被改了或那一枚没了，注册表在过期`); bad++; }
/* needle 的另一半（放在对账之后，免得它顶掉真正的原因）：盘上扫不到这一枚，要么扫描器坏了、要么那一行没了 */
if (!disk.some(d => key(d) === NEEDLE_KEY)){ console.log(`  ✗ 盘上扫不到 needle 那一条（${NEEDLE[0]} ${NEEDLE[2]} ${NEEDLE[3]}:${NEEDLE[4]}）—— 扫描器坏了、那一行没了，或者它被人挪下了格子`); bad++; }

/* 判据②：C 档在册值必须是 8 的倍数；X 档必须不是（是就说明它该转 C，两边都得由人签字） */
const tierCount = { A: 0, B: 0, C: 0, X: 0 };
for (const r of REGISTRY){
  tierCount[r[5]] = (tierCount[r[5]] || 0) + 1;
  const n = NUM(r[4]);
  if (r[5] === 'C'){
    if (n === null){ console.log(`  ✗ C 档在册值不是固定 px：${r[0]} ${r[2]} ${r[3]} ${r[4]} —— C 只收固定 px`); bad++; }
    else if (n % 8 !== 0){ console.log(`  ✗ C 档在册值不在 8 的格子上：${r[0]} ${r[1] ? r[1] + ' › ' : ''}${r[2]}  ${r[3]}: ${r[4]} —— 要么它本就是 X（§4 说了不全站过一遍），要么这枚数被人挪 off 了格子`); bad++; }
  }
  if (r[5] === 'X'){
    if (n === null){ console.log(`  ✗ X 档在册值不是固定 px：${r[0]} ${r[2]} ${r[3]} ${r[4]} —— X 只收"纯块间距里的固定 px 且未上格"`); bad++; }
    else if (n % 8 === 0){ console.log(`  ✗ X 档里这一枚已经在格子上了：${r[0]} ${r[2]} ${r[3]}: ${r[4]} —— 该转 C 并同步两枚登记值`); bad++; }
  }
  if (r[5] === 'A' && !(hasVp(r[4]) || isVar(r[4]))){ console.log(`  ✗ A 档在册值不是视口比例：${r[0]} ${r[2]} ${r[3]}: ${r[4]}`); bad++; }
  if (r[5] === 'B' && n === null){ console.log(`  ✗ B 档在册值不是固定 px：${r[0]} ${r[2]} ${r[3]}: ${r[4]} —— 行距派生讲的是 px 跟行盒走，em 那类本来就跟着字号、不在认领范围`); bad++; }
}
for (const t of Object.keys(REGISTERED)){
  if (tierCount[t] !== REGISTERED[t]){ console.log(`  ✗ ${TIERS[t]} 档在册 ${tierCount[t] ?? 0} 枚、规范登记值 ${REGISTERED[t]} 枚 —— §4/§16 那个数与这份判据对不上了（三处同源）`); bad++; }
}

/* ---------- 第二族对账：圆角落档（判据③两侧认领 ＋ 判据④逐档枚数）---------- */
/* ⚠️ 这一族只立尺：它不产生任何改圆角的动作，红了要停的是改圆角的那一手，不是这张表。 */
let rbad = 0;
const rregMap = new Map(), rdiskMap = new Map();
for (const r of RADIUS_REGISTRY){ const k = rkey(r); if (rregMap.has(k)){ console.log(`  ✗ 圆角注册表里 ${k} 写了两遍 —— 认领关系不再是一一对应`); rbad++; } rregMap.set(k, r); }
for (const d of rdisk){ const k = key(d); if (rdiskMap.has(k)){ console.log(`  ✗ 盘上 ${d.file} ${d.sel} 的 ${d.prop}: ${d.tok} 扫出两枚同键圆角（:${d.line} 与 :${rdiskMap.get(k).line}）—— 键不够用，得把上下文加进去`); rbad++; } rdiskMap.set(k, d); }
const runclaimed = [...rdiskMap.keys()].filter(k => !rregMap.has(k));
const rphantom = [...rregMap.keys()].filter(k => !rdiskMap.has(k));
for (const k of runclaimed){ const d = rdiskMap.get(k); console.log(`  ✗ 盘上没人认领的圆角：${d.file}:${d.line}  ${d.ctx ? d.ctx + ' › ' : ''}${d.sel}  ${d.prop}: ${d.value} —— 新增一枚圆角要交代它是梯子上哪一档（梯子外的写法一律红；改别人的圆角另立卡）`); rbad++; }
for (const k of rphantom){ const r = rregMap.get(k); console.log(`  ✗ 圆角注册表里有一条盘上找不到：${r[0]}  ${r[1] ? r[1] + ' › ' : ''}${r[2]}  ${r[3]}: ${r[4]}（登记在 ${r[5]} 那一档）—— 值被改了或那一枚没了，注册表在过期`); rbad++; }
/* 盘侧 needle 放在对账之后，理由与间距那一族相同：别让它顶掉真正的原因 */
if (!rdisk.some(d => key(d) === RNEEDLE_KEY)){ console.log(`  ✗ 盘上扫不到圆角 needle 那一条（${RADIUS_NEEDLE[0]} ${RADIUS_NEEDLE[2]} ${RADIUS_NEEDLE[3]}:${RADIUS_NEEDLE[4]}）—— 扫描器坏了、那一行没了，或者它被挪下了梯子`); rbad++; }

const rungOf = new Map(RADIUS_LADDER.map(l => [l[0], l]));
const rDiskN = {}, rRegN = {};
for (const d of rdisk) rDiskN[d.tok] = (rDiskN[d.tok] || 0) + 1;
for (const r of RADIUS_REGISTRY) rRegN[r[4]] = (rRegN[r[4]] || 0) + 1;
/* 梯子判据：盘上每一枚取值都得在册（按字面） */
for (const d of rdisk){
  if (!rungOf.has(d.tok)){ console.log(`  ✗ 梯子外冒出一枚圆角：${d.file}:${d.line}  ${d.ctx ? d.ctx + ' › ' : ''}${d.sel}  ${d.prop}: ${d.tok} —— §4 那根梯子上没有这一种写法。口径是按字面比，换算后相等也不算在册（那样 Firefly 那种 28 种混排写法会全数过关）`); rbad++; }
}
/* 逐档枚数：登记值 ⇄ 注册表条数 ⇄ 盘上命中，两头都要等于登记的那个数 */
for (const l of RADIUS_LADDER){
  const [v, n, name] = l, dn = rDiskN[v] ?? 0, rn = rRegN[v] ?? 0;
  if (rn !== n){ console.log(`  ✗ 圆角那一档 ${v}（${name}）注册表里认了 ${rn} 枚、梯子登记 ${n} 枚 —— 枚数承重：多一枚少一枚都要在 RADIUS_LADDER 这一档签字（三处同源：本文件这两张表 / 盘上声明 / §4 那一行）`); rbad++; }
  if (dn !== n){ console.log(`  ✗ 圆角那一档 ${v}（${name}）盘上扫到 ${dn} 枚、梯子登记 ${n} 枚 —— 有人改了那一档的圆角或把某枚删了／加上了；本族只立尺不改值，改值另立卡`); rbad++; }
}
/* 注册表里的档名必须就是梯子上那一档的名字（档位口径漂了就红） */
for (const r of RADIUS_REGISTRY){
  const l = rungOf.get(r[4]);
  if (!l){ console.log(`  ✗ 圆角注册表里这一条的取值不在梯子上：${r[0]} ${r[2]} ${r[3]}: ${r[4]} —— 注册表自己先坏了梯子的口径`); rbad++; continue; }
  if (r[5] !== l[2]){ console.log(`  ✗ 圆角注册表里 ${r[0]} ${r[2]} 记的档名 ${r[5]} 与梯子上那一档的 ${l[2]} 不一致 —— 档位口径漂了，两张表得说同一句话`); rbad++; }
}
/* 总数与种数也是字面量（与 §4 那一行、与本文件那两张表同源） */
const ladderSum = RADIUS_LADDER.reduce((s, l) => s + l[1], 0);
const rKinds = Object.keys(rDiskN).length;
if (ladderSum !== RADIUS_REGISTERED.hits){ console.log(`  ✗ 梯子逐档枚数相加是 ${ladderSum} 枚、登记的总枚数是 ${RADIUS_REGISTERED.hits} 枚 —— 这一族的总数同样是一处同源的字面量`); rbad++; }
if (RADIUS_LADDER.length !== RADIUS_REGISTERED.kinds){ console.log(`  ✗ 梯子上有 ${RADIUS_LADDER.length} 种写法、登记的种数是 ${RADIUS_REGISTERED.kinds} 种 —— 新开一档要连这两个数一起签`); rbad++; }
if (rdisk.length !== RADIUS_REGISTERED.hits){ console.log(`  ✗ 盘上扫到 ${rdisk.length} 枚圆角字面、登记总数 ${RADIUS_REGISTERED.hits} 枚 —— 圆角的枚数变了而梯子没签字`); rbad++; }
if (rKinds !== RADIUS_REGISTERED.kinds){ console.log(`  ✗ 盘上有 ${rKinds} 种圆角写法、登记种数 ${RADIUS_REGISTERED.kinds} 种 —— 写法一多就是参照站那件事回来了，停下`); rbad++; }
bad += rbad;

/* ---------- 打印：全绿也要看得见量到了哪些数 ---------- */
console.log('\n=== 垂直间距三档（§4：视口比例 / 行距派生 / 纯块间距）===');
const pxN = disk.filter(d => d.kind === 'px').length;
console.log(`  ${bad ? '✗' : '✓'} 扫了 ${new Set(disk.map(d => d.file)).size} 份样式表共 ${disk.length} 枚垂直间距槽位` +
  `（固定 px ${pxN} / 视口比例 ${disk.length - pxN}），认领 ${disk.length - unclaimed.length} 枚、无人认领 ${unclaimed.length} 枚、注册表过期 ${phantom.length} 条`);
for (const t of ['A', 'B', 'C', 'X']) console.log(`    ${TIERS[t].padEnd(12)} 在册 ${String(tierCount[t] ?? 0).padStart(3)} 枚（登记值 ${REGISTERED[t]}）`);
const byFile = {};
for (const d of disk) byFile[d.file] = (byFile[d.file] || 0) + 1;
console.log('    逐份：' + FILES.filter(f => byFile[f]).map(f => `${f} ${byFile[f]}`).join(' / '));
const xv = {};
for (const r of REGISTRY) if (r[5] === 'X') xv[r[4]] = (xv[r[4]] || 0) + 1;
const xnum = t => { const n = NUM(t); return n === null ? 0 : Math.abs(n); };
console.log('    在册偏差（X）按值（枚数降序、同数按 |+px| 降序）：' + Object.entries(xv).sort((a, b) => (b[1] - a[1]) || (xnum(b[0]) - xnum(a[0]))).map(([v, n]) => `${v}×${n}`).join(' '));

/* 圆角那一族的全绿也要看得见数：命中枚数／种数／逐档（盘上/登记）／逐份 */
console.log('\n=== 圆角梯子（§4 那根 11 档 ＋ 一枚抹平的 0，两把尺两张表）===');
console.log(`  ${rbad ? '✗' : '✓'} 扫了 ${new Set(rdisk.map(d => d.file)).size} 份样式表共 ${rdisk.length} 枚 ${RPROP} 字面` +
  `（${rKinds} 种写法），认领 ${rdisk.length - runclaimed.length} 枚、无人认领 ${runclaimed.length} 枚、注册表过期 ${rphantom.length} 条`);
console.log('    逐档（§4 顺序，从小到大；盘上扫到/梯子登记）：' + RADIUS_LADDER.map(l => `${l[0]} ${rDiskN[l[0]] ?? 0}/${l[1]}`).join('  '));
console.log('    档名（梯子上的说法）：' + RADIUS_LADDER.map(l => `${l[0]}=${l[2]}×${l[1]}`).join('  '));
const rByFile = {};
for (const d of rdisk) rByFile[d.file] = (rByFile[d.file] || 0) + 1;
console.log('    逐份：' + FILES.filter(f => rByFile[f]).map(f => `${f} ${rByFile[f]}`).join(' / '));
console.log(`    总数与种数的登记值：${RADIUS_REGISTERED.hits} 枚 / ${RADIUS_REGISTERED.kinds} 种（梯子逐档相加 ${ladderSum} 枚）`);
if (args.includes('--list')){
  console.log('\n=== 整张量表（--list）===');
  const sorted = [...disk].sort((a, b) => (FILES.indexOf(a.file) - FILES.indexOf(b.file)) || (a.line - b.line));
  for (const d of sorted){
    const r = regMap.get(key(d));
    console.log(`${(r ? TIERS[r[5]] : '未认领').padEnd(14)} ${d.file}:${String(d.line).padEnd(4)} ${(d.ctx ? d.ctx + ' › ' : '') + d.sel}  ${d.prop}: ${d.value} → ${d.tok}${r ? '   ｜ ' + r[6] : ''}`);
  }
  console.log('\n=== 整张圆角表（--list）===');
  const rsorted = [...rdisk].sort((a, b) => (FILES.indexOf(a.file) - FILES.indexOf(b.file)) || (a.line - b.line));
  for (const d of rsorted){
    const r = rregMap.get(key(d));
    console.log(`${(r ? r[5] : '梯子外').padEnd(16)} ${d.file}:${String(d.line).padEnd(4)} ${(d.ctx ? d.ctx + ' › ' : '') + d.sel}  ${d.prop}: ${d.tok}${r ? '   ｜ ' + r[6] : '   ｜ 没登记、没档名'}`);
  }
}
if (bad){ console.log(`\n✗ 间距尺子没过：${bad} 处`); process.exit(1); }
console.log('\n✓ 间距三档对齐：每一枚固定 px 与视口比例都被认领，C 档在册的都在 8 的格子上，X 档枚数与登记值一致');
console.log(`✓ 圆角落档对齐：盘上 ${rdisk.length} 枚 ${RPROP} 字面（${rKinds} 种写法）全在梯子上、逐档枚数与登记一致，梯子外零冒新写法`);
