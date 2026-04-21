import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: agent 在读 /state 或发 /ops 时，如果 projection 还没 ready，
// 之前只会拿到 repairPending:true，但服务端并不会主动触发 repair，也没告诉
// agent 该等多久再 poll。生产上看到的症状：agent 60 轮 retry 全空跑，每轮都
// 在重刷 projection stale 的文档；/ops 第一次 precondition 失败也没人推
// projection-repair，下一次 retry 大概率继续失败。
//
// 修复：
//   1) /state handler 检测 repairPending/projectionFresh=false 时，调用
//      queueProjectionRepair(slug, 'agent_state_read') 并在响应里带上
//      retryAfterMs（agent 的 backoff 提示）。
//   2) /ops 的三个 precondition 失败响应（PROJECTION_STALE /
//      AUTHORITATIVE_BASE_UNAVAILABLE / 通用 STALE_BASE 家族）都补上
//      retryAfterMs + nextSteps（可执行的恢复步骤，mirror proof 契约）。
//
// 这个测试用源码扫描锁住 4 条不变式。如果后续 PR 去掉这些字段或 nudge，会
// 直接在 CI 里红起来。

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const src = readFileSync(path.join(repoRoot, 'server', 'agent-routes.ts'), 'utf8');

function assertContains(needle: string, label: string) {
  assert(src.includes(needle), `${label}: expected agent-routes.ts to contain ${JSON.stringify(needle)}`);
}

// --- 1) queueProjectionRepair is imported from ./collab.js ---
assertContains('queueProjectionRepair', 'queueProjectionRepair must be referenced');
// Must be in the collab.js import block, not accidentally a string literal
const importBlockMatch = src.match(/from '\.\/collab\.js';/);
assert(importBlockMatch, "Expected './collab.js' import block");
const beforeImport = src.slice(0, (importBlockMatch.index ?? 0));
assert(
  beforeImport.includes('queueProjectionRepair'),
  'queueProjectionRepair must be imported from ./collab.js (not just referenced)',
);

// --- 2) /state handler nudges + emits retryAfterMs when stale ---
const stateHandlerStart = src.indexOf("agentRoutes.get('/:slug/state'");
assert(stateHandlerStart !== -1, "GET /:slug/state handler not found");
// 下一个 top-level `agentRoutes.` 声明之前的都算 handler 体
const stateHandlerEnd = src.indexOf("\nagentRoutes.", stateHandlerStart + 1);
const stateBody = src.slice(stateHandlerStart, stateHandlerEnd === -1 ? src.length : stateHandlerEnd);

assert(
  stateBody.includes("queueProjectionRepair(slug, 'agent_state_read')"),
  "/state must call queueProjectionRepair(slug, 'agent_state_read') when projection is stale",
);
assert(
  /body\.retryAfterMs\s*=\s*\d+/.test(stateBody),
  '/state must set body.retryAfterMs (polling hint) when projection is stale',
);
assert(
  /repairPending\s*===\s*true[\s\S]{0,80}projectionFresh\s*===\s*false|projectionFresh\s*===\s*false[\s\S]{0,80}repairPending\s*===\s*true/.test(stateBody),
  '/state nudge must trigger on both repairPending=true and projectionFresh=false',
);

// --- 3) enforceMutationPrecondition failures include nextSteps + retryAfterMs ---
const preconditionStart = src.indexOf('async function enforceMutationPrecondition(');
assert(preconditionStart !== -1, 'enforceMutationPrecondition not found');
// 函数体：到下一个 top-level function/const 之前
const preconditionEnd = src.indexOf('\nfunction ', preconditionStart + 1);
const preconditionBody = src.slice(preconditionStart, preconditionEnd === -1 ? src.length : preconditionEnd);

// 3a) PROJECTION_STALE branch has retryAfterMs + nextSteps + nudge
const projectionStaleIdx = preconditionBody.indexOf("code: 'PROJECTION_STALE'");
assert(projectionStaleIdx !== -1, "PROJECTION_STALE branch not found in enforceMutationPrecondition");
const projectionStaleBlock = preconditionBody.slice(projectionStaleIdx, projectionStaleIdx + 800);
assert(
  /retryAfterMs\s*:\s*\d+/.test(projectionStaleBlock),
  'PROJECTION_STALE response must include retryAfterMs',
);
assert(
  projectionStaleBlock.includes('nextSteps'),
  'PROJECTION_STALE response must include nextSteps array',
);
assert(
  projectionStaleBlock.includes("queueProjectionRepair(slug, 'ops_precondition_fail')"),
  'PROJECTION_STALE branch must nudge queueProjectionRepair(slug, ops_precondition_fail)',
);

// 3b) AUTHORITATIVE_BASE_UNAVAILABLE branch
const authBaseIdx = preconditionBody.indexOf("code: 'AUTHORITATIVE_BASE_UNAVAILABLE'");
assert(authBaseIdx !== -1, 'AUTHORITATIVE_BASE_UNAVAILABLE branch not found');
const authBaseBlock = preconditionBody.slice(authBaseIdx, authBaseIdx + 800);
assert(
  /retryAfterMs\s*:\s*\d+/.test(authBaseBlock),
  'AUTHORITATIVE_BASE_UNAVAILABLE response must include retryAfterMs',
);
assert(
  authBaseBlock.includes('nextSteps'),
  'AUTHORITATIVE_BASE_UNAVAILABLE response must include nextSteps array',
);

// 3c) Generic stage-precondition failure (the !opPrecondition.ok branch)
const opPreIdx = preconditionBody.indexOf('if (!opPrecondition.ok)');
assert(opPreIdx !== -1, 'Generic precondition-fail branch not found');
const opPreBlock = preconditionBody.slice(opPreIdx, opPreIdx + 1200);
assert(
  /retryAfterMs\s*:\s*\d+/.test(opPreBlock),
  'Generic precondition-fail response must include retryAfterMs',
);
assert(
  opPreBlock.includes('nextSteps'),
  'Generic precondition-fail response must include nextSteps array',
);

// --- 4) nextSteps are NON-EMPTY arrays (avoid accidentally shipping `nextSteps: []`) ---
// 简单扫：每个含 nextSteps 的响应里，nextSteps 后面 500 字符内必须出现一个字符串
for (const block of [projectionStaleBlock, authBaseBlock, opPreBlock]) {
  const nextStepsIdx = block.indexOf('nextSteps');
  const windowAfter = block.slice(nextStepsIdx, nextStepsIdx + 500);
  assert(
    /['"`][^'"`]{10,}['"`]/.test(windowAfter),
    'nextSteps array must contain at least one concrete guidance string',
  );
}

console.log('✓ /state + /ops precondition failures emit retryAfterMs + nextSteps + nudge repair queue');
