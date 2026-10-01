/* 字体清单只写这一份：Layout 从它拼出 Google Fonts 的请求 URL，关于页的"站点档案"列的是同一批条目。
   以前 URL 手写在工作流里、档案再抄一遍，加一个字体要改两处，迟早对不上。
   q 是 css2 的 family= 查询片段，逐字符照原 URL，别顺手"美化"——改了就是换字体。
   ⚠️ `self: true` ＝这一族不走 css2，改走站内自托管（表在 base.css，文件在 public/fonts/**，
   清单与 SHA256 在册 tools/font-selfhost.manifest.json；CJK 两族是 2026-09-30 `card/cjk-subset` 打上这面旗的——
   子集那两枚的清单与复验在 tools/font-subset.manifest.json / font-subset.mjs，规范 §3.3 与 §12「随滚动微调字重」格）。
   拼 URL 只吃没有这面旗的条目；
   条目本身留在清单里是因为关于页档案列的是**同一批字体**，不是"远程的那批"。 */
export const FONT_HOST = process.env.FONT_HOST || 'https://fonts.loli.net';
/* FONT_HOST 是构建期开关：给了环境变量就用它，没给就用上面这枚默认值（本机那条被证书拦住的路，§3 钉着）。
   它只管 css2 那张表在哪儿——字体文件在哪儿由下面那张映射表从它算，两枚一起换。 */

/* 字体文件的域名从 FONT_HOST 派生，不许是第二枚独立常量：css2 返回的那张 @font-face 表里，src 指的是
   另一枚 host，preconnect 连错就等于白连。换镜像时两枚必须一起换，所以配对写死在这张显式表里，
   派生值 = FONT_FILE_HOSTS[FONT_HOST]。表里没有的 host 当场 throw——猜一份对应关系，拼出来的就是
   "镜像的 CSS ＋ 源站的字体文件"那种从未验证过的配对；静默退回默认更糟，它会绿着骗过构建。
   新增一档镜像：把它的字体文件 host 一并登记进来，别改判据。 */
export const FONT_FILE_HOSTS = {
  'https://fonts.loli.net': 'https://gstatic.loli.net',
  'https://fonts.googleapis.com': 'https://fonts.gstatic.com',
};
const fontFileHost = FONT_FILE_HOSTS[FONT_HOST];
if (fontFileHost === undefined) {
  throw new Error(
    `FONT_HOST = ${FONT_HOST} 没有登记在 src/data/site.js 的字体文件域名映射表里，` +
    `无法派生 <link rel="preconnect"> 的第二枚 host（已登记：${Object.keys(FONT_FILE_HOSTS).join(' / ')}）。` +
    `要么把这枚镜像的字体文件 host 加进 FONT_FILE_HOSTS，要么把 FONT_HOST 换回已登记的那两枚之一——不猜，也不退回默认。`
  );
}
export const FONT_FILE_HOST = fontFileHost;

/* 作者名（§13a 结构化数据里 Person 那一格要它）：站名与 GitHub 用户名是同一个字面量，大小写有据——
   那笔账（账号接口回的 login）登记在 docs/设计规范.md §13 与 about.astro 那枚 const 的注释里。
   ⚠️ 这一枚是**新增的第二处独立字面量**：首页 `.hero-name`（index.astro，本轮在禁碰清单里）还写着自己的份，
   关于页那枚 const 只是把它藏在 URL 尾巴上。本轮不折它们，只保证 JSON-LD 这一格有出处——
   下一轮收编时改这里，别在 Seo.astro 里再抄一串。
   ⚠️ Person 不写 sameAs：那要第二次落 GitHub 那枚地址，而 §13 登记的是"全站只有一处 GitHub 地址"
   （about.astro:10）。等哪一轮把那枚 const 折进这份文件，sameAs 再挂——别在这里先开第二处真值。 */
export const AUTHOR = 'Alyssumira';

/* 写信的那枚地址（第十八轮 `card/reading2`，F6 顺带结掉的一枚 §13a 欠账）：
   原先它是 `src/pages/about.astro:20` 的一枚**局部 const**，而详情页那枚"写信回应这一篇"要是也用它，
   就得在那一页再抄一遍——两枚同一个邮箱、两种写法，迟早有一处改了没人知道，
   这正是 §13a 那句"抄的那份改了没人知道"点名的家族（`GITHUB` 那一枚还在 about.astro 里，
   因为今天只有它一个消费者；多一处消费者时就按这一格收编，别抄）。
   ⚠️ 存的是**整枚 `mailto:` 地址**而不是裸邮箱名：两枚消费者要的本来就是同一枚能点的 href，
      拆开成"地址 + 各页自己拼 `mailto:`"就是把同一件事放回两处（F6 那一枚还要在后面接 `?subject=`）。
   ⚠️ 空着 ⇒ 两处的"写信"都整块不出现（§14 那条"没填 ⇒ 不出现"，与 `BIRTH_DATE` 同一个口径：
      宁可少一项，不多一项；`href=""` 那是一枚看着能点、点了停在原地的活壳）。判据在
      `tools/reading-check.mjs`：源码里这枚字面量**只许出现一次**，第二处抄的一改就过期。 */
export const EMAIL = 'mailto:chidanta_suki@qq.com';

/* 出生日（`card/lifegrid`，关于页"一生格子"那一格的唯一载体）：**没有默认值**——空串就是没登记。
   ⚠️ 为什么这里不许躺着一枚占位日期：那一页要画的每一格都由「出生日 ＋ 构建日」两枚输入复算出来
      （`src/lib/lifegrid.js`），起点是编的，整片格子就是一幅假地图——与 §12「编一个访问量」同族，
      只不过这次被编的是作者自己的年纪。
   ⚠️ 读不到 ⇒ 关于页那一块**一格都不画**，连"第 0 年"都不出现（口径照 §12 那条"载入次数读不到时整行不出现"，
      不许退回 0 那种假值）。空态那句话写在 `src/pages/about.astro`，今天页面上看到的就是它。
   写法：`YYYY-MM-DD` 或 `YYYY.MM.DD`，只到日（站里所有日期都是这一族写法）；
   不合法的日历日（`2026-02-30`）与还没到的那一天都按"没登记"处理，判据在 `parseBirth()`。
   ⚠️ 也不走环境变量：这一枚进的是**内容**，让产物取决于构建机的 env 等于给同一份源码两种长相
      （`FONT_HOST` 那枚开关管的是镜像地址，不是站里要说出口的话——别把这一行往那个方向改）。 */
export const BIRTH_DATE = '';

export const fonts = [
  { name: 'Fraunces',      q: 'Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400', self: true },
  { name: 'Noto Serif SC', q: 'Noto+Serif+SC:wght@400;600;700', self: true },
  { name: 'Noto Sans SC',  q: 'Noto+Sans+SC:wght@400;500', self: true },
  { name: 'IBM Plex Mono', q: 'IBM+Plex+Mono:ital,wght@0,400;0,500;1,400', self: true },
];

/* 小东西与碎碎念：从旧版 assets/content.js 搬来，页面在构建期读它 */
export const things = [
  {
    "name": "白噪声收音机",
    "tag": "web · toy",
    "link": "#",
    "shot": ""
  },
  {
    "name": "番茄钟 · 苔",
    "tag": "pwa",
    "link": "#",
    "shot": ""
  },
  {
    "name": "书签森林",
    "tag": "self-hosted",
    "link": "#",
    "shot": ""
  },
  {
    "name": "像素天气",
    "tag": "api · toy",
    "link": "#",
    "shot": ""
  }
];

/* 小东西与碎碎念：从旧版 assets/content.js 搬来，页面在构建期读它。
   notes 的一条 = date + weather + text，另有一个可选的第四键 jieqi（节气，手填）：
   填了才出现在关于页 last walk 那一行末尾，空着就什么都不显示。
   为什么留空位而不是算出来——24 节气的间隔在 14–16 天之间且按时刻定，本地数组要么写死当年
   （明年就是死数据）要么近似；而它紧挨着的是全站唯一承诺"分钟级真实"的那口时钟（§6）。
   这一格是手记，不是天文台。 */
export const notes = [
  {
    "date": "2026.09.25",
    "weather": "light rain",
    "text": "雨后的人行道反着光，走路像在翻一本没裁开的书。"
  },
  {
    "date": "2026.09.21",
    "weather": "fog",
    "text": "今天把网站的雾灯做出来了。光标照到哪里，哪里的雾就散开——原来*清晰*也是可以被提着走的。"
  },
  {
    "date": "2026.09.18",
    "weather": "light",
    "text": "楼下的桂花开了半树。另一半大概是想清楚了再开。"
  }
];
