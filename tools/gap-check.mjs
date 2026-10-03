/* 间距尺子 ＋ 圆角尺子：把 §4 那句"区块间距 120–160px"换成盘上真正在跑的三档，并且钉住第三档；
   第二轮又给圆角立了一把同构的尺子（`card/radiuscheck`），第三轮（2026-10-02 本卡 `v11b/hgap`）给**横向**立了第三把尺，
   三族住在同一个文件里、共用同一套块栈走法与两侧对账。
   用法  node tools/gap-check.mjs            （门禁跑这一条：注册表 ⇄ 盘上，两个方向都要对得上）
         node tools/gap-check.mjs --list     （把整张量表打出来，给人复核 / 抄进规范）
   背景：外部提案「间距基准化（8px 网格）」的前提是读规范读出来的，而规范那两行是过期的——
   盘上从来就没有 120–160px 这一档，垂直间距分三种机制在走（§4 现在把它们分开写）。
   本工具不判"该不该上网格"，它守的每一本账都是同一类事（下面逐族列 ①②／③④／⑤⑥⑦⑧）：
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
   第三族（横向间距尺子，2026-10-02 本卡 `v11b/hgap` 新立，判据 ⑤⑥⑦⑧ 是它的四条）：
     ⑤ **盘上每一枚横向间距槽位必须在横向注册表 `HREGISTRY` 里被认领**——逐枚认领、两侧对账同构（扫到却不在册 ⇒ `unclaimed` 红、
        在册却扫不到 ⇒ `phantom` 红），并钉四枚 needle（`margin-left`／`padding-left`／`column-gap`／双值 `gap` 的列距，四种形状各一枚）防这一族空转；
     ⑥ **逐档枚数必须与 `H_REGISTERED` 登记一致**——五档 A／B／C／X／H 各自签字，C 判 8 的倍数、X 判枚数冻结，算术与垂直那一族同一句；
     ⑦ **状态档 H 与静态档不许混**：选择器（或它所在的媒体查询）里带 `:hover`／`:focus`／`:focus-visible`／`:focus-within`／`:active`／`:target`
        的横槽**只能**登记成 H，H 档也**只收**它们；反向冒出一枚静态缩进被塞进 H 也红（2026-10-03 `v12c/offset` 那枚逐行错落就是照这条落的：静态缩进进 **C 档**、H 一枚没蹭，
        H 到这一轮仍然只有 `.contact-links a:hover` 那枚 `padding-left:34px`）。这一条拦的是"拿新档当逃生口"。
     ⑧ **逻辑写法不许从两把间距尺中间滑过去**：`margin-inline*`／`padding-inline*` 带 px／视口比例值 ⇒ 直接红（不认领、只报警）。
        理由：本表收的是物理左右，逻辑属性是同一件事的另一副面孔，认领它就得先定义 `direction` 的解读——那是改口径，不是加一行。
        ⚠️ 垂直那一族的 `margin-block*` 有同一个洞，本卡不补（只动横向这一维），已写进未验到清单。
   第四格（注释抄本尺，2026-10-03 本卡 `v11h1/numtooth` 新立，判据 ⑨⑩⑪ 是它的三条）：
     ⑨ **抄进 CSS 注释里的账本现值必须等于本工具实算的那一枚**——靶是 `src/styles/*.css` 里**含注释原文**的那份文本
        （抄本就住在注释里，剥了注释这一格就没有靶），模式族吃「垂直 144 枚」／「横向 86 枚」／「圆角 32 枚」
        这种紧邻的现在时陈述，另吃「归横向那本（86 枚，…）」那种同位写法；不等 ⇒ 红，红话点名文件＋行号＋它写的那枚数＋实值。
        为什么要这一格：那三串数字被人逐处抄进注释当解释用，而 `v11f/slot` 把横向从 84 抬到 85（X 档 53→54）之后，
        注释里那几处 84 当场过期、没有任何一把尺说一句话（第 0 问实测：把 `mistwood.css:994` 改成「横向 77 枚」，`npm run check` 九项照旧 rc=0）。
     ⑩ **括号里的分解求和与逐档读数也要对**：出现 `（A6／B0／C25／X54／H1）` 这类分解串时，Σ 要等于同一处写的总数，
        每一档要等于实算逐档数——"总数没写错而分解写错"（essay.css:621 那种 X53）也红。
     ⑪ **失去靶就红（fail closed，这一条不许省）**：扫到 0 处陈述 ⇒ 红，不是静默绿。理由：本仓踩过一次
        "尺子没有靶了还一路绿"（`font-fallback-check --gate` 那一轮）；再把"扫到 N 处"钉成一枚独立字面量
        `COPY_STATEMENTS`（照上面 `RADIUS_REGISTERED` 那种写法），新增抄本必须显式改这个数，不许静默漂移。
     ⚠️ 模式族**只吃 `src/styles/`**，不许走到 `docs/**`，也不把 `dist/`、`docs/` 里任何句子拉进来比对；
        带"那 N 枚"的过去时历史记录（base.css:579、essay.css:221 那种旧账句）**不在靶里、一字不许改**——它说的是那一年。
   横向拆值口径（**下一张卡要靠它拦人，写死在这里**）：
     属性集 `HPROPS` ＝ `margin-left`／`margin-right`／`padding-left`／`padding-right`／`column-gap` 整条即横向；
     `gap` 双值取第 2 值＝列＝横向（第 1 值是行＝垂直，由垂直那一族收），`gap` 单值同时是行距与列距 ⇒ 垂直与横向两本各收一枚同值的；
     `margin`／`padding` 简写的横向分量＝1 值取第 1 值、2 值取第 2 值、3 值取第 2 值（左右同值 ⇒ 只认一枚，别把一条声明数成两枚）、
     4 值取第 2 与第 4 值（右、左；两枚字面同值时同样只认一枚）。
     ⇒ 一行里同时背着垂直与横向两枚槽的写法（`margin:0 24px`、`padding:12px 18px`、`gap:20px 32px`、`padding:16px` 四边同值）**两把尺各收各的那一半**：
       两本账各自闭合、各自数得回来，谁也不许替谁记，垂直那 144 枚因此一枚不增不减；
       同一枚声明在两本里各有一条不是重复计数——那是同一块物理留白的两个维度，就像一枚圆角不能替一枚间距作保。
     不收的：`left`／`right`／`inset*`／`transform:translateX`（定位与位移，不是间距槽）、`text-indent`、`letter-spacing`、`border-inline*`。
     零／auto 仍旧不认领（重置与居中）；`em`／`mm`／百分比仍旧不认领（量具边界与垂直同一句话，写在 §16 与回执的未验到里）。
   横向档位口径（沿用垂直的分档语义，另立一档 H）：
     A 视口比例 ＝ 值是 vw／vh／vmin／vmax 或解析为比例的 var()：沿用，盘上就是页面级 `8vw` 那一族（窄屏 `7vw`）。
     B 行距派生 ＝ **本表不收、恒 0 枚**。理由：B 说的是"行与行之间"的那枚 px，它按定义是垂直量；横向没有对应物。
        谁把横槽登记成 B 就红（判据⑦ 的反面：不许拿"行距派生"给横向缩进当免检通道）。
     C 纯块间距·已上格 ／ X 纯块间距·在册偏差 ＝ 沿用，只把"块间距"读成"块间距的左右两半"；算术（|n| 是否 8 的倍数）一字不改。
        ⚠️ 负值照算术走：`essay.css:470` 浮进栏外那枚 `-232px` 落 C（232＝29×8），登记它是因为**格子管得住它**，不是把它认成留白档。
     H 悬停位移（本族新立的一档）＝ 只在 `:hover`／`:focus` 一类状态下改横向槽的那一族。我的判：**算槽位、要认领、但单独一档**。
        理由两条：① 悬停位移是"手感"——它是一次过渡的终点（`mistwood.css:916` 那枚 34px 由 `:910` 的 `transition:padding-left .35s` 过渡到），
        reduced-motion 下退回静止态那枚 `padding-left:0`（`:908`）；静态缩进是"版面"，reduced-motion 下照样在。两种东西，两种降级。
        ② 这张卡立尺的正事就是拦下一批那张「Stepping-stone list：rows are offset along a gentle S-curve…0／12／0／12px indent」的逐行错位；
        把它和悬停位移混成一锅，等于给新冒出来的静态缩进留了一个"并进旧档就免检"的门。
        H 不判 8 的倍数（那一判讲的是静止版面），只判枚数冻结——要加一枚悬停位移就得动 `H_REGISTERED.H`，那是签字。
        ⚠️ 边界：`:908` 的静止 `padding-left:0` 吃零口径不进账；`:910` 是 `transition` 名单不是槽位；`home.css:466`
           `.home-note:hover,.home-note:focus-visible{transform:translateX(6px)}` 走 transform、不在 `HPROPS` 里，同一族的位移今天数不到，已写进未验到。
   ⚠️ **三张表、三把尺**（从本卡起；立圆角那一轮写下的那句"两张表、两把尺"讲的是垂直＋圆角那一年的形状）：
     下面 `REGISTERED` 那 144 枚是**垂直间距**的账，`H_REGISTERED` 那 86 枚是**横向间距**的账，`RADIUS_LADDER` 那 32 枚／12 种写法是**圆角**的账，
     三本互不相干、谁也不许并进谁（立圆角那一轮的 142 枚这个数字，那一轮一枚都没动；
     后来 `v7b/density` 的一轮 §B1 把 X 抬了一枚、总数成 143，再后来 `v5b/heads` 的一轮 §C2 把 X 抬到 68、
     总数成 144——两笔账都写在下面 `REGISTERED` 那一格里；本卡立横向那一维，垂直与圆角两本账一枚未动）。
   档位口径（注册表里那一格是判断，机器不推）：
     A 视口比例 ＝ 槽位值是 vh/vw/vmin/vmax，或一枚解析为 vh 的自定义属性（`var(--head-top)`）；不参与基准化。
     B 行距派生 ＝ 文字流里"行与行／条目与条目"之间的那枚 px，出处是所在块 font-size × line-height 的行盒；不参与基准化。
     C 纯块间距 ＝ 其余固定 px，且已在 8 的格子上 → 受判据②。
     X 纯块间距·在册偏差 ＝ 同一类里还没上 8 格的那些 → 不判 8 的倍数，判"枚数不许悄悄变"（要动就动那枚登记值，
                             那是 §16 说的三处同源：规范那一格 / 本文件字面量 / 盘上的声明）。
   在册枚数（顶部这一行、下面 `REGISTERED` 那枚字面量、§16 那一格、§4 那三行是同一句话的四处，动一处必红）：
     **A 14 ／ B 10 ／ C 52 ／ X 69 ＝ 145 枚垂直间距槽位，覆盖 src/styles/ 五份样式表。**
     横向那一本另立一句（与下面 `H_REGISTERED` 字面量、`HREGISTRY` 条数、盘上声明四处同源，动一处必红）：
     **A 6 ／ B 0 ／ C 25 ／ X 54 ／ H 1 ＝ 86 枚横向间距槽位，覆盖同五份样式表。**
   ⚠️ 防空转是硬要求（§16 记过一次"rgba 漂移检查静默空转、退出码 0、长得像全绿"）：
     注册表为空 ⇒ 红；扫描器一枚都没抓到 ⇒ 红并打印"判据正在空转"；
     注册表里一条盘上找不到（幻影）⇒ 红；盘上一枚没人认领 ⇒ 红；
     再钉一枚 needle：`essay.css` 的 `.post-body h2{margin:64px 0 24px}` 那枚 64px 必须在册且扫得到。
     横向那一族钉四枚 needle（`H_NEEDLES`：一枚 `margin-left`、一枚 `padding-left`、一枚 `column-gap`、一枚 `gap` 双值里的列距），
     再加两道形状闸：盘上一枚长手／`column-gap` 都没抓到 ⇒ 红，一枚简写拆出来的横槽都没抓到 ⇒ 红（两种来源任坏一种都当场响）。
   ⚠️ 拆值口径（**垂直这一族**）：`margin`/`padding` 的 1–2 值写法取第 1 值（上下）、3–4 值写法取第 1 与第 3 值；
     `gap` 双值取第 1 值＝row＝垂直（第 2 值是列＝水平，不进**这一本**账，见下面 `HPROPS` 那一族），
     单值写法同时是行距与列距、这里认它行距那一半；`*-top`/`*-bottom`/`row-gap` 整条即垂直。
     ⚠️ 旧句"`margin-left`/`padding-left`/`column-gap` 一概不看"从本卡起作废 —— 垂直这一族仍旧不看它们（`VPROPS` 一个字未改），
     但它们不再无人看管：`HPROPS` 那一族逐枚认领、两侧对账。这一句留着是为了以后有人拿它当"横向没人管"的挡箭牌时能对上日期。
     零／auto 槽位不认领（那是重置与居中，不是间距决策）；`em`/`mm`/百分比不认领（不是固定 px，量具边界写在 §16 与回执的未验到里）。 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['base.css', 'mistwood.css', 'home.css', 'essay.css', 'notes.css'];
const VPROPS = ['margin', 'margin-top', 'margin-bottom', 'padding', 'padding-top', 'padding-bottom', 'gap', 'row-gap'];
/* 第三族的属性集（2026-10-02 `v11b/hgap`）：口径全文在文件头"横向拆值口径"那一段，改这里必须连那段一起改。
   `margin-block*`／`padding-block*` 那个洞属于垂直那一族，本卡不补；`*inline*` 由判据⑧ 现场报警（见 LOGICAL_HPROPS）。 */
const HPROPS = ['margin', 'margin-left', 'margin-right', 'padding', 'padding-left', 'padding-right', 'gap', 'column-gap'];
const LOGICAL_HPROPS = ['margin-inline', 'margin-inline-start', 'margin-inline-end', 'padding-inline', 'padding-inline-start', 'padding-inline-end'];
const TIERS = { A: '视口比例', B: '行距派生', C: '纯块间距·已上格', X: '纯块间距·在册偏差' };
/* 横向那一本沿用 TIERS 的四个名字（同一句话，不给横向另造一套档名——两本各造一名就是给自己埋漂移），
   只多立一档 H；两本的区别只在打印那一节的标题上（"横向间距槽"）。B 在这一本恒 0 枚（判据⑦ 的反面）。 */
const HTIERS = { ...TIERS, H: '悬停位移·状态态' };
/* ⚠️ 横向在册枚数（`HREGISTRY` 条数 / 盘上声明 / §4 那本间距账将来单列的横向一条，四处同源，动一处必红）：
   **A 6 ／ B 0 ／ C 25 ／ X 54 ／ H 1 ＝ 86 枚横向间距槽位，覆盖 5 份样式表。**
   逐份：base.css 10 ／ mistwood.css 43 ／ home.css 13 ／ essay.css 18 ／ notes.css 2。
   这一串同样是 `node tools/gap-check.mjs` **实跑打印**的那一串，不是相加出来的。
   ⚠️ 立尺这一轮（本卡 `v11b/hgap`）从盘上现值全量登记，`src/**` 一个字节未改：垂直那 144 枚与圆角那 32 枚／12 种一枚未动、
   两本旧账的逐位读数与本卡之前一致（横向这一本是新立的第三本，不与前两本共享任何一枚槽位记录）。
   ⚠️ `v12c/offset`（2026-10-03，W2-C 第 1 档）把 C 抬到 25、总数抬到 **86**：多出来的那一枚是
   `mistwood.css` 的 `.essay-index li:nth-child(2n) .row{margin-left:24px}`——目录行逐行错落的**静态**缩进，
   取值 24 是盘上已有的在册档（同一行那枚 `gap:24px`），涨的是**槽位**不是**新值**；窄屏那一档归零成
   `margin-left:0` 吃零口径不进账。**A／B／X／H 四档一枚没动**（尤其 H 仍旧 1 枚：静态缩进不许蹭它）。
   ⚠️ B 档登记 0 是**判断**不是"没扫到"：横向没有"行与行之间"那种东西（文件头那一段写了理由），
      谁把横槽登记成 B，判据⑦ 那一段会点名它，而不是让枚数加法悄悄把它收进去。 */
const H_REGISTERED = { A: 6, B: 0, C: 25, X: 54, H: 1 };
/* needle：四种形状各一枚，扫不到就是在空转（长手 margin-left／长手 padding-left／column-gap／双值 gap 的列距） */
const H_NEEDLES = [
  ['mistwood.css', '', '.chip-n', 'margin-left', '6px', 'X'],
  ['essay.css', '', '#toc a', 'padding-left', '14px', 'X'],
  ['mistwood.css', '', '.yring', 'column-gap', '3px', 'X'],
  ['mistwood.css', '', '.col-grid', 'gap', '32px', 'C'],
];
/* 形状闸：这一族的两种来源（长手／简写分量）任一种在盘上消失了，就是拆值口径坏了，不是"刚好没有" */
const HLONGHAND = ['margin-left', 'margin-right', 'padding-left', 'padding-right', 'column-gap'];
const HSHORTHAND = ['margin', 'padding', 'gap'];
/* ⚠️ 在册枚数（§16 那一格与 §4 那三行说的就是这几个数，三处同源，动一处必红）：
   A 14 / B 10 / C 52 / X 67 ＝ 143 枚垂直间距槽位，覆盖 5 份样式表。
   ⚠️ 这一串是 `node tools/gap-check.mjs` **实跑打印**的那一串，不是相加出来的：
   第十一轮末把搜索面板窄屏那一档（`@media (max-width:720px)` 的 `padding:16px`，C 档一枚）
   连同入口宿主一起撤掉，C 53→52、总数 143→142（§11 那一格的账在规范里）。
   ⚠️ `v7b/density`（2026-10-01，一轮 §B1 密度自适应）把 X 抬到 67、总数抬到 143：多出来的那一枚是
   `.essay-index[data-density="compact"] .row{padding:20px 0}`——**取值 20px 是盘上已有的在册档**
   （同元素同属性在窄屏那一档就是它），涨的是**槽位**不是**新值**；摘要收到一行那半枚动的是
   `-webkit-line-clamp` 与 `em`，都在本工具的拆值口径之外，所以一整轮只涨这一枚。C 档 52 枚一枚没动。
   ⚠️ `v5b/heads`（2026-10-02，一轮 §C2 键盘导航提示条）把 X 抬到 68、总数抬到 **144**：多出来的那一枚是
   `base.css` 的 `.kbd-hint{padding:12px 18px}` 里上下那一半——**取值 12px 同样是盘上已有的在册档**
   （`.thing-bar` 与 `.settings` 上内垫都是它），涨的是槽位不是新值；横向 18px、`bottom:16px`、`left:50%`、
   `max-width:84vw` 四件都不在拆值口径里，所以这一格全站也只多这一枚。C 档 52 枚仍一枚没动。
   ⚠️ `w2u/seal`（2026-10-03，规范二轮 §7.2 那枚文末落款落地）把 X 抬到 69、总数抬到 **145**：多出来的那一枚是
   `essay.css` 的 `.post-seal{margin:14px auto 0}` 里上下那一半——**取值 14px 是本页那一族已有的在册档**（`.post-when`／
   `.stamp-note`／图注三处都是它，且从来不在 8 的格子上 ⇒ 落的还是 X 档，不新开一档、也不替它上格），
   涨的是**槽位**不是**新值**。同一条里 `font-size`／`color`／`letter-spacing` 三枚都不在 `VPROPS`，
   那枚点的 `fill` 与 `width`／`height` 标记属性也都不在拆值口径里 ⇒ 全站这一格只多这一枚。
   C 档 52 枚、横向那本 86 枚、圆角那本 32 枚／12 种仍一枚没动（点走 SVG `<circle r="1">`，`border-radius` 零枚）。 */
const REGISTERED = { A: 14, B: 10, C: 52, X: 69 };
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
  /* 一轮 §C2 那条键盘提示条（2026-10-02 `v5b/heads`）：这一格只多出**一枚**垂直槽位——上下内垫 12px
     逐字符照 `.thing-bar`（`mistwood.css:820`）与 `.settings` 上内垫那一枚：**取值 12px 是盘上已有的在册档**，
     涨的是槽位不是新值。横向那枚 18px、`bottom:16px`、`left:50%`、`max-width:84vw` 四件都不在拆值口径里
     （`margin-left`／`padding-left` 一概不看，`bottom`／`left`／`max-width`／`width` 不在 VPROPS 名单）。 */
  ['base.css', '', '.kbd-hint', 'padding', '12px', 'X', '键盘提示条的上下内垫：逐字符照图鉴玻璃条那一枚 12px（薄板族同一档，不为新组件开新留白档）'],
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
  ['mistwood.css', '', '.essay-index[data-density="compact"] .row', 'padding', '20px', 'X', '目录行 compact 档的上下内垫（一轮 §B1，`v7b/density`）：**不是新值**——同一枚元素、同一个属性在 `@media (max-width:720px)` 里已经认领的那枚 20px，本轮只是让它在宽屏的 compact 档也说话；sparse 那一档仍旧走上面那条 26px，两档之间没有第三个数（提案 §B1 的"切换是离散的"），摘要收到一行那半走 `-webkit-line-clamp` ＋ `1.7em`，两枚都不在本工具的拆值口径里 ⇒ 这一档全站只多这一枚槽位'],
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
  ['essay.css', '', '.post-body hr', 'margin', '56px', 'C', '换气记号那枚点的上下（三轮 §2.2：那三枚点退役成一枚苔点）'],
  ['essay.css', '', '.footnotes', 'margin-top', '72px', 'C', '正文与脚注块之间（比 h2 的 64 再高一档：这是一次转场不是一章）'],
  ['essay.css', '', '.footnotes', 'padding-top', '28px', 'X', '封口线与脚注块之间：沿用段距那一档 28，但它不在 8 的格子上'],
  ['essay.css', '', '.footnotes .fn-title', 'margin', '18px', 'X', '"注"那一行与脚注列表之间'],
  ['essay.css', '', '.footnotes li', 'margin-bottom', '8px', 'B', '脚注条目距：所在块 14px × 1.85（行盒 25.9）；顺带说，这一枚本来就在格子上'],
  ['essay.css', '@media (min-width:1240px)', '.post-body .sidenote', 'margin', '2px', 'X', '浮进留白时与正文第一行的对位微调（不是栏间距）'],
  ['essay.css', '@media (min-width:1240px)', '.post-body .sidenote', 'margin', '20px', 'B', '两条边注之间：边注自己那 14px × 1.75 的行盒档（§4 边注栏那一格）'],
  ['essay.css', '@media (min-width:1240px)', '.post-body .sn-mark', 'margin', '2px', 'X', '上标号与浮注对位'],
  ['essay.css', '', '.post-body figure.shot', 'margin', '44px', 'X', '图版上下：比段距宽、比小节窄，那一档是图自己的'],
  ['essay.css', '', '.post-body figcaption', 'margin-top', '14px', 'X', '图注与其图版之间（值与引用内段距同档，机制不同：它上头不是行）'],
  ['essay.css', '', '.post-seal', 'margin', '14px', 'X', '落款那一行与它上面 `.post-tail` 那一块之间：取值逐字符借本页那一族已有的 14px（`.post-when`／`.stamp-note`／图注三处都是它），写法照 `.post-tail`／`.post-nav` 那两块的 `margin:N auto 0`（`auto` 不认领、第 3 值是 0 也不认领）；与它们同一档 X——14px 从来不在 8 的格子上，这一枚不新开一档、也不为它上格（`w2u/seal` 2026-10-03）'],
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

/* ---------- 第三族的注册表：横向间距槽位（2026-10-02 本卡 `v11b/hgap`）---------- */
/* 键的形状与垂直那一本一样：文件 / 媒体查询 / 选择器 / 属性 / 槽位值 / 档位 / 这一枚是谁的横向呼吸。
   逐枚按盘上文件与行序排。⚠️ 这一本登记的是**盘上现值**，本卡一枚 `src/**` 都没改：
   今天盘上横向有多少枚就登记多少枚，将来谁加一枚就得在这里加一条并交代档位，加不动就红。
   与垂直那一本同一条声明各记一枚（`padding:12px 18px` 这种）不是重复计数——两把尺量的是两个维度，见文件头"横向拆值口径"。 */
const HREGISTRY = [
  /* ===== base.css：全站基础层（含打印层那一档）===== */
  ['base.css', '', '.nav-clock', 'gap', '8px', 'C', '时钟行那枚状态点与文字之间的列距：`gap:8px` 单值同时是行距与列距，垂直那一本认它行距那一半，这一本认列距那一半'],
  ['base.css', '', '.search .sep', 'margin', '8px', 'C', '搜索入口分隔点左右各 8px（`margin:0 8px` 第二值位＝左右同值，只认一枚）。⚠️ base.css:359 那句"左右是水平量、gap-check 不看"从本卡起过期：横向不再无人看管（src/** 不许改，那句的更正随本卡入账）'],
  ['base.css', '', '.search-input', 'padding', '9px', 'X', '输入框左右内垫：上下那枚 8px 在垂直那一本（C），左右 9px 撑的是命中与呼吸，不吃 8 的格子'],
  ['base.css', '', '.search-row', 'padding', '10px', 'X', '结果行左右内垫：上下 16px 走垂直那一本，左右 10px 是列表行的横向衬里'],
  ['base.css', '', '.foot-in', 'padding', '8vw', 'A', '尾页横向留白：与 .wrap／.hero／.home-lower 那一族 8vw 同一个页面级档（§4 那句"8vw 在第二值位"讲的正是这一族），视口比例不参与基准化'],
  ['base.css', '', '.site-foot .sep', 'margin', '8px', 'C', '尾页那一行分隔点左右 8px：与 .search .sep 同族同值（§17 那种"两处各一枚"这里两处各记一条）'],
  ['base.css', '', '.kbd-hint', 'padding', '18px', 'X', '键盘提示条左右内垫（`v5b/heads` 一轮 §C2）：上下 12px 那枚在垂直那一本，18px 今天全站只它用——垂直那一本的注释早写着"横向 18px 不在拆值口径里"，从今天起它在横向这一本里'],
  ['base.css', '@media print', 'html .post-body .sidenote', 'margin', '2px', 'X', '纸上边注回到句间：`margin:0 2px` 的左右那一半，上下 0 不吃'],
  ['base.css', '@media print', 'html .post-body .sn-mark', 'margin', '2px', 'X', '纸上上标号的右距（四值写法第 2 值）'],
  ['base.css', '@media print', 'html .post-body .sn-mark', 'margin', '5px', 'X', '纸上上标号的左距（四值写法第 4 值）：左右不等 ⇒ 两枚各记一条，与 essay.css 屏幕层那一对同值不同层'],
  /* ===== mistwood.css：子页那一层 ===== */
  ['mistwood.css', '', '.nav', 'gap', '28px', 'X', '胶囊横排三项之间的列距：垂直那一本记的是同一条声明的 row 那一半（nowrap 下不显形），真正说话的是这一枚'],
  ['mistwood.css', '', '.nav', 'padding', '22px', 'X', '胶囊左右内垫（`padding:10px 22px` 第二值位）：上下 10px 在垂直那一本'],
  ['mistwood.css', '', '.dayring', 'margin', '-7.5px', 'X', '绝对对中的负自身半径（15/2）落在左半：与垂直那一本那枚 -7.5px 同一条声明的另一半，仍不是间距决策'],
  ['mistwood.css', '', '.nav-links', 'gap', '22px', 'X', '导航三项之间的列距'],
  ['mistwood.css', '', '.settings', 'padding', '16px', 'C', '抽屉左右内垫：三值写法 `14px 16px 12px` 的中间那枚＝左右同值 ⇒ 只认一枚（上下那两枚 14/12 在垂直那一本各记一条）'],
  ['mistwood.css', '', '.seg', 'gap', '8px', 'C', '旋钮行 grid `42px 1fr` 单值 gap 的列距那一半：一行两列，列距就是轨距'],
  ['mistwood.css', '', '.seg-opts', 'gap', '4px', 'X', '三个选项 chip 之间的列距'],
  ['mistwood.css', '', '.wrap', 'padding', '8vw', 'A', '子页正文横向留白：§4 那一格"8vw 在第二值位"（`padding:0 8vw`）点名的就是它，第一值 0 两把尺都不收'],
  ['mistwood.css', '', '.row', 'gap', '24px', 'C', '目录行内编号／标题／日期之间的列距——这一枚是行横向节奏的真值（垂直那一本记的 row 那一半在横排下不显形）'],
  ['mistwood.css', '', '.essay-index li:nth-child(2n) .row', 'margin-left', '24px', 'C', 'W2-C 第 1 档（2026-10-03 本卡 `v12c/offset`）：目录行逐行错落的**静态**缩进——每第二行往右踩一步石头。取 24 ＝ 上面那一格同一行在册那枚 `gap:24px` 的列距，步长由这一行自己的单位派生，不是新造的一枚数；24 在 8 的格子上（3×8）⇒ 落 C 档。⚠️ 不许图省事登记成 H：H 的定义是"只在 `:hover`／`:focus` 一类状态态下改横槽"，静态缩进塞进 H 正是判据⑦ 反向那一半（拿新档当逃生口）要点名的形状；它也不落 X——X 收的是"盘上还没上格的老值"，一枚新数没有理由一落地就记成偏差。窄屏那一档（`@media (max-width:720px)`）把它归零成 `margin-left:0`，吃**零口径**不进账 ⇒ 横向整本只涨这一枚。'],
  ['mistwood.css', '', '.row-side', 'gap', '6px', 'X', '日期列 flex-column ⇒ 列距不显形（垂直那一本记它是真行距）：单值 gap 两本各一枚，这一枚今天画不出来但值在册'],
  ['mistwood.css', '', '.density-wrap', 'gap', '14px', 'X', '密度条与图例之间（flex column ⇒ 列距不显形，同上一条的形状）'],
  ['mistwood.css', '', '.yring', 'column-gap', '3px', 'X', '年度尺架月与月之间那 3px 缝：mistwood.css:661 那句"横向与 column-gap 一概不看"从本卡起过期（它现在有人数了）。⚠️ 这块今天零枚被撤、零枚被改，只是被登记'],
  ['mistwood.css', '', '.lost-list a,.lost-list button', 'gap', '18px', 'X', '404 行内编号与地址之间的列距（baseline 横排，这一枚真说话）'],
  ['mistwood.css', '', '.chip-row', 'gap', '8px', 'C', '标签胶囊之间的列距（flex-wrap ⇒ 换行时也当行距用，值仍只这一枚）'],
  ['mistwood.css', '', '.chip', 'padding', '10px', 'X', '胶囊左右内垫：上下 4px 在垂直那一本'],
  ['mistwood.css', '', '.chip-n', 'margin-left', '6px', 'X', '胶囊里编号与名字之间那 6px 左距——needle 之一（`margin-left` 这一族长手只有这一把尺看得见）'],
  ['mistwood.css', '', '.things-grid', 'gap', '32px', 'C', '图鉴卡间距的列距——§4 那句"卡片间距 32"的真值横向也在这枚上（grid 2 列，行距那一半在垂直那一本）'],
  ['mistwood.css', '', '.thing-bar', 'gap', '16px', 'C', '玻璃条内标题与标签之间（space-between 横排 ⇒ 这一枚是最小间隙地板）'],
  ['mistwood.css', '', '.thing-bar', 'padding', '18px', 'X', '玻璃条左右内垫：上下 12px 在垂直那一本'],
  ['mistwood.css', '', '.about-inner', 'gap', '40px', 'C', '/about/ 各块之间（flex column ⇒ 列距不显形）：值与垂直那一本同一条声明，各记一枚'],
  ['mistwood.css', '', '.about-lede', 'gap', '40px', 'C', '扉页竖排档：列距不显形（≥1024 换 grid 后说话的是下面那枚 column-gap:60px）'],
  ['mistwood.css', '@media (min-width:1024px)', '.about-lede', 'column-gap', '60px', 'X', '人像 220px 栏与简介栏之间那 60px：垂直那一本的注释早写着"那一枚是水平、不在此列"——它现在在此列了（本卡之前它确实一本都不在）'],
  ['mistwood.css', '', '.portrait:not(:has(img))::after', 'padding', '24px', 'C', '占位期那句提示文字的左右内垫（`padding:0 24px`，上下 0 不收）：24 在格子上'],
  ['mistwood.css', '', '.about-now summary', 'gap', '8px', 'C', '"现在在做"那行里点与文字之间的列距'],
  ['mistwood.css', '', '.now-list', 'margin', '2px', 'X', '披露件列表右距（`margin:14px 0 0 2px` 四值写法第 2 值）：上下那枚 14px 在垂直那一本'],
  ['mistwood.css', '', '.now-list', 'padding', '20px', 'X', '披露件列表左内垫（`padding:0 0 0 20px` 第 4 值）：那条 `border-left` 苔线到字的距离，逐条错位的正主形状'],
  ['mistwood.css', '', '.contact-links', 'gap', '28px', 'X', '三枚大号链接之间（flex column ⇒ 列距不显形，值仍与垂直那一本各记一枚）'],
  ['mistwood.css', '', '.contact-links a:hover', 'padding-left', '34px', 'H', '悬停位移那一档（判据⑦）：静止态是 `:908` 那枚 `padding-left:0`（吃零口径不进账），`:910` 的 `transition:padding-left .35s` 把它过渡到 34px 让苔绿箭头长出来。它算槽位，但它是"手感"不是"版面"——reduced-motion 下退回 0，而逐行错位那种静态缩进不会退 ⇒ 单独一档，不与静态缩进混账'],
  ['mistwood.css', '', '.col-title', 'gap', '10px', 'X', 'colophon 标题行内两块的列距'],
  ['mistwood.css', '', '.col-grid', 'gap', '32px', 'C', '`gap:20px 32px` 双值写法里第 2 值＝列距＝横向：垂直那一本记的是 20px 那一半，两本各一枚——这就是"一行里两枚槽、两把尺各收各的"的字面样本'],
  ['mistwood.css', '', '.col-grid > div', 'gap', '5px', 'X', '一格内 dt 与 dd 之间（flex column ⇒ 列距不显形）'],
  ['mistwood.css', '', '.word-river', 'column-gap', '3px', 'X', '词河点与点之间那 3px：mistwood.css:950-952 那段"这里几枚声明没有一枚在 gap-check 的两把尺上（`column-gap`…）"从本卡起过期——它现在在第三把尺上'],
  ['mistwood.css', '', '.col-year', 'gap', '10px', 'X', '年度弧那一行文字与 SVG 弧之间的列距'],
  ['mistwood.css', '', '.col-visit::before', 'margin-right', '8px', 'C', '回访行那枚 5px 苔点与文字之间的右距'],
  ['mistwood.css', '', '.life-year', 'column-gap', '2px', 'X', '一生格子列与列之间那 2px：mistwood.css:981 那句"零新垂直间距槽位：这里只写 column-gap"讲的就是它——垂直那一本确实一枚不动，横向这一本要它'],
  ['mistwood.css', '@media (max-width:720px)', '.nav', 'gap', '14px', 'X', '窄屏胶囊列距（§11 降级表那一档）'],
  ['mistwood.css', '@media (max-width:720px)', '.nav', 'padding', '14px', 'X', '窄屏胶囊左右内垫（上下 9px 在垂直那一本）'],
  ['mistwood.css', '@media (max-width:720px)', '.nav-links', 'gap', '10px', 'X', '窄屏导航三项之间的列距'],
  ['mistwood.css', '@media (max-width:720px)', '.row', 'gap', '14px', 'X', '窄屏目录行内的列距'],
  ['mistwood.css', '@media (max-width:720px)', '.col-grid', 'gap', '16px', 'C', '窄屏档案收成单栏：这一枚在垂直那一本是真行距、在这一本是列距（单栏 ⇒ 列距不显形），两本各记一枚'],
  ['mistwood.css', '@media (max-width:340px)', '.nav', 'padding', '12px', 'X', '320 那一档收的那一半正是横向（垂直那一本的注释写着"只收横向（12px），上下仍旧 9px"——那枚 12px 从今天起有账）'],
  ['mistwood.css', '@media (max-width:340px)', '.nav-links', 'gap', '8px', 'C', '320 那一档导航列距'],
  /* ===== home.css：只有首页 ===== */
  ['home.css', '', '.nav', 'gap', '28px', 'X', '与 mistwood.css 那份逐字符同值（§17：这一族两份都要改，两本账也各记两条）'],
  ['home.css', '', '.nav', 'padding', '22px', 'X', '同上：胶囊左右内垫'],
  ['home.css', '', '.hero', 'padding', '8vw', 'A', '首屏横向留白：`padding:0 8vw`，几何与 .home-lower 对齐（home.css:450 那句"8vw 左内边距"说的就是它）'],
  ['home.css', '', '.hero-log .sep', 'margin', '14px', 'X', '日志行分隔点左右 14px（`.hero-log .sep`）：与窄屏那一档的 8px 是同族两档'],
  ['home.css', '', '.home-lower', 'padding', '8vw', 'A', '首页下半段横向留白：`padding:0 8vw 22vh` 第二值位＝左右同值 ⇒ 一枚；上下那两枚（0 与 22vh）在垂直那一本'],
  ['home.css', '', '.home-note', 'gap', '18px', 'X', '`gap:0 18px` 双值写法第 2 值＝日期列与句子之间的列距；第一值 0 是行距、两把尺都不收'],
  ['home.css', '@media (max-width:720px)', '.nav', 'gap', '14px', 'X', '窄屏胶囊列距（与 mistwood.css 同值）'],
  ['home.css', '@media (max-width:720px)', '.nav', 'padding', '16px', 'C', '这一份的左右 16px 同样被打包顺序压住（§17：说话算数的是 mistwood 那 14px，那一枚在 mistwood 表里落 X），留着它是保险不是现状；16 本身在 8 的格子上 ⇒ C'],
  ['home.css', '@media (max-width:720px)', '.hero', 'padding', '7vw', 'A', '窄屏首屏横向留白 8vw → 7vw'],
  ['home.css', '@media (max-width:720px)', '.hero-log .sep', 'margin', '8px', 'C', '窄屏日志分隔点左右 8px（base.css:359 那句"取值口径抄 home.css:275 那一份"讲的正是这一枚）'],
  ['home.css', '@media (max-width:720px)', '.home-lower', 'padding', '7vw', 'A', '窄屏首页下半段横向留白'],
  ['home.css', '@media (max-width:720px)', '.home-note', 'gap', '4px', 'X', '窄屏 note 收成单列后 `gap:4px`：行距那一半在垂直那一本，列距这一半在单列下不显形'],
  ['home.css', '@media (max-width:340px)', '.nav', 'padding', '12px', 'X', '320 那一档（横向 12，上下仍旧 9；home.css:514 那句"内容区留白走 .hero/.home-lower 的 padding:0 8vw，不共享这个常数"是横向的口径）'],
  /* ===== essay.css：详情页那一层 ===== */
  ['essay.css', '', '.post-focus', 'margin-left', '14px', 'X', '专注开关与盖章之间那 14px 左距：essay.css:49-50 写明它沿用 `.stamp-note{margin-top:14px}` 那一族既有节奏、不新开一档——两把尺各数一枚，同一族 14px'],
  ['essay.css', '', '#toc', 'gap', '12px', 'X', '目录各行之间（flex column ⇒ 列距不显形；值那一半在垂直那一本）'],
  ['essay.css', '', '#toc a', 'padding-left', '14px', 'X', '一级目录条目的左缘（那枚 6px 短线记号之后的落字位）——needle 之一：静态缩进，下一张卡那种逐行错位冒出来就是长在这个形状上，它必须与下面那枚 H 分开数'],
  ['essay.css', '', '#toc a.sub', 'padding-left', '26px', 'X', '二级条目缩进＝一级那 14px ＋ 本表自己的行距档 12px（essay.css:146-150 那段"只往缩进那一格走，不新造记号"的账就在这两枚上）'],
  ['essay.css', '', '.post-body code', 'padding', '7px', 'X', '行内 code 左右内垫：上下 2px 在垂直那一本'],
  ['essay.css', '', '.post-body pre', 'padding', '16px', 'C', '代码面四边同值（`padding:16px` 单值写法）⇒ 垂直记上下那一枚、横向记左右那一枚，同一条声明两本各一枚'],
  ['essay.css', '', '.post-body th,.post-body td', 'padding', '12px', 'X', '格子左右内垫：垂直那一本的注释早写着"12px 是横向、不计"——从今天起它在横向这一本里计'],
  ['essay.css', '', '.post-body blockquote', 'padding-left', '28px', 'X', '引用块左缘（那条 1px 苔绿竖线与引文之间的距离）：静态缩进，与段距那枚 28px 同值不同职'],
  ['essay.css', '', '.post-body sup.fnref', 'margin-left', '2px', 'X', '正文里上标号与前字之间的 2px 左距（撑的是笔画不打架，不是留白档）'],
  ['essay.css', '', '.footnotes .backref', 'margin-left', '6px', 'X', '文末脚注那条 ↩ 与句子之间的 6px 左距：与 .chip-n 那枚同值'],
  ['essay.css', '', '.post-body .sn-mark', 'margin', '2px', 'X', '边注上标号的右距（`margin:0 2px 0 5px` 第 2 值）'],
  ['essay.css', '', '.post-body .sn-mark', 'margin', '5px', 'X', '边注上标号的左距（第 4 值）：左右不等 ⇒ 一条声明两枚横槽，各记一条'],
  ['essay.css', '@media (min-width:1240px)', '.post-body .sidenote', 'margin', '-232px', 'C', '边注浮进 680 栏左侧留白那 232px 负左距：照算术 232＝29×8 落 C，登记它是为了"格子管得住它"，不是把它认成留白档（负位移的语义与 .dayring 那枚同族）'],
  ['essay.css', '@media (min-width:1240px)', '.post-body .sn-mark', 'margin', '8px', 'C', '浮注那一档上标号的右距（`margin:2px 8px 0 0` 第 2 值，左 0 不收）'],
  ['essay.css', '', '.post-body figcaption::before', 'margin-right', '6px', 'X', '图注那枚齿孔点与"图"字之间的 6px 右距：essay.css:581-583 那段注释明写"margin-right 是横向槽位、gap-check 一概不看、横向不在它那 143 枚垂直账上"——后半句从本卡起过期（它现在在横向这一本的 86 枚里），前半句仍旧只对垂直那一本成立'],
  ['essay.css', '', '.lightbox', 'gap', '14px', 'X', '灯箱里大图／图注／收起钮之间（flex column ⇒ 列距不显形）'],
  ['essay.css', '', '.lightbox', 'padding', '16px', 'C', '面板四边同值 ⇒ 两本各一枚（垂直那一本记上下，这一本记左右）'],
  ['essay.css', '', '.post-nav', 'gap', '32px', 'C', '左右两枚链接之间的列距：这一枚在桌面横排才显形（≤720 转竖排后它变成行距，那一半在垂直那一本）'],
  /* ===== notes.css：/notes/ ===== */
  ['notes.css', '', '.note', 'gap', '10px', 'X', '一条 note 里日期行与句子之间（flex column ⇒ 列距不显形）：垂直那一本把同一条声明记成 B 行距派生，这一本不收 B ⇒ 按算术落 X，枚数冻结'],
  ['notes.css', '', '.jieqi-scale', 'column-gap', '3px', 'X', '廿四气标尺气与气之间那 3px 缝：与 `.yring`（mistwood.css:669 那一枚，在册也记 X）同值，两条各认各的宿主——那一枚在 mistwood.css、这一枚在 notes.css，两把尺架各自认各自的。⚠️ 这块零枚被撤、零枚被改，只是被登记：`v11d/jieqi` 那枚 `column-gap:3px` 是逐字照 `.yring` 搬的，而横向这一族自 `v11b/hgap` 起已在册，所以它落地那天就该有这一条；notes.css:16 那句"gap-check 的拆值口径明写 column-gap 一概不看"是它基树上的旧说法，登记不改它的设计与值'],
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
  ['12px', 3, '玻璃条与悬停铺面', '薄板族三面：图鉴玻璃条／目录行的悬停铺面／键盘导航提示条（第三枚是 2026-10-02 一轮 §C2 添的，逐字符照前两枚那一档，不是新写法）'],
  ['14px', 1, '显示设置抽屉', '抽屉那一块面（今天全站只有它用 14）'],
  ['16px', 5, '图与卡的那一面', '§4 那句 卡片是 16 不是 20 说的那一族：封面框／图鉴卡／人像／图版框／灯箱面板'],
  ['50%', 8, '圆与椭圆', '整圆与椭圆：两枚 30px 圆钮／四枚状态点／萤火虫／首页雾带那条椭圆'],
  ['999px', 3, '胶囊', '两枚导航玻璃胶囊（`home.css`／`mistwood.css` 各一份，§17 那条在册重复）＋首页主行动 `.hero-cta`（2026-10-02 从实心面退成胶囊，规范 §2.6）'],
  ['0', 1, '抹平', '把圆角取消那一枚，不是第 12 档半径（见上面口径 ③ 末那段）'],
];
/* 在册总数与种数（与 `RADIUS_LADDER` 逐档枚数、盘上的声明三处同源，动一处必红）：
   立尺那一轮盘上是 12 种写法共 30 枚 —— 50%×8、16px×5、9px×4、8px×3、999px×2、12px×2、
   6px／4px／3px／14px／10px／0 各 1 枚；垂直那本 142 枚的账与它无关。
   ⚠️ 2026-10-02（规范 §2.6）首页主行动退成玻璃胶囊 ⇒ `999px` 那一档 2→3、总数 30→**31**（种数不动）。
   ⚠️ 2026-10-02（`v5b/heads`，一轮 §C2）键盘导航提示条落地 ⇒ `12px` 那一档 2→3、总数 31→**32**
   （种数仍然不动：它吃的是那一档的现成写法，不是第 13 种写法）。 */
const RADIUS_REGISTERED = { hits: 32, kinds: 12 };
/* needle：盘上扫不到这一条就是这一族在空转，不是"这一档刚好没东西" */
const RADIUS_NEEDLE = ['mistwood.css', '', '.thing-bar', RPROP, '12px', '玻璃条与悬停铺面'];

/* ---------- 第四格的登记值：抄进 CSS 注释里的账本现值（2026-10-03 本卡 `v11h1/numtooth`）---------- */
/* ⚠️ 抄本处数（与下面 `copyStatements()` 在 `src/styles/*.css` 里扫到的「陈述三本账总数的句子」处数同源，动一处必红）：
   **18 处** ＝ base.css 4（:359 垂直／:360 横向＋圆角／:635 横向）＋ essay.css 4（:717 垂直／:718 横向＋圆角／
   :782 垂直＝`w2u/seal` 那枚文末落款自己那一格）
   ＋ mistwood.css 10（:526 垂直＋圆角／:565 垂直／:718 横向／:1050 垂直＋横向＋圆角／:1082 垂直／:1083 横向＋圆角）；
   home.css、notes.css 零处。
   （⚠️ `v12c/offset` 两档各添了抄本：第 1 档那 1 处是逐行错落那一格把自己的垂直读数抄进注释（现 :565），
     第 2 档那 2 处是大写标签那一格写下"三本账一枚不动"时把垂直与圆角的现值也抄上了（现 :526）；
     行号同样是这两处插入改的——上一轮的 :662／:994／:1026／:1027 现在漂到 :718／:1050／:1082／:1083。
     ⚠️ `w2u/seal`（2026-10-03）添的第 18 处在 essay.css:782（落款那一格把垂直那本的新值抄进注释），
     同一轮把六处旧抄本的 144 全改成 145、三处带分解的那句把 X68 改成 X69——这一格就是当场逼着改齐的那把牙。）
   以后新增一处抄本就得显式把这个数 ＋1 —— 它是"扫到 N 处"的牙，不许静默漂移：
   少了就说明某一处抄本被改写或换了写法（换个说法就等于绕过这一格），多了就说明有人新抄了一句却没上账。 */
const COPY_STATEMENTS = 18;

/* ---------- 圆角逐枚认领：文件 / 上下文 / 选择器 / 属性 / 字面 / 档名 / 这一枚是谁的圆 ---------- */
const RADIUS_REGISTRY = [
  /* ===== base.css：全站基础层 ===== */
  ['base.css', '', '::-webkit-scrollbar-thumb', RPROP, '3px', '滚动条 thumb', '6px 宽滚动条的 thumb：§4 梯子最小那一档'],
  ['base.css', '', ':focus-visible', RPROP, '4px', '焦点环', '键盘焦点那圈 2px 描边的四角；`outline-offset` 也是 4px，同值不同职'],
  ['base.css', '', '.nav-clock .dot', RPROP, '50%', '圆与椭圆', '时钟那枚 5px 状态点（§6 时钟零动效：实心、不呼吸）'],
  ['base.css', '', '.theme-toggle', RPROP, '50%', '圆与椭圆', '30px 圆钮（主题切换）：全站两枚同尺寸圆钮之一，另一枚在 mistwood.css'],
  ['base.css', '', '.search-input', RPROP, '9px', 'chip 与列表行', '搜索输入框：复用抽屉选项 chip 那一档，不为新组件开新档（§9 复用那一整套）'],
  ['base.css', '', '.search-row', RPROP, '9px', 'chip 与列表行', '搜索结果行：同上，一块可点的小面'],
  ['base.css', '', '.kbd-hint', RPROP, '12px', '玻璃条与悬停铺面', '键盘导航提示条那块薄玻璃（一轮 §C2，2026-10-02 `v5b/heads`）：逐字符照 `.thing-bar` 那一档，不新开写法'],
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
  ['home.css', '', '.hero-cta', RPROP, '999px', '胶囊', '首页主行动那枚胶囊：2026-10-02 从深苔实心面退成玻璃面（规范 §2.6），复用导航那一族的形状'],
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
/* 横向槽位（第三族唯一的一份口径，注册表与扫描共用；口径全文在文件头那一段）：
   与 verticalSlots 是同一条 CSS 的另一半——两边合起来才是那条声明的四个边，各自数各自的、互不代记。
   左右同值只认一枚（2／3 值写法的第 2 值本来就是左右同值；4 值写法若右==左字面相同也只认一枚），
   免得把一条声明数成两枚同键槽位去撞"键不够用"那条红——那是形状问题，不是有人加了一枚间距。 */
function horizontalSlots(prop, value) {
  const t = tokens(value);
  if (!t.length) return [];
  if (['margin-left', 'margin-right', 'padding-left', 'padding-right', 'column-gap'].includes(prop)) return [t.join(' ')];
  if (prop === 'gap') return t.length >= 2 ? [t[1]] : [t[0]];    /* 双值取第 2 值＝列；单值同时是行与列，这一本认列那一半 */
  if (prop === 'margin' || prop === 'padding') {
    const idx = t.length === 4 ? [1, 3] : [1];                   /* 1 值写法 t[1] 空 ⇒ 退回第 1 值：四边同值也是横向内垫 */
    const got = [];
    for (const i of idx){ const v = t[i] ?? t[0]; if (v && !got.includes(v)) got.push(v); }
    return got;
  }
  return [];
}
/* 判据⑦ 的那只眼：状态态选择器（媒体查询上下文一并问，别只盯住最后那层选择器） */
const STATEFUL = /:(?:hover|focus|focus-visible|focus-within|active|target)\b/;
const isStateful = (ctx, sel) => STATEFUL.test(String(sel || '')) || STATEFUL.test(String(ctx || ''));
/* 块栈走法（唯一的一份，三族共用）：逐条声明吐出来，属性名在 props 名单里才算。
   ⚠️ 三族读的是同一段 CSS 语法，所以走法只有一份——CSS 写法变了改一处就够，不会几把尺子各自漂。 */
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
/* 横向扫描（第三族）：走法与 scan() 同一份，只是每枚槽位取的是同一条声明的左右那一半 */
function scanH() {
  const rows = [];
  for (const d of walkDecls(HPROPS)) {
    for (const tok of horizontalSlots(d.prop, d.value)) {
      if (hasPx(tok)) rows.push({ ...d, tok, kind: 'px' });
      else if (hasVp(tok) || isVar(tok)) rows.push({ ...d, tok, kind: 'vp' });
      /* 其余（0 / auto / em / mm / % / 关键字）＝不认领，与垂直同一句量具边界 */
    }
  }
  return rows;
}
/* 判据⑧：逻辑写法不认领、但冒出来就红——它说的就是 `margin-left`／`padding-left` 那同一件事，
   任它过就等于横向留着一道"换个属性名即可免检"的门。 */
function logicalHorizontal() {
  return walkDecls(LOGICAL_HPROPS).filter(d => tokens(d.value).some(t => hasPx(t) || hasVp(t) || isVar(t)));
}
/* 扫描名单完备性：`src/styles/` 里冒出一份没进 `FILES` 的表就红——三族都会跟着漏检，
   而漏检的样子和全绿一模一样（§16 那条静默空转的老形状，只是这次漏的是文件不是判据）。 */
function unscannedCss() {
  const dir = join(ROOT, 'src', 'styles');
  if (!existsSync(dir)) return ['src/styles/ 这一层没了'];
  return readdirSync(dir).filter(n => n.endsWith('.css') && !FILES.includes(n));
}
/* 横向一族的空转闸（2026-10-02 本卡 `v11b/hgap`）：注册表侧的 needle 与两道形状闸走在这里（早闸，
   坏的是尺子本身、不是某一枚槽位）；盘侧的 needle 排在下面对账之后，免得它把两条真诊断压住。 */
function guardH() {
  if (!HREGISTRY.length){ console.log('✗ 横向注册表是空的 —— 横向间距尺子正在空转'); process.exit(1); }
  const rows = scanH();
  if (!rows.length){ console.log('✗ 五份样式表里一枚横向间距都没扫到 —— 横向判据正在空转（HPROPS 或拆值口径或文件名单坏了）'); process.exit(1); }
  const files = new Set(rows.map(d => d.file));
  if (files.size < 2){ console.log(`✗ 横向只扫到 ${[...files].join(', ') || '零'} 一份样式表 —— 判据正在空转`); process.exit(1); }
  for (const n of H_NEEDLES){
    const k = n.slice(0, 5).join('|');
    if (!HREGISTRY.some(r => rkey(r) === k)){ console.log(`✗ 横向注册表里没有 needle 那一条（${n[0]} ${n[2]} ${n[3]}:${n[4]}）—— 这一关的牙被拔了`); process.exit(1); }
  }
  /* 两道形状闸：这一族的两种来源（长手／简写分量）任一种在盘上消失，就是拆值口径坏了一半，不是"刚好没有" */
  if (!rows.some(d => HLONGHAND.includes(d.prop))){ console.log('✗ 盘上一枚 `margin-left`／`margin-right`／`padding-left`／`padding-right`／`column-gap` 长手都没扫到 —— 横向属性集坏了（本卡要拦的正是这一族的形状）'); process.exit(1); }
  if (!rows.some(d => HSHORTHAND.includes(d.prop))){ console.log('✗ 盘上一枚从 `margin`／`padding`／`gap` 简写拆出来的横槽都没扫到 —— 简写那一半的拆值口径坏了'); process.exit(1); }
  return rows;
}
const args = process.argv.slice(2);
const K = (file, ctx, sel, prop, tok) => `${file}|${ctx}|${sel}|${prop}|${tok}`;
const key = r => K(r.file, r.ctx, r.sel, r.prop, r.tok);          /* 盘上的一枚槽位 */
const rkey = r => K(r[0], r[1], r[2], r[3], r[4]);                /* 注册表里的一条记录 */
const NEEDLE_KEY = NEEDLE.slice(0, 5).join('|');                   /* 注册表那一条的前五格就是键 */
const RNEEDLE_KEY = RADIUS_NEEDLE.slice(0, 5).join('|');           /* 圆角那一族同构 */
const HNEEDLE_KEYS = H_NEEDLES.map(n => n.slice(0, 5).join('|'));  /* 横向那一族钉四枚（四种形状各一枚） */

/* ---------- 防空转闸：放在所有表之前（三族各一套）---------- */
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
/* 横向一族的空转闸（本卡 `v11b/hgap`）：注册表非空、盘上抓得到、抓到的跨过 2 份表、四枚 needle 在册、
   长手与简写两种来源各至少一枚在场 —— 六条任一条坏就是尺子坏了，不是"盘上刚好没有横向间距" */
const hdisk = guardH();
const missed = unscannedCss();
if (missed.length){ console.log(`✗ src/styles/ 里有没进 FILES 的样式表：${missed.join(', ')} —— 三把尺子都会漏检它（加文件要上名单）`); process.exit(1); }

/* ---------- 对账 ---------- */
/* ⚠️ 三本账各记各的旗标：`vbad` ＝**垂直这一族**的失败条数（下面那行汇总的旗标读它），`hbad`／`rbad` ＝横向与
   圆角各自的；`bad` ＝三族之和，**只**用来定退出码：任何一族红 ⇒ `bad` 非零 ⇒ rc 1，`npm run check` 照旧拦得住。
   为什么旗标不读 `bad`：横向那一族红的时候，垂直那行明明写着「144 枚／认领 144 枚／无人认领 0 枚／注册表过期 0 条」
   却被打成 ✗，拿这段日志 triage 的人会去查错的那一本账（在册纪律：红了先怀疑尺子——一把会冤枉另一本账的尺子比没有尺
   更糟，所以每一族的汇总行只为自己那一族的 unclaimed／phantom／逐档不符说话）。
   自证格子：三族全闭合时本工具打印的每一行必须与交付版**逐字相同**——旗标读哪个变量是形状问题，措辞不是；
   改这一处只许动旗标读的那个变量名，三行汇总与逐档／逐份／按值那些句子一字不许顺手改。 */
let vbad = 0, bad = 0;
const regMap = new Map(), diskMap = new Map();
for (const r of REGISTRY){ const k = rkey(r); if (regMap.has(k)){ console.log(`  ✗ 注册表里 ${k} 写了两遍 —— 认领关系不再是一一对应`); vbad++; } regMap.set(k, r); }
for (const d of disk){ const k = key(d); if (diskMap.has(k)){ console.log(`  ✗ 盘上 ${d.file} ${d.sel} ${d.prop} 的 ${d.tok} 扫出两枚同键槽位（:${d.line} 与 :${diskMap.get(k).line}）—— 键不够用，得把上下文加进去`); vbad++; } diskMap.set(k, d); }

const unclaimed = [...diskMap.keys()].filter(k => !regMap.has(k));
const phantom = [...regMap.keys()].filter(k => !diskMap.has(k));
for (const k of unclaimed){ const d = diskMap.get(k); console.log(`  ✗ 盘上没人认领：${d.file}:${d.line}  ${d.ctx ? d.ctx + ' › ' : ''}${d.sel}  ${d.prop}: …${d.tok}… —— 新增间距要交代它属于哪一档（A 视口比例 / B 行距派生 / C 纯块间距·已上格 / X 在册偏差）`); vbad++; }
for (const k of phantom){ const r = regMap.get(k); console.log(`  ✗ 注册表里有一条盘上找不到：${r[0]}  ${r[1] ? r[1] + ' › ' : ''}${r[2]}  ${r[3]}: ${r[4]}（登记为 ${r[5]}）—— 值被改了或那一枚没了，注册表在过期`); vbad++; }
/* needle 的另一半（放在对账之后，免得它顶掉真正的原因）：盘上扫不到这一枚，要么扫描器坏了、要么那一行没了 */
if (!disk.some(d => key(d) === NEEDLE_KEY)){ console.log(`  ✗ 盘上扫不到 needle 那一条（${NEEDLE[0]} ${NEEDLE[2]} ${NEEDLE[3]}:${NEEDLE[4]}）—— 扫描器坏了、那一行没了，或者它被人挪下了格子`); vbad++; }

/* 判据②：C 档在册值必须是 8 的倍数；X 档必须不是（是就说明它该转 C，两边都得由人签字） */
const tierCount = { A: 0, B: 0, C: 0, X: 0 };
for (const r of REGISTRY){
  tierCount[r[5]] = (tierCount[r[5]] || 0) + 1;
  const n = NUM(r[4]);
  if (r[5] === 'C'){
    if (n === null){ console.log(`  ✗ C 档在册值不是固定 px：${r[0]} ${r[2]} ${r[3]} ${r[4]} —— C 只收固定 px`); vbad++; }
    else if (n % 8 !== 0){ console.log(`  ✗ C 档在册值不在 8 的格子上：${r[0]} ${r[1] ? r[1] + ' › ' : ''}${r[2]}  ${r[3]}: ${r[4]} —— 要么它本就是 X（§4 说了不全站过一遍），要么这枚数被人挪 off 了格子`); vbad++; }
  }
  if (r[5] === 'X'){
    if (n === null){ console.log(`  ✗ X 档在册值不是固定 px：${r[0]} ${r[2]} ${r[3]} ${r[4]} —— X 只收"纯块间距里的固定 px 且未上格"`); vbad++; }
    else if (n % 8 === 0){ console.log(`  ✗ X 档里这一枚已经在格子上了：${r[0]} ${r[2]} ${r[3]}: ${r[4]} —— 该转 C 并同步两枚登记值`); vbad++; }
  }
  if (r[5] === 'A' && !(hasVp(r[4]) || isVar(r[4]))){ console.log(`  ✗ A 档在册值不是视口比例：${r[0]} ${r[2]} ${r[3]}: ${r[4]}`); vbad++; }
  if (r[5] === 'B' && n === null){ console.log(`  ✗ B 档在册值不是固定 px：${r[0]} ${r[2]} ${r[3]}: ${r[4]} —— 行距派生讲的是 px 跟行盒走，em 那类本来就跟着字号、不在认领范围`); vbad++; }
}
for (const t of Object.keys(REGISTERED)){
  if (tierCount[t] !== REGISTERED[t]){ console.log(`  ✗ ${TIERS[t]} 档在册 ${tierCount[t] ?? 0} 枚、规范登记值 ${REGISTERED[t]} 枚 —— §4/§16 那个数与这份判据对不上了（三处同源）`); vbad++; }
}
bad += vbad;   /* 全局退出码仍旧收三族之和：本族旗标分家，rc 语义不分家 */

/* ---------- 第三族对账：横向间距槽位（判据⑤两侧认领 ＋ ⑥逐档枚数 ＋ ⑦状态档不混 ＋ ⑧逻辑写法）---------- */
/* ⚠️ 与垂直那一本同构，但它是**独立的一本账**：键、注册表、档位计数都不与垂直那 144 枚共享任何一条记录，
   所以本卡立完之后垂直那 144 枚与圆角那 32 枚／12 种的逐位读数不变（红了也只红在这一本上）。 */
let hbad = 0;
const hregMap = new Map(), hdiskMap = new Map();
for (const r of HREGISTRY){ const k = rkey(r); if (hregMap.has(k)){ console.log(`  ✗ 横向注册表里 ${k} 写了两遍 —— 认领关系不再是一一对应`); hbad++; } hregMap.set(k, r); }
for (const d of hdisk){ const k = key(d); if (hdiskMap.has(k)){ console.log(`  ✗ 盘上 ${d.file} ${d.sel} ${d.prop} 的 ${d.tok} 扫出两枚同键横槽（:${d.line} 与 :${hdiskMap.get(k).line}）—— 键不够用，得把上下文加进去`); hbad++; } hdiskMap.set(k, d); }
const hunclaimed = [...hdiskMap.keys()].filter(k => !hregMap.has(k));
const hphantom = [...hregMap.keys()].filter(k => !hdiskMap.has(k));
for (const k of hunclaimed){ const d = hdiskMap.get(k); console.log(`  ✗ 盘上没人认领的横槽：${d.file}:${d.line}  ${d.ctx ? d.ctx + ' › ' : ''}${d.sel}  ${d.prop}: …${d.tok}… —— 新增横向间距（左右内垫／左右外边距／列距／逐行错位）要交代它属于哪一档（A 视口比例 / C 纯块间距·已上格 / X 纯块间距·在册偏差 / H 悬停位移·状态态；B 行距派生这一本不收）`); hbad++; }
for (const k of hphantom){ const r = hregMap.get(k); console.log(`  ✗ 横向注册表里有一条盘上找不到：${r[0]}  ${r[1] ? r[1] + ' › ' : ''}${r[2]}  ${r[3]}: ${r[4]}（登记为 ${HTIERS[r[5]] || r[5]}）—— 值被改了或那一枚没了，注册表在过期`); hbad++; }
/* 盘侧 needle 排在认领之后（同一族的老规矩：别让它顶掉真正的原因）。四枚形状各一枚，坏哪一只眼点哪一枚。 */
for (const nk of HNEEDLE_KEYS){
  if (!hdisk.some(d => key(d) === nk)){ console.log(`  ✗ 盘上扫不到横向 needle 那一条（${nk.split('|').slice(0, 4).join(' ')}）—— 扫描器坏了、那一行没了，或者它被挪出了 HPROPS`); hbad++; }
}
/* 判据⑥：逐档计数 ＋ 判据⑦：状态档与静态档不许混（两个方向都拦） */
const hTierCount = { A: 0, B: 0, C: 0, X: 0, H: 0 };
for (const r of HREGISTRY){
  hTierCount[r[5]] = (hTierCount[r[5]] || 0) + 1;
  const n = NUM(r[4]);
  const where = `${r[0]}  ${r[1] ? r[1] + ' › ' : ''}${r[2]}  ${r[3]}: ${r[4]}`;
  if (!HTIERS[r[5]]){ console.log(`  ✗ 横向注册表里这一条的档位 ${r[5]} 不在横表的档名里（${where}）—— 只有 A／B／C／X／H 五个字，造档要连本文件头与 §4 一起改`); hbad++; }
  if (isStateful(r[1], r[2]) && r[5] !== 'H'){ console.log(`  ✗ 状态态槽位登记成了静态档：${where} 记的是 ${r[5]} —— 判据⑦：带 :hover／:focus／:active／:target 的那一族改的横槽只能落 H，混进 C／X 等于给悬停位移发一张版面身份证`); hbad++; }
  if (!isStateful(r[1], r[2]) && r[5] === 'H'){ console.log(`  ✗ 静态缩进被塞进悬停那一档：${where} —— 判据⑦ 的反面：H 不是免检通道，逐行错位那种静态缩进不许并进 H 去躲格子判定`); hbad++; }
  if (r[5] === 'B'){ console.log(`  ✗ 横向这一本不收 B 档（${where}）—— "行与行之间"按定义是垂直量，横表里 B 恒 0 枚（理由在文件头那一段）`); hbad++; }
  if (r[5] === 'C'){
    if (n === null){ console.log(`  ✗ 横向 C 档在册值不是固定 px：${where} —— C 只收固定 px`); hbad++; }
    else if (n % 8 !== 0){ console.log(`  ✗ 横向 C 档在册值不在 8 的格子上：${where} —— 要么它本就是 X，要么这枚数被人挪 off 了格子`); hbad++; }
  }
  if (r[5] === 'X'){
    if (n === null){ console.log(`  ✗ 横向 X 档在册值不是固定 px：${where} —— X 只收"纯块横向间距里的固定 px 且未上格"`); hbad++; }
    else if (n % 8 === 0){ console.log(`  ✗ 横向 X 档里这一枚已经在格子上了：${where} —— 该转 C 并同步两枚登记值`); hbad++; }
  }
  if (r[5] === 'A' && !(hasVp(r[4]) || isVar(r[4]))){ console.log(`  ✗ 横向 A 档在册值不是视口比例：${where}`); hbad++; }
  if (r[5] === 'H' && n === null){ console.log(`  ✗ 横向 H 档在册值不是固定 px：${where} —— 悬停位移登记的是一次过渡的终点，今天只收固定 px（em／vh 那类要位移就先改口径）`); hbad++; }
}
for (const t of Object.keys(H_REGISTERED)){
  if (hTierCount[t] !== H_REGISTERED[t]){ console.log(`  ✗ ${HTIERS[t]} 档横向在册 ${hTierCount[t] ?? 0} 枚、登记值 ${H_REGISTERED[t]} 枚 —— §4 那本间距账（横向这一条）与本文件的字面量对不上了（四处同源，动一处必红）`); hbad++; }
}
const hSum = Object.values(H_REGISTERED).reduce((s, v) => s + v, 0);
if (hSum !== HREGISTRY.length){ console.log(`  ✗ 横向五档登记值相加是 ${hSum} 枚、HREGISTRY 有 ${HREGISTRY.length} 条 —— 总数与逐档两处不同源`); hbad++; }
if (hdisk.length !== HREGISTRY.length){ console.log(`  ✗ 盘上扫到 ${hdisk.length} 枚横向槽位、注册表认了 ${HREGISTRY.length} 枚 —— 两头不是同一本账（认领关系必须一一对应）`); hbad++; }
/* 判据⑧：逻辑写法不认领、但冒出来就红（它是 margin-left／padding-left 的另一副面孔，任它过就是免检门） */
for (const d of logicalHorizontal()){ console.log(`  ✗ 横向尺子的属性集不收逻辑写法，可盘上有它：${d.file}:${d.line}  ${d.ctx ? d.ctx + ' › ' : ''}${d.sel}  ${d.prop}: ${d.value} —— 判据⑧：要么改成 margin-left／padding-left 那一族物理属性（进账、签字），要么改口径（连文件头那段与 §4 一起动），不许让它从两把间距尺中间静默滑过去`); hbad++; }
bad += hbad;

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
/* 旗标读 vbad（本族那本账），不读 bad（三族之和）：横向或圆角红的时候这一行仍是 ✓，见上面「对账」那一格的注释 */
console.log(`  ${vbad ? '✗' : '✓'} 扫了 ${new Set(disk.map(d => d.file)).size} 份样式表共 ${disk.length} 枚垂直间距槽位` +
  `（固定 px ${pxN} / 视口比例 ${disk.length - pxN}），认领 ${disk.length - unclaimed.length} 枚、无人认领 ${unclaimed.length} 枚、注册表过期 ${phantom.length} 条`);
for (const t of ['A', 'B', 'C', 'X']) console.log(`    ${TIERS[t].padEnd(12)} 在册 ${String(tierCount[t] ?? 0).padStart(3)} 枚（登记值 ${REGISTERED[t]}）`);
const byFile = {};
for (const d of disk) byFile[d.file] = (byFile[d.file] || 0) + 1;
console.log('    逐份：' + FILES.filter(f => byFile[f]).map(f => `${f} ${byFile[f]}`).join(' / '));
const xv = {};
for (const r of REGISTRY) if (r[5] === 'X') xv[r[4]] = (xv[r[4]] || 0) + 1;
const xnum = t => { const n = NUM(t); return n === null ? 0 : Math.abs(n); };
console.log('    在册偏差（X）按值（枚数降序、同数按 |+px| 降序）：' + Object.entries(xv).sort((a, b) => (b[1] - a[1]) || (xnum(b[0]) - xnum(a[0]))).map(([v, n]) => `${v}×${n}`).join(' '));

/* 横向那一本的对账句（现在时，每次跑都打印）：扫了几枚／认领几枚／无人认领几枚／注册表过期几条，
   再加逐档（A／B／C／X／H）与逐份。口径与垂直那一句逐字同构，只是"槽位"取的是每一条声明的左右那一半。 */
console.log('\n=== 横向间距槽（本卡 `v11b/hgap` 新立：margin/padding 的左右两半 ＋ column-gap ＋ gap 的列距）===');
const hpxN = hdisk.filter(d => d.kind === 'px').length;
/* 旗标读 hbad（本族那本账）：垂直或圆角红的时候这一行仍是 ✓ —— 与上面垂直那一行同一条规矩 */
console.log(`  ${hbad ? '✗' : '✓'} 扫了 ${new Set(hdisk.map(d => d.file)).size} 份样式表共 ${hdisk.length} 枚横向间距槽位` +
  `（固定 px ${hpxN} / 视口比例 ${hdisk.length - hpxN}），认领 ${hdisk.length - hunclaimed.length} 枚、无人认领 ${hunclaimed.length} 枚、注册表过期 ${hphantom.length} 条`);
for (const t of ['A', 'B', 'C', 'X', 'H']) console.log(`    ${HTIERS[t].padEnd(14)} 在册 ${String(hTierCount[t] ?? 0).padStart(3)} 枚（登记值 ${H_REGISTERED[t]}）`);
console.log('    逐档相加＝' + ['A', 'B', 'C', 'X', 'H'].map(t => `${t}${hTierCount[t] ?? 0}`).join('／') + `＝${hdisk.length} 枚 ／ 注册表 ${HREGISTRY.length} 条 ／ 登记总数 ${hSum} 枚`);
const hByFile = {};
for (const d of hdisk) hByFile[d.file] = (hByFile[d.file] || 0) + 1;
console.log('    逐份：' + FILES.filter(f => hByFile[f]).map(f => `${f} ${hByFile[f]}`).join(' / '));
const hv = {};
for (const r of HREGISTRY) if (r[5] === 'X') hv[r[4]] = (hv[r[4]] || 0) + 1;
console.log('    在册偏差（X）按值（枚数降序、同数按 |+px| 降序）：' + Object.entries(hv).sort((a, b) => (b[1] - a[1]) || (xnum(b[0]) - xnum(a[0]))).map(([v, n]) => `${v}×${n}`).join(' '));
const hsrc = {};
for (const d of hdisk) hsrc[HLONGHAND.includes(d.prop) ? '长手（margin-left／padding-left／column-gap…）' : '简写分量（margin／padding／gap 的左右那一半）'] = (hsrc[HLONGHAND.includes(d.prop) ? '长手（margin-left／padding-left／column-gap…）' : '简写分量（margin／padding／gap 的左右那一半）'] || 0) + 1;
console.log('    按来源：' + Object.entries(hsrc).map(([k, n]) => `${k} ${n} 枚`).join(' / '));

/* 圆角那一族的全绿也要看得见数：命中枚数／种数／逐档（盘上/登记）／逐份 */
console.log('\n=== 圆角梯子（§4 那根 11 档 ＋ 一枚抹平的 0，两把尺两张表）===');
/* 旗标读 rbad（本族那本账）：两本间距账红的时候这一行仍是 ✓ —— 三行汇总三族各自说话 */
console.log(`  ${rbad ? '✗' : '✓'} 扫了 ${new Set(rdisk.map(d => d.file)).size} 份样式表共 ${rdisk.length} 枚 ${RPROP} 字面` +
  `（${rKinds} 种写法），认领 ${rdisk.length - runclaimed.length} 枚、无人认领 ${runclaimed.length} 枚、注册表过期 ${rphantom.length} 条`);
console.log('    逐档（§4 顺序，从小到大；盘上扫到/梯子登记）：' + RADIUS_LADDER.map(l => `${l[0]} ${rDiskN[l[0]] ?? 0}/${l[1]}`).join('  '));
console.log('    档名（梯子上的说法）：' + RADIUS_LADDER.map(l => `${l[0]}=${l[2]}×${l[1]}`).join('  '));
const rByFile = {};
for (const d of rdisk) rByFile[d.file] = (rByFile[d.file] || 0) + 1;
console.log('    逐份：' + FILES.filter(f => rByFile[f]).map(f => `${f} ${rByFile[f]}`).join(' / '));
console.log(`    总数与种数的登记值：${RADIUS_REGISTERED.hits} 枚 / ${RADIUS_REGISTERED.kinds} 种（梯子逐档相加 ${ladderSum} 枚）`);

/* ---------- 第四格：抄进 CSS 注释里的账本现值（判据⑨⑩⑪，2026-10-03 本卡 `v11h1/numtooth`）---------- */
/* 口径全文在文件头"第四格"那一段（⑨抄本⇄实值／⑩分解求和与逐档／⑪失去靶就红＋处数登记值）。这里只写实现的两处规矩：
   ① 读的是 **raw**（剥注释之前的那一份）——`strip()` 一剥这一格就没靶了，抄本恰恰全在注释里；
   ② 模式族只吃紧邻的现在时陈述「垂直 144 枚」「横向 86 枚（A6／B0／C25／X54／H1）」，另吃 mistwood.css:718 那种
      「归横向那本（86 枚，…）」的同位写法（`那本（` 那一小段）；带"那 N 枚"的过去时旧账句（base.css:579 那 143 枚、
      essay.css:221 那 143 枚＋X67 分解）按口径不在靶里，一字不改，也不许被这一格打成红。
   ⚠️ 只扫 `src/styles/`：模式族不许走到 docs/**，不把 dist/、docs/ 里任何句子拉进来比对（规范那一格的账归规范）。
   ⚠️ 旗标读 cbad（本格那本账）：与上面三行汇总同一条规矩，别让它冤枉另一本账。 */
const COPY_RE = /(垂直|横向|圆角)(那本[（(])?[ \t]*([0-9]+)[ \t]*枚(?:[ \t]*[（(]([ABCXH][0-9]+(?:[／/][ABCXH][0-9]+)+)[）)])?/g;
function copyStatements(){
  const dir = join(ROOT, 'src', 'styles');
  const out = [];
  for (const f of readdirSync(dir).filter(n => n.endsWith('.css')).sort((a, b) => FILES.indexOf(a) - FILES.indexOf(b))){
    const raw = readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n');   /* raw ＝含注释原文的那一份 */
    for (const m of raw.matchAll(COPY_RE)){
      out.push({ file: f, line: raw.slice(0, m.index).split('\n').length, ledger: m[1], n: Number(m[3]), bd: m[4] || null });
    }
  }
  return out;
}
const LEDGERS = {
  垂直: { real: disk.length, tiers: tierCount, keys: ['A', 'B', 'C', 'X'] },
  横向: { real: hdisk.length, tiers: hTierCount, keys: ['A', 'B', 'C', 'X', 'H'] },
  圆角: { real: rdisk.length, tiers: null, keys: [] },
};
const tierRead = o => Object.keys(o).map(t => `${t}${o[t]}`).join('／');
let cbad = 0;
const copies = copyStatements();
for (const c of copies){
  const L = LEDGERS[c.ledger];
  const where = `src/styles/${c.file}:${c.line}`;
  const said = `${c.ledger} ${c.n} 枚` + (c.bd ? `（${c.bd}）` : '');
  if (c.n !== L.real){ console.log(`  ✗ 抄本过期：${where} 那句「${said}」写的是 ${c.n} 枚、本工具实算${c.ledger}那一本是 ${L.real} 枚 —— 账本改了现值而抄着它的注释没跟着改（判据⑨：这一格就是拦这个）`); cbad++; }
  if (!c.bd) continue;
  const items = c.bd.split(/[／/]/).map(s => [s[0], Number(s.slice(1))]);
  const sum = items.reduce((s, [, v]) => s + v, 0);
  if (!L.tiers){ console.log(`  ✗ 抄本带错了分解：${where} 那句「${said}」—— 圆角那一本的账是「多少枚／多少种写法」，没有 A／B／C／X 那种档位可分解（判据⑩）`); cbad++; continue; }
  if (sum !== c.n){ console.log(`  ✗ 抄本的分解求和对不上：${where} 那句「${said}」逐档相加是 ${sum} 枚、同一处写的总数是 ${c.n} 枚（判据⑩：总数与分解两处得说同一句话）`); cbad++; }
  for (const [t, v] of items){
    if (!(t in L.tiers)){ console.log(`  ✗ 抄本里冒出一档 ${t}：${where} 那句「${said}」—— ${c.ledger}那一本只有 ${L.keys.join('／')} 这几档（判据⑩）`); cbad++; continue; }
    if (L.tiers[t] !== v){ console.log(`  ✗ 抄本的逐档读数过期：${where} 那句「${said}」里 ${t} 档写的是 ${v} 枚、本工具实算 ${L.tiers[t]} 枚 —— 总数没写错而分解写错也红（判据⑩）`); cbad++; }
  }
}
/* 判据⑪：失去靶就红（fail closed）。这一条不许省，也不许退成"零处 ⇒ 静默绿"——本仓踩过一次
   「尺子没有靶了还一路绿」（font-fallback-check --gate 那一轮）；处数还被钉成 COPY_STATEMENTS 那枚独立字面量，
   新增抄本要显式改它，改写法绕过就红在处数上。 */
if (!copies.length){ console.log(`  ✗ src/styles/ 里一处「陈述账本总数」的抄本都没扫到 —— 第四格判据正在空转（扫到 0 处 ⇒ 红，不是静默绿；失去靶这一族见文件头判据⑪ 与 ${COPY_STATEMENTS} 那枚登记值）`); cbad++; }
else if (copies.length !== COPY_STATEMENTS){ console.log(`  ✗ 扫到 ${copies.length} 处抄本陈述、本文件登记的处数是 ${COPY_STATEMENTS} 处 —— 处数是一枚独立字面量（三处同源之一）：新增抄本要显式改那个数，少了就是有人把某处换成了这一格吃不到的写法`); cbad++; }
const copyByLedger = { 垂直: 0, 横向: 0, 圆角: 0 };
for (const c of copies) copyByLedger[c.ledger]++;
/* 汇总句的三种说话：零处＝失去靶（不许写成"逐处等于实值"那种恒绿样子），有过期处＝点名它，全对＝现在时的"逐处等于实值" */
const copyVerdict = !copies.length ? '判据失去靶（零处抄本，红的是上面那一格空转）—— 本工具实算的是'
  : cbad ? '其中有过期处 —— 本工具实算的是' : '逐处等于实值：';
console.log('\n=== 注释抄本（第四格，本卡 `v11h1/numtooth` 新立：src/styles/*.css 的注释里那些「垂直 N 枚／横向 N 枚／圆角 N 枚」的句子 ⇄ 本工具实算）===');
console.log(`  ${cbad ? '✗' : '✓'} 扫了 ${new Set(copies.map(c => c.file)).size} 份样式表共 ${copies.length} 处抄本陈述` +
  `（垂直 ${copyByLedger.垂直} ／横向 ${copyByLedger.横向} ／圆角 ${copyByLedger.圆角}，登记值 ${COPY_STATEMENTS} 处），` +
  `${copyVerdict}垂直 ${disk.length} 枚（${tierRead(tierCount)}）／横向 ${hdisk.length} 枚（${tierRead(hTierCount)}）／圆角 ${rdisk.length} 枚 ${rKinds} 种`);
console.log('    抄本落点：' + (copies.map(c => `${c.file}:${c.line}`).join(' ') || '（零处）'));
bad += cbad;
if (args.includes('--list')){
  console.log('\n=== 整张量表（--list）===');
  const sorted = [...disk].sort((a, b) => (FILES.indexOf(a.file) - FILES.indexOf(b.file)) || (a.line - b.line));
  for (const d of sorted){
    const r = regMap.get(key(d));
    console.log(`${(r ? TIERS[r[5]] : '未认领').padEnd(14)} ${d.file}:${String(d.line).padEnd(4)} ${(d.ctx ? d.ctx + ' › ' : '') + d.sel}  ${d.prop}: ${d.value} → ${d.tok}${r ? '   ｜ ' + r[6] : ''}`);
  }
  console.log('\n=== 整张横向间距表（--list，第三族）===');
  const hsorted = [...hdisk].sort((a, b) => (FILES.indexOf(a.file) - FILES.indexOf(b.file)) || (a.line - b.line));
  for (const d of hsorted){
    const r = hregMap.get(key(d));
    console.log(`${(r ? HTIERS[r[5]] : '未认领').padEnd(16)} ${d.file}:${String(d.line).padEnd(4)} ${(d.ctx ? d.ctx + ' › ' : '') + d.sel}  ${d.prop}: ${d.value} → ${d.tok}${r ? '   ｜ ' + r[6] : ''}`);
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
console.log(`✓ 横向间距落档对齐：盘上 ${hdisk.length} 枚横槽（左右内垫／左右外边距／列距／gap 的列那一半）全在册、逐档枚数与登记一致，` +
  `无人认领 ${hunclaimed.length} 枚、注册表过期 ${hphantom.length} 条、逻辑写法 ${logicalHorizontal().length} 条——下一张卡那种逐行横向错位冒出来就红，不再是"一概不看"那一句放过去的那种静默`);
console.log(`✓ 圆角落档对齐：盘上 ${rdisk.length} 枚 ${RPROP} 字面（${rKinds} 种写法）全在梯子上、逐档枚数与登记一致，梯子外零冒新写法`);
console.log(`✓ 注释抄本对齐：src/styles/ 的注释里 ${copies.length} 处陈述三本账总数的句子（登记值 ${COPY_STATEMENTS} 处）逐处等于实值` +
  `——垂直 ${disk.length} 枚／横向 ${hdisk.length} 枚／圆角 ${rdisk.length} 枚，带括号分解那几处的求和与逐档读数也同源；` +
  `下一轮谁把账本现值改了而抄在注释里的那句没跟着改，就红在这一格上`);
