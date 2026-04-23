# `/zoon` 快捷触发 — 把 "推 Zoon" 从被动路由改成一条命令

## 问题

今天在 Claude Code / Cursor 这类本地 agent 里用 Zoon，走通流程要等
skill §0 "plan-grade 内容出现 → 问'推 Zoon 还是 chat'" 这个被动路由。
想要 "接下来都推 Zoon" 得靠用户**嘴说**——*"以后都直接推 Zoon"*——
agent 才切 session 模式。

用户想要的是一条**显式快捷命令**：打 `/zoon`，当场切到推 Zoon 模式，
同时挑好目的地（新建 / 贴已有 doc）。之后 agent 产出任何 plan-grade
内容就自动进 doc，不再问一遍。

## 用户已对齐的设计决策

1. **触发时机**：只记 session 偏好，**不**立即建空 doc。等下一次真正
   有 plan-grade 内容再建（跟 §0 被动路由风格一致，避免孤儿 doc）。
2. **"贴已有 doc" 输入形态**：用户粘带 token 的完整 URL
   （`http://host/d/<slug>?token=<token>`），agent 从中 parse slug +
   token。parse 失败 → 回问一次，不猜。
3. **架构归属**：写成 skill §0 的一个子节 "快捷触发：`/zoon`"，不另起
   章节——本质是 §0 "session-level 偏好" 的显式触发器。

## 改动清单

### 1. `docs/zoon-agent.skill.md` — 新增 §0 子节

在 §0 "Session-level preference for plan-grade output" 段之后、§0
"Routing rules" 之前，插入新子节：

```markdown
### Shortcut trigger: `/zoon`

When the user types `/zoon` (or `/Zoon` / `/ZOON`) as a standalone
message — not as part of a sentence — treat it as an **explicit
session-level switch into mode A** (push plan-grade output to Zoon by
default), plus a destination pick.

**Reply with exactly this shape — two lines, then a pick question:**

> 好，之后 plan-grade 的输出我帮你推到 Zoon。
>
> A) 新建一个 doc
> B) 贴到已有 doc（发我带 token 的 URL：`<host>/d/<slug>?token=<token>`）

Then **stop and wait** for the pick. Do not build anything, do not
pre-create a doc. Empty docs end up orphaned; defer until the user
actually has plan-grade content.

**On pick A (new doc):** reply one line — *"收到。下次长内容我新建一个
doc 推过去。"* — and remember for this session: next plan-grade output
triggers `POST /api/public/documents` (§0 "The call" flow). No doc
created yet. When it does get created, share just the tokenized `url`
from the response in chat.

**On pick B (existing doc):** wait for the user to paste a URL. Parse
`slug` and `token` from it:

- URL shape: `<host>/d/<slug>?token=<token>` — `slug` is the path
  segment after `/d/`, `token` is the `token` query param.
- **Parse failure** (no `/d/<slug>` path, or no `token` query) → reply
  once: *"URL 看起来不对，应该长这样：`<host>/d/<slug>?token=<...>`。
  再发一次？"* and wait. Do NOT try to guess.

Once parsed, remember `{slug, token, host}` for this session. Next
plan-grade output routes to that doc via §2.A `insert_at_end` (no
snapshot / ref / baseRevision needed — append commutes safely). In the
chat, just confirm: *"收到，推到 <slug>。"* Don't pre-fetch the doc.

**After either pick**, the session-level mode is **A** for the rest of
this conversation:
- §0's per-plan "推到 Zoon 还是 chat？" ask is **off** — you've already
  been told.
- The stay-in-chat whitelist (one-paragraph answers, code snippets,
  short diagnostics, quick clarifications) is unchanged — don't push
  a 2-line answer into Zoon just because mode A is on.
- Mode A sticks until the user flips it ("算了都写 chat" → mode C, or
  "改成每次问" → mode B).

**What `/zoon` does NOT do:**
- Does not retroactively push the conversation so far into Zoon — it's
  forward-only. If the user wants the last response migrated, they'll
  ask (and you can POST it as the first append into the chosen doc).
- Does not create an empty doc. Wait for real content.
- Does not override §0's plan-grade judgment. Short answers stay in
  chat even under mode A.
```

### 2. `src/tests/zoon-slash-trigger-skill-contract.test.ts` — 新增 grep 测试

一个轻量结构测试，grep skill 文本确认关键要素存在。防止未来误删整段。

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const skillPath = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '../../docs/zoon-agent.skill.md',
);
const skill = readFileSync(skillPath, 'utf8');

// Shortcut trigger must be documented as a standalone subsection in §0.
assert(
  /Shortcut trigger:\s*`\/zoon`/.test(skill),
  'skill must document the /zoon shortcut trigger under §0',
);

// The two branches (new / existing) must both be present.
assert(/新建一个 doc/.test(skill), '/zoon reply must offer option A: 新建一个 doc');
assert(/贴到已有 doc/.test(skill), '/zoon reply must offer option B: 贴到已有 doc');

// Must explicitly tell agent not to pre-create empty docs.
assert(
  /(empty docs?|not.*pre-create|defer until)/i.test(skill),
  'skill must explicitly defer doc creation until plan-grade content exists',
);

// Must handle URL parse failure by asking again, not guessing.
assert(
  /Parse failure|parse.*fail|URL 看起来不对/i.test(skill),
  'skill must tell agent to re-ask on URL parse failure',
);

console.log('✓ /zoon shortcut trigger contract present in skill');
```

### 3. 不动

- 服务端：没有 API 改动。复用现有 `POST /api/public/documents` (§0)
  和 `POST /api/agent/<slug>/edit/v2 insert_at_end` (§2.A)。
- 其它 skill 段：§First contact 不动（那是 entry point C "没 doc 没
  任务"的场景，和 `/zoon` 不冲突）。§0 主体不动。§2.A / §2.B 不动。
- agent-docs.md 不动（不新增 API）。

## 验证

1. `npx tsx src/tests/zoon-slash-trigger-skill-contract.test.ts` 绿
2. `npx tsx src/tests/zoon-agent-contract-doc-matches-routes.test.ts`
   绿（确认 skill 改动没破其它契约）
3. `npm run build` 干净
4. `npm test` 全绿
5. **人工冒烟**（本地 Claude Code + 这个 skill）：
   - 打 `/zoon` → 看到两行介绍 + A/B 问句
   - 选 A → 看到"收到，下次长内容推 Zoon"
   - 让 agent 出一个 plan-grade 输出（比如"给我出一版漏斗分析大纲"）
     → agent 调 `POST /api/public/documents`，回一个 `url` 给你
   - 选 B 流程：粘一个带 token 的 URL → 看 agent 正确 parse 并存偏好
     → 下一次 plan-grade 内容走 `insert_at_end` 到该 slug
   - URL 故意粘错 → agent 回问，不瞎猜

## 不在本 plan 范围

- **回溯同步** "把上一轮回答也推进 doc"：用户原话是"agent 输出的 plan
  内容"，默认前向。需要回溯时用户明说，agent 把上一条 assistant 消息
  作为首个 `insert_at_end` payload 即可——不需要 skill 层新增规则。
- **多 doc 并发**（一条 session 推好几个 doc）：mode A 只绑一个目的地；
  想切换就再打一次 `/zoon`。
- **跨 session 持久化偏好**：仅 session 内有效，新 chat 要重打。跨
  session 记忆是 memory 系统的事，这个 skill 不管。
- **服务端侧 `/zoon` 命令**：这个命令是本地 agent 层的约定，Zoon 服务
  端不需要识别 `/zoon`。

## 关键文件

| 文件 | 改什么 |
|---|---|
| `docs/zoon-agent.skill.md` | §0 新增子节 "Shortcut trigger: `/zoon`" |
| `src/tests/zoon-slash-trigger-skill-contract.test.ts` | 新建 grep 结构测试 |

## 风险 & 退路

- **风险 1：`/zoon` 误触发**。用户在正文里提 "就像 /zoon 里那种"——
  agent 会不会当触发器？**缓解**：skill 明写"standalone message, not
  part of a sentence"，判断简单（整条消息是否 === `/zoon`）。
- **风险 2：URL parse 不够鲁棒**。托管环境 URL 可能带额外参数、编码
  字符等。**缓解**：skill 明写"parse fail → 回问一次，不猜"。失败成本
  只是多问一轮，不是写错 doc。
- **风险 3：Claude Code 的 `/zoon` 实际是 skill 触发命令**，不是
  user-to-agent 的 slash。skill 一旦被 `/zoon` 激活就会走 §First
  contact ——**现在的 `/zoon` 语义是 "激活 skill + 打招呼"**。这个新
  子节的语义 "用户在已有对话中插一条 `/zoon` 切模式" 要和 skill 激活
  区分开。**缓解**：子节开头明写触发条件是"用户在**已有对话中**发
  `/zoon`" vs §First contact 是"skill 第一次被激活"，两种情况在 skill
  里是互斥分支。
- **Revert**：改动只在 skill + 1 个测试，`git revert` 安全。
