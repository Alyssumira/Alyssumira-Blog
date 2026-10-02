import { renderMd, renderArticle, inlineMd, safe, root, splitBlocks } from '../src/lib/markdown.js';
import assert from 'node:assert/strict';

/* ---- 路径规整：详情页在 /essays/<slug>/，相对路径必须钉到站点根 ---- */
assert.equal(root('assets/fog.jpg'), '/assets/fog.jpg');
assert.equal(root('./assets/fog.jpg'), '/assets/fog.jpg');
assert.equal(root('/assets/fog.jpg'), '/assets/fog.jpg');
assert.equal(root('../assets/fog.jpg'), '/assets/fog.jpg');
assert.equal(root('things.html'), '/things/');
assert.equal(root('https://example.com/a.jpg'), 'https://example.com/a.jpg');
assert.equal(root('#sec-1'), '#sec-1');
assert.equal(root('mailto:a@b.c'), 'mailto:a@b.c');

/* ---- `/public/…` ⇄ `/…` 同义（2026-10-01 方案 C；规范 §15「路径一律钉到站点根」那一格）----
   两侧都有格子：正向钉"该剥的剥了"，反向钉"不该剥的一枚都没动"。反向那四条不是凑数——
   最省事的写法（贪剥／不要求斜杠后有东西／不分中间与开头）恰好会让它们红，
   而红的每一枚名字都是作者真可能写进稿子里的地址。 */
assert.equal(root('/public/assets/posts/x/a.jpg'), '/assets/posts/x/a.jpg', 'Obsidian 给的库根绝对路径落到站内同一处');
assert.equal(root('public/assets/posts/x/a.jpg'), '/assets/posts/x/a.jpg', '缺前导斜杠也一样：先钉根，再剥前缀');
assert.equal(root('../../public/assets/x.jpg'), '/assets/x.jpg', '相对层数吃掉之后仍剥得掉');
assert.equal(root('/public/things.html'), '/things/', '旧站 .html 那一步排在剥前缀之后，照样换成目录式 URL');
assert.equal(root('/public/public/a.jpg'), '/public/a.jpg', '只许剥第一枚：贪剥会把作者真要的那枚名字吃掉');
assert.equal(root('/assets/public/a.jpg'), '/assets/public/a.jpg', '中间位置的 public 不是前缀，一枚都不许多剥');
assert.equal(root('/public'), '/public', '光秃秃一枚不许剥——剥了就得到站点根');
assert.equal(root('/public/'), '/public/', '斜杠后面没东西就不算前缀：剥它会静默长出一枚指向首页的活锚（§15 页脚那一格忌的形状）');
assert.equal(root('https://cdn.example.com/public/a.jpg'), 'https://cdn.example.com/public/a.jpg', '远端地址一律不碰（协议短路住在剥前缀之前）');
/* 这枚同义前缀不许变成"跳出 public/"的第二条路：剥完之后必须与今天那枚越界写法逐字同串，
   于是 `tools/media-check.mjs` 与 `src/lib/image-dims.js` 那道 resolve-出界判据照旧罩得住（它们只看见一种形状） */
assert.equal(root('/public/assets/../../outside.jpg'), root('/assets/../../outside.jpg'), '带前缀的越界写法＝不带前缀那一枚，没开新出口');

const md = [
  '## 起雾的时候',
  '',
  '清晨的林子像一张没洗干净的玻璃。',
  '',
  '![雾中的林线](assets/bg-light.jpg "晨雾")',
  '',
  '也可以一段里塞两张：![甲](/a.png) 然后 ![乙](/b.png) 这样。',
  '',
  '看 [雾的来历](https://example.com/fog) 或者 [站内](/essays/slow-frontend/)，',
  '旧习惯写的 [页面](things.html) 也要能跳，',
  '坏协议要废掉：[点我](javascript:alert(1))，还有 [图](x.png"onerror="alert(2))。',
  '',
  '## 下一节',
  '',
  '结尾。',
].join('\n');

const html = renderMd(md);

assert.equal((html.match(/<figure/g) || []).length, 3, 'three figures');
assert.equal((html.match(/<\/figure>/g) || []).length, 3, 'figures closed');
assert.equal((html.match(/<figcaption/g) || []).length, 1, 'caption only for the titled image');
assert.ok(!/javascript:/.test(html), 'javascript: neutered');
assert.ok(/onerror/.test(html) === false || /&quot;onerror=&quot;/.test(html), 'quote must be escaped if it survives at all');
/* 属性注入的唯一可能是逃出引号：把所有带引号的属性值挖掉，剩下的内容里不该再有 onerror，
   且引号总数必须是偶数（每个属性值恰好贡献一对） */
const outsideAttrs = html.replace(/"[^"]*"/g, '""');
assert.ok(!/onerror/i.test(outsideAttrs), 'onerror lives only inside a quoted value, so it is inert');
assert.equal((html.match(/"/g) || []).length % 2, 0, 'quotes are balanced, nothing escaped the value');
/* ===== 一轮 §C1 的改钉（编排者 2026-10-02）=====
   下面那枚 `<a ` 计数尺、与 `H2 id = safe(原文)`／`h3 也带 id`／`同名标题第二枚拿 -2 后缀` 那三格字面，
   原样钉的其实是"**标题里不许出现 `<a>`**"，而 §C1 要发的恰恰是一枚**结构性**锚
   （形状预先签在 §15·「标题的锚点记号（一轮 §C1）」那一格：`<h2 id="x">x<a …>#</a></h2>`）——同一形状、两件事。
   改钉不等于放宽：这把尺把"作者写的链接"与"标题自己那枚锚"**分开数**，并给后者另立三条判据——
   ① 一枚标题至多一枚 `<a>`；② 那枚锚的 `href` 必须逐字等于 `#` + 它所在标题自己的 `id`（§12 那条"死锚点"禁令的正面）；
   ③ 锚的字面只有一个字符 `#`。
   ⇒ 无锚（今天）与有锚（§C1 落地那天）**两侧都要绿**；而 href 指错章、一枚标题发两枚锚、锚字面写成"链接"，当场红。
   ⚠️ 残余照登：作者若真写出一枚"字面恰好是 `#` 的站内片段链接"，会被这把尺当结构性锚摘掉计数——
   盘上那种写法今天 0 枚（`href="#"` 空片段在册 0 枚，§9 那格「井号 `#` 这枚记号在站内的归属」量过），
   而那种写法本身正是 §12 禁的死锚点。 */
function auditHeadAnchors(s, where) {
  const heads = [...s.matchAll(/<h([23]) id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/g)];
  assert.ok(heads.length > 0, `${where}：一枚标题都没读到 ⇒ 本格的三条判据在空转`);
  for (const [, lvl, id, inner] of heads) {
    const anchors = [...inner.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    assert.ok(anchors.length <= 1, `${where}：h${lvl}#${id} 里出现 ${anchors.length} 枚 <a> ⇒ 一枚标题至多一枚锚`);
    for (const [, attrs, text] of anchors) {
      assert.ok(attrs.includes(`href="#${id}"`), `${where}：h${lvl}#${id} 的锚 href 不是它自己的片段 ⇒ ${attrs}`);
      assert.equal(text, '#', `${where}：h${lvl}#${id} 的锚字面不是单个 # ⇒ ${text}`);
    }
  }
  return s.replace(/<a\b[^>]*href="#[^"]*"[^>]*>#<\/a>/g, '');
}
assert.equal((auditHeadAnchors(html, '第一轮').match(/<a /g) || []).length, 5, 'one <a> per link, breakout adds none（结构性锚先按上面那格摘掉再数；摘掉那一步承不承担判据，M5 那档变异证过）');
assert.ok(/<img src="\/assets\/bg-light\.jpg"/.test(html), 'relative image pinned to site root');
assert.ok(/<a href="\/things\/"/.test(html), 'things.html rewritten to the directory URL');
assert.ok(/<a href="https:\/\/example\.com\/fog" target="_blank" rel="noopener noreferrer">/.test(html), 'external link opens safe');
assert.ok(/<a href="\/essays\/slow-frontend\/"[^>]*>站内<\/a>/.test(html), 'root-relative link stays put, no target');
assert.ok(html.indexOf('![') === -1, 'no raw markdown survives');
assert.ok(/<p>也可以一段里塞两张：/.test(html), 'inline text keeps its paragraph');
assert.equal((html.match(/<h2 id="/g) || []).length, 2, 'two sections');
/* ⚠️ 这一格是 `card/anchors` **改掉**的旧断言，不是放宽：原句是
   `assert.ok(!/id="/.test(…<h2>[^<]*</h2>…), 'h2 ids are added by the toc script, not the parser')`
   —— 它钉的正是"id 归运行期脚本"那一件**机制缺件**（无 JS / 脚本没跑 ⇒ 深链跳不到、目录整块不存在，
   §19.3 那格同族）。今天渲染器自己发 id，所以断言换成"两枚 id 都在、且取值就是那两章的规范化结果"。
   逐篇现值表与算法登记在规范 §15 详情页那一格。 */
assert.ok(/<h2 id="起雾的时候">起雾的时候(?:<a\b[^>]*>#<\/a>)?<\/h2>/.test(html), 'H2 id = safe(原文)，CJK 原样留着（§C1 那枚锚在不在都过，三条判据由上面那把尺管）');
assert.ok(/<h2 id="下一节">下一节(?:<a\b[^>]*>#<\/a>)?<\/h2>/.test(html), 'second section gets its own readable id');

console.log('markdown OK  figures=3  h2=2  links=' + (html.match(/<a /g) || []).length);
console.log(html.replace(/></g, '>\n<'));

/* ---- 第二轮：这轮补进来的词汇（列表 / 引用 / 分隔线 / h3 / 脚注 / 边注）----
   单独一个 fixture，上面那 55 行断言一个字都不改——旧保证不许因为这轮而被"顺手放宽" */
const md2 = [
  '先引用一句 [^a]，再引用一句 [^b]，边注在这里 ^[括号里的话]，最后再来一次 [^a]。',
  '',
  '### 三级标题',
  '',
  '- 苔',
  '* 雾',
  '- 风',
  '',
  '3. 第三件',
  '4. 第四件',
  '',
  '> 雾是森林的第一层语言。',
  '> 它让远处先消失。',
  '> —— 某本笔记',
  '',
  '---',
  '',
  '坏边注不该吃掉链接：^[注](https://evil.example/x)。',
  '',
  '[^b]: 第二条定义，正文里它排第二。',
  '[^a]: 第一条定义，带 [链接](https://example.com/a) 也要能渲染。',
  '[^unused]: 没被引用过的定义不该出现在文末。',
].join('\n');

const h2 = renderMd(md2);
assert.ok(/<ul><li>苔<\/li><li>雾<\/li><li>风<\/li><\/ul>/.test(h2), 'ul: both - and * markers, one <li> per line');
assert.ok(/<ol start="3"><li>第三件<\/li><li>第四件<\/li><\/ol>/.test(h2), 'ol keeps the author\'s starting number');
assert.ok(/<h3 id="三级标题">三级标题(?:<a\b[^>]*>#<\/a>)?<\/h3>/.test(h2), 'h3 也带 id（目录与刻度收的就是这一批）');
auditHeadAnchors(h2, '第二轮');   /* §C1 改钉：这一轮的 h2／h3 同样受"至多一枚锚 / href＝#id / 字面只有 #"管 */
assert.ok(/<hr>/.test(h2) && (h2.match(/<hr>/g) || []).length === 1, 'one divider');
assert.ok(/<blockquote><p>[^<]*<\/p><footer>某本笔记<\/footer><\/blockquote>/.test(h2), 'quote lines join into one paragraph, attribution becomes <footer>');
/* 编号按正文里第一次出现排，不按定义顺序；重复引用复用同一个号 */
assert.ok(/<sup class="fnref" id="fnref-a"><a href="#fn-a">1<\/a><\/sup>/.test(h2), 'first ref is 1 even though its definition comes second');
assert.equal((h2.match(/id="fnref-a"/g) || []).length, 1, 'a repeated reference reuses the number but never duplicates the anchor id');
assert.equal((h2.match(/>1<\/a><\/sup>/g) || []).length, 2, 'both references to the same footnote show number 1');
assert.ok(/>2<\/a><\/sup>/.test(h2), 'second distinct footnote is numbered 2');
assert.ok(/<li id="fn-a">/.test(h2) && /<li id="fn-b">/.test(h2), 'both used definitions land in the list');
assert.ok(!/fn-unused/.test(h2), 'an unreferenced definition is dropped');
assert.ok(/<a class="backref" href="#fnref-a" aria-label="回到正文第 1 处">&#8617;<\/a>/.test(h2), 'back-link with an aria label');
assert.ok(/<span class="sidenote"><span class="sn-mark">1<\/span>括号里的话<\/span>/.test(h2), 'sidenote renders inline, single source');
assert.ok(!/\^\[/.test(h2) && !/\[\^/.test(h2), 'no raw footnote/sidenote syntax survives');
assert.ok(/<a href="https:\/\/evil/.test(h2) === false, '^[注](url) must NOT turn the following paren into a link target');
assert.ok(/\(https:\/\/evil\.example\/x\)/.test(h2), '…and the paren survives as literal prose');
assert.ok(/<a href="https:\/\/example\.com\/a" target="_blank" rel="noopener noreferrer">/.test(h2), 'definitions run through the inline pass too');
assert.equal((h2.match(/"/g) || []).length % 2, 0, 'quotes balanced with the new syntax in play');
assert.equal(snResetProbe(), true, 'counters reset between documents');

/* 计数器是模块级状态：连着渲染两篇，边注必须重新从 1 开始 */
function snResetProbe(){
  const again = renderMd('第二篇 ^[另一句]。');
  return /sn-mark">1</.test(again) && !/footnotes/.test(again);
}

console.log('\nmarkdown 2 OK  list+quote+hr+h3+footnote+sidenote');
console.log(h2.replace(/></g, '>\n<'));

/* ---- 第三轮：审计点出来的那几个真会炸的写法，逐条钉住 ---- */
const md3 = [
  '这里引用了一个不存在的脚注 [^ghost]，它不许造出死锚点。',
  '',
  '中文 id 也能用：[^注一] 和 [^注二] 是两条。',
  '',
  '代码里的语法必须按字面出现：`[^1]`、`^[x](https://evil.example/y)`、`[文字](https://evil.example/z)`。',
  '',
  '> 我们用 1.0-beta 版本发布，中间这个连字符不是署名。',
  '',
  '[^注一]: 第一条中文注。',
  '[^注二]: 第二条中文注。',
].join('\n');
const h3 = renderMd(md3);
assert.ok(!/href="#fn-ghost"/.test(h3), 'a reference with no definition must not emit a link');
assert.ok(!/undefined/.test(h3), 'no undefined leaking into the footnote list');
assert.ok(/fn-missing/.test(h3), '…but the marker still shows the reader something is there');
assert.ok(/id="fn-注一"/.test(h3) && /id="fn-注二"/.test(h3), 'unicode ids survive normalisation as two distinct ids');
assert.ok((h3.match(/<li id="fn-/g) || []).length === 2, 'exactly two footnotes, the ghost one is not listed');
assert.ok(/<code>\[\^1\]<\/code>/.test(h3), 'footnote syntax inside code stays literal');
assert.ok(/<code>\^\[x\]\(https:\/\/evil\.example\/y\)<\/code>/.test(h3), 'sidenote + url inside code stays literal');
assert.ok(/<code>\[文字\]\(https:\/\/evil\.example\/z\)<\/code>/.test(h3), 'a link inside code stays literal too');
assert.ok(!/evil\.example/.test(h3.replace(/<code>[\s\S]*?<\/code>/g, '')), 'outside of code, none of those urls became links');
assert.ok(/<blockquote><p>我们用 1\.0-beta 版本发布，中间这个连字符不是署名。<\/p><\/blockquote>/.test(h3), 'a single hyphen mid-sentence is not an attribution');
assert.ok(!/<footer>beta/.test(h3), '…and specifically did not split the quote in half');

/* inlineMd 单独被 notes 那类页面调用时，不该长出注号（allowRefs 只在整篇渲染里打开） */
assert.equal(inlineMd('碎碎念里的 ^[括号] 与 [^1] 保持原样'), '碎碎念里的 ^[括号] 与 [^1] 保持原样');
/* 归一化函数被检查脚本共用，行为要写死：空格与标点变连字符、首尾不留、限长 32 */
assert.equal(safe('my note'), 'my-note');
assert.equal(safe('  ##weird id##  '), 'weird-id');
assert.equal(safe('注 一'), '注-一');
assert.equal(safe('x'.repeat(50)).length, 32, 'ids are capped so they cannot blow up the anchor');

/* 行尾不许改产物：`core.autocrlf=true` 的机器上 `git clone` 会把稿件落成 CRLF，而切块认的是 /\n{2,}/
   （'\r\n\r\n' 里两枚 '\n' 不相邻）⇒ 不归一就整篇塌成一枚 <p>、'## ' 字面上屏，而 build 一点不红。
   2026-09-28 在 worktree 里实测到（规范 §16）。判据取"两份产物逐字节相同"而不是"章还在"：
   前者连"塌成两段"这种半成品形状也拦得住，且它钉的是**行为**而不是某一枚标签。 */
assert.equal(renderMd(md.replace(/\n/g, '\r\n')), html, 'CRLF input must render byte-identical to LF');

console.log('\nmarkdown 3 OK  ghost-ref + unicode-id + code-literal + hyphen-quote + crlf-parity');

/* ---- 第四轮：正文渲染器补进来的三件（``` 围栏代码块 / **加粗** / |a|b| 表格）----
   每一格都是两侧的：朝宽（会破相的写法必须拦得住）＋朝窄（合法写法不许误红）。

   先钉切块本身。`renderMd` 原先一句 `md.split(/\n{2,}/)` 就把整篇切成块，而**代码块内部允许有空行**，
   那一枚围栏会被劈成两半、前半尾巴上还挂着裸 ` ``` ` 上屏。改成了逐行游标的 `splitBlocks`，
   判据不是"围栏渲染对了"这种下游观察，而是**它是旧切块的替身**：在没有围栏的稿子里逐块相同。
   这样下面那两趟 `collectDefs`（脚注定义写在文末、引用却在开头）读的块序列一个字都没变——
   围栏不牵动脚注，是因为它只在"块怎么切"这一步插手，而这一步对无围栏输入是恒等的。 */
for (const [name, src] of [['md', md], ['md2', md2], ['md3', md3],
                           ['空行与空格行', 'a\n \nb\n\n\n\nc\n\n'],
                           ['首尾空行', '\n\nfoo\nbar\n\n\n']]){
  const norm = String(src).replace(/\r\n/g, '\n');
  assert.deepEqual(splitBlocks(norm).map(s => s.trim()).filter(Boolean),
                   norm.split(/\n{2,}/).map(s => s.trim()).filter(Boolean),
                   `splitBlocks 与旧切块在「${name}」上不同 —— 两趟脚注扫的块序列被牵动了`);
}

/* 围栏：整段只过 esc()，一枚字节都不许进 inlineMd（§15 那句"`code` 里的东西一律按字面出现"扩到整块） */
const mdFence = [
  '正文里先引用 [^k]。',
  '',
  '```js',
  'const 雾 = 1;',
  '',
  '// 中间这枚空行不许把围栏劈成两半',
  '[^1] 与 *em* 与 **粗** 与 `反引号` 都按字面',
  '[文字](https://evil.example/z) 与 ![图](/x.png "注") 与 ^[边注] 与 <script>alert(1)</script>',
  '[^k]: 写在围栏里的这一行不是脚注定义。',
  '```',
  '',
  '后面一段照常。',
  '',
  '[^k]: 真定义在文末。',
].join('\n');
const htmlF = renderMd(mdFence);
const inside = /<pre class="code"><code>([\s\S]*?)<\/code><\/pre>/.exec(htmlF);
assert.ok(inside, '围栏渲染出了 <pre class="code"><code>…</code></pre>');
assert.equal((htmlF.match(/class="codeblock"/g) || []).length, 1, '一枚围栏＝一个代码块，内部空行没有把它劈开');
assert.ok(/<div class="codeblock" data-lang="js">/.test(htmlF), '语言标识挂在 data-lang（详情页那张复制钮的卡要吃它）');
assert.ok(inside[1].includes('const 雾 = 1;\n\n// 中间这枚空行不许把围栏劈成两半'), '空行原样留在 <pre> 里');
/* 朝宽：围栏里任何一种行内语法都不许被渲染成排版件——这是本卡最硬的一条 */
assert.ok(!/<em>|<strong>|<code>|<sup|<a |<figure|sidenote/.test(inside[1]), '围栏里没有一枚排版件');
assert.ok(inside[1].includes('[^1] 与 *em* 与 **粗** 与 `反引号` 都按字面'), '*、**、`、[^1] 全部按字面出现');
assert.ok(inside[1].includes('[文字](https://evil.example/z) 与 ![图](/x.png "注") 与 ^[边注]'), '链接/图片/边注在围栏里都是字面文本，引号不必再 Esc 一遍');
assert.ok(inside[1].includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'HTML 在围栏里也只过 esc()，不成为标签');
assert.ok(!/fn-k/.test(inside[1]) && !/id="fn-k"[^>]*>[^<]*写在围栏/.test(htmlF), '写在围栏里的 `[^k]:` 不算定义');
assert.ok(/<li id="fn-k">[^<]*真定义在文末/.test(htmlF), '文末那枚真定义仍然接手——围栏没把两趟扫定义的过程搅乱');
assert.ok(!/```/.test(htmlF), '屏幕上一枚裸反引号都不许留下');
assert.equal((htmlF.match(/"/g) || []).length % 2, 0, '带围栏的产物引号成对，没有逃出属性');
/* 未闭合的围栏一路吃到文末（CommonMark 同口径），后半截不许回到散文层去跟别人配对 */
const htmlU = renderMd(['前。', '', '```', 'let a = 1;', '', '**x 没闭合', '还是代码'].join('\n'));
assert.equal((htmlU.match(/class="codeblock"/g) || []).length, 1, '未闭合也只有一个代码块');
assert.ok(htmlU.includes('**x 没闭合'), '未闭合围栏里的 `**` 留在代码里，不许跑出去跟下一段配对');
assert.ok(!/<strong>/.test(htmlU) && !/```/.test(htmlU), '没有 <strong>、也没有裸反引号');
/* info 串要进 data-lang 就必须先过白名单形状：过不了就整个不要这一枚属性（宁可没有标签） */
const htmlI = renderMd('```js"onerror="alert(1)\ncode\n```');
assert.ok(!/data-lang=/.test(htmlI), '带引号的 info 串不配当属性值');
assert.ok(!/onerror/.test(htmlI), '……而且它一个字都不许落到产物里');
assert.ok(/<div class="codeblock"><pre/.test(htmlI), '被拒的语言标识 ⇒ 不带 data-lang，CSS 那一侧的标签行因此不存在');
/* CRLF：归一必须发生在围栏扫描**之前**，否则 ` ``` ` 那行带着 '\r' 就认不出来 */
assert.equal(renderMd(mdFence.replace(/\n/g, '\r\n')), htmlF, '带围栏的稿子 CRLF 与 LF 产物逐字节相同');
assert.equal(renderMd('```js\na\n\nb\n```'.replace(/\n/g, '\r\n')), renderMd('```js\na\n\nb\n```'), '未闭合之外的 CRLF 同一条');

/* 加粗：必须赶在斜体之前，而且不许"斜体把加粗的星号吃掉一半"（那是这一格改之前的实际行为） */
assert.equal(inlineMd('**加粗**'), '<strong>加粗</strong>', '没有半枚裸星号留下');
assert.equal(inlineMd('***x***'), '<strong><em>x</em></strong>', '粗斜一套一起认');
assert.equal(inlineMd('**a *b* c**'), '<strong>a <em>b</em> c</strong>', '粗里套斜：外粗内斜，断在半路的旧匹配方式不许回来');
assert.equal(inlineMd('普通 *em* 照旧'), '普通 <em>em</em> 照旧', '斜体那一枚规则没被动');
assert.equal(inlineMd('**x'), '**x', '未闭合的 ** 原样，不吞后文');
assert.equal(inlineMd('看 `**字面**` 这里'), '看 <code>**字面**</code> 这里', 'code 占位那一步仍然走在加粗之前');
const htmlB = renderMd(['第一段 **x 没闭合。', '', '第二段 **y** 闭合了。'].join('\n'));
assert.ok(htmlB.includes('<p>第一段 **x 没闭合。</p>'), '跨段落不许配对');
assert.equal((htmlB.match(/<strong>/g) || []).length, 1, '只有闭合那一对长成 <strong>');

/* 表格：|a|b| + 分隔行；格子里的文字走 inlineMd，所以链接与行内 code 都在 */
const mdT = [
  '正文里先引用 [^t]。',
  '',
  '| 名字 | 数量 | 备注 | 说明 |',
  '| --- | ---: | :---: | :--- |',
  '| 雾 | 3 | [链接](https://example.com/fog) | `code` |',
  '| 苔 | 12 | 竖线 \\| 不算分格 | 再引用 [^t] |',
  '| 四格 | 1 | 2 | 3 | 这一格超出表头，该被丢掉 |',
  '| 两格 | 1 |',
  '',
  '| a | b | c |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '标题',
  '---',
  '',
  '[^t]: 表格里也能挂脚注。',
].join('\n');
const htmlT = renderMd(mdT);
assert.ok(/^<div class="tablewrap"><table><thead><tr><th>名字<\/th>/.test(htmlT.match(/<div class="tablewrap">[\s\S]*?<\/tbody><\/table><\/div>/)[0]), '结构：wrapper › table › thead › tbody');
assert.equal((htmlT.match(/<th[ >]/g) || []).length, 4, '四列表头');
assert.equal((htmlT.match(/<td[ >]/g) || []).length, 16, '四行数据 × 四格（多的丢掉、缺的补空）');
assert.ok(/<th class="al-r">数量<\/th>/.test(htmlT), '---: 右对齐');
assert.ok(/<th class="al-c">备注<\/th>/.test(htmlT), ':---: 居中');
assert.ok(/<th>说明<\/th>/.test(htmlT), '--- 与 :--- 都是默认左缘，不落 class');
assert.ok(htmlT.includes('<a href="https://example.com/fog" target="_blank" rel="noopener noreferrer">链接</a>'), '格子里的链接走 inlineMd');
assert.ok(/<td><code>code<\/code><\/td>/.test(htmlT), '格子里的行内 code');
assert.ok(htmlT.includes('竖线 | 不算分格'), '\\| 是内容里的竖线，不是分格');
assert.ok(!htmlT.includes('这一格超出表头'), '超出表头格数的单元格被丢掉，不许把表格撑破');
assert.ok(/<td>两格<\/td><td class="al-r">1<\/td><td class="al-c"><\/td><td><\/td>/.test(htmlT), '不足格数的补空 <td>，列数守恒（对齐 class 跟着列走，不跟着内容走）');
assert.ok(renderMd('| a | b |\n| --- | --- |\n| <i>尖括号</i> | 结束 |').includes('<td>&lt;i&gt;尖括号&lt;/i&gt;</td>'), '原始 HTML 在格子里转义成文字（与段落同一口径）');
assert.equal((htmlT.match(/id="fn-t"/g) || []).length, 1, '同一处脚注在表格里再引用一次复用号数');
assert.ok(/<li id="fn-t">/.test(htmlT), '定义在文末、引用在表格里——两趟扫描跨得住');
/* 朝宽：三种"看着像表格"的写法都不许被误认，认错了就是把作者的一行字换成一块空表 */
assert.ok(!/<table/.test(renderMd('标题\n---')), 'setext 那味写法（白名单里没有）不许解释成一列表格');
assert.ok(!/<table/.test(renderMd('| a | b | c |\n| --- | --- |\n| 1 | 2 |')), '表头与分隔行格数不等 ⇒ 退回段落，不猜');
assert.ok(!/<table/.test(renderMd('| a | b |\n| --- | x |\n| 1 | 2 |')), '分隔行里有非 `:?-+:?` 的格 ⇒ 不是分隔行');
assert.ok(!/<table/.test(renderMd('| a | b |')), '只有表头没有分隔行 ⇒ 一整块段落');
assert.ok(renderMd('| a | b | c |\n| --- | --- |\n| 1 | 2 |').includes('<p>| a | b | c | | --- | --- | | 1 | 2 |</p>'), '退回段落时那几行仍是字面文本');
assert.equal(renderMd(mdT.replace(/\n/g, '\r\n')), htmlT, '带表格的稿子 CRLF 与 LF 产物逐字节相同');
assert.equal((htmlT.match(/"/g) || []).length % 2, 0, '带表格的产物引号成对');

console.log('\nmarkdown 4 OK  fence-literal + fence-atomic-blankline + lang-attr-whitelist + bold-before-em + table-shape + alignment + crlf-parity');
console.log(htmlF.replace(/></g, '>\n<'));
console.log(htmlT.replace(/></g, '>\n<'));

/* ---- 第五轮 `card/anchors`：章的 id 与那一页的章清单，由渲染器在构建期一次交回 ----
   这一格钉的是**机制**：id 一旦归运行期脚本补，无 JS／脚本没跑到那一拍，`/essays/<slug>/#某节` 就跳不到、
   目录整块不存在（§19.3 那格"起手态由 JS 落"的同族）。所以判据要能在**不看浏览器**的前提下说出：
   渲染器发的 id 长什么样、重名怎么退、纯标点章怎么退、两篇之间的去重账不许互相污染。 */
{
  const dup = renderArticle('## 同名\n\n正文一。\n\n## 同名\n\n正文二。\n\n## ！？\n\n纯标点章。\n\n## 用 *斜体* 与 `code`\n');
  /* 重名：第一枚拿裸值，第二枚带 `-2` —— 确定性行为，不是"谁先谁后看运气" */
  assert.ok(/<h2 id="同名">同名(?:<a\b[^>]*>#<\/a>)?<\/h2>/.test(dup.html) && /<h2 id="同名-2">同名(?:<a\b[^>]*>#<\/a>)?<\/h2>/.test(dup.html), '同名标题第二枚拿 -2 后缀');
  auditHeadAnchors(dup.html, '第五轮');   /* §C1 改钉：这一格给"href 必须带 -2 后缀"提供牙——第二枚同名章的锚若还指 #同名，当场红 */
  /* 归一化成空串（纯标点章）⇒ 退 sec-<章序>，绝不发 id=""：空串是一枚点不开的活锚（§12 死锚点） */
  assert.ok(/<h2 id="sec-2">/.test(dup.html), '纯标点章退 sec-章序，不发空 id');
  /* 原料是**原文**不是渲染结果：星号与反引号被规范化成连字符，`em`/`code` 这两个标记名不许进地址 */
  assert.ok(/<h2 id="用--斜体--与--code">/.test(dup.html), '带行内标记的标题：id 走原文规范化，不含标记名');
  /* 渲染结果的壳不许漏进 id：判据用**字符集**而不是"含不含 code 这个词"——
     上面那枚 fixture 的地址里 `code` 是作者自己写的字，拿词当needle 会假红（第一版就在这里红过一次）。 */
  for (const h of dup.heads) assert.ok(!/[<>&/;"=]/.test(h.id), `id 里出现了壳或引号：${h.id}`);
  /* id 的字符集白名单：safe() 之后只剩 Unicode 字母/数字/连字符 ⇒ 属性值里原理上不会有引号 */
  for (const h of dup.heads) assert.ok(/^[\p{L}\p{N}-]+$/u.test(h.id), `id 出了白名单：${h.id}`);
  /* 清单与正文同源：级别、顺序、去壳后的字（目录那一行要印的字） */
  assert.deepEqual(dup.heads.map(h => [h.level, h.id]), [[2, '同名'], [2, '同名-2'], [2, 'sec-2'], [2, '用--斜体--与--code']], '章清单的顺序就是正文里的先后，一枚不多一枚不少');
  assert.deepEqual(dup.heads.map(h => h.text), ['同名', '同名', '！？', '用 斜体 与 code'], '目录用的字是渲染结果的去壳（与运行期 textContent 同读法）');
  /* ⚠️ 去重集合是**一篇一份**：上一篇用过 `同名`，下一篇第一枚仍拿裸值——
     状态没清就是"越构建越歪"，而且歪在第二篇上，第一篇的读数看着完全正常 */
  assert.equal(renderArticle('## 同名\n\n另一篇。\n').heads[0].id, '同名', '第二篇不被上一篇的后缀账污染');
  /* H3 与 H2 走同一枚函数、进同一份清单（目录与刻度吃的就是这一批） */
  const mixed = renderArticle('## 甲\n\nx\n\n### 乙\n\ny\n');
  assert.deepEqual(mixed.heads.map(h => [h.level, h.id]), [[2, '甲'], [3, '乙']], 'H3 收进同一份清单，带自己的级别');
  assert.ok(/<h3 id="乙">/.test(mixed.html), 'H3 的 id 也在构建期落地');
  /* 渲染器不许把同一枚 id 发两遍（产物里两枚同值 id ＝ 锚点跳到哪一枚算哪一枚） */
  assert.equal((renderMd('## a\n\n## a\n\n## a\n').match(/<h2 id="/g) || []).length, 3, '三枚同名章都要成形');
  assert.deepEqual([...new Set(renderArticle('## a\n\n## a\n\n## a\n').heads.map(h => h.id))].length, 3, '三枚 id 互不相同');
  /* CRLF 那把尺子在这一族上同样成立：行尾不许改 id（规范化吃的是整串原文，不该有 \r 的影子） */
  assert.equal(renderArticle('## 同名\n\n正文一。\n\n## 同名\n'.replace(/\n/g, '\r\n')).html,
               renderArticle('## 同名\n\n正文一。\n\n## 同名\n').html, '带重名 id 的稿子 CRLF 与 LF 产物逐字节相同');
  console.log('\nmarkdown 5 OK  heading-id-shape + duplicate-suffix + empty-normalisation-fallback + per-doc-reset + toc-list-same-source');
}

/* ---------- markdown 6：`/public/` 那枚同义前缀必须一路走到产物属性，而不只活在 root() 里 ----------
   上面那一组断言证的是函数，这一组证的是**三条消费路共用同一枚真值**：正文图、正文链接、
   front matter 的 cover（模板调 `root(p.data.cover)`——`src/components/EssayIndex.astro:146`／
   `src/components/PostRow.astro:28`，全仓没有第二份剥前缀的实现，所以这里用同一枚函数代表那一路）。 */
{
  const mdP = [
    '正文里放一张：![林线](/public/assets/posts/x/line.jpg "晨雾")',
    '',
    '再放两条站内链接：[旧篇](/public/essays/slow-frontend/)，以及旧写法 [页面](/public/things.html)。',
    '',
    '不该动的两枚：![中间](/assets/public/keep.png) 与 ![只剥一枚](/public/public/twice.png)。',
  ].join('\n');
  const hp = renderMd(mdP);
  assert.ok(/<img src="\/assets\/posts\/x\/line\.jpg"/.test(hp), '正文图：前缀剥掉之后才进 src');
  assert.ok(/<a href="\/essays\/slow-frontend\/"/.test(hp), '正文链接走的是同一枚 root()，没有第二套拼法');
  assert.ok(/<a href="\/things\/"/.test(hp), '`.html → 目录式 URL` 那一步排在剥前缀之后，照样成立');
  assert.ok(/<img src="\/assets\/public\/keep\.png"/.test(hp), '中间位置的 public 原样进产物');
  assert.ok(/<img src="\/public\/twice\.png"/.test(hp), '第二枚 public 留在原地：只许剥第一枚');
  assert.ok(hp.indexOf('/public/assets') === -1, '剥完不该再留下任何 `/public/assets` 的影子');
  assert.equal((hp.match(/<img /g) || []).length, 3, '三枚图一枚不多一枚不少（映射只改地址，不改形状数量）');
  assert.equal(root('/public/assets/posts/x/cover.jpg'), '/assets/posts/x/cover.jpg', 'cover 与正文图同一枚落点');
  console.log('\nmarkdown 6 OK  prefix-into-产物：figure+link+html-rule / middle-不动 / 贪剥被拒 / cover 同源');
}

