import { unlinkSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

const CLIENT_HEADERS = {
  'X-Proof-Client-Version': '0.31.1',
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
    ZOON_OAUTH_CLIENT_ID: process.env.ZOON_OAUTH_CLIENT_ID,
    ZOON_OAUTH_CLIENT_SECRET: process.env.ZOON_OAUTH_CLIENT_SECRET,
    ZOON_OAUTH_AUTHORIZE_URL: process.env.ZOON_OAUTH_AUTHORIZE_URL,
    ZOON_OAUTH_TOKEN_URL: process.env.ZOON_OAUTH_TOKEN_URL,
    ZOON_OAUTH_USERINFO_URL: process.env.ZOON_OAUTH_USERINFO_URL,
    ZOON_OAUTH_SCOPES: process.env.ZOON_OAUTH_SCOPES,
    ZOON_SIGNUP_INVITE_CODE: process.env.ZOON_SIGNUP_INVITE_CODE,
    ZOON_LOCAL_SIGNUP_INVITE_CODE: process.env.ZOON_LOCAL_SIGNUP_INVITE_CODE,
    ZOON_SIGNUP_INVITE_REQUIRED: process.env.ZOON_SIGNUP_INVITE_REQUIRED,
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
  process.env.ZOON_SIGNUP_INVITE_CODE = 'join-zoon-test';

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
    const { getDocumentBySlug } = await import('../../server/db.ts');

    const anonymousMeRes = await fetch(`${baseUrl}/api/account/me`);
    assert(anonymousMeRes.status === 401, `Expected anonymous account/me 401, got ${anonymousMeRes.status}`);

    const localRegisterRes = await fetch(`${baseUrl}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'Local@Example.Test',
        name: 'Local Writer',
        password: 'password123',
      }),
    });
    const localRegistered = await readJson(localRegisterRes);
    assert(localRegisterRes.status === 200 && localRegistered.success === true, 'Expected local registration success');
    assert(localRegistered.user?.email === 'local@example.test', 'Expected normalized local account email');
    assert(Number(localRegistered.user?.id) >= 3_000_000_000, 'Expected local account id range');
    const localCookie = cookieHeader(localRegisterRes.headers.get('set-cookie'));
    assert(localCookie.includes('proof_session='), 'Expected local proof_session cookie');

    const duplicateRegisterRes = await fetch(`${baseUrl}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'local@example.test',
        name: 'Local Writer',
        password: 'password123',
      }),
    });
    const duplicateRegister = await readJson(duplicateRegisterRes);
    assert(duplicateRegisterRes.status === 409 && duplicateRegister.code === 'ACCOUNT_EXISTS', 'Expected duplicate account rejection');

    const localMeRes = await fetch(`${baseUrl}/api/account/me`, { headers: { cookie: localCookie } });
    const localMe = await readJson(localMeRes);
    assert(localMeRes.status === 200 && localMe.user?.email === 'local@example.test', 'Expected local account user from cookie');

    const localOwnedCreateRes = await fetch(`${baseUrl}/api/public/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: localCookie,
      },
      body: JSON.stringify({ title: 'Local account doc', markdown: '# Local account doc\n\nHello' }),
    });
    const localOwnedCreated = await readJson(localOwnedCreateRes);
    assert(localOwnedCreateRes.status === 200 && localOwnedCreated.slug, 'Expected local logged-in public create');

    const localOwnedDoc = getDocumentBySlug(localOwnedCreated.slug);
    assert(
      localOwnedDoc?.owner_id === `oauth:${localRegistered.user.id}`,
      `Expected hosted-session owner for local doc, got ${localOwnedDoc?.owner_id}`,
    );

    const localDocsRes = await fetch(`${baseUrl}/api/account/documents?limit=20`, {
      headers: {
        ...CLIENT_HEADERS,
        cookie: localCookie,
      },
    });
    const localDocsPayload = await readJson(localDocsRes);
    assert(localDocsRes.status === 200 && Array.isArray(localDocsPayload.documents), 'Expected local account documents');
    assert(!JSON.stringify(localDocsPayload).includes(String(localOwnedCreated.accessToken)), 'Local account docs must not leak token');
    const localOwnedRow = localDocsPayload.documents.find((doc: any) => doc.slug === localOwnedCreated.slug);
    assert(localOwnedRow?.isOwned === true, 'Expected local owned doc in account library');
    assert(typeof localOwnedRow.webUrl === 'string' && !localOwnedRow.webUrl.includes('token='), 'Expected clean local webUrl');

    const localLogoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie: localCookie },
    });
    const localLogout = await readJson(localLogoutRes);
    assert(localLogoutRes.status === 200 && localLogout.success === true, 'Expected local logout success');

    const localAfterLogoutRes = await fetch(`${baseUrl}/api/account/me`, { headers: { cookie: localCookie } });
    assert(localAfterLogoutRes.status === 401, `Expected local account/me 401 after logout, got ${localAfterLogoutRes.status}`);

    const wrongLoginRes = await fetch(`${baseUrl}/api/auth/local/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'local@example.test', password: 'wrong-password' }),
    });
    const wrongLogin = await readJson(wrongLoginRes);
    assert(wrongLoginRes.status === 401 && wrongLogin.code === 'INVALID_CREDENTIALS', 'Expected wrong password rejection');

    const configuredInviteCode = process.env.ZOON_SIGNUP_INVITE_CODE;
    process.env.ZOON_SIGNUP_INVITE_REQUIRED = 'true';
    delete process.env.ZOON_SIGNUP_INVITE_CODE;
    delete process.env.ZOON_LOCAL_SIGNUP_INVITE_CODE;
    const disabledSignupRes = await fetch(`${baseUrl}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'disabled@example.test',
        name: 'Disabled Signup',
        password: 'password123',
      }),
    });
    const disabledSignup = await readJson(disabledSignupRes);
    assert(disabledSignupRes.status === 503 && disabledSignup.code === 'SIGNUP_DISABLED', 'Expected disabled signup without invite env');
    if (configuredInviteCode) process.env.ZOON_SIGNUP_INVITE_CODE = configuredInviteCode;
    const badInviteRes = await fetch(`${baseUrl}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'gated@example.test',
        name: 'Gated Writer',
        password: 'password123',
        inviteCode: 'wrong-code',
      }),
    });
    const badInvite = await readJson(badInviteRes);
    assert(badInviteRes.status === 403 && badInvite.code === 'INVALID_INVITE_CODE', 'Expected invalid invite rejection when invite gate is enabled');
    delete process.env.ZOON_SIGNUP_INVITE_REQUIRED;

    const localLoginRes = await fetch(`${baseUrl}/api/auth/local/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'local@example.test', password: 'password123' }),
    });
    const localLoggedIn = await readJson(localLoginRes);
    assert(localLoginRes.status === 200 && localLoggedIn.user?.email === 'local@example.test', 'Expected local login success');
    const localLoginCookie = cookieHeader(localLoginRes.headers.get('set-cookie'));
    const localDocsAfterLoginRes = await fetch(`${baseUrl}/api/account/documents?limit=20`, {
      headers: {
        ...CLIENT_HEADERS,
        cookie: localLoginCookie,
      },
    });
    const localDocsAfterLogin = await readJson(localDocsAfterLoginRes);
    assert(
      localDocsAfterLogin.documents?.some((doc: any) => doc.slug === localOwnedCreated.slug && doc.isOwned === true),
      'Expected local owned doc after password login',
    );

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

    const removeSharedVisitRes = await fetch(`${baseUrl}/api/account/documents/${encodeURIComponent(sharedCreated.slug)}/visit`, {
      method: 'DELETE',
      headers: { cookie },
    });
    const removedSharedVisit = await readJson(removeSharedVisitRes);
    assert(removeSharedVisitRes.status === 200 && removedSharedVisit.success === true, 'Expected shared visit removal success');

    const sharedAfterRemoveRes = await fetch(`${baseUrl}/api/documents/${encodeURIComponent(sharedCreated.slug)}`, {
      headers: {
        ...CLIENT_HEADERS,
        'x-share-token': sharedCreated.accessToken,
      },
    });
    assert(sharedAfterRemoveRes.status === 200, 'Removing a shared row must not delete the source document');

    const docsAfterRemoveRes = await fetch(`${baseUrl}/api/account/documents?limit=20`, {
      headers: {
        ...CLIENT_HEADERS,
        cookie,
      },
    });
    const docsAfterRemove = await readJson(docsAfterRemoveRes);
    assert(
      !docsAfterRemove.documents.some((doc: any) => doc.slug === sharedCreated.slug),
      'Expected removed shared doc to disappear from account library',
    );

    const deleteOwnedRes = await fetch(`${baseUrl}/api/documents/${encodeURIComponent(ownedCreated.slug)}`, {
      method: 'DELETE',
      headers: {
        ...CLIENT_HEADERS,
        cookie,
      },
    });
    const deletedOwned = await readJson(deleteOwnedRes);
    assert(deleteOwnedRes.status === 200 && deletedOwned.shareState === 'DELETED', 'Expected logged-in owner delete success');
    assert(getDocumentBySlug(ownedCreated.slug)?.share_state === 'DELETED', 'Expected owned doc to be soft deleted');

    const docsAfterDeleteRes = await fetch(`${baseUrl}/api/account/documents?limit=20`, {
      headers: {
        ...CLIENT_HEADERS,
        cookie,
      },
    });
    const docsAfterDelete = await readJson(docsAfterDeleteRes);
    assert(
      !docsAfterDelete.documents.some((doc: any) => doc.slug === ownedCreated.slug),
      'Expected deleted owned doc to disappear from account library',
    );

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie },
    });
    const logout = await readJson(logoutRes);
    assert(logoutRes.status === 200 && logout.success === true, 'Expected logout success');

    const afterLogoutRes = await fetch(`${baseUrl}/api/account/me`, { headers: { cookie } });
    assert(afterLogoutRes.status === 401, `Expected account/me 401 after logout, got ${afterLogoutRes.status}`);

    process.env.ZOON_OAUTH_PROVIDER = 'google';
    process.env.ZOON_OAUTH_CLIENT_ID = 'google-client-id.test';
    process.env.ZOON_OAUTH_CLIENT_SECRET = 'google-client-secret.test';
    delete process.env.ZOON_OAUTH_AUTHORIZE_URL;
    delete process.env.ZOON_OAUTH_TOKEN_URL;
    delete process.env.ZOON_OAUTH_USERINFO_URL;
    delete process.env.ZOON_OAUTH_SCOPES;
    const googleStartRes = await fetch(`${baseUrl}/api/auth/start`, { method: 'POST' });
    const googleStarted = await readJson(googleStartRes);
    assert(googleStartRes.status === 200, `Expected Google preset auth start 200, got ${googleStartRes.status}`);
    const googleAuthUrl = new URL(String(googleStarted.authUrl));
    assert(googleAuthUrl.origin === 'https://accounts.google.com', `Expected Google auth origin, got ${googleAuthUrl.origin}`);
    assert(googleAuthUrl.pathname === '/o/oauth2/v2/auth', `Expected Google auth path, got ${googleAuthUrl.pathname}`);
    assert(googleAuthUrl.searchParams.get('client_id') === 'google-client-id.test', 'Expected Google client id');
    assert(googleAuthUrl.searchParams.get('scope') === 'openid email profile', 'Expected Google OAuth scopes');
    assert(
      googleAuthUrl.searchParams.get('redirect_uri') === `${baseUrl}/api/auth/callback`,
      'Expected Google OAuth redirect URI to use Zoon callback',
    );

    delete process.env.ZOON_OAUTH_CLIENT_SECRET;
    const googleMissingSecretRes = await fetch(`${baseUrl}/api/auth/start`, { method: 'POST' });
    const googleMissingSecret = await readJson(googleMissingSecretRes);
    assert(googleMissingSecretRes.status === 503, `Expected Google missing secret 503, got ${googleMissingSecretRes.status}`);
    assert(googleMissingSecret.code === 'OAUTH_NOT_CONFIGURED', 'Expected OAuth not configured code for missing Google secret');
    assert(
      String(googleMissingSecret.error).includes('ZOON_OAUTH_CLIENT_SECRET'),
      'Expected missing Google secret guidance',
    );
  });
  console.log('✓ account library OAuth/session/document history flow');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
