import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: skill §0 过去是"output 长了 agent 自己决定推不推"的 judgment
// rule，实际跑下来 agent 经常直接往 terminal 喷 500 行 plan，污染 chat、人类
// 还没决定要不要留档就被塞满了。
//
// 修复：§0 升级成最高优先级的"先问后写"规则 —— 产 plan / spec / 文章 级别
// 的结构化输出前，必须先问人类"推 Zoon 还是留 chat"。> 100 行无论类型都推。
//
// 这个测试锁死三条不能被无意 revert 的 invariants：
//   1. §0 必须标注为最高优先级（"Top-priority" 标记）
//   2. §0 必须出现"先问再写"的 imperative 文案
//   3. §0 必须保留 ~100 行的长度门槛（独立于问答规则）
//
// 任何未来 PR 想改这三条都要显式更新这个测试，避免悄悄降级回旧行为。

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const skill = readFileSync(path.join(repoRoot, 'docs', 'zoon-agent.skill.md'), 'utf8');

// 抓 §0 的段落范围（从 "## 0." 到 下一个 "## " 之前）
const sec0Start = skill.indexOf('\n## 0.');
assert(sec0Start !== -1, 'Expected skill to have a §0 section');
const sec0End = skill.indexOf('\n## ', sec0Start + 5);
assert(sec0End !== -1, 'Expected a §1+ section after §0');
const sec0 = skill.slice(sec0Start, sec0End);

// 1) 最高优先级标记（视觉锚点，agent 读第一屏就能看到）
assert(
  /top-priority/i.test(sec0),
  'Expected §0 to be marked as the top-priority rule of the skill',
);

// 2) "先问后写" imperative —— 必须在动笔前问
assert(
  /stop and ask before you write/i.test(sec0),
  'Expected §0 to contain the "stop and ask before you write" imperative',
);

// 3) 问句模板锚点（中文）：必须给 agent 一个固定句式，减少自由发挥漂移
assert(
  sec0.includes('推到 Zoon') && sec0.includes('还是在这里直接写'),
  'Expected §0 to provide a Chinese ask template with "推到 Zoon … 还是在这里直接写?"',
);

// 4) 枚举 plan-grade kinds（plan / spec / design doc / article / 多段分析）
//    确保 agent 知道这条规则具体覆盖哪些产物，不会狭义理解成只有"plan"
for (const kind of ['plan', 'spec', 'design doc', 'article']) {
  assert(
    sec0.toLowerCase().includes(kind.toLowerCase()),
    `Expected §0 to list "${kind}" as a plan-grade output kind that triggers the ask`,
  );
}

// 5) 100 行长度门槛 —— 独立于问答规则，保底避免长输出漏推
assert(
  /~?100 lines/i.test(sec0),
  'Expected §0 to keep the ~100 lines length threshold for auto-push',
);

// 6) Stay-in-chat 白名单 —— 明确列出不要问、直接答的场景，否则 agent 会
//    在每个回复前都弹"要推 Zoon 吗？"变噪声
assert(
  /code snippets?/i.test(sec0) && /one-paragraph answers?/i.test(sec0),
  'Expected §0 to enumerate stay-in-chat cases (one-paragraph answers, code snippets)',
);

// 7) 同一 plan 的后续迭代不重复问 —— 避免改稿过程被问个不停
assert(
  /don't ask twice/i.test(sec0) || /stay on that surface for every follow-up/i.test(sec0),
  'Expected §0 to instruct agents not to re-ask for follow-up iterations of the same plan',
);

console.log('✓ skill §0 locks the ask-before-plan-grade-output rule');
