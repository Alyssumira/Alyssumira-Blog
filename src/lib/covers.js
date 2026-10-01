/* 封面与截图的退路：一处真值（作者 2026-10-01 晚点名「如果没有封面就默认使用这张」）。
   为什么单独开一个模块，而不是在三枚消费点各写一句 `x.cover || DEFAULT_COVER`：这一族本仓叫**派生字段铁律**——
   `PostRow`／`EssayIndex`／`things` 今天判的是同一句"这篇有没有封面"，写三遍就迟早有一遍忘了改，
   第四处只会长在别人身上。消费点只许 import 这一枚函数，那三处各 import 它由 `tools/media-check.mjs` 第 ④ 格数着。
   ⚠️ 本模块**不解析路径**：地址怎么归一仍然只有 `markdown.js` 那枚 `root()`，这里只决定"拿哪一枚值去走它"。
   ⚠️ "没填"有两种形状：作者手写 `cover: ""`，与 Obsidian 属性面板留下的空键 `cover:`（YAML 交来 `null`）——
     所以判的是"字符串且 trim 后非空"，不是光看真假（`content.config.ts` 的 `blankSlot` 同一个口径）。 */
import { root } from './markdown.js';
import { DEFAULT_COVER } from '../data/site.js';

export function coverSrc(value){
  return root(typeof value === 'string' && value.trim() ? value : DEFAULT_COVER);
}