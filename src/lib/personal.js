/* 手记与小东西的**唯一取数入口**（与 `src/lib/posts.js` 同一族：页面只准调这里，顺序只许算一遍）。
   为什么必须有这一份：`/notes/`、首页那一条收尾、关于页"last walk"与 `now` 那一列读的是同一批手记，
   "最新一条"在两处各排一次序就是两枚真值（§16 派生字段铁律：值 = f(同一张表里的参数)，只许一个出处）。
   ⚠️ 这两枚集合里的文件**不在 git 里**（`.gitignore` 的 `src/content/notes/*.md`／`src/content/things/*.md`，
      作者 2026-10-01 点名「仓库只留模板，我自己发的不要提交」）。所以：
      · 零枚是**在册状态**，不是坏了 —— 每一处消费点都得有空态兜住（`src/pages/notes.astro` 的 `.tax-empty`、
        首页与关于页那一块整块不出现）。
      · 目录本身要留在仓库里（那一旁的 `.gitkeep`）：glob loader 的 `base` 指向一枚不存在的目录时
        `astro build` 当场红，而红的是配置，不是"这个作者还没写手记"。
   ⚠️ 这一份文件不写"空值怎么办"：可空键的默认值住在 `src/content.config.ts` 的 schema（`blankSlot`），
      页面只管那一枚空串渲染成不出现。 */
import { getCollection } from 'astro:content';

/* 手记按日期倒序（最新在最前）；同一天按文件名倒序，为了两处调用拿到**同一串**顺序而不是插入顺序。 */
export async function allNotes(){
  const ns = await getCollection('notes');
  return ns.sort((a, b) => b.data.date - a.data.date || String(b.id).localeCompare(String(a.id)));
}

/* 小东西按 front matter 的 `order` 升序；没填 `order` 的排最后（编者没说话时不替他插队），再按文件名。 */
export async function allThings(){
  const ts = await getCollection('things');
  return ts.sort((a, b) => {
    const oa = a.data.order ?? Number.POSITIVE_INFINITY;
    const ob = b.data.order ?? Number.POSITIVE_INFINITY;
    return oa - ob || String(a.id).localeCompare(String(b.id));
  });
}
