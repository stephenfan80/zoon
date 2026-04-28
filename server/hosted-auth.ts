import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import {
  createLocalAccount,
  createShareAuthSession,
  getLocalAccountByEmail,
  getShareAuthSession,
  revokeShareAuthSession,
  touchLocalAccountLogin,
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

type OAuthProviderPreset = {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string | null;
  scopes: string;
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

type LocalAuthResult = {
  ok: true;
  principal: HostedAuthPrincipal;
  sessionToken: string;
  sessionMaxAgeSec: number;
} | {
  ok: false;
  status: number;
  code: string;
  error: string;
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

function getOAuthProviderPreset(provider: string): OAuthProviderPreset | null {
  if (provider !== 'google') return null;
  return {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scopes: 'openid email profile',
  };
}

function getConfiguredOAuthProvider(): string {
  return (readEnv('ZOON_OAUTH_PROVIDER', 'PROOF_OAUTH_PROVIDER', 'OAUTH_PROVIDER') || 'generic').toLowerCase();
}

function getOAuthConfig(publicBaseUrl?: string): OAuthConfig | null {
  const provider = getConfiguredOAuthProvider();
  const mock = provider === 'mock' || isTruthy(process.env.ZOON_OAUTH_MOCK);
  const preset = getOAuthProviderPreset(provider);
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
  ) || preset?.authorizeUrl || '';
  const tokenUrl = readEnv('ZOON_OAUTH_TOKEN_URL', 'PROOF_OAUTH_TOKEN_URL', 'OAUTH_TOKEN_URL', 'EVERY_OAUTH_TOKEN_URL')
    || preset?.tokenUrl
    || '';
  const userInfoUrl = readEnv(
    'ZOON_OAUTH_USERINFO_URL',
    'PROOF_OAUTH_USERINFO_URL',
    'OAUTH_USERINFO_URL',
    'EVERY_OAUTH_USERINFO_URL',
  ) || preset?.userInfoUrl || null;

  if (!mock && (!clientId || !authorizeUrl || !tokenUrl || (provider === 'google' && !clientSecret))) return null;
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
    scopes: readEnv('ZOON_OAUTH_SCOPES', 'PROOF_OAUTH_SCOPES', 'OAUTH_SCOPES') || preset?.scopes || 'openid email profile',
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

function getHostedSessionTtlSeconds(): number {
  return parsePositiveInt(process.env.ZOON_OAUTH_SESSION_TTL_SECONDS, 30 * 24 * 60 * 60);
}

function normalizeLocalEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  if (normalized.length > 254) return null;
  return normalized;
}

function normalizeLocalName(name: unknown, fallbackEmail: string): string | null {
  if (typeof name !== 'string') {
    const localPart = fallbackEmail.split('@')[0]?.trim();
    return localPart || null;
  }
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  return normalized.slice(0, 80);
}

function normalizeLocalPassword(password: unknown): string | null {
  if (typeof password !== 'string') return null;
  if (password.length < 8 || password.length > 200) return null;
  return password;
}

function readSignupInviteCode(): string {
  return readEnv('ZOON_SIGNUP_INVITE_CODE', 'ZOON_LOCAL_SIGNUP_INVITE_CODE');
}

function isSignupInviteRequired(): boolean {
  return isTruthy(process.env.ZOON_SIGNUP_INVITE_REQUIRED);
}

function secureStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function hashLocalPassword(password: string, salt: string = randomToken(18)): { hash: string; salt: string } {
  const hash = scryptSync(password, salt, 64).toString('base64url');
  return { hash, salt };
}

function verifyLocalPassword(password: string, salt: string, expectedHash: string): boolean {
  const { hash } = hashLocalPassword(password, salt);
  const expected = Buffer.from(expectedHash);
  const actual = Buffer.from(hash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
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

function createLocalHostedSession(input: {
  everyUserId: number;
  email: string;
  name: string | null;
}): { principal: HostedAuthPrincipal; sessionMaxAgeSec: number } {
  const sessionToken = createSessionToken();
  const sessionMaxAgeSec = getHostedSessionTtlSeconds();
  const sessionExpiresAt = isoFromNow(sessionMaxAgeSec);
  createShareAuthSession({
    provider: 'local',
    sessionToken,
    everyUserId: input.everyUserId,
    email: input.email,
    name: input.name,
    accessToken: 'local-session',
    refreshToken: null,
    accessExpiresAt: sessionExpiresAt,
    sessionExpiresAt,
  });
  return {
    principal: {
      userId: input.everyUserId,
      email: input.email,
      name: input.name,
      sessionToken,
    },
    sessionMaxAgeSec,
  };
}

export function registerLocalAccount(input: {
  email: unknown;
  name?: unknown;
  password: unknown;
  inviteCode?: unknown;
}): LocalAuthResult {
  const configuredInviteCode = readSignupInviteCode();
  if (isSignupInviteRequired()) {
    if (!configuredInviteCode) {
      return {
        ok: false,
        status: 503,
        code: 'SIGNUP_DISABLED',
        error: '注册暂未开放。',
      };
    }
    const inviteCode = typeof input.inviteCode === 'string' ? input.inviteCode.trim() : '';
    if (!inviteCode || !secureStringEqual(inviteCode, configuredInviteCode)) {
      return {
        ok: false,
        status: 403,
        code: 'INVALID_INVITE_CODE',
        error: '邀请码不正确。',
      };
    }
  }

  const email = normalizeLocalEmail(input.email);
  if (!email) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_EMAIL',
      error: '请输入有效邮箱。',
    };
  }
  const password = normalizeLocalPassword(input.password);
  if (!password) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_PASSWORD',
      error: '密码至少 8 位，最多 200 位。',
    };
  }
  if (getLocalAccountByEmail(email)) {
    return {
      ok: false,
      status: 409,
      code: 'ACCOUNT_EXISTS',
      error: '这个邮箱已经注册，请直接登录。',
    };
  }

  const { hash, salt } = hashLocalPassword(password);
  try {
    const account = createLocalAccount({
      email,
      name: normalizeLocalName(input.name, email),
      passwordHash: hash,
      passwordSalt: salt,
    });
    const session = createLocalHostedSession({
      everyUserId: account.every_user_id,
      email: account.email,
      name: account.name,
    });
    return {
      ok: true,
      principal: session.principal,
      sessionToken: session.principal.sessionToken,
      sessionMaxAgeSec: session.sessionMaxAgeSec,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE')) {
      return {
        ok: false,
        status: 409,
        code: 'ACCOUNT_EXISTS',
        error: '这个邮箱已经注册，请直接登录。',
      };
    }
    return {
      ok: false,
      status: 500,
      code: 'SIGNUP_FAILED',
      error: '注册失败，请稍后重试。',
    };
  }
}

export function loginLocalAccount(input: {
  email: unknown;
  password: unknown;
}): LocalAuthResult {
  const email = normalizeLocalEmail(input.email);
  const password = normalizeLocalPassword(input.password);
  if (!email || !password) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_CREDENTIALS',
      error: '邮箱或密码不正确。',
    };
  }

  const account = getLocalAccountByEmail(email);
  if (!account || !verifyLocalPassword(password, account.password_salt, account.password_hash)) {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_CREDENTIALS',
      error: '邮箱或密码不正确。',
    };
  }
  touchLocalAccountLogin(account.every_user_id);
  const session = createLocalHostedSession({
    everyUserId: account.every_user_id,
    email: account.email,
    name: account.name,
  });
  return {
    ok: true,
    principal: session.principal,
    sessionToken: session.principal.sessionToken,
    sessionMaxAgeSec: session.sessionMaxAgeSec,
  };
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
    const provider = getConfiguredOAuthProvider();
    return {
      ok: false,
      error: provider === 'google'
        ? 'OAuth is not configured. Set ZOON_OAUTH_CLIENT_ID and ZOON_OAUTH_CLIENT_SECRET for Google sign-in.'
        : 'OAuth is not configured. Set ZOON_OAUTH_CLIENT_ID, ZOON_OAUTH_AUTHORIZE_URL, and ZOON_OAUTH_TOKEN_URL.',
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
