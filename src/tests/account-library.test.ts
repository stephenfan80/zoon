import { unlinkSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

const CLIENT_HEADERS = {
  'X-Proof-Client-Version': '0.31.0',
  'X-Proof-Client-Build': 'tests',
  'X-Proof-Client-Protocol': '3',
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function readJson(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Response is not JSON: ${text.slice(0, 200)}`);
  }
}

function cookieHeader(setCookie: string | null): string {
  if (!setCookie) return '';
  return setCookie.split(',').map((part) => part.split(';')[0]).join('; ');
}

async function withServer(run: (baseUrl: string, dbPath: string) => Promise<void>): Promise<void> {
  const dbPath = path.join(os.tmpdir(), `zoon-account-library-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const previousEnv = {
    DATABASE_PATH: process.env.DATABASE_PATH,
    PROOF_DB_ENV_INIT: process.env.PROOF_DB_ENV_INIT,
    ZOON_OAUTH_PROVIDER: process.env.ZOON_OAUTH_PROVIDER,
    ZOON_OAUTH_MOCK_USER_ID: process.env.ZOON_OAUTH_MOCK_USER_ID,
    ZOON_OAUTH_MOCK_EMAIL: process.env.ZOON_OAUTH_MOCK_EMAIL,
    ZOON_OAUTH_MOCK_NAME: process.env.ZOON_OAUTH_MOCK_NAME,
    ZOON_PUBLIC_CREATE_ENABLED: process.env.ZOON_PUBLIC_CREATE_ENABLED,
    PROOF_SHARE_MARKDOWN_AUTH_MODE: process.env.PROOF_SHARE_MARKDOWN_AUTH_MODE,
  };
  process.env.DATABASE_PATH = dbPath;
  process.env.PROOF_DB_ENV_INIT = 'development';
  process.env.ZOON_OAUTH_PROVIDER = 'mock';
  process.env.ZOON_OAUTH_MOCK_USER_ID = '4242';
  process.env.ZOON_OAUTH_MOCK_EMAIL = 'writer@example.test';
  process.env.ZOON_OAUTH_MOCK_NAME = 'Test Writer';
  process.env.ZOON_PUBLIC_CREATE_ENABLED = 'true';

  let server: Server | null = null;
  try {
    const { apiRoutes } = await import('../../server/routes.ts');
    const { publicEntryRoutes } = await import('../../server/public-entry-routes.ts');
    const { enforceApiClientCompatibility } = await import('../../server/client-capabilities.ts');
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(publicEntryRoutes);
    app.use('/api', enforceApiClientCompatibility, apiRoutes);
    app.use(apiRoutes);

    server = createServer(app);
    await new Promise<void>((resolve) => server!.listen(0, resolve));
    const address = server.address();
    assert(address && typeof address === 'object', 'Expected ephemeral server address');
    await run(`http://127.0.0.1:${address.port}`, dbPath);
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    try { unlinkSync(dbPath); } catch { /* ignore */ }
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key as keyof NodeJS.ProcessEnv];
      else process.env[key as keyof NodeJS.ProcessEnv] = value;
    }
  }
}

async function main(): Promise<void> {
  await withServer(async (baseUrl) => {
    const startRes = await fetch(`${baseUrl}/api/auth/start`, { method: 'POST' });
    assert(startRes.status === 200, `Expected auth start 200, got ${startRes.status}`);
    const started = await readJson(startRes);
    assert(typeof started.authUrl === 'string', 'Expected authUrl');
    assert(typeof started.pollToken === 'string', 'Expected pollToken');
    assert(typeof started.requestId === 'string', 'Expected requestId');

    const callbackRes = await fetch(started.authUrl, { redirect: 'manual' });
    assert(callbackRes.status === 200, `Expected auth callback 200, got ${callbackRes.status}`);
    const cookie = cookieHeader(callbackRes.headers.get('set-cookie'));
    assert(cookie.includes('proof_session='), 'Expected proof_session cookie');

    const pollRes = await fetch(`${baseUrl}/api/auth/poll/${started.requestId}?pollToken=${encodeURIComponent(started.pollToken)}`);
    const polled = await readJson(pollRes);
    assert(polled.success === true, 'Expected auth poll success');
    assert(typeof polled.sessionToken === 'string' && polled.sessionToken.startsWith('epsess_'), 'Expected session token');

    const meRes = await fetch(`${baseUrl}/api/account/me`, { headers: { cookie } });
    const me = await readJson(meRes);
    assert(meRes.status === 200 && me.user?.id === 4242, 'Expected account user from cookie');

    process.env.PROOF_SHARE_MARKDOWN_AUTH_MODE = 'oauth';
    const directShareRes = await fetch(`${baseUrl}/api/share/markdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie,
      },
      body: JSON.stringify({ title: 'Direct OAuth doc', markdown: '# Direct OAuth doc\n\nHello' }),
    });
    const directShared = await readJson(directShareRes);
    assert(directShareRes.status === 200 && directShared.slug, 'Expected OAuth direct share create from session cookie');
    const { getDocumentBySlug } = await import('../../server/db.ts');
    const directDoc = getDocumentBySlug(directShared.slug);
    assert(directDoc?.owner_id === 'oauth:4242', `Expected direct OAuth owner, got ${directDoc?.owner_id}`);

    const ownedCreateRes = await fetch(`${baseUrl}/api/public/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie,
      },
      body: JSON.stringify({ title: 'Owned account doc', markdown: '# Owned account doc\n\nHello' }),
    });
    const ownedCreated = await readJson(ownedCreateRes);
    assert(ownedCreateRes.status === 200 && ownedCreated.slug, 'Expected logged-in public create');

    const ownedDoc = getDocumentBySlug(ownedCreated.slug);
    assert(ownedDoc?.owner_id === 'oauth:4242', `Expected oauth owner, got ${ownedDoc?.owner_id}`);

    const sharedCreateRes = await fetch(`${baseUrl}/api/public/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Visited shared doc', markdown: '# Visited shared doc\n\nHello' }),
    });
    const sharedCreated = await readJson(sharedCreateRes);
    assert(sharedCreateRes.status === 200 && sharedCreated.slug && sharedCreated.accessToken, 'Expected anonymous shared create');

    const visitRes = await fetch(`${baseUrl}/api/account/documents/${encodeURIComponent(sharedCreated.slug)}/visit`, {
      method: 'POST',
      headers: {
        cookie,
        'x-share-token': sharedCreated.accessToken,
      },
    });
    const visited = await readJson(visitRes);
    assert(visitRes.status === 200 && visited.success === true, 'Expected visit recording success');

    const docsRes = await fetch(`${baseUrl}/api/account/documents?limit=20`, {
      headers: {
        ...CLIENT_HEADERS,
        cookie,
      },
    });
    const docsPayload = await readJson(docsRes);
    assert(docsRes.status === 200 && Array.isArray(docsPayload.documents), 'Expected account documents');
    const responseText = JSON.stringify(docsPayload);
    assert(!responseText.includes(String(ownedCreated.accessToken)), 'Account documents must not leak owned token');
    assert(!responseText.includes(String(sharedCreated.accessToken)), 'Account documents must not leak shared token');
    const ownedRow = docsPayload.documents.find((doc: any) => doc.slug === ownedCreated.slug);
    const sharedRow = docsPayload.documents.find((doc: any) => doc.slug === sharedCreated.slug);
    assert(ownedRow?.isOwned === true, 'Expected owned account doc in library');
    assert(sharedRow?.isOwned === false && sharedRow.lastVisitedAt, 'Expected visited shared doc in library');
    assert(typeof ownedRow.webUrl === 'string' && !ownedRow.webUrl.includes('token='), 'Expected clean owned webUrl');
    assert(typeof sharedRow.webUrl === 'string' && !sharedRow.webUrl.includes('token='), 'Expected clean shared webUrl');

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie },
    });
    const logout = await readJson(logoutRes);
    assert(logoutRes.status === 200 && logout.success === true, 'Expected logout success');

    const afterLogoutRes = await fetch(`${baseUrl}/api/account/me`, { headers: { cookie } });
    assert(afterLogoutRes.status === 401, `Expected account/me 401 after logout, got ${afterLogoutRes.status}`);
  });
  console.log('✓ account library OAuth/session/document history flow');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
