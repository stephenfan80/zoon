import { getDocumentBySlug, updateDocumentTitle } from './db.js';

// "Default" title values that should be treated as unset and overwritable by
// an auto-derived H1. Anything else means the human (or an agent acting on
// human intent) chose the title — don't clobber it.
const DEFAULT_TITLE_TOKENS = new Set([
  '',
  'untitled',
  'new document',
  '新文档',
  '新建文档',
  '未命名',
]);

export function __isDefaultTitleForTests(title: string | null | undefined): boolean {
  return DEFAULT_TITLE_TOKENS.has(normalizeForDefaultCheck(title));
}

function normalizeForDefaultCheck(title: string | null | undefined): string {
  return (title ?? '').trim().toLowerCase();
}

function shouldAutoOverwriteTitle(currentTitle: string | null | undefined): boolean {
  return DEFAULT_TITLE_TOKENS.has(normalizeForDefaultCheck(currentTitle));
}

/**
 * Extract a clean heading string from the first ATX heading (`# ...`) in the
 * markdown. Returns null when no heading exists, when the heading text is
 * empty after stripping markup, or when the result is implausibly long
 * (> 120 chars — likely not a real title).
 */
export function deriveTitleFromMarkdown(markdown: string): string | null {
  if (!markdown) return null;
  const lines = markdown.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Only consider ATX headings (#, ##, … ######). Skip code fences, quotes, etc.
    const atxMatch = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!atxMatch) {
      // First non-empty line is not a heading → treat as "no auto title".
      // We intentionally don't scan past it so we don't pick up later H1s when
      // a user wrote an intro paragraph before any heading.
      return null;
    }
    const cleaned = atxMatch[2]
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .trim();
    if (!cleaned) return null;
    // Reject strings that collapse to markdown punctuation only (`****`, `~~~`, …)
    // — not meaningful titles even if the regex above couldn't pair them up.
    if (!/[\p{L}\p{N}]/u.test(cleaned)) return null;
    if (cleaned.length > 120) return null;
    return cleaned;
  }
  return null;
}

export interface AutoTitleDerivationResult {
  slug: string;
  title: string;
  previousTitle: string | null;
}

/**
 * If the document's current title is unset / "Untitled" and the new markdown
 * contains a first ATX heading, persist that heading as the title and return
 * the result so the caller can broadcast `document.title.updated`. Returns
 * null when nothing changed (human has set a custom title, or no heading).
 */
export function maybeAutoDeriveTitle(slug: string, markdown: string): AutoTitleDerivationResult | null {
  const doc = getDocumentBySlug(slug);
  if (!doc) return null;
  if (!shouldAutoOverwriteTitle(doc.title)) return null;
  const derived = deriveTitleFromMarkdown(markdown);
  if (!derived) return null;
  if (normalizeForDefaultCheck(derived) === normalizeForDefaultCheck(doc.title)) return null;
  const ok = updateDocumentTitle(slug, derived);
  if (!ok) return null;
  return { slug, title: derived, previousTitle: doc.title ?? null };
}
