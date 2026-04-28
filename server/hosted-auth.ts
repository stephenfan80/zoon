import { createHash, randomBytes } from 'crypto';
import {
  createShareAuthSession,
  getShareAuthSession,
  revokeShareAuthSession,
  touchShareAuthSessionVerification,
} from './db.js';

export type ShareMarkdownAuthMode = 'none' | 'api_key' | 'oauth' | 'oauth_or_api_key' | 'auto';

type PendingAuthStatus = 'pending' | 'completed' | 'failed';

export type HostedAuthPrincipal = {
  userId: number;
  email: string;
  name: string | null;
  sessionToken: string;
};

type OAuthConfig = {
  provider: string;
  mock: boolean;
  clientId: string;
  clientSecret: string | null;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string | null;
  scopes: string;
  sessionTtlSeconds: number;
  pendingTtlSeconds: number;
};

type PendingAuthEntry = {
  requestId: string;
  pollToken: string;
  state: string;
  codeVerifier: string;
  publicBaseUrl: string;
  expiresAtMs: number;
  status: PendingAuthStatus;
  error?: string;
  principal?: HostedAuthPrincipal;
  sessionExpiresAt?: string;
};

type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
};

const pendingByRequestId = new Map<string, PendingAuthEntry>();
const pendingByState = new Map<string, PendingAuthEntry>();

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

function isTruthy(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getOAuthConfig(publicBaseUrl?: string): OAuthConfig | null {
  const provider = (readEnv('ZOON_OAUTH_PROVIDER', 'PROOF_OAUTH_PROVIDER', 'OAUTH_PROVIDER') || 'generic').toLowerCase();
  const mock = provider === 'mock' || isTruthy(process.env.ZOON_OAUTH_MOCK);
  const clientId = readEnv('ZOON_OAUTH_CLIENT_ID', 'PROOF_OAUTH_CLIENT_ID', 'OAUTH_CLIENT_ID', 'EVERY_OAUTH_CLIENT_ID');
  const clientSecret = readEnv(
    'ZOON_OAUTH_CLIENT_SECRET',
    'PROOF_OAUTH_CLIENT_SECRET',
    'OAUTH_CLIENT_SECRET',
    'EVERY_OAUTH_CLIENT_SECRET',
  ) || null;
  const authorizeUrl = readEnv(
    'ZOON_OAUTH_AUTHORIZE_URL',
    'PROOF_OAUTH_AUTHORIZE_URL',
    'OAUTH_AUTHORIZE_URL',
    'EVERY_OAUTH_AUTHORIZE_URL',
  );
  const tokenUrl = readEnv('ZOON_OAUTH_TOKEN_URL', 'PROOF_OAUTH_TOKEN_URL', 'OAUTH_TOKEN_URL', 'EVERY_OAUTH_TOKEN_URL');
  const userInfoUrl = readEnv(
    'ZOON_OAUTH_USERINFO_URL',
    'PROOF_OAUTH_USERINFO_URL',
    'OAUTH_USERINFO_URL',
    'EVERY_OAUTH_USERINFO_URL',
  ) || null;

  if (!mock && (!clientId || !authorizeUrl || !tokenUrl)) return null;
  const origin = publicBaseUrl?.trim() ? trimTrailingSlash(publicBaseUrl.trim()) : '';
  if (!origin) return null;

  return {
    provider,
    mock,
    clientId: mock ? 'mock-client' : clientId,
    clientSecret,
    authorizeUrl: mock ? `${origin}/api/auth/callback` : authorizeUrl,
    tokenUrl,
    userInfoUrl,
    scopes: readEnv('ZOON_OAUTH_SCOPES', 'PROOF_OAUTH_SCOPES', 'OAUTH_SCOPES') || 'openid email profile',
    sessionTtlSeconds: parsePositiveInt(process.env.ZOON_OAUTH_SESSION_TTL_SECONDS, 30 * 24 * 60 * 60),
    pendingTtlSeconds: parsePositiveInt(process.env.ZOON_OAUTH_PENDING_TTL_SECONDS, 10 * 60),
  };
}

function redirectUri(publicBaseUrl: string): string {
  return `${trimTrailingSlash(publicBaseUrl)}/api/auth/callback`;
}

function randomToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('base64url');
}

function createSessionToken(): string {
  return `epsess_${randomToken(36)}`;
}

function sha256Base64Url(value: string): string {
  return createHash('sha256').update(value).digest('base64url');
}

function isoFromNow(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isFutureIso(value: string | null | undefined): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function cleanupExpiredPending(): void {
  const now = Date.now();
  for (const [requestId, entry] of pendingByRequestId.entries()) {
    if (entry.expiresAtMs > now) continue;
    pendingByRequestId.delete(requestId);
    pendingByState.delete(entry.state);
  }
}

function userIdFromSubject(provider: string, subject: string): number {
  if (/^\d+$/.test(subject)) {
    const parsed = Number.parseInt(subject, 10);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  const digest = createHash('sha256').update(`${provider}:${subject}`).digest();
  return (digest.readUInt32BE(0) % 2_147_483_000) + 1;
}

function readStringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function decodeJwtPayload(token: string | undefined): Record<string, unknown> {
  if (!token) return {};
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) return {};
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function principalFromProfile(
  provider: string,
  profile: Record<string, unknown>,
  sessionToken: string,
): HostedAuthPrincipal {
  const subject = readStringField(profile.sub)
    ?? readStringField(profile.id)
    ?? readStringField(profile.user_id)
    ?? readStringField(profile.uid);
  if (!subject) {
    throw new Error('OAuth profile did not include a stable subject');
  }
  const email = readStringField(profile.email) ?? `${provider}-${subject}@oauth.local`;
  const name = readStringField(profile.name)
    ?? readStringField(profile.preferred_username)
    ?? readStringField(profile.login);
  return {
    userId: userIdFromSubject(provider, subject),
    email,
    name,
    sessionToken,
  };
}

async function exchangeOAuthCode(config: OAuthConfig, entry: PendingAuthEntry, code: string): Promise<TokenPayload> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(entry.publicBaseUrl),
    client_id: config.clientId,
    code_verifier: entry.codeVerifier,
  });
  if (config.clientSecret) body.set('client_secret', config.clientSecret);

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const payload = await response.json().catch(() => null) as TokenPayload | { error?: string; error_description?: string } | null;
  if (!response.ok || !payload) {
    const message = payload && 'error_description' in payload && payload.error_description
      ? payload.error_description
      : `OAuth token exchange failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload as TokenPayload;
}

async function fetchOAuthProfile(config: OAuthConfig, tokenPayload: TokenPayload): Promise<Record<string, unknown>> {
  const fromIdToken = decodeJwtPayload(tokenPayload.id_token);
  if (!config.userInfoUrl || !tokenPayload.access_token) return fromIdToken;

  const response = await fetch(config.userInfoUrl, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`OAuth userinfo request failed with HTTP ${response.status}`);
  }
  return { ...fromIdToken, ...payload };
}

function createMockProfile(): Record<string, unknown> {
  return {
    sub: readEnv('ZOON_OAUTH_MOCK_USER_ID') || '1001',
    email: readEnv('ZOON_OAUTH_MOCK_EMAIL') || 'zoon-user@example.test',
    name: readEnv('ZOON_OAUTH_MOCK_NAME') || 'Zoon User',
  };
}

function completePendingAuth(
  config: OAuthConfig,
  entry: PendingAuthEntry,
  profile: Record<string, unknown>,
  tokenPayload?: TokenPayload,
): HostedAuthPrincipal {
  const sessionToken = createSessionToken();
  const principal = principalFromProfile(config.provider, profile, sessionToken);
  const accessExpiresAt = isoFromNow(
    typeof tokenPayload?.expires_in === 'number' && Number.isFinite(tokenPayload.expires_in)
      ? Math.max(60, Math.trunc(tokenPayload.expires_in))
      : 60 * 60,
  );
  const sessionExpiresAt = isoFromNow(config.sessionTtlSeconds);

  createShareAuthSession({
    provider: config.provider,
    sessionToken,
    everyUserId: principal.userId,
    email: principal.email,
    name: principal.name,
    accessToken: tokenPayload?.access_token ?? 'mock-access-token',
    refreshToken: tokenPayload?.refresh_token ?? null,
    accessExpiresAt,
    sessionExpiresAt,
  });

  entry.status = 'completed';
  entry.principal = principal;
  entry.sessionExpiresAt = sessionExpiresAt;
  pendingByState.delete(entry.state);
  return principal;
}

export function isOAuthConfigured(publicBaseUrl?: string): boolean {
  return getOAuthConfig(publicBaseUrl) !== null;
}

export function resolveShareMarkdownAuthMode(publicBaseUrl?: string): Exclude<ShareMarkdownAuthMode, 'auto'> {
  const configured = (process.env.PROOF_SHARE_MARKDOWN_AUTH_MODE || 'none').trim().toLowerCase();
  if (configured === 'api_key') return 'api_key';
  if (configured === 'oauth_or_api_key') return 'oauth_or_api_key';
  if (configured === 'oauth') return 'oauth';
  return 'none';
}

export function startOAuthFlow(publicBaseUrl: string):
  | {
    ok: true;
    requestId: string;
    pollToken: string;
    pollUrl: string;
    authUrl: string;
    expiresAt: string;
    expiresIn: number;
  }
  | {
    ok: false;
    error: string;
  } {
  cleanupExpiredPending();
  const config = getOAuthConfig(publicBaseUrl);
  if (!config) {
    return {
      ok: false,
      error: 'OAuth is not configured. Set ZOON_OAUTH_CLIENT_ID, ZOON_OAUTH_AUTHORIZE_URL, and ZOON_OAUTH_TOKEN_URL.',
    };
  }

  const requestId = randomToken(18);
  const pollToken = randomToken(24);
  const state = randomToken(24);
  const codeVerifier = randomToken(48);
  const expiresAtMs = Date.now() + config.pendingTtlSeconds * 1000;
  const entry: PendingAuthEntry = {
    requestId,
    pollToken,
    state,
    codeVerifier,
    publicBaseUrl: trimTrailingSlash(publicBaseUrl),
    expiresAtMs,
    status: 'pending',
  };
  pendingByRequestId.set(requestId, entry);
  pendingByState.set(state, entry);

  const authUrl = new URL(config.authorizeUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri(entry.publicBaseUrl));
  authUrl.searchParams.set('scope', config.scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', sha256Base64Url(codeVerifier));
  if (config.mock) authUrl.searchParams.set('code', 'mock-code');

  return {
    ok: true,
    requestId,
    pollToken,
    pollUrl: `${entry.publicBaseUrl}/api/auth/poll/${encodeURIComponent(requestId)}`,
    authUrl: authUrl.toString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresIn: config.pendingTtlSeconds,
  };
}

export function pollOAuthFlow(
  requestId: string,
  pollToken: string,
): {
  status: PendingAuthStatus;
  error?: string;
  principal?: HostedAuthPrincipal;
  sessionToken?: string;
  sessionExpiresAt?: string;
} | null {
  cleanupExpiredPending();
  const entry = pendingByRequestId.get(requestId);
  if (!entry) return null;
  if (entry.pollToken !== pollToken) {
    return {
      status: 'failed',
      error: 'Invalid poll token',
    };
  }
  return {
    status: entry.status,
    error: entry.error,
    principal: entry.principal,
    sessionToken: entry.principal?.sessionToken,
    sessionExpiresAt: entry.sessionExpiresAt,
  };
}

export async function handleOAuthCallback(input: {
  state: string;
  code?: string;
  error?: string;
  publicBaseUrl?: string;
}): Promise<{
  ok: boolean;
  message: string;
  principal?: HostedAuthPrincipal;
  sessionToken?: string;
  sessionExpiresAt?: string;
  sessionMaxAgeSec?: number;
}> {
  cleanupExpiredPending();
  const entry = pendingByState.get(input.state);
  if (!entry) {
    return {
      ok: false,
      message: 'Auth request not found or expired.',
    };
  }

  const config = getOAuthConfig(input.publicBaseUrl || entry.publicBaseUrl);
  if (!config) {
    entry.status = 'failed';
    entry.error = 'OAuth is not configured on this server.';
    pendingByState.delete(entry.state);
    return { ok: false, message: entry.error };
  }

  if (input.error) {
    entry.status = 'failed';
    entry.error = input.error;
    pendingByState.delete(entry.state);
    return {
      ok: false,
      message: `OAuth provider returned an error: ${input.error}`,
    };
  }
  if (!input.code) {
    entry.status = 'failed';
    entry.error = 'Missing OAuth code.';
    pendingByState.delete(entry.state);
    return {
      ok: false,
      message: entry.error,
    };
  }

  try {
    const tokenPayload = config.mock
      ? { access_token: 'mock-access-token', expires_in: 3600 }
      : await exchangeOAuthCode(config, entry, input.code);
    const profile = config.mock ? createMockProfile() : await fetchOAuthProfile(config, tokenPayload);
    const principal = completePendingAuth(config, entry, profile, tokenPayload);
    return {
      ok: true,
      message: `Signed in as ${principal.email}.`,
      principal,
      sessionToken: principal.sessionToken,
      sessionExpiresAt: entry.sessionExpiresAt,
      sessionMaxAgeSec: config.sessionTtlSeconds,
    };
  } catch (error) {
    entry.status = 'failed';
    entry.error = error instanceof Error ? error.message : String(error);
    pendingByState.delete(entry.state);
    return {
      ok: false,
      message: entry.error,
    };
  }
}

export async function validateHostedSessionToken(
  sessionToken: string,
  _publicBaseUrl?: string,
): Promise<{
  ok: boolean;
  principal?: HostedAuthPrincipal;
  reason?: string;
}> {
  const token = sessionToken.trim();
  if (!token) return { ok: false, reason: 'missing_token' };
  const row = getShareAuthSession(token);
  if (!row) return { ok: false, reason: 'invalid_token' };
  if (row.revoked_at) return { ok: false, reason: 'revoked_token' };
  if (!isFutureIso(row.session_expires_at)) return { ok: false, reason: 'expired_token' };

  touchShareAuthSessionVerification({
    sessionToken: token,
    email: row.email,
    name: row.name,
    subscriber: row.subscriber !== 0,
  });

  return {
    ok: true,
    principal: {
      userId: row.every_user_id,
      email: row.email,
      name: row.name,
      sessionToken: token,
    },
  };
}

export function revokeHostedSessionToken(sessionToken: string): boolean {
  return revokeShareAuthSession(sessionToken);
}
