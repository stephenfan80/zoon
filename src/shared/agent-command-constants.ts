export const ZOON_AGENT_MENTION = '@zoon';
export const LEGACY_PROOF_AGENT_MENTION = '@proof';

export type AgentQuickAction = 'fix-grammar' | 'improve-clarity' | 'make-shorter';

export const AGENT_QUICK_ACTION_PROMPTS: Record<AgentQuickAction, string> = {
  'fix-grammar': 'Fix any grammar issues in this text',
  'improve-clarity': 'Improve the clarity of this text while keeping the meaning',
  'make-shorter': 'Make this text more concise without losing important information',
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
