export const ZOON_AGENT_MENTION = '@zoon';
export const LEGACY_PROOF_AGENT_MENTION = '@proof';

export type AgentQuickAction = 'fix-grammar' | 'improve-clarity' | 'make-shorter';

export const AGENT_QUICK_ACTION_PROMPTS: Record<AgentQuickAction, string> = {
  'fix-grammar': '修复这段文字的语法问题',
  'improve-clarity': '改善这段文字的表达，保持原意',
  'make-shorter': '在不丢失关键信息的前提下缩短这段文字',
};

export const AGENT_REVIEW_COMMENT_TEMPLATE = `[For ${ZOON_AGENT_MENTION} to review]`;

export function buildAgentMentionPrompt(prompt: string): string {
  return `${ZOON_AGENT_MENTION} ${prompt}`.trim();
}

export const AGENT_MENTION_PATTERN = /(?:@zoon|@proof)\b/i;

export function hasAgentMention(text: string): boolean {
  return AGENT_MENTION_PATTERN.test(text);
}

export function extractAgentMentions(text: string): { index: number; match: string }[] {
  const mentions: { index: number; match: string }[] = [];
  const pattern = new RegExp(AGENT_MENTION_PATTERN.source, 'gi');
  const matches = text.matchAll(pattern);
  for (const match of matches) {
    if (typeof match.index === 'number') {
      mentions.push({ index: match.index, match: match[0] });
    }
  }
  return mentions;
}
