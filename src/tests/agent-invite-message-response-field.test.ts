import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: 三个创建 doc 的 endpoint 必须在响应里带 agentInviteMessage 字段，
// 下一个 agent 才能拿到一段已经填好真 token 的邀请文本、直接粘贴用。
// 漏掉任何一个，调用那个 endpoint 的 agent 又会被迫自己拼模板，
// placeholder regression 就回来了。
//
// 三个 endpoint:
//   - POST /api/public/documents   (server/public-entry-routes.ts)   ← skill §0 推荐
//   - POST /documents              (server/routes.ts)                ← agent-friendly authed
//   - POST /share/markdown         (server/routes.ts, handleShareMarkdown)
//
// 我们用源码扫描而不是起 HTTP，保证快、不依赖 DB。每一处检查：
//   (a) 文件里 import 了 buildAgentInviteMessage
//   (b) 对应 handler 在 res.json({...}) 之前调用了 builder
//   (c) res.json 里出现了 agentInviteMessage

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const publicRoutesSource = readFileSync(
  path.join(repoRoot, 'server', 'public-entry-routes.ts'),
  'utf8',
);
const routesSource = readFileSync(path.join(repoRoot, 'server', 'routes.ts'), 'utf8');

function assertContains(src: string, needle: string, label: string) {
  assert(src.includes(needle), `${label}: expected source to contain ${JSON.stringify(needle)}`);
}

// --- 1) POST /api/public/documents ---
assertContains(
  publicRoutesSource,
  "from '../src/shared/agent-invite-message.js'",
  'public-entry-routes.ts should import buildAgentInviteMessage from shared builder',
);

// 抓 /api/public/documents handler 的主体（从 post('/api/public/documents' 到 下一个顶层 // ---- 注释）
{
  const handlerStart = publicRoutesSource.indexOf("publicEntryRoutes.post('/api/public/documents'");
  assert(handlerStart !== -1, 'POST /api/public/documents handler not found');
  const nextBlock = publicRoutesSource.indexOf('// ---------- ', handlerStart + 1);
  const handlerBody = publicRoutesSource.slice(
    handlerStart,
    nextBlock === -1 ? publicRoutesSource.length : nextBlock,
  );
  assertContains(
    handlerBody,
    'buildAgentInviteMessage({',
    'POST /api/public/documents must build invite before responding',
  );
  assertContains(
    handlerBody,
    'agentInviteMessage',
    'POST /api/public/documents response must include agentInviteMessage',
  );
}

// --- 2) POST /documents ---
assertContains(
  routesSource,
  "from '../src/shared/agent-invite-message.js'",
  'server/routes.ts should import buildAgentInviteMessage from shared builder',
);
{
  const handlerStart = routesSource.indexOf("apiRoutes.post('/documents'");
  assert(handlerStart !== -1, 'POST /documents handler not found');
  // 下一个 apiRoutes.post 作为上界
  const nextHandler = routesSource.indexOf('apiRoutes.post(', handlerStart + 1);
  const handlerBody = routesSource.slice(
    handlerStart,
    nextHandler === -1 ? routesSource.length : nextHandler,
  );
  assertContains(
    handlerBody,
    'buildAgentInviteMessage({',
    'POST /documents must build invite before responding',
  );
  assertContains(
    handlerBody,
    'agentInviteMessage',
    'POST /documents response must include agentInviteMessage',
  );
}

// --- 3) handleShareMarkdown (POST /share/markdown) ---
{
  const handlerStart = routesSource.indexOf('export async function handleShareMarkdown(');
  assert(handlerStart !== -1, 'handleShareMarkdown handler not found');
  // 下一个 export / 顶层函数作为上界
  const nextExport = routesSource.indexOf('\nexport ', handlerStart + 1);
  const handlerBody = routesSource.slice(
    handlerStart,
    nextExport === -1 ? routesSource.length : nextExport,
  );
  assertContains(
    handlerBody,
    'buildAgentInviteMessage({',
    'handleShareMarkdown must build invite before responding',
  );
  assertContains(
    handlerBody,
    'agentInviteMessage',
    'handleShareMarkdown response must include agentInviteMessage',
  );
}

console.log(
  '✓ agentInviteMessage field wired into POST /api/public/documents, POST /documents, POST /share/markdown',
);
