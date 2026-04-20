import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: 上次改 refresh 机制后，每次刷新都会把文档滚回顶部。
// 根因：refreshCollabSessionAndReconnect 永远走 hard reconnect，
// 重建 Y.Doc + 重新 bindDoc 到 ProseMirror 会触发一次从 Yjs 状态
// 推导 doc 内容的事务，视口随之复位。
//
// 修复：同会话的 token 续期走 softRefreshSession —— 复用 provider +
// Y.Doc + ProseMirror 绑定，用户完全无感。
//
// 这个测试锁定 editor 侧的路径选择、soft 路径的提前 return、以及
// 硬重连作为 fallback 的完整性。collab-client 本身暴露 softRefresh /
// requiresHardReconnect 的契约由 milkdown-collab-runtime.test.ts 锁定。

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const editorSource = readFileSync(path.join(__dirname, '../editor/index.ts'), 'utf8');

const refreshFnStart = editorSource.indexOf(
  'private async refreshCollabSessionAndReconnect(preserveLocalState: boolean): Promise<void> {',
);
assert(refreshFnStart !== -1, 'Expected refreshCollabSessionAndReconnect to exist');

// 找函数体（到下一个 private 方法签名为止）。
const refreshFnEnd = editorSource.indexOf('\n  private ', refreshFnStart + 1);
assert(refreshFnEnd !== -1, 'Expected refreshCollabSessionAndReconnect to have a successor method');
const refreshFnBody = editorSource.slice(refreshFnStart, refreshFnEnd);

// 1) Soft-first：先问 requiresHardReconnect，再试 softRefreshSession。
assert(
  refreshFnBody.includes('collabClient.requiresHardReconnect(refreshed.session)')
    && refreshFnBody.includes('collabClient.softRefreshSession(refreshed.session)'),
  'Expected refresh to attempt softRefreshSession before falling back to hard reconnect',
);

// 2) Soft path 和 hard path 的先后顺序：soft 的 try 必须在 hard 路径的
//    resetShareMarksSyncState / reconnectWithSession 之前，否则等于白切。
const softIdx = refreshFnBody.indexOf('collabClient.softRefreshSession(refreshed.session)');
const hardResetIdx = refreshFnBody.indexOf('this.resetShareMarksSyncState();');
const hardReconnectIdx = refreshFnBody.indexOf('collabClient.reconnectWithSession(refreshed.session');
assert(
  softIdx !== -1 && hardResetIdx !== -1 && hardReconnectIdx !== -1,
  'Expected both soft and hard paths to be present in refreshCollabSessionAndReconnect',
);
assert(
  softIdx < hardResetIdx && softIdx < hardReconnectIdx,
  'Expected softRefreshSession attempt to precede the hard reconnect reset + reconnect calls',
);

// 3) Soft 成功必须早 return —— 不能 fall through 到硬重连的 Y.Doc rebuild
//    和 pendingCollabRebindOnSync=true（那会触发 connectCollabService 里
//    的 bindDoc，把滚动位置重置掉）。
const softBlock = refreshFnBody.slice(softIdx, hardResetIdx);
assert(
  softBlock.includes('return;'),
  'Expected soft refresh success path to return early so the hard reconnect rebuild is skipped',
);
assert(
  !softBlock.includes('this.pendingCollabRebindOnSync = true;'),
  'Expected soft refresh path NOT to set pendingCollabRebindOnSync (rebinding triggers doc re-derivation and resets scroll)',
);
assert(
  !softBlock.includes('this.resetProjectionPublishState();'),
  'Expected soft refresh path to skip projection reset — Y.Doc is preserved, marks stay in place',
);
assert(
  !softBlock.includes('collabClient.reconnectWithSession('),
  'Expected soft refresh path to skip hard reconnect entirely',
);

// 4) Hard path 作为 fallback 必须保留完整 —— rebind 标志、模板重取、
//    reconnectWithSession 三件套全部要在 soft 之后仍然存在。
assert(
  refreshFnBody.includes('this.pendingCollabRebindOnSync = true;')
    && refreshFnBody.includes('this.pendingCollabRebindResetDoc = !shouldPreserveLocalState || !this.collabCanEdit;')
    && refreshFnBody.includes('collabClient.reconnectWithSession(refreshed.session, { preserveLocalState: shouldPreserveLocalState });'),
  'Expected hard-reconnect fallback (rebind flags + reconnectWithSession) to remain intact',
);

console.log('✓ refreshCollabSessionAndReconnect prefers softRefreshSession to preserve scroll position');
