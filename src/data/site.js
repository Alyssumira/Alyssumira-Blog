/* 字体清单只写这一份：Layout 从它拼出 Google Fonts 的请求 URL，关于页的"站点档案"列的是同一批条目。
   以前 URL 手写在工作流里、档案再抄一遍，加一个字体要改两处，迟早对不上。
   q 是 css2 的 family= 查询片段，逐字符照原 URL，别顺手"美化"——改了就是换字体。 */
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

export const fonts = [
  { name: 'Fraunces',      q: 'Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400' },
  { name: 'Noto Serif SC', q: 'Noto+Serif+SC:wght@400;600;700' },
  { name: 'Noto Sans SC',  q: 'Noto+Sans+SC:wght@400;500' },
  { name: 'IBM Plex Mono', q: 'IBM+Plex+Mono:ital,wght@0,400;0,500;1,400' },
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
