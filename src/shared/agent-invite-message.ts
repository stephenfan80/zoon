// Single source of truth for the agent invite template.
//
// Called from:
// - Server doc-creation responses (server/routes.ts — POST /documents, POST
//   /share/markdown). 服务端早一步知道真 token，把预拼好的完整邀请文本放进
//   响应的 agentInviteMessage 字段；调用方（尤其是另一个 agent）直接整段
//   粘贴给下一个 agent，不需要自己拼模板，也就不会再把 <token-from-doc-url>
//   占位符留在 x-share-token 那一行里了。
// - Browser invite button (src/editor/index.ts — getAgentInviteMessage). 浏览器
//   owner 点"邀请"时，token 从 shareClient.getShareToken()（内存里的真值）拿，
//   调用同一个 builder，保证两个入口的文本格式完全一致。
//
// 纯函数，零依赖，只拼字符串。

export interface AgentInviteInput {
  origin: string;
  slug: string | null;
  token: string | null;
  shareUrl?: string | null; // 可选，外部已经构造好的 tokenized URL；不给就 fallback 到 origin/d/<slug>[?token=...]
}

function buildDefaultShareUrl(origin: string, slug: string, token: string | null): string {
  const base = `${origin}/d/${encodeURIComponent(slug)}`;
  if (!token) return base;
  return `${base}?token=${encodeURIComponent(token)}`;
}

function buildFallbackLocationUrl(origin: string, slug: string | null): string {
  if (!slug) return origin;
  return `${origin}/d/${encodeURIComponent(slug)}`;
}

export function buildAgentInviteMessage(input: AgentInviteInput): string {
  const { origin, slug, token } = input;

  if (!slug) {
    const shareUrl = input.shareUrl || buildFallbackLocationUrl(origin, slug);
    return [
      'Hi! Inviting you to collaborate on my Zoon doc.',
      '',
      `Doc: ${shareUrl}`,
      '',
      'Read the full agent protocol first, then reply here with what you can help me with — do not edit or comment until I pick an option.',
    ].join('\n');
  }

  const shareUrl = input.shareUrl || buildDefaultShareUrl(origin, slug, token);
  const encodedSlug = encodeURIComponent(slug);
  const presenceUrl = `${origin}/api/agent/${encodedSlug}/presence`;
  const stateUrl = `${origin}/api/agent/${encodedSlug}/state`;
  const skillUrl = `${origin}/skill`;

  return [
    'Hi! Inviting you to collaborate on my Zoon doc.',
    '',
    `Doc: ${shareUrl}`,
    `Full agent protocol: ${skillUrl}`,
    '',
    'Auth headers for every API request:',
    `- x-share-token: ${token || '<token-from-doc-url>'}`,
    '- X-Agent-Id: <your-agent-id>',
    '',
    'Quick start:',
    `1) Read ${skillUrl} — it covers ops, edits, error handling, and the 拍板 (Ack) protocol.`,
    `   (If your tool can't fetch URLs, run: curl ${skillUrl})`,
    '2) Announce yourself so I can see you joined:',
    `   POST ${presenceUrl}`,
    '   body: {"agentId":"<your-agent-id>","name":"<your-name>","status":"active"}',
    '3) Read the current document state:',
    `   GET ${stateUrl}`,
    '4) Follow the skill\'s §6 handoff template: reply here with a one-line topic summary + 2–3 concrete ways you can help.',
    '',
    'Protocol details live in the skill — it\'s the single source of truth. In short: if I already left comments in the doc, reply in those threads (no 「拍板」 needed — that\'s discussion). If you want to propose a change to the doc body, run the §2 proposal flow (that one needs 「拍板」).',
  ].join('\n');
}
