# mistwood · 晨雾森林

一个人的静态博客。Astro 7 构建期渲染，产物是纯静态文件，没有服务端、没有数据库、没有访问统计——关于页上那句"拿不到访客数"是实话，不是谦虚。

线上地址：**https://alyssumira.living-the.life**（同一份产物另有一枚镜像 `https://alyssumira.pages.dev`，它是上面那条域名的 CNAME 目标，不是"旧地址"）

- 视觉与写作的规矩：[`docs/设计规范.md`](docs/设计规范.md)（这份是权威，改效果先改它）
- 部署与复现：[`docs/部署与复现.md`](docs/部署与复现.md)
- 界面优化的提案与取舍：[`docs/美化建议.md`](docs/美化建议.md)

---

## 跑起来

需要 Node **≥ 22.12**（`astro` 7.3.5 的 `engines` 下限）。

```bash
npm install
npm run dev          # http://localhost:4321
```

## 写一篇稿子

```bash
npm run new-post -- fog-debugging "雾天调试法" --date 2026.09.27 --excerpt "一句话摘要"
```

（`slug` 与标题是位置参数，其余可选；它会顺手校验 slug 不撞已有稿件、不占用分页那批保留字。）

正文是受限的 Markdown：只认在册的那批形状（段落、`##`／`###`、**粗体**、`*斜体*`、行内代码、围栏代码块、链接、站内图片、列表、引用、脚注、表格）。想加新语法要先动渲染器和规范，不然写了不上屏。

front matter 里除 `title`／`date` 之外全部可空，**没填的那一行整行不出现**——不会留一个空位给你看：

| 键 | 用途 |
|---|---|
| `excerpt` | 列表页那两行摘要 |
| `cover` | 卡片封面（站内路径，指到 `public/` 下的真文件） |
| `category` / `tags` / `series` | 分类、标签、系列（`/categories/`、`/tags/`、`/series/` 三族页面的数据源） |
| `draft` | `true` ⇒ 不进产物、不进 feed、不进搜索索引 |
| `pinned` | 列表置顶 |
| `unlisted` | 发了但站内零指向：页面在、地址活、导航与列表里没有它 |
| `aliases` | 旧地址：为每一条生成一枚跳转页 |
| `author` / `sourceLink` / `licenseName` / `licenseUrl` | 详情页文末那一行转载许可，四枚都可空 |
| `hour` | 写这篇文章的时刻（0–23）：填了，详情页才多落一行"写于一个九月的傍晚"；空着那一行不出现 |

图片放进 `public/`，正文里用站内相对路径引用；构建期会把固有宽高读进 `<img>`，所以不必手写 `width`／`height`。

## 改动过之后先跑这两个

```bash
npm run check        # 八项源码级判断：稿件规矩 / 渲染器 / 色板一处真值 / 时段与月相 / 间距与圆角梯子 / 分类族 / 媒体存在性 / 字体子集
npm run gate         # 完整十二步：check ＋ build ＋ 十步产物级对账（含两把要起浏览器的尺子）
npm run selftest     # 给判据喂坏数据，自证那八格"有牙"（不接进 gate，故意）
```

`gate` 里有一步会起真浏览器读产物的运行时 DOM。本机用哪一枚浏览器由 `tools/browser-bin.mjs` 现场探（判据是能力探针，不是"文件在不在"）；要指定就传 `--browser=<路径>` 或设 `MISTWOOD_BROWSER`。

产物里的绝对地址由一枚开关决定，**没给就还是那枚占位域名**：

```bash
PUBLIC_SITE=https://你的域名 npm run build
```

上线那一次的顺序在 `docs/部署与复现.md` §3.13 第 ⑥ 格钉死了，别照着本 README 临场发挥。

## 仓库形状

```
src/pages/       路由与机器侧产物（rss.xml / atom.xml / search.json / llms.txt / robots.txt / sitemap）
src/lib/         纯函数：稿件读取、分类、分页、搜索切词、feed 净化、时段与月相……判据的期望值也从这里要
src/styles/      四层样式表，色板只在 base.css 一处
src/content/     稿件
tools/           门禁尺子与新稿脚手架，一把尺子一个文件
public/          原样进 dist/：字体子集、图片、逐篇社交卡
```

## 致谢

Firefly（`CuteLeaf/Firefly`）、qiyuan、xg-blog 这几位站主的源码读过，抄之前先想清楚了哪些不该抄——取舍都记在 `docs/` 里。
