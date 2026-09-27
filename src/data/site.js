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
