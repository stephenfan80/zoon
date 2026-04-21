import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression: docs/ZOON_AGENT_CONTRACT.md 是给外部 agent 作者的公开契约。
// 如果我们重构时顺手删了/改了一个 public route 的路径，而没同步更新契约
// 文档，外部 SDK 会直接坏掉（agent 按文档发请求 → 404）。
//
// 这个测试用源码扫描锁 3 条不变式：
//   1. 契约文档里列的 9 个 public endpoint，每一个都能在 server/*.ts 的路由
//      定义里对上（URL 存在、方法一致）
//   2. 契约文档的 /ops op 类型列表跟 SUPPORTED_DOCUMENT_OP_TYPES 保持一致
//      （任何一方多 / 少一个都会红）
//   3. 契约文档里标成"Not in the contract"的那批 fan-out 路由，代码里确实
//      仍存在（如果哪天真被删了，要提醒我们把文档里对应的 "Use instead"
//      行也一起清理，别留误导信息）

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const doc = readFileSync(path.join(repoRoot, 'docs', 'ZOON_AGENT_CONTRACT.md'), 'utf8');
const agentRoutesSrc = readFileSync(path.join(repoRoot, 'server', 'agent-routes.ts'), 'utf8');
const publicRoutesSrc = readFileSync(path.join(repoRoot, 'server', 'public-entry-routes.ts'), 'utf8');
const opsTypesSrc = readFileSync(path.join(repoRoot, 'server', 'document-ops.ts'), 'utf8');

// --- 1) Public endpoints in the doc table exist in routing code ---

type RouteExpectation = {
  method: 'GET' | 'POST' | 'PUT';
  path: string;
  // grep 片段：(router-object, regex that should match in its source)
  routerSrc: string;
  routerPattern: RegExp;
};

// 路径到路由代码里实际写法的映射（/api/agent/:slug 前缀被 app.use 挂上，
// agent-routes.ts 内部写的是 '/:slug/...'，public-entry-routes 写全路径）
const contractEndpoints: RouteExpectation[] = [
  {
    method: 'POST',
    path: '/api/public/documents',
    routerSrc: publicRoutesSrc,
    routerPattern: /publicEntryRoutes\.post\(\s*['"]\/api\/public\/documents['"]/,
  },
  {
    method: 'GET',
    path: '/api/agent/:slug/state',
    routerSrc: agentRoutesSrc,
    routerPattern: /agentRoutes\.get\(\s*['"]\/:slug\/state['"]/,
  },
  {
    method: 'POST',
    path: '/api/agent/:slug/ops',
    routerSrc: agentRoutesSrc,
    routerPattern: /agentRoutes\.post\(\s*['"]\/:slug\/ops['"]/,
  },
  {
    method: 'POST',
    path: '/api/agent/:slug/edit/v2',
    routerSrc: agentRoutesSrc,
    routerPattern: /agentRoutes\.post\(\s*['"]\/:slug\/edit\/v2['"]/,
  },
  {
    method: 'POST',
    path: '/api/agent/:slug/presence',
    routerSrc: agentRoutesSrc,
    routerPattern: /agentRoutes\.post\(\s*['"]\/:slug\/presence['"]/,
  },
  {
    method: 'GET',
    path: '/api/agent/:slug/events/pending',
    routerSrc: agentRoutesSrc,
    routerPattern: /agentRoutes\.get\(\s*['"]\/:slug\/events\/pending['"]/,
  },
  {
    method: 'POST',
    path: '/api/agent/:slug/events/ack',
    routerSrc: agentRoutesSrc,
    routerPattern: /agentRoutes\.post\(\s*['"]\/:slug\/events\/ack['"]/,
  },
  {
    method: 'POST',
    path: '/api/agent/bug-reports',
    routerSrc: agentRoutesSrc,
    routerPattern: /agentRoutes\.post\(\s*['"]\/bug-reports['"]/,
  },
  {
    method: 'GET',
    path: '/skill',
    routerSrc: publicRoutesSrc,
    routerPattern: /publicEntryRoutes\.get\(\s*['"]\/skill['"]/,
  },
];

for (const ep of contractEndpoints) {
  // The contract doc must mention the endpoint path in a table row or code fence.
  assert(
    doc.includes(ep.path),
    `Contract doc must reference ${ep.method} ${ep.path} (not found in docs/ZOON_AGENT_CONTRACT.md)`,
  );
  // The routing source must define it.
  assert(
    ep.routerPattern.test(ep.routerSrc),
    `Route ${ep.method} ${ep.path} is in the contract doc but missing from routing source (pattern: ${ep.routerPattern})`,
  );
}

// --- 2) /ops op types in doc match SUPPORTED_DOCUMENT_OP_TYPES exactly ---

const opTypesBlockMatch = opsTypesSrc.match(
  /SUPPORTED_DOCUMENT_OP_TYPES\s*=\s*\[([\s\S]*?)\]\s*as const/,
);
assert(opTypesBlockMatch, 'Could not find SUPPORTED_DOCUMENT_OP_TYPES in server/document-ops.ts');
const codeOpTypes = new Set(
  [...opTypesBlockMatch[1].matchAll(/['"]([a-z.]+)['"]/g)].map((m) => m[1]),
);
assert(codeOpTypes.size >= 7, `Expected at least 7 op types in code, got ${codeOpTypes.size}`);

for (const opType of codeOpTypes) {
  assert(
    doc.includes(`\`${opType}\``),
    `Contract doc must list op type "${opType}" (present in SUPPORTED_DOCUMENT_OP_TYPES but not in docs/ZOON_AGENT_CONTRACT.md)`,
  );
}

// And the reverse: every backticked `foo.bar` in the doc's ops list must
// exist in code. Scope the scan to the "Mutations — always via /ops" section.
const opsSectionStart = doc.indexOf('## 4. Mutations');
const opsSectionEnd = doc.indexOf('## 5.');
assert(opsSectionStart !== -1 && opsSectionEnd !== -1, 'Could not locate §4 Mutations section in doc');
const opsSection = doc.slice(opsSectionStart, opsSectionEnd);
const docOpTypes = new Set(
  [...opsSection.matchAll(/`([a-z]+\.[a-z]+)`/g)].map((m) => m[1]),
);
for (const docOp of docOpTypes) {
  assert(
    codeOpTypes.has(docOp),
    `Contract doc lists op type "${docOp}" in §4, but it's not in SUPPORTED_DOCUMENT_OP_TYPES`,
  );
}

// --- 3) "Not in contract" fan-out routes still exist in code ---
// (If they've actually been deleted, the contract's "Use instead" table is
//  stale and should be trimmed; this test prompts that cleanup.)
const fanoutRoutes = [
  "/:slug/marks/comment",
  "/:slug/marks/suggest-replace",
  "/:slug/marks/accept",
  "/:slug/rewrite",
  "/:slug/edit",
];
for (const route of fanoutRoutes) {
  // appears in doc's "Not in the contract" table
  assert(
    doc.includes(route),
    `Expected contract doc to reference internal route ${route} in the "Not in the contract" table`,
  );
  // …and still exists in the codebase
  const pattern = new RegExp(`agentRoutes\\.post\\(\\s*['"]${route.replace(/[/:*]/g, '\\$&')}['"]`);
  assert(
    pattern.test(agentRoutesSrc),
    `Contract doc lists ${route} as a deprecated fan-out alias, but the route no longer exists in agent-routes.ts — trim the "Not in the contract" table`,
  );
}

console.log('✓ ZOON_AGENT_CONTRACT.md matches routing code and op-type registry');
