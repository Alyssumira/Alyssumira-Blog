/* 字体清单只写这一份：Layout 从它拼出 Google Fonts 的请求 URL，关于页的"站点档案"列的是同一批条目。
   以前 URL 手写在工作流里、档案再抄一遍，加一个字体要改两处，迟早对不上。
   q 是 css2 的 family= 查询片段，逐字符照原 URL，别顺手"美化"——改了就是换字体。 */
export const FONT_HOST = 'https://fonts.loli.net';
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
