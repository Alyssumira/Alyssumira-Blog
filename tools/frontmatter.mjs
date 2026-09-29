/* front matter 的最小读法——**工具侧只此一份**（`new-post.mjs --check` / `taxonomy-check.mjs` /
   `runtime-check.mjs` 三处都 import 它；谁再自己 split 一遍 '\n---\n'，就会出现
   "预检放行的写法构建期炸"或"门禁绿、产物红"那种两边各自赦免同一个错的形状，§16 记过这一族）。
   ⚠️ 它不是 YAML 解析器，也故意不做成：只认顶层 `键: 值` 一行式与 `tags:` 下面那种 `- 项` 块式数组。
      认不出来的写法一律**报出来**，不猜、不"顺手兼容"——猜错等于替作者改了 front matter。
      页面那侧的真值由 gray-matter + zod schema 给，这一份只用于发布前的预检与产物对账。
   ⚠️ 行尾先归一成 LF：`core.autocrlf=true` 的机器上 `git checkout` 会把稿件落成 CRLF，
      那时 '\r' 会挂在每个值尾巴上——`draft: true\r` 读成"不是布尔"，假红比漏检更坏（new-post 文件头那条同一个坑）。 */
import { cleanName, taxSlug, parseFlag } from '../src/lib/taxonomy.js';

export function splitFm(raw){
  const text = String(raw).replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 3);
  if (end < 0) return null;
  const fmText = text.slice(4, end + 1);
  const fm = {};
  for (const line of fmText.split('\n')){
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    fm[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
  return { fm, fmText, body: text.slice(end + 5).replace(/^\r?\n/, '') };
}

/* 值两侧的单/双引号摘掉：`splitFm` 那一份只摘了双引号（`^"(.*)"$`），单引号写法（`sourceLink: 'https://…'`）
   要由消费侧再走一次这里才算读到位——页面那侧 gray-matter 两种引号都剥，工具侧不剥就是**假红**
   （新-post 文件头那条同一个教训：假阳性比漏检更糟，它教人忽略门禁）。摘引号是**读法**不是判据，
   所以它住在这儿（工具侧只此一份），而不是住在 `new-post.mjs` 的那一格旁边。 */
export const unquote = s => {
  const v = String(s).trim();
  const q = v[0];
  return (q === '"' || q === "'") && v.endsWith(q) && v.length > 1 ? v.slice(1, -1) : v;
};

/* flow 序列 `[a, b, "c,d"]` 的切分：逗号只在引号之外才算分隔符，
   否则 `"散文,随笔"` 会被切成两项——那是把作者写的一个标签读成两个。 */
function flowItems(inner){
  const out = [];
  let buf = '', q = '';
  for (const ch of inner){
    if (q) { if (ch === q) q = ''; else buf += ch; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === ',') { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  out.push(buf);
  return out;
}

/* 六枚可空键（category / tags / draft / pinned ＋ 第十五轮 `card/series` 的 series / seriesOrder）的读法
   ＋ 坏写法的报错句子。两枚系列键的读法**只是翻译**：真值在 `src/content.config.ts` 与 `src/lib/series.js`，
   这里不写第二份归一化、也不写第二份排序。
   返回的 errors 是**可以直接 print 的句子主体**（调用方拼 `✗ ${f}：${e}`），
   语气照本仓库既有那条：把后果说清，不只说"格式不对"。 */
export function readTaxonomy(fmText){
  const errors = [];
  const lineOf = key => {
    const m = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(fmText);
    return m ? m : null;
  };
  const blockItems = m => {
    if (m[1].trim() !== '') return null;                       // 行内有值 ⇒ 不是块式
    const rest = fmText.slice(m.index + m[0].length);
    const items = [...rest.matchAll(/^[ \t]+-[ \t]*(\S[^\n]*)$/gm)].map(x => unquote(x[1]));
    return items;
  };

  /* 分类是一个标量：没写／空着 ⇒ 空串（页面上不出现） */
  let category = '';
  const cm = lineOf('category');
  if (cm){
    const v = cm[1].trim();
    if (v === '') category = '';
    else if (v.startsWith('[') || /^["']?\s*-\s/.test(v)){
      errors.push('category 写成数组了——一篇稿子只有一个分类（列表页与详情页只画一枚胶囊），要多个名字请用 tags');
    } else category = cleanName(unquote(v));
  }

  /* 标签是一个序列：flow `tags: [甲, 乙]` 或 block `tags:` + 下面几行 `- 甲` */
  let tags = [];
  const tm = lineOf('tags');
  if (tm){
    const v = tm[1].trim();
    const block = blockItems(tm);
    if (block) tags = block.map(cleanName);
    else if (v === '') tags = [];
    else if (v === '[]') tags = [];
    else if (v.startsWith('[')){
      if (!v.endsWith(']')) errors.push(`tags "${v}" 这个方括号没关好——zod 会当场报错、astro build 红，整站烘不出来`);
      else {
        const items = flowItems(v.slice(1, -1)).map(unquote);
        const blanks = items.filter(x => cleanName(x) === '');
        tags = items.map(cleanName).filter(Boolean);
        if (blanks.length) errors.push('tags 里有一项是空的（`tags: [甲, , 乙]` 这种）——空名字清成空串就没有地址，胶囊会指向 /tags//，那是 §12 的死锚点');
      }
    }
    else errors.push(`tags 写成 "${v}" 是个字符串——schema 要的是 YAML 数组（` + '`tags: [甲, 乙]`' + `），这一篇会让 astro build 当场报错，列表与 /tags/ 一个胶囊都长不出来`);
  }

  /* 系列那一族（第十五轮 `card/series`）：`series` 是一枚标量（与 category 同一条读法），
     `seriesOrder` 是一枚**正整数**（形状照 schema 里 `hourSlot` 那一枚：空值＝没填，值走数字）。
     ⚠️ 这一格的读法**不重写判据、只翻译**：真值仍然在 `src/content.config.ts` 那两枚键与
     `src/lib/series.js` 那一份分组函数里（页面吃的那一份）。工具里再抄一份归一化或排序，
     就会出现"预检全绿、astro build 红"或反过来（§16 记过的那一族）。
     下界为什么是 `> 0` 而不是 `>= 0`：`seriesOrder: 0` 说的是"第 0 篇"，那是编出来的序——第一篇从 1 数起。
     与 schema 的 `positive()` 同一枚口径，两侧各测一次由 `tools/taxonomy-check.mjs` 第④格钉。 */
  let series = '';
  const sm = lineOf('series');
  if (sm){
    const v = sm[1].trim();
    if (v === '') series = '';
    else if (v.startsWith('[') || /^["']?\s*-\s/.test(v)){
      errors.push('series 写成数组了——一篇稿子只属于一枚系列（详情页那一行与 /series/ 的清单都只画一个名字），要多个记号请用 tags');
    } else series = cleanName(unquote(v));
  }
  let seriesOrder;                            // undefined ＝ 没填 ＝ 这一组没有"作者说过的顺序"，整组退回按 date 排
  const om = lineOf('seriesOrder');
  if (om){
    const raw = om[1].trim();
    const v = unquote(raw);
    if (v === '') seriesOrder = undefined;    // 空着的 `seriesOrder:` 与 schema 的 preprocess 同解：没填
    else {
      const n = Number(v);
      if (Number.isInteger(n) && n > 0) seriesOrder = n;
      else errors.push(`seriesOrder 写成 "${raw}" 不是一枚正整数——zod 的 int().positive() 会当场报错、astro build 红，整站烘不出来；`
        + `第一篇写 1（**不是 0**：0 说的是"第 0 篇"，那是编出来的序），后面的接着写；或者把这一行整条删掉——删掉＝没填＝这一组改按日期排，页面上不会少任何东西`);
    }
  }
  if (seriesOrder !== undefined && !series){
    errors.push(`seriesOrder: ${seriesOrder} 填了而 series 空着——这一枚序数没有主人：没有名字就没有那一组，`
      + `详情页那一行与 /series/ 的清单都不会因为它多出现一个字。要么把系列名填上，要么把这一行删掉（"作者写了却看不见"就是 §12 那一族，本工具专门点名它）`);
  }

  /* 草稿与置顶：只认 YAML 1.2 核心 schema 的那六个字面量，空着＝没填＝默认 */
  const flags = {};
  const effect = { draft: '草稿（这一篇从站上任何一处都读不到）', pinned: '置顶（它排在 / 与 /essays/ 的最前面）' };
  for (const key of ['draft', 'pinned']){
    const m = lineOf(key);
    const r = parseFlag(m ? m[1] : '');
    flags[key] = r.ok ? r.value : false;
    if (!r.ok) errors.push(`${key} 写成 "${r.value}" 不是布尔——YAML 1.2 不把 yes/no/on/off/1 当真假，zod 会当场报错、整站烘不出来；`
      + `要它算${effect[key]}就写 true，不算就写 false，或者把这一行整条删掉（删掉＝没填＝${key === 'draft' ? '已发布' : '不置顶'}）`);
  }

  /* 归一化之后没有地址的名字：页面那侧（groupBy / tagsOf）会把它丢掉，于是"作者写了却不出现"——
     那正是 §12 那条"作者写了但读者看不见"的形状，也是死锚点 `/categories//` 的来源。
     在这里说破，不留给渲染器兜底。 */
  if (category && !taxSlug(category)){
    errors.push(`category "${category}" 归一化之后是空串（纯标点／符号的名字清完什么也不剩）——它没有地址可指，胶囊会指向 /categories//，这一篇也不会在 /categories/ 的清单里出现；起个含字母或数字的名字，或者把这一行删掉`);
  }
  const dead = tags.filter(t => !taxSlug(t));
  if (dead.length){
    errors.push(`tags 里这些名字归一化之后是空串：${dead.map(x => `"${x}"`).join(' / ')}——清完就没有地址，胶囊会指向 /tags//（§12 的死锚点），页面上一个都不出现`);
  }
  tags = tags.filter(t => taxSlug(t));
  /* 系列名同一条判据（页面那侧 `lib/series.js` 走的也是 `taxSlug`，那一格把它挡在清单外）：
     详情页那一行不出现、/series/ 的清单里也没有这一枚——"作者写了却不出现"必须在这里说破。 */
  if (series && !taxSlug(series)){
    errors.push(`series "${series}" 归一化之后是空串（纯标点／符号的名字清完什么也不剩）——它没有地址可指，详情页那一行不会出现、/series/ 的清单里也不会有它（` + '`/series//`' + ` 是 §12 的死锚点）；起个含字母或数字的名字，或者把这一行删掉`);
  }

  return { category, tags, draft: flags.draft, pinned: flags.pinned, series, seriesOrder, errors };
}
