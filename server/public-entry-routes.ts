/**
 * Zoon 公共入口路由（无鉴权、限速、对外）
 *
 * - POST /api/public/documents  — 创建空白文档（首页「创建新文档」按钮调用）
 * - GET  /skill                 — 对外 agent 读取的 skill 原文（text/markdown）
 *
 * 注意：这些路由不走 admin API key，任何人都能用。防滥用靠两层：
 *   1. 内存 IP 限速（每 IP 每分钟 N 次创建）
 *   2. ZOON_PUBLIC_CREATE_ENABLED 环境变量开关（默认开）
 */

import { randomUUID } from 'crypto';
import { Router, type Request, type Response } from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSlug } from './slug.js';
import {
  canonicalizeStoredMarks,
} from '../src/formats/marks.js';
import {
  createDocument,
  createDocumentAccessToken,
  addEvent,
} from './db.js';
import { refreshSnapshotForSlug } from './snapshot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const publicEntryRoutes = Router();

// ---------- 工具函数 ----------

function trustProxyHeaders(): boolean {
  const value = (process.env.PROOF_TRUST_PROXY_HEADERS || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function getClientIp(req: Request): string {
  if (trustProxyHeaders()) {
    const forwardedFor = req.header('x-forwarded-for');
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
      const first = forwardedFor.split(',')[0]?.trim();
      if (first) return first;
    }
  }
  if (req.ip && req.ip.trim()) return req.ip;
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  return 'unknown';
}

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isFeatureDisabled(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off';
}

// ---------- 公共创建限速 ----------

type Bucket = { count: number; resetAt: number };
const PUBLIC_CREATE_BUCKETS = new Map<string, Bucket>();
const PUBLIC_CREATE_MAX_BUCKETS = 10_000;

function checkPublicCreateRateLimit(req: Request): { allowed: true } | { allowed: false; retryAfterSeconds: number; max: number; windowMs: number } {
  const max = parsePositiveIntEnv('ZOON_PUBLIC_CREATE_RATE_LIMIT_MAX_PER_WINDOW', 20);
  const windowMs = parsePositiveIntEnv('ZOON_PUBLIC_CREATE_RATE_LIMIT_WINDOW_MS', 60_000);
  const now = Date.now();

  // 清理过期 bucket，避免内存无限增长
  if (PUBLIC_CREATE_BUCKETS.size > 0) {
    for (const [key, bucket] of PUBLIC_CREATE_BUCKETS.entries()) {
      if (bucket.resetAt <= now) PUBLIC_CREATE_BUCKETS.delete(key);
    }
  }
  if (PUBLIC_CREATE_BUCKETS.size > PUBLIC_CREATE_MAX_BUCKETS) {
    const overflow = PUBLIC_CREATE_BUCKETS.size - PUBLIC_CREATE_MAX_BUCKETS;
    let pruned = 0;
    for (const key of PUBLIC_CREATE_BUCKETS.keys()) {
      PUBLIC_CREATE_BUCKETS.delete(key);
      pruned += 1;
      if (pruned >= overflow) break;
    }
  }

  const key = `public:${getClientIp(req)}`;
  const existing = PUBLIC_CREATE_BUCKETS.get(key);
  if (!existing || existing.resetAt <= now) {
    PUBLIC_CREATE_BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      max,
      windowMs,
    };
  }
  existing.count += 1;
  return { allowed: true };
}

// ---------- POST /api/public/documents ----------

// 新建空白文档的默认 markdown：简洁标题 + 一行引导
const DEFAULT_MARKDOWN = `# Untitled\n\n`;

publicEntryRoutes.post('/api/public/documents', (req: Request, res: Response) => {
  if (isFeatureDisabled(process.env.ZOON_PUBLIC_CREATE_ENABLED)) {
    res.status(503).json({
      error: 'Public document creation is disabled',
      code: 'PUBLIC_CREATE_DISABLED',
    });
    return;
  }

  const rateLimit = checkPublicCreateRateLimit(req);
  if (!rateLimit.allowed) {
    res.setHeader('retry-after', String(rateLimit.retryAfterSeconds));
    res.status(429).json({
      error: '创建太频繁，请稍后再试',
      code: 'RATE_LIMITED',
      retryAfterSeconds: rateLimit.retryAfterSeconds,
      maxPerWindow: rateLimit.max,
      windowMs: rateLimit.windowMs,
    });
    return;
  }

  try {
    const slug = generateSlug();
    const ownerSecret = randomUUID();
    const title = 'Untitled';
    const marks = canonicalizeStoredMarks({});
    const doc = createDocument(slug, DEFAULT_MARKDOWN, marks, title, undefined, ownerSecret);
    const access = createDocumentAccessToken(slug, 'editor');
    refreshSnapshotForSlug(slug);

    addEvent(slug, 'document.created', {
      title,
      shareState: doc.share_state,
      source: 'public.homepage',
      accessRole: access.role,
      authMode: 'public',
      authenticated: false,
    }, 'public-homepage');

    res.json({
      success: true,
      slug: doc.slug,
      accessToken: access.secret,
      ownerSecret,
      shareState: doc.share_state,
      createdAt: doc.created_at,
    });
  } catch (error) {
    console.error('[public-entry] failed to create document:', error);
    res.status(500).json({
      error: 'Failed to create document',
      code: 'CREATE_FAILED',
    });
  }
});

// ---------- GET /skill ----------

// 把 docs/zoon-agent.skill.md 缓存到内存，避免每次请求磁盘 I/O
let cachedSkill: string | null = null;
const SKILL_PATH = path.resolve(__dirname, '..', 'docs', 'zoon-agent.skill.md');

function loadSkill(): string {
  if (cachedSkill !== null && process.env.NODE_ENV === 'production') return cachedSkill;
  try {
    cachedSkill = readFileSync(SKILL_PATH, 'utf-8');
  } catch (error) {
    console.error('[public-entry] failed to load skill file:', error);
    cachedSkill = '# Zoon Agent Skill\n\n(skill file missing — please report this)\n';
  }
  return cachedSkill;
}

publicEntryRoutes.get('/skill', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.type('text/markdown; charset=utf-8').send(loadSkill());
});
