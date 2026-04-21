import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: 线上 bug —— 打开一个新文档、welcome 弹窗停着看 agent 加入，
// 几分钟后顶栏一直黄灯、小圆点不再变绿。抓的 console log：
//   [HocuspocusProvider] Connection closed with status Unauthorized: collab:expired
// 反复出现。
//
// 根因：startCollabRefreshLoop 里有一条"看起来健康就不主动刷"的 guard
//   if (this.collabConnectionStatus === 'connected' && this.collabIsSynced) return;
// 这条放在 "token <60s 到期" 分支之内，逻辑变成：离过期只剩 60s、但此刻还
// 连着 & synced，那就跳过刷新。结果 token 自然死 → 服务端踢连接 →
// HocuspocusProvider 拿过期 token 疯狂重连失败 → reactive 兜底要等 4s + 5s backoff
// 才去换 token。期间顶栏一直黄灯。
//
// 修复：删掉这条 guard —— 只要 token 进了 <60s 窗口就主动 softRefresh，
// 对用户无感。正在打字的情况由 shouldDeferExpiringCollabRefresh 单独兜底。
//
// 这个测试锁三件事，避免未来有人"好心"把这条 guard 加回来：
//   1. startCollabRefreshLoop 里还留着 <60s 主动刷的分支
//   2. 那条"connected && isSynced 就跳过"的 guard 已经不存在
//   3. 同 tick 的 deferExpiringCollabRefresh 兜底还留着（打字窗口不会被误伤）

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const editorSource = readFileSync(path.join(repoRoot, 'src', 'editor', 'index.ts'), 'utf8');

// 抓 startCollabRefreshLoop 函数体（到下一个 private 方法为止）
const fnStart = editorSource.indexOf('private startCollabRefreshLoop(): void {');
assert(fnStart !== -1, 'Expected startCollabRefreshLoop to exist');
const fnEnd = editorSource.indexOf('\n  private ', fnStart + 1);
assert(fnEnd !== -1, 'Expected startCollabRefreshLoop to have a successor method');
const fnBody = editorSource.slice(fnStart, fnEnd);

// 1) 60s 主动刷窗口仍然在：< 60s 到期就直接进入刷新判断
assert(
  /\(\s*expiresAtMs\s*-\s*now\s*\)\s*>\s*60_000/.test(fnBody),
  'Expected startCollabRefreshLoop to keep the "expires in >60s → skip" gate',
);

// 2) ⚠ 关键：不能再出现"已健康就跳过刷新"的 guard。允许出现的模式只能是
//    维护 unhealthy 窗口（比如 updateCollabHealthWindow 里用的），
//    但 startCollabRefreshLoop 函数体里必须不含下面这句。
const harmfulGuard = /if\s*\(\s*this\.collabConnectionStatus\s*===\s*['"]connected['"]\s*&&\s*this\.collabIsSynced\s*\)\s*return/;
assert(
  !harmfulGuard.test(fnBody),
  'Regression: startCollabRefreshLoop must NOT skip proactive refresh just because the connection currently looks healthy. Token expiry will still fire and kick the ws.',
);

// 3) 打字窗口兜底还留着：shouldDeferExpiringCollabRefresh 仍被调用
assert(
  fnBody.includes('this.shouldDeferExpiringCollabRefresh(now)'),
  'Expected shouldDeferExpiringCollabRefresh to still guard active-typing refreshes',
);

// 4) 刷新动作本身仍保留
assert(
  fnBody.includes('this.refreshCollabSessionAndReconnect('),
  'Expected startCollabRefreshLoop to still invoke refreshCollabSessionAndReconnect',
);

// 5) 顺序：defer 检查必须在 refresh 调用之前（否则等于白兜底）
const deferIdx = fnBody.indexOf('this.shouldDeferExpiringCollabRefresh(now)');
const refreshIdx = fnBody.indexOf('this.refreshCollabSessionAndReconnect(');
assert(
  deferIdx !== -1 && refreshIdx !== -1 && deferIdx < refreshIdx,
  'Expected the typing-defer check to run before refreshCollabSessionAndReconnect',
);

console.log('✓ startCollabRefreshLoop proactively refreshes inside the <60s window even when currently healthy');
