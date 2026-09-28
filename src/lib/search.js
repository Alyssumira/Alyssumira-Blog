/* 站内搜索的**唯一一份**检索口径（第十一轮 `card/search`）。
   为什么这份文件必须存在、而且必须"不碰 astro:content、不碰 DOM"：
   ① 同一份代码要在三处跑——构建期（`src/pages/search.json.js` 把稿子切成索引）、浏览器
      （`src/scripts/site.js` 拿输入去比对）、门禁（`tools/search-check.mjs` 在 node 里跑**同一枚**
      `searchDoc()` 复算命门那一格）。分三处写就是三把尺子，§16 记过这一族："门禁一套算法、
      页面一套算法，然后两边各自赦免同一个错"（口径抄自 `lib/posts.js` 文件头对 `taxonomy.js` 的说法）。
   ② 中文检索的形状：**二字滑窗（bigram）**，不是按空格切。
      按空格切对中文等于什么都没切——一整篇稿子是一个"词"，除了把标题一字不差打出来之外永远搜不到。
      滑窗反过来保证一件可以一句话说清的事：**你打的字只要是正文里连着出现过的，就一定搜得到**。
      这条性质正是参照实现（构建期静态索引那一族）在中文上漏的地方：本站实测过一枚三字词
      「能见度」，输入整枚命中、输入它中间那两枚字「见度」返回零条，而旁边「能见」「度只」两枚
      都命中——它的中文分词按词库切，切到哪里就只认哪里。二字滑窗没有这种洞，因为它不猜词。
      ⚠️ 代价照实登记，不假装它不存在：AND 语义只看"这几枚二字窗在不在这一篇里"，不看它们在不在
      彼此旁边。所以「能度」这种"两半都出现过、但从来没连着写"的输入也会命中 fog-debugging。
      多出来的是召回、丢掉的不是任何一篇该出现的稿子（凡连续出现过的必然满足 AND），
      在只有几篇稿子的站上这个形状读起来是"宽"，不是"错"。要收紧就得连位置一起索引，
      那是另一枚数据结构的价钱，这一轮的口径是**宁宽不漏**。
   ③ 索引里只准有 `lib/posts.js` 交出来的那批稿子。草稿不许进索引这件事**不在这里判**——
      判它的那一格是 `visiblePosts()` 本身（第十轮立的唯一入口），这里连"什么是草稿"都不知道。 */

/* 索引格式的版本。产物里带着它，门禁拿它确认"读到的这份索引是这一版代码能解释的"，
   而不是上一轮留下的某枚形状。改字段含义就抬这一枚数，别悄悄改。 */
export const INDEX_VERSION = 1;

/* 一枚"词元"= 一段连续的字（汉字、字母、数字都算；\p{L} 把 CJK 全收进来）。
   标点、空白、Markdown 残留的尖括号一律是切分点——bigram 不许跨过它们，
   跨过去就会造出「。有」这种现实里没人打的查询。 */
const RUN_RE = /[\p{L}\p{N}]+/gu;

/* 切词元：先折叠空白与大小写（拉丁文按小写比，中文无大小写，这一步对它是零），再取连续段。
   长度 > 32 的一段丢掉：那是代码块或十六进制串，不是有人会在搜索框里打的东西，
   留着只会让索引变大、让"命中"变得莫名其妙。 */
const MAX_RUN = 32;
export function runTokens(text){
  const runs = String(text == null ? '' : text).toLowerCase().replace(/\s+/g, ' ').match(RUN_RE) || [];
  return runs.filter(r => r.length <= MAX_RUN);
}

/* 一篇稿子的词元集合，三层一起给：
   · 整段词元（`能见度` 作为一个整体出现在正文里时才算）——用来给"整枚词都命中"的排序加分；
   · **单字**——只为一枚边界场合：访客只打了一个字（「雾」）。不铺这一层，那一档会一枚都匹配不上，
     搜索框在最短的输入上装死，正是 §12 刚在 404 那格否决过的"许愿输入框"形状。
     代价照实登记：单字档天然宽（「的」三篇全中），但那是"含这个字的稿子"这句实话，不是假回执；
   · **二字滑窗**——这份索引的主力，也是"连着出现过的就一定搜得到"那条性质的来源。
   返回去重后的**排序数组**：排序是刻意的，同一批稿子两次构建交出逐字节相同的 JSON，
   门禁才拿它当对账对象（不排序的话顺序跟着正文出现走，改一个标点就漂）。 */
export function docTokens(text){
  const set = new Set();
  for (const run of runTokens(text)){
    set.add(run);
    for (let i = 0; i < run.length; i++) set.add(run[i]);
    for (let i = 0; i + 1 < run.length; i++) set.add(run.slice(i, i + 2));
  }
  return [...set].sort();
}

/* 查询切成**必须全中**的那批窗：长度 ≥2 的一段切成二字滑窗，长度 1 的一段就是它自己。
   ⚠️ 整段词元不进 `want`、只进 `whole`：它参与排序，不参与判定。
   这一刀是实测逼出来的——第一版把整段也当成必中项，于是「能见度」这种"正文里连着写过"的输入
   反而返回零条（正文那一枚词元是「但能见度只有一米」，不是「能见度」），
   正好把这一枚索引最该守住的那条性质演反了。 */
export function queryTerms(text){
  const parts = runTokens(text);
  const want = new Set(), whole = new Set();
  for (const p of parts){
    whole.add(p);
    if (p.length < 2) want.add(p);
    else for (let i = 0; i + 1 < p.length; i++) want.add(p.slice(i, i + 2));
  }
  return { want: [...want], whole: [...whole] };
}

/* 构建期：把 visiblePosts() 交出来的那批稿子切成索引文档。
   地址的拼法 `/essays/<id>/` 全站只有一种写法（`PostRow.astro:17` 与 `/essays/` 那张表都是它），
   这里照抄它而不是从 `p.url` 另推一份：`url` 是 loader 给的形状，目录式 URL 末尾那枚斜杠不归它管，
   拿它当地址就会造出"索引里指得到、页面上跳不到"的那半像素差。
   ⚠️ **站内相对路径，一枚字面域名都不许出现**（§16 那枚 PUBLIC_SITE 开关管的是绝对地址，
   搜索产物根本不在它管辖范围内——换域名时这份 JSON 一个字节都不用改）。
   `b` 那一层由调用方给（"标题 + 摘要 + 正文纯文本"拼一串）：
   只喂标题会当场红在命门那一格（tools/search-check.mjs 的变异档实测过这一刀），
   所以正文是这份索引唯一的内容来源，t/e 只是访客看得见的那两行。 */
export function buildIndex(posts, textOf){
  return posts.map(p => {
    const t = String(p.data.title || '');
    const e = String(p.data.excerpt || '');
    const b = String(textOf(p) || '');
    return { u: `/essays/${p.id}/`, t, e, k: docTokens([t, e, b].join(' ')) };
  });
}

/* 运行时：拿输入去比对。返回命中清单，按"整枚词元命中数 → 二字窗命中数 → 索引里的先后"排。
   第三把尺子就是 `visiblePosts()` 的顺序（置顶在最前、其余按日期倒序）——
   索引里的先后不是随手排的，所以并列时沿用它是白拿的一条信息，不再另发明一套打分。 */
export function searchDoc(index, query){
  const q = String(query || '').trim();
  if (!q) return [];
  const { want, whole } = queryTerms(q);
  if (!want.length) return [];
  const hits = [];
  for (const d of index){
    const keys = d && d.k;
    if (!Array.isArray(keys) || !keys.length) continue;   /* 一枚词元都没有的文档不参与：它什么都匹配不上 */
    const have = new Set(keys);
    let matched = 0;
    for (const w of want) if (have.has(w)) matched++;
    if (matched < want.length) continue;                  /* AND：少一枚窗就不算这篇 */
    let exact = 0;
    for (const w of whole) if (have.has(w)) exact++;
    hits.push({ u: d.u, t: d.t, e: d.e, exact, partial: matched });
  }
  return hits.sort((a, b) => (b.exact - a.exact) || (b.partial - a.partial));
}

/* 命中高亮用的：把标题/摘要里**真的连着出现过**的那几段挑出来交给 <mark>。
   先按整段找，整段落不了地才退到它的二字窗——两个场合标的都是字面连续的字符串。
   ⚠️ 只认字面连续，不认"二字窗都齐了"：后者会在「能度」这种输入下把不相邻的两块字都刷上颜色，
   那是在替访客编造"这里出现过你打的这串字"。与其标错不如不标（§12 假反馈同族）。 */
export function markRanges(text, query){
  const src = String(text || '');
  const low = src.toLowerCase();
  const spans = [];
  const find = needle => {
    if (!needle) return;
    let at = 0;
    while ((at = low.indexOf(needle, at)) !== -1){
      spans.push([at, at + needle.length]);
      at += Math.max(1, needle.length);
    }
  };
  for (const part of runTokens(query)){
    const before = spans.length;
    find(part);
    if (spans.length === before && part.length > 1)          /* 整段没连着出现过 ⇒ 退到二字窗 */
      for (let i = 0; i + 1 < part.length; i++) find(part.slice(i, i + 2));
  }
  /* 合并：按起点排，起点相同留长的；被前一段整个盖住的丢掉（二字窗是整段的子串，会成对重复） */
  const out = [];
  for (const s of spans.sort((a, b) => (a[0] - b[0]) || (b[1] - a[1]))){
    const prev = out[out.length - 1];
    if (prev && s[0] >= prev[0] && s[1] <= prev[1]) continue;
    if (prev && s[0] < prev[1]) { prev[1] = Math.max(prev[1], s[1]); continue; }
    out.push([s[0], s[1]]);
  }
  return out;
}
