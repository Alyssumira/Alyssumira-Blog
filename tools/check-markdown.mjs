import { renderMd, root } from '../src/lib/markdown.js';
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
