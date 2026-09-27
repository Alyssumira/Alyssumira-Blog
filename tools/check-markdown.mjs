import { renderMd, inlineMd, safe, root } from '../src/lib/markdown.js';
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
assert.equal((html.match(/<a /g) || []).length, 5, 'one <a> per link, breakout adds none');
assert.ok(/<img src="\/assets\/bg-light\.jpg"/.test(html), 'relative image pinned to site root');
assert.ok(/<a href="\/things\/"/.test(html), 'things.html rewritten to the directory URL');
assert.ok(/<a href="https:\/\/example\.com\/fog" target="_blank" rel="noopener noreferrer">/.test(html), 'external link opens safe');
assert.ok(/<a href="\/essays\/slow-frontend\/"[^>]*>站内<\/a>/.test(html), 'root-relative link stays put, no target');
assert.ok(html.indexOf('![') === -1, 'no raw markdown survives');
assert.ok(/<p>也可以一段里塞两张：/.test(html), 'inline text keeps its paragraph');
assert.equal((html.match(/<h2>/g) || []).length, 2, 'two sections');
assert.ok(!/id="/.test(html.match(/<h2>[^<]*<\/h2>/g).join('')), 'h2 ids are added by the toc script, not the parser');

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
assert.ok(/<h3>三级标题<\/h3>/.test(h2), 'h3');
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

console.log('\nmarkdown 3 OK  ghost-ref + unicode-id + code-literal + hyphen-quote');
