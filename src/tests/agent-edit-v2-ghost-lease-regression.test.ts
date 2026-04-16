import { unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { WebSocketServer } from 'ws';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

// Regression: when a human client disconnects, their documentLease and recentLease
// linger in ghost form for several minutes while Hocuspocus has already unloaded the
// Y.Doc. In hosted mode the raw `breakdown.total` includes those ghosts, which used
// to make /edit/v2 return 503 LIVE_DOC_UNAVAILABLE. The fix treats a slug as "live"
// only when exactEpochCount or anyEpochCount is > 0 (a real WS connection).

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function normalizeWsBase(collabWsUrl: string): string {
  const raw = collabWsUrl.replace(/\?slug=.*$/, '');
  try {
    const url = new URL(raw);
    if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
    return url.toString();
  } catch {
    return raw.replace('ws://localhost:', 'ws://127.0.0.1:');
  }
}

async function mustJson<T>(res: Response, label: string): Promise<T> {
  const text = await res.text().catch(() => '');
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text) as T;
}

async function waitFor(predicate: () => boolean, timeoutMs: number, label: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

const CLIENT_HEADERS = {
  'X-Proof-Client-Version': '0.31.2',
  'X-Proof-Client-Build': 'tests',
  'X-Proof-Client-Protocol': '3',
};

async function run(): Promise<void> {
  const dbName = `proof-agent-edit-v2-ghost-lease-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  const dbPath = path.join(os.tmpdir(), dbName);
  process.env.DATABASE_PATH = dbPath;
  process.env.COLLAB_EMBEDDED_WS = '1';
  process.env.AGENT_EDIT_V2_ENABLED = '1';
  process.env.COLLAB_SINGLE_WRITER_EDIT = '1';
  // Force hosted runtime so the ghost-lease path is actually exercised.
  process.env.RAILWAY_ENVIRONMENT_NAME = 'production';
  // Shrink the grace timeout to keep the test snappy.
  process.env.HOSTED_LIVE_DOC_GRACE_MS = '200';

  const [{ apiRoutes }, { agentRoutes }, { setupWebSocket, getActiveCollabClientBreakdown }, collab] = await Promise.all([
    import('../../server/routes.js'),
    import('../../server/agent-routes.js'),
    import('../../server/ws.js'),
    import('../../server/collab.js'),
  ]);

  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', apiRoutes);
  app.use('/api/agent', agentRoutes);
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  setupWebSocket(wss);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;
  await collab.startCollabRuntimeEmbedded(address.port);

  const ydoc = new Y.Doc();
  let provider: HocuspocusProvider | null = null;
  let connected = false;
  let synced = false;

  try {
    const createRes = await fetch(`${base}/api/documents`, {
      method: 'POST',
      headers: { ...CLIENT_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ghost lease regression', markdown: '# Title\n\nBase paragraph.', marks: {} }),
    });
    const created = await mustJson<{ slug: string; ownerSecret: string }>(createRes, 'create');

    const sessionRes = await fetch(`${base}/api/documents/${created.slug}/collab-session`, {
      headers: { ...CLIENT_HEADERS, 'x-share-token': created.ownerSecret },
    });
    const session = await mustJson<{ success: boolean; session: { collabWsUrl: string; slug: string; token: string; role: string } }>(sessionRes, 'collab-session');

    provider = new HocuspocusProvider({
      url: normalizeWsBase(session.session.collabWsUrl),
      name: session.session.slug,
      document: ydoc,
      parameters: { token: session.session.token, role: session.session.role },
      token: session.session.token,
      preserveConnection: false,
      broadcast: false,
    });
    provider.on('status', (event: { status: string }) => {
      if (event.status === 'connected') connected = true;
    });
    provider.on('synced', (event: { state?: boolean }) => {
      if (event.state !== false) synced = true;
    });
    await waitFor(() => connected, 10_000, 'provider connected');
    await waitFor(() => synced, 10_000, 'provider synced');

    // Disconnect the human and wait for the Hocuspocus doc to unload, but before
    // the documentLease/recentLease entries expire. This reproduces the ghost lease.
    provider.disconnect();
    provider.destroy();
    provider = null;

    await waitFor(() => {
      const brk = getActiveCollabClientBreakdown(created.slug);
      return brk.exactEpochCount === 0 && brk.anyEpochCount === 0 && brk.total > 0;
    }, 5_000, 'ghost lease window');

    const brk = getActiveCollabClientBreakdown(created.slug);
    assert(
      brk.exactEpochCount === 0 && brk.anyEpochCount === 0 && brk.total > 0,
      `expected ghost-lease window, got ${JSON.stringify(brk)}`,
    );

    const stateRes = await fetch(`${base}/api/agent/${created.slug}/state`, {
      headers: { ...CLIENT_HEADERS, 'x-share-token': created.ownerSecret },
    });
    const state = await mustJson<{ revision: number }>(stateRes, 'state');

    const editRes = await fetch(`${base}/api/agent/${created.slug}/edit/v2`, {
      method: 'POST',
      headers: { ...CLIENT_HEADERS, 'Content-Type': 'application/json', 'x-share-token': created.ownerSecret },
      body: JSON.stringify({
        by: 'ai:ghost-lease-regression',
        baseRevision: state.revision,
        operations: [{ op: 'insert_after', ref: 'b1', blocks: [{ markdown: 'Appended paragraph.' }] }],
      }),
    });
    const editBody = await editRes.text();

    assert(
      editRes.status === 200,
      `Expected /edit/v2 to succeed during ghost-lease window, got status ${editRes.status}: ${editBody.slice(0, 300)}`,
    );
    const editJson = JSON.parse(editBody) as { success?: boolean; revision?: number };
    assert(editJson.success === true, `Expected success:true, got ${editBody.slice(0, 300)}`);
    assert(
      typeof editJson.revision === 'number' && editJson.revision === state.revision + 1,
      `Expected revision bump to ${state.revision + 1}, got ${editJson.revision}`,
    );

    console.log('✓ /edit/v2 succeeds during ghost-lease window (no false LIVE_DOC_UNAVAILABLE)');
  } finally {
    try { provider?.disconnect(); provider?.destroy(); } catch {}
    ydoc.destroy();
    await collab.stopCollabRuntime();
    try { wss.close(); } catch {}
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const suffix of ['', '-wal', '-shm']) {
      try { unlinkSync(`${dbPath}${suffix}`); } catch {}
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
  });
