/**
 * 最近文档本地缓存
 *
 * 没做登录，所以用 localStorage 记录当前浏览器见过的文档（slug/title/完整带 token 的 URL/时间戳），
 * 供顶栏 ⋯ 菜单里的「最近文档」下拉用。上限 20 条，按最新一次打开的时间倒排。
 */

const STORAGE_KEY = 'zoon:recent-docs';
const MAX_ENTRIES = 20;

export interface RecentDoc {
  slug: string;
  title: string;
  href: string; // 完整 URL，包含 token，点击直达
  ts: number;  // Date.now()
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
