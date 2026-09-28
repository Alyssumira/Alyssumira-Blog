/* 间距尺子：把 §4 那句"区块间距 120–160px"换成盘上真正在跑的三档，并且钉住第三档。
   用法  node tools/gap-check.mjs            （门禁跑这一条：注册表 ⇄ 盘上，两个方向都要对得上）
         node tools/gap-check.mjs --list     （把整张量表打出来，给人复核 / 抄进规范）
   背景：外部提案「间距基准化（8px 网格）」的前提是读规范读出来的，而规范那两行是过期的——
   盘上从来就没有 120–160px 这一档，垂直间距分三种机制在走（§4 现在把它们分开写）。
   本工具不判"该不该上网格"，它只守两件事：
     ① **盘上每一枚固定 px 的垂直间距（含视口比例那一半）必须在注册表里被认领，并写明它属于哪一档**
        —— 防的是"以后有人新增一枚间距，没交代它是哪一类"；
     ② **C 档（纯块间距·已上格）在册值必须是 8 的倍数**；纯块间距里还没上格的那一半登记为 X，
        枚数冻结（§4 点名"把已经是 8 的倍数的钉住，不是全站过一遍"）。
   档位口径（注册表里那一格是判断，机器不推）：
     A 视口比例 ＝ 槽位值是 vh/vw/vmin/vmax，或一枚解析为 vh 的自定义属性（`var(--head-top)`）；不参与基准化。
     B 行距派生 ＝ 文字流里"行与行／条目与条目"之间的那枚 px，出处是所在块 font-size × line-height 的行盒；不参与基准化。
     C 纯块间距 ＝ 其余固定 px，且已在 8 的格子上 → 受判据②。
     X 纯块间距·在册偏差 ＝ 同一类里还没上 8 格的那些 → 不判 8 的倍数，判"枚数不许悄悄变"（要动就动那枚登记值，
                             那是 §16 说的三处同源：规范那一格 / 本文件字面量 / 盘上的声明）。
   在册枚数（顶部这一行、下面 `REGISTERED` 那枚字面量、§16 那一格、§4 那三行是同一句话的四处，动一处必红）：
     **A 14 ／ B 10 ／ C 42 ／ X 62 ＝ 128 枚垂直间距槽位，覆盖 src/styles/ 五份样式表。**
   ⚠️ 防空转是硬要求（§16 记过一次"rgba 漂移检查静默空转、退出码 0、长得像全绿"）：
     注册表为空 ⇒ 红；扫描器一枚都没抓到 ⇒ 红并打印"判据正在空转"；
     注册表里一条盘上找不到（幻影）⇒ 红；盘上一枚没人认领 ⇒ 红；
     再钉一枚 needle：`essay.css` 的 `.post-body h2{margin:64px 0 24px}` 那枚 64px 必须在册且扫得到。
   ⚠️ 拆值口径：`margin`/`padding` 的 1–2 值写法取第 1 值（上下）、3–4 值写法取第 1 与第 3 值；
     `gap` 双值取第 1 值＝row＝垂直（第 2 值是列＝水平，不计入），单值写法同时是行距与列距、这里认它行距那一半；
     `*-top`/`*-bottom`/`row-gap` 整条即垂直。`margin-left`/`padding-left`/`column-gap` 一概不看。
     零／auto 槽位不认领（那是重置与居中，不是间距决策）；`em`/`mm`/百分比不认领（不是固定 px，量具边界写在 §16 与回执的未验到里）。 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['base.css', 'mistwood.css', 'home.css', 'essay.css', 'notes.css'];
const VPROPS = ['margin', 'margin-top', 'margin-bottom', 'padding', 'padding-top', 'padding-bottom', 'gap', 'row-gap'];
const TIERS = { A: '视口比例', B: '行距派生', C: '纯块间距·已上格', X: '纯块间距·在册偏差' };
/* ⚠️ 在册枚数（§16 那一格与 §4 那三行说的就是这几个数，三处同源，动一处必红）：
   A 14 / B 10 / C 42 / X 62 ＝ 128 枚垂直间距槽位，覆盖 5 份样式表。 */
const REGISTERED = { A: 14, B: 10, C: 42, X: 62 };
/* needle：盘上扫不到这一条就是判据空转，不是"这一档刚好没东西" */
const NEEDLE = ['essay.css', '', '.post-body h2', 'margin', '64px', 'C'];

/* ---------- 注册表：文件 / 上下文 / 选择器 / 属性 / 槽位值 / 档位 / 这一枚是谁的呼吸 ---------- */
/* 按文件与盘上顺序排，逐枚一行；改盘上的间距就得改这里，这就是"以后不会再漂"的代价与牙。 */
const REGISTRY = [
  /* ===== base.css：全站基础层（含打印层那一档）===== */
  ['base.css', '', '.nav-clock', 'gap', '8px', 'C', '导航里"现在"那点与时钟文字之间'],
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
  ['essay.css', '@media (max-width:720px)', '.post-head', 'padding', '18vh', 'A', '窄屏开场降一档（24vh → 18vh）'],
  ['essay.css', '@media (max-width:720px)', '.post-head', 'padding', '40px', 'C', '窄屏收尾段（56 → 40）'],
  /* ===== notes.css：/notes/ ===== */
  ['notes.css', '', '.notes-list', 'padding-bottom', '16vh', 'A', '手记页底部呼吸：与 /things/ /about/ 同一档'],
  ['notes.css', '', '.note', 'gap', '10px', 'B', '一条 note 里日期行与句子之间：所在块走 body 的 17px × 1.85'],
  ['notes.css', '', '.note', 'margin-bottom', '56px', 'C', '两条 note 之间'],
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
function scan() {
  const rows = [];
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
      if (!VPROPS.includes(prop)) return;
      const sel = stack.length ? stack[stack.length - 1].sel : '(顶层)';
      const ctx = stack.slice(0, -1).map(b => b.sel).join(' / ');
      for (const tok of verticalSlots(prop, value)) {
        if (hasPx(tok)) rows.push({ file: f, ctx, sel, prop, value, tok, line: lineOf(s), kind: 'px' });
        else if (hasVp(tok) || isVar(tok)) rows.push({ file: f, ctx, sel, prop, value, tok, line: lineOf(s), kind: 'vp' });
        /* 其余（0 / auto / em / mm / % / 关键字）＝不认领，见文件头的量具边界 */
      }
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
  return rows;
}

const args = process.argv.slice(2);
const K = (file, ctx, sel, prop, tok) => `${file}|${ctx}|${sel}|${prop}|${tok}`;
const key = r => K(r.file, r.ctx, r.sel, r.prop, r.tok);          /* 盘上的一枚槽位 */
const rkey = r => K(r[0], r[1], r[2], r[3], r[4]);                /* 注册表里的一条记录 */
const NEEDLE_KEY = NEEDLE.slice(0, 5).join('|');                   /* 注册表那一条的前五格就是键 */

/* ---------- 防空转闸：放在所有表之前 ---------- */
if (!REGISTRY.length){ console.log('✗ 注册表是空的 —— 间距尺子正在空转'); process.exit(1); }
const disk = scan();
if (!disk.length){ console.log('✗ 五份样式表里一枚垂直间距都没扫到 —— 判据正在空转（拆值口径或文件名单坏了）'); process.exit(1); }
{
  const files = new Set(disk.map(d => d.file));
  if (files.size < 2){ console.log(`✗ 只扫到 ${[...files].join(', ') || '零'} 一份样式表 —— 判据正在空转`); process.exit(1); }
  if (!REGISTRY.some(r => rkey(r) === NEEDLE_KEY)){ console.log(`✗ 注册表里没有 needle 那一条（${NEEDLE[0]} ${NEEDLE[2]} ${NEEDLE[3]}:${NEEDLE[4]}）—— 这一关的牙被拔了`); process.exit(1); }
}

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
if (args.includes('--list')){
  console.log('\n=== 整张量表（--list）===');
  const sorted = [...disk].sort((a, b) => (FILES.indexOf(a.file) - FILES.indexOf(b.file)) || (a.line - b.line));
  for (const d of sorted){
    const r = regMap.get(key(d));
    console.log(`${(r ? TIERS[r[5]] : '未认领').padEnd(14)} ${d.file}:${String(d.line).padEnd(4)} ${(d.ctx ? d.ctx + ' › ' : '') + d.sel}  ${d.prop}: ${d.value} → ${d.tok}${r ? '   ｜ ' + r[6] : ''}`);
  }
}
if (bad){ console.log(`\n✗ 间距尺子没过：${bad} 处`); process.exit(1); }
console.log('\n✓ 间距三档对齐：每一枚固定 px 与视口比例都被认领，C 档在册的都在 8 的格子上，X 档枚数与登记值一致');
