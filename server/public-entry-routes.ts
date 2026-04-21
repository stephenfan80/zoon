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
import {
  applyCanonicalDocumentToCollab,
  queueProjectionRepair,
  getCollabRuntime,
} from './collab.js';
import { buildAgentInviteMessage } from '../src/shared/agent-invite-message.js';

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

// 新建空白文档的默认 markdown：中文上手引导
// 第一次用 Zoon 的人打开新文档，这里解释拍板协议、三步协作、可做事项
const DEFAULT_MARKDOWN = `# 欢迎用 Zoon 写文档

Zoon 是和 AI 一起写东西的地方。你写的字会标成绿色，AI 写的字会标成紫色——左边那条彩色边栏会一直告诉你每一段是谁写的。

## 拍板协议：AI 不会偷偷改你的文档

规则很短：AI 有想法 → 先写成批注 → 你看到后点「拍板」才真的落到文档里。

- 你在文档里直接写字：绿色的，随你改
- AI 不动文档，它只在批注里提建议
- 你点「拍板」，这条建议才变成文档里的紫色文字
- 你点「👎」或者不理它，什么都不会发生

AI 永远只能建议，你永远是拍板的人。

## 三步开始协作

1. **加 agent** — 点右上角「+ Add agent」。支持 Claude Code、Codex、Cursor、ChatGPT 等能发 HTTP 的 AI 工具，复制提示词粘给它就行。
2. **让它干活** — 在批注里提要求，或者直接对它说：「帮我把这段改短」「再给三个标题候选」「把我这几条碎片整理成一段」。
3. **拍板** — 它给的方案你满意就拍板，不满意就追问、换方向、或者自己改。

## 可以试试

这篇文档就是练习场。试试这几件事：

- 选中这一段，加一条批注：「帮我改得更短更有力」
- 在下面新起一段，写 3 句你今天在想的事，让 AI 扩成完整段落
- 给一个标题，让 AI 搭提纲
- 把手机备忘录里一堆碎片丢给 AI，让它整理成结构化文档

## 开始写

删掉上面这些，或者留着——随你。往下就是你的空白页：

---

`;

// Agent push 入参大小上限（Express json limit 已兜底 10mb，这里再限 markdown 本身）
const MAX_AGENT_MARKDOWN_BYTES = 500_000; // 500 KB，约 15-20 万字
const MAX_AGENT_TITLE_LENGTH = 200;

publicEntryRoutes.post('/api/public/documents', async (req: Request, res: Response) => {
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

  // 可选：agent 一次性塞入 markdown + title，省掉「先建空文档再 edit」两跳
  const rawMarkdown = req.body?.markdown;
  const rawTitle = req.body?.title;
  let initialMarkdown = DEFAULT_MARKDOWN;
  let initialTitle = 'Untitled';
  let source: 'public.homepage' | 'public.agent_push' = 'public.homepage';

  if (rawMarkdown !== undefined) {
    if (typeof rawMarkdown !== 'string') {
      res.status(400).json({ error: 'markdown must be a string', code: 'INVALID_MARKDOWN' });
      return;
    }
    if (Buffer.byteLength(rawMarkdown, 'utf8') > MAX_AGENT_MARKDOWN_BYTES) {
      res.status(413).json({
        error: 'markdown exceeds 500KB limit',
        code: 'MARKDOWN_TOO_LARGE',
        maxBytes: MAX_AGENT_MARKDOWN_BYTES,
      });
      return;
    }
    initialMarkdown = rawMarkdown;
    source = 'public.agent_push';
  }

  if (rawTitle !== undefined) {
    if (typeof rawTitle !== 'string') {
      res.status(400).json({ error: 'title must be a string', code: 'INVALID_TITLE' });
      return;
    }
    const trimmed = rawTitle.trim();
    if (trimmed) initialTitle = trimmed.slice(0, MAX_AGENT_TITLE_LENGTH);
  }

  try {
    const slug = generateSlug();
    const ownerSecret = randomUUID();
    const marks = canonicalizeStoredMarks({});
    const doc = createDocument(slug, initialMarkdown, marks, initialTitle, undefined, ownerSecret);
    const access = createDocumentAccessToken(slug, 'editor');
    refreshSnapshotForSlug(slug);

    // Eagerly hydrate the Yjs runtime and mark the markdown projection fresh so that the
    // very first GET /api/agent/:slug/state — and the first browser WebSocket sync — see
    // mutationReady:true instead of repair_pending:true / yjs_fallback. Without this the
    // doc is only written to the DB here; Y.Doc hydration and projection generation were
    // deferred to the first WebSocket onLoadDocument, which is why fresh docs showed a
    // stuck yellow "Syncing..." topbar and agents hit 60× /state polls returning
    // mutationReady:false before they could edit.
    //
    // Failures are logged but non-fatal: the client will still work, it just falls back
    // to the old lazy-hydrate path on first open.
    try {
      if (getCollabRuntime().enabled) {
        await applyCanonicalDocumentToCollab(slug, {
          markdown: initialMarkdown,
          marks,
          source: 'public.create',
        });
        queueProjectionRepair(slug, 'public.create');
      }
    } catch (collabError) {
      console.error('[public-entry] failed to hydrate collab state after create:', {
        slug,
        error: collabError instanceof Error ? collabError.message : String(collabError),
      });
    }

    addEvent(slug, 'document.created', {
      title: initialTitle,
      shareState: doc.share_state,
      source,
      accessRole: access.role,
      authMode: 'public',
      authenticated: false,
      markdownBytes: Buffer.byteLength(initialMarkdown, 'utf8'),
    }, source === 'public.agent_push' ? 'public-agent-push' : 'public-homepage');

    // Agent 一键 push 场景：返回带 token 的完整 URL，agent 可以直接丢给人类
    const origin = `${req.protocol}://${req.get('host')}`;
    const url = `${origin}/d/${doc.slug}?token=${encodeURIComponent(access.secret)}`;

    // Pre-built invite block ready to paste into an agent-to-agent handoff.
    // 用同一个 shared builder —— 和 POST /documents / POST /share/markdown /
    // 浏览器"邀请"按钮文本完全一致，token 已嵌入，下一个 agent 直接粘贴就能用。
    const agentInviteMessage = buildAgentInviteMessage({
      origin,
      slug: doc.slug,
      token: access.secret,
      shareUrl: url,
    });

    res.json({
      success: true,
      slug: doc.slug,
      accessToken: access.secret,
      ownerSecret,
      shareState: doc.share_state,
      createdAt: doc.created_at,
      url,
      agentInviteMessage,
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
