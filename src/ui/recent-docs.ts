/**
 * 最近文档本地缓存
 *
 * localStorage 记录当前浏览器见过的文档（slug/title/完整带 token 的 URL/时间戳），
 * 供未登录或账号文档库不可用时兜底。上限 20 条，按最新一次打开的时间倒排。
 */

const STORAGE_KEY = 'zoon:recent-docs';
const MAX_ENTRIES = 20;
const VISIT_THROTTLE_MS = 60_000;
const lastVisitWriteBySlug = new Map<string, number>();

export interface RecentDoc {
  slug: string;
  title: string;
  href: string; // 完整 URL，包含 token，点击直达
  ts: number;  // Date.now()
}

export interface AccountDocument {
  slug: string;
  title: string | null;
  shareState: 'ACTIVE' | 'PAUSED' | 'REVOKED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  lastVisitedAt: string | null;
  isOwned: boolean;
  webUrl: string;
}

export interface AccountUser {
  id: number;
  email: string;
  name: string | null;
}

type AccountAuthPayload = {
  success?: boolean;
  user?: unknown;
  error?: string;
  code?: string;
};

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  return await response.json().catch(() => null) as Record<string, unknown> | null;
}

function accountDocumentToRecent(entry: AccountDocument): RecentDoc {
  return {
    slug: entry.slug,
    title: entry.title || 'Untitled',
    href: entry.webUrl,
    ts: parseTimestamp(entry.lastVisitedAt) || parseTimestamp(entry.updatedAt) || parseTimestamp(entry.createdAt) || Date.now(),
  };
}

function safeRead(): RecentDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is RecentDoc => (
      typeof entry === 'object'
      && entry !== null
      && typeof entry.slug === 'string'
      && typeof entry.href === 'string'
      && typeof entry.ts === 'number'
    ));
  } catch {
    return [];
  }
}

function safeWrite(entries: RecentDoc[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage 满 / 隐私模式 / SSR — 静默失败就行
  }
}

export function loadRecentDocs(): RecentDoc[] {
  return safeRead().sort((a, b) => b.ts - a.ts);
}

export function recordRecentDoc(entry: Omit<RecentDoc, 'ts'> & { ts?: number }): void {
  if (!entry.slug || !entry.href) return;
  const ts = entry.ts ?? Date.now();
  const existing = safeRead().filter((item) => item.slug !== entry.slug);
  const next = [{ slug: entry.slug, title: entry.title || 'Untitled', href: entry.href, ts }, ...existing].slice(0, MAX_ENTRIES);
  safeWrite(next);
  recordAccountDocumentVisit(entry.slug, entry.href);
}

function extractTokenFromHref(href: string): string | null {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(href, origin);
    const token = url.searchParams.get('token')?.trim();
    return token || null;
  } catch {
    return null;
  }
}

export function recordAccountDocumentVisit(slug: string, href?: string): void {
  if (!slug || typeof fetch !== 'function') return;
  const now = Date.now();
  const last = lastVisitWriteBySlug.get(slug) ?? 0;
  if (now - last < VISIT_THROTTLE_MS) return;
  lastVisitWriteBySlug.set(slug, now);
  const token = href ? extractTokenFromHref(href) : null;
  const headers: Record<string, string> = {};
  if (token) headers['x-share-token'] = token;
  void fetch(`/api/account/documents/${encodeURIComponent(slug)}/visit`, {
    method: 'POST',
    headers,
    credentials: 'same-origin',
  }).catch(() => {
    // 未登录、OAuth 不可用、离线都走本地最近文档兜底。
  });
}

export async function loadAccountMe(): Promise<AccountUser | null> {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch('/api/account/me', {
      credentials: 'same-origin',
    });
    if (!response.ok) return null;
    const payload = await readJson(response) as { user?: unknown } | null;
    const user = payload?.user as AccountUser | undefined;
    if (
      !user
      || typeof user.id !== 'number'
      || typeof user.email !== 'string'
      || (user.name !== null && typeof user.name !== 'string')
    ) return null;
    return user;
  } catch {
    return null;
  }
}

export async function loadAccountDocuments(limit: number = 50): Promise<AccountDocument[] | null> {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch(`/api/account/documents?limit=${encodeURIComponent(String(limit))}`, {
      credentials: 'same-origin',
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null) as { documents?: unknown } | null;
    if (!payload || !Array.isArray(payload.documents)) return null;
    return payload.documents
      .filter((entry): entry is AccountDocument => (
        typeof entry === 'object'
        && entry !== null
        && typeof (entry as AccountDocument).slug === 'string'
        && typeof (entry as AccountDocument).webUrl === 'string'
      ));
  } catch {
    return null;
  }
}

export async function loadAccountRecentDocs(limit: number = 10): Promise<RecentDoc[] | null> {
  const documents = await loadAccountDocuments(limit);
  return documents ? documents.map(accountDocumentToRecent) : null;
}

function parseAccountUser(value: unknown): AccountUser | null {
  const user = value as AccountUser | undefined;
  if (
    !user
    || typeof user.id !== 'number'
    || typeof user.email !== 'string'
    || (user.name !== null && typeof user.name !== 'string')
  ) return null;
  return user;
}

async function postAccountAuth(path: string, body: Record<string, unknown>): Promise<AccountUser> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await readJson(response) as AccountAuthPayload | null;
  if (!response.ok || payload?.success !== true) {
    throw new Error(payload?.error || '登录失败，请稍后重试。');
  }
  const user = parseAccountUser(payload.user);
  if (!user) {
    throw new Error('登录成功，但账号信息暂时不可用。');
  }
  return user;
}

export async function loginAccount(input: { email: string; password: string }): Promise<AccountUser> {
  return postAccountAuth('/api/auth/local/login', {
    email: input.email,
    password: input.password,
  });
}

export async function registerAccount(input: {
  email: string;
  name: string;
  password: string;
  inviteCode: string;
}): Promise<AccountUser> {
  return postAccountAuth('/api/auth/local/register', {
    email: input.email,
    name: input.name,
    password: input.password,
    inviteCode: input.inviteCode,
  });
}

export async function logoutAccount(): Promise<boolean> {
  if (typeof fetch !== 'function') return false;
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function formatRelativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.max(0, Math.round(diffMs / 1000));
  if (sec < 60) return '刚刚';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day} 天前`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon} 个月前`;
  const yr = Math.round(mon / 12);
  return `${yr} 年前`;
}
