/* 用 GitHub Data API 推历史，而不是 git push。
   原因（本机实测，2026-09-27）：github.com 的 443 直连真 IP 超时，走代理时 git 收到不受信 CA
   （schannel SEC_E_UNTRUSTED_ROOT）⇒ git 协议这条路不通；只有 api.github.com 是可达且证书可信的。
   因此这里也不把 token 交给那台中间人代理，并且绝不落盘到 .git/config。

   用法：node tools/gh-push.mjs <owner>/<repo> [--branch master]
        token 从 GITHUB_TOKEN 环境变量读，或按顺序找这三个文件（内容是裸 token，不要有别的字符）：
          ~/.config/gh-tok   ← 推荐放这里：一次放好，不在临时目录里，不会被清理，脚本也**不会删它**
          %TEMP%/gh-tok 或 /tmp/gh-tok
        脚本只读不写：不打印 token、不把它写进 .git/config、也不在推完之后删文件（要删由人删）。
*/
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

const [,, TARGET, ...REST] = process.argv;
if (!TARGET || !/^[\w.-]+\/[\w.-]+$/.test(TARGET)) {
  console.log('用法：node tools/gh-push.mjs <owner>/<repo> [--branch master]');
  process.exit(2);
}
const branchArg = REST.indexOf('--branch');
const BRANCH = branchArg >= 0 ? REST[branchArg + 1] : 'master';
const DRY = REST.includes('--dry-run');
const [OWNER, REPO] = TARGET.split('/');

let token = process.env.GITHUB_TOKEN || '';
if (!token) {
  for (const p of [join(homedir(), '.config', 'gh-tok'), join(tmpdir(), 'gh-tok'), '/tmp/gh-tok']) {
    if (existsSync(p)) { token = readFileSync(p, 'utf8').trim(); break; }
  }
}
if (!token) { console.log('✗ 没拿到 token（用 GITHUB_TOKEN 环境变量，或把裸 token 放进 ~/.config/gh-tok —— 这个位置不会被临时清理，脚本也不删它）'); process.exit(2); }
if (/[\s\r\n]/.test(token)) { console.log(`✗ token 里混进了空白字符（长度 ${token.length}），拒绝使用`); process.exit(2); }

const git = (...a) => execFileSync('git', ['-c', 'core.quotePath=false', ...a], { encoding: 'utf8' });
const gitBin = sha => execFileSync('git', ['cat-file', 'blob', sha], { maxBuffer: 64 << 20 });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, path, body, attempt = 0) {
  const send = async () => fetch('https://api.github.com' + path, {
    method,
    signal: AbortSignal.timeout(60_000),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let res;
  try {
    res = await send();
  } catch (e) {
    /* 本机会出现瞬时连接超时（dry-run 刚过、下一步就 Connect Timeout），
       65 次串行请求一次抖动就整轮废掉 ⇒ 网络错与 5xx 一律退避重试，最多 5 次 */
    if (attempt < 5) {
      const wait = 700 * 2 ** attempt;
      console.log(`  …${method} ${path.split('?')[0]} 网络错 ${e.code || e.name || e.message}，${wait}ms 后第 ${attempt + 1} 次重试`);
      await sleep(wait);
      return api(method, path, body, attempt + 1);
    }
    throw new Error(`${method} ${path} 重试 5 次仍失败：${e.code || e.name || e.message}`);
  }

  if (res.status >= 500 && attempt < 5) {
    const wait = 700 * 2 ** attempt;
    console.log(`  …${method} ${path.split('?')[0]} HTTP ${res.status}，${wait}ms 后第 ${attempt + 1} 次重试`);
    await sleep(wait);
    return api(method, path, body, attempt + 1);
  }
  if (res.status === 404 || res.status === 403) {
    // 限流会带 Retry-After；等一次再试，不算进网络预算
    const retryAfter = Number(res.headers.get('retry-after') || 0);
    if (res.status === 403 && retryAfter && attempt < 2) {
      await sleep(retryAfter * 1000 + 500);
      return api(method, path, body, attempt + 1);
    }
  }
  if (!res.ok) {
    const t = await res.text();
    /* GitHub 偶发回 400 "We received a malformed request"，同一个请求原样重投就成功
       （实测 2026-09-27 推到第 4 个提交时命中）。只认这一种 400，其余 4xx 照抛，
       免得把真正的内容错误（超限、字段非法）当抖动吞掉 */
    if (res.status === 400 && /malformed req/i.test(t) && attempt < 5) {
      const wait = 700 * 2 ** attempt;
      console.log(`  …${method} ${path.split('?')[0]} HTTP 400 malformed，${wait}ms 后第 ${attempt + 1} 次重试`);
      await sleep(wait);
      return api(method, path, body, attempt + 1);
    }
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
}

/* 树条目直接取 git 的对象信息，不读工作区：工作区可能被 core.autocrlf 改写，
   那会让上传后的 blob sha 与本地对不上（这台机器上真栽过）。
   用 `ls-tree -z` 的默认输出（"mode type sha\tpath" 以 NUL 结尾），不依赖 --format 对 %00 的处理 */
function entriesOf(commit) {
  const raw = execFileSync('git', ['ls-tree', '-r', '-z', commit], { encoding: 'utf8' });
  const out = [];
  for (const rec of raw.split('\0')) {
    if (!rec.trim()) continue;
    const tab = rec.indexOf('\t');
    const [mode, type, sha] = rec.slice(0, tab).split(' ');
    if (type !== 'blob') throw new Error(`${commit} 的 ${rec.slice(tab + 1)} 不是 blob（type=${type}），脚本只处理普通文件`);
    out.push({ sha, mode, path: rec.slice(tab + 1) });
  }
  return out;
}

const uploaded = new Set();
async function pushBlob(sha) {
  if (uploaded.has(sha)) return;
  const buf = gitBin(sha);
  const r = await api('POST', `/repos/${OWNER}/${REPO}/git/blobs`, {
    content: buf.toString('base64'), encoding: 'base64',
  });
  if (r.sha !== sha) throw new Error(`blob 落库后 sha 变了：本地 ${sha} ≠ 远端 ${r.sha}（内容被改写过，停）`);
  uploaded.add(sha);
  process.stdout.write(`  blob ${sha.slice(0, 8)} ${buf.length}B ✓\n`);
}

const commits = git('rev-list', '--reverse', 'HEAD').trim().split('\n').filter(Boolean);
console.log(`→ ${TARGET} 分支 ${BRANCH}，共 ${commits.length} 个提交`);

const status = await api('GET', `/repos/${OWNER}/${REPO}`).catch(e => {
  if (/HTTP 404/.test(e.message)) {
    console.log(`✗ 仓库 ${TARGET} 不存在（或这个 token 看不见它）。fine-grained PAT 不能建仓——` +
      `请在 https://github.com/new 建一个空仓库（不要勾 README / .gitignore / License），或改用带 repo 范围的 classic token。`);
    process.exit(1);
  }
  throw e;
});
console.log(`  仓库存在：${status.full_name} · ${status.private ? 'private' : 'public'} · 默认分支 ${status.default_branch}`);

/* 只查一次 ref，绝不遍历远端历史：几百提交的仓库逐个 GET 会跑到天荒地老（实测卡死过一次） */
let remoteHead = null;
try { remoteHead = (await api('GET', `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`)).object.sha; }
catch { console.log('  远端还没有这个分支，按空仓处理'); }

const localSet = new Set(commits);
/* 远端头落在本地历史的第几个 ⇒ 它及其之前的都不用重推 */
let resumeFrom = remoteHead && localSet.has(remoteHead) ? commits.indexOf(remoteHead) + 1 : 0;
/* 远端头不在本地历史里 ≠ 一定推错了仓库。2026-09-28 实测到第二种成因：本地历史里有过并行分支
   （两张卡各自从同一个基线出发，其中一条被我快进掉，中间还留过一枚 merge commit），而这个脚本是
   `rev-list --reverse HEAD` 整链重建、每枚只挂**一个** parent ⇒ 它把那条并行历史摊平成一条，
   摊平点之后所有提交的 sha 都变了（远端于是持有一串本地没有的 sha）。
   解法不是 `--force`（那会改写已发布的历史），是**按树认亲**：树只由 blob sha + 路径 + mode 组成，
   不含日期、不含 parent ⇒ 远端头的树等于本地某一提交的树，就说明那一枚正是"远端已收到的最新内容"，
   从它的下一枚续推即可。认不出唯一孪生就照旧拒绝——别把"没对上"读成"该强推"。 */
let seedParent = null;
if (remoteHead && !localSet.has(remoteHead) && !REST.includes('--force')) {
  /* ⚠️ 别把这两步写成一行 `(await api(...)?.tree)?.sha`：`await` 的优先级**低于** `?.`，
     那串实际求的是 `api(...)?.tree`（一个 Promise 上没有 tree 字段）再 await ⇒ 恒为 undefined，
     于是"孪生 0 个"、报出来的错指哪儿不是哪儿（本轮实测被自己的错信息带去查了一遍历史线）。
     取字段和判空分两步写，取不到树就单独报一条。 */
  const remoteCommit = await api('GET', `/repos/${OWNER}/${REPO}/git/commits/${remoteHead}`);
  const remoteTree = remoteCommit && remoteCommit.tree ? remoteCommit.tree.sha : null;
  if (!remoteTree) throw new Error(`拿不到远端 ${BRANCH} 头 ${remoteHead.slice(0, 7)} 的树 sha，认亲这一步没法做` +
    `（不是历史线的问题，是这次 GET 没交出 tree 字段）`);
  const twin = commits.filter(c => git('rev-parse', `${c}^{tree}`).trim() === remoteTree);
  /* 孪生不止一枚时，先问"它们彼此是不是串在同一条线上"。会撞出这一格的成因是**空 merge**：
     `git merge --no-ff <分支>` 合一条内容上已经领先的分支，那枚 merge commit 的树与它的第一父逐字节相同
     ⇒ 同一棵树在同一条直线上出现两次（2026-09-30 推 card/topact 之后实测：`dd3a6a1` 与 `87715ec` 同树
     `4a21ab9`，而远端头 `1fb3ed1` 正是 `87715ec` 摊平后的那枚）。这种情况下"远端收过的最新内容"
     有唯一诚实的答案＝**串上最新的那枚**：它父链上每一枚都已推过，从它下一枚起是纯快进，一枚已发布提交都不改写。
     ⚠️ 反过来说，如果两枚同树提交互不为祖先（真的分了两条线），树就答不了"远端是哪一个"——
     猜错等于把别人那条线覆盖掉，照旧拒绝，并且把这条判据的名字留在错信息里，别让人顺手加 `--force`。 */
  const isAncestor = (a, b) => { try { git('merge-base', '--is-ancestor', a, b); return true; } catch { return false; } };
  let pick = twin[0];
  if (twin.length > 1) {
    const byAge = twin.slice().sort((x, y) => commits.indexOf(x) - commits.indexOf(y));
    for (let i = 1; i < byAge.length; i++) {
      if (!isAncestor(byAge[i - 1], byAge[i])) {
        throw new Error(`远端 ${BRANCH} 头 ${remoteHead.slice(0, 7)}（树 ${remoteTree.slice(0, 7)}）在本地有 ${twin.length} 枚同树提交，` +
          `而 ${byAge[i - 1].slice(0, 7)} 与 ${byAge[i].slice(0, 7)} 互不为祖先 ⇒ 那是真的两条历史线（先确认没推错仓库、` +
          `或本地被别的检出改写过）。"同树即同内容"在这一步只能判串、不能选线，所以拒绝。` +
          `确实要用本地历史接管请加 --force——那会改写已经发布出去的历史`);
      }
    }
    pick = byAge[byAge.length - 1];
    console.log(`  同树孪生 ${twin.length} 枚串在同一条线上（空 merge 的第一父与 merge commit 同树）⇒ 取最新那枚续推`);
  } else if (twin.length === 0) {
    throw new Error(`远端 ${BRANCH} 头 ${remoteHead.slice(0, 7)}（树 ${remoteTree.slice(0, 7)}）既不在本地 ${commits.length} 个提交里，` +
      `也没有任何一枚同树孪生（找到 0 个）——那是另一条历史线（先确认没推错仓库）。` +
      `确实要用本地历史接管请加 --force`);
  }
  resumeFrom = commits.indexOf(pick) + 1;
  seedParent = remoteHead;
  console.log(`  按树认亲：远端头 ${remoteHead.slice(0, 7)} 的树 == 本地 ${pick.slice(0, 7)} 的树（${remoteTree.slice(0, 7)}）` +
    ` ⇒ 从其后续推 ${commits.length - resumeFrom} 枚，不改写已发布历史`);
}

try {
  const t = await api('GET', `/repos/${OWNER}/${REPO}/git/trees/${remoteHead || BRANCH}?recursive=1`);
  t.tree.forEach(x => { if (x.type === 'blob') uploaded.add(x.sha); });
  console.log(`  远端已有 ${uploaded.size} 个 blob 可复用`);
} catch { console.log('  远端无树可复用'); }

if (DRY) {
  let bytes = 0;
  const seen = new Set(uploaded);
  let todo = 0;
  for (const c of commits.slice(resumeFrom)) for (const e of entriesOf(c)) {
    if (seen.has(e.sha)) continue;
    seen.add(e.sha); todo++;
    bytes += gitBin(e.sha).length;
  }
  console.log(`--dry-run：待推 ${commits.length - resumeFrom}/${commits.length} 个提交，` +
    `需上传 ${todo} 个 blob / ${(bytes / 1048576).toFixed(2)} MB（已去重），写请求约 ${todo + (commits.length - resumeFrom) * 2 + 1} 次`);
  console.log(`            本地历史 ${commits[0].slice(0, 7)}..${commits[commits.length - 1].slice(0, 7)} @ ${BRANCH}`);
  process.exit(0);
}

const existing = new Set(commits.slice(0, resumeFrom));
let parentSha = seedParent ?? (resumeFrom ? commits[resumeFrom - 1] : null);
let headSha = parentSha;
const drift = [];
for (const local of commits) {
  if (existing.has(local)) { headSha = local; continue; }
  const meta = git('show', '-s', '--format=%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI%x00%B', local).split('\0');
  const [an, ae, aI, cn, ce, cI] = meta;
  const message = meta.slice(6).join('\0').replace(/\n+$/, '') + '\n';

  const ents = entriesOf(local);
  const localTree = git('rev-parse', `${local}^{tree}`).trim();
  process.stdout.write(`提交 ${local.slice(0, 7)} · ${ents.length} 文件\n`);
  for (const e of ents) await pushBlob(e.sha);

  const tree = await api('POST', `/repos/${OWNER}/${REPO}/git/trees`, {
    tree: ents.map(e => ({ path: e.path, mode: e.mode, type: 'blob', sha: e.sha })),
  });
  /* 树 sha 是硬判据：只由 blob sha + 路径 + mode 决定，不含日期 ⇒ 远端与本地必须逐位相同，
     相同就等于这一提交的全部文件内容字节级一致（blob sha 本身就是内容的 sha1） */
  if (tree.sha !== localTree) {
    throw new Error(`提交 ${local.slice(0, 7)} 的树不一致：本地 ${localTree.slice(0, 7)} ≠ 远端 ${tree.sha.slice(0, 7)}（内容或路径被改写过，停）`);
  }

  const commit = await api('POST', `/repos/${OWNER}/${REPO}/git/commits`, {
    message, tree: tree.sha, parents: parentSha ? [parentSha] : [],
    author: { name: an, email: ae, date: aI },
    committer: { name: cn, email: ce, date: cI },
  });
  /* commit sha 允许不同，但**成因不是日期规范化**（这句错过：实测过远端 sha 与本地逐位相同的推送，
     比如 33a6b40 那次——若 GitHub 真把 +08:00 改写成 Z，那一枚就不可能相等）。真正的成因只有一个：
     **parent 不一样**。本脚本整链线性化（每枚只挂一个 parent），本地历史一旦有过并行分支或 merge
     commit，摊平点之后每枚的 parent 都换了 ⇒ sha 全变；而从这里起，之后每一枚都挂着远端那一串
     sha 作父，所以差异会一路继承下来，哪怕后来的历史完全是线性的。
     ⇒ 判"推上去没有"永远看**树 sha**（上面那条硬判据），别看提交 sha。 */
  if (commit.sha !== local) drift.push(`${local.slice(0, 7)} → ${commit.sha.slice(0, 7)}`);
  console.log(`  tree ${tree.sha.slice(0, 7)} 与本地一致 · commit ${commit.sha.slice(0, 7)}`);
  parentSha = commit.sha;
  headSha = commit.sha;
}

if (!headSha) { console.log('✓ 远端已经和本地一致，没有要推的提交'); process.exit(0); }

try {
  await api('POST', `/repos/${OWNER}/${REPO}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: headSha });
  console.log(`✓ 建分支 refs/heads/${BRANCH} @ ${headSha.slice(0, 7)}`);
} catch (e) {
  /* 非快进（远端头不是本地历史的祖先）只有 --force 才允许，且显式打出来：
     这一步会丢掉远端原有提交（GitHub 侧保留为悬空对象一段时间，可再指回去） */
  const forced = REST.includes('--force');
  await api('PATCH', `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, { sha: headSha, ...(forced ? { force: true } : {}) });
  console.log(`✓ ${forced ? '强制' : '快进'}更新分支 refs/heads/${BRANCH} @ ${headSha.slice(0, 7)}`);
}

if (status.default_branch !== BRANCH) {
  const r = await api('PATCH', `/repos/${OWNER}/${REPO}`, { default_branch: BRANCH });
  console.log(`✓ 默认分支 → ${r.default_branch || BRANCH}`);
}

/* 落库后独立复验：重新拉远端树，与本地最后一个提交逐条比 path + blob sha + mode */
const after = await api('GET', `/repos/${OWNER}/${REPO}/git/trees/${headSha}?recursive=1`);
const want = entriesOf(commits[commits.length - 1]);
const remoteBlobs = after.tree.filter(t => t.type === 'blob');
const bad = want.filter(w => !remoteBlobs.some(t => t.path === w.path && t.sha === w.sha && t.mode === w.mode));
const extra = remoteBlobs.filter(t => !want.some(w => w.path === t.path));
console.log(`远端树复验：本地 ${want.length} · 远端 ${remoteBlobs.length} · 不符 ${bad.length} · 多出 ${extra.length}`);
bad.forEach(b => console.log('  ✗ ' + b.path));
extra.forEach(x => console.log('  ? 远端多出 ' + x.path));
if (drift.length) console.log(`⚠️ ${drift.length} 枚提交 sha 与本地不同（parent 被线性化过、一路继承；` +
  `内容不受影响——每枚都验过 tree 与本地逐位相同，判推送成没成只看树 sha）：\n   ` + drift.join('\n   '));
process.exitCode = bad.length || extra.length ? 1 : 0;
