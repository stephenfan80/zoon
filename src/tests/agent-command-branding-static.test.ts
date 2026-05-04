import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  AGENT_REVIEW_COMMENT_TEMPLATE,
  LEGACY_PROOF_AGENT_MENTION,
  ZOON_AGENT_MENTION,
  buildAgentMentionPrompt,
  extractAgentMentions,
  hasAgentMention,
} from '../shared/agent-command-constants.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function readSource(...segments: string[]): string {
  return readFileSync(path.join(process.cwd(), ...segments), 'utf8');
}

const contextMenu = readSource('src', 'ui', 'context-menu.ts');
const keybindings = readSource('src', 'editor', 'plugins', 'keybindings.ts');
const agentInputDialog = readSource('src', 'ui', 'agent-input-dialog.ts');
const editorIndex = readSource('src', 'editor', 'index.ts');
const comments = readSource('src', 'editor', 'plugins', 'comments.ts');
const triggerService = readSource('src', 'agent', 'trigger-service.ts');

assert(ZOON_AGENT_MENTION === '@zoon', 'Expected @zoon to be the canonical agent mention');
assert(LEGACY_PROOF_AGENT_MENTION === '@proof', 'Expected @proof to remain as a legacy alias');
assert(AGENT_REVIEW_COMMENT_TEMPLATE === '[For @zoon to review]', 'Expected review template to use @zoon');
assert(buildAgentMentionPrompt('Fix this') === '@zoon Fix this', 'Expected generated prompts to use @zoon');
assert(buildAgentMentionPrompt('修复这段文字的语法问题') === '@zoon 修复这段文字的语法问题', 'Expected generated quick action prompts to be Chinese-first');
assert(hasAgentMention('@zoon please fix this'), 'Expected @zoon to trigger mention detection');
assert(hasAgentMention('@proof please fix this'), 'Expected legacy @proof alias to trigger mention detection');
assert(!hasAgentMention('@zoomer please fix this'), 'Expected partial @zoon matches to be ignored');
assert(
  extractAgentMentions('first @zoon then @proof').map((mention) => mention.match).join(',') === '@zoon,@proof',
  'Expected mention extraction to include canonical and legacy aliases',
);

for (const [label, source] of [
  ['context menu', contextMenu],
  ['keybindings', keybindings],
  ['agent input dialog', agentInputDialog],
] as const) {
  assert(source.includes('AGENT_QUICK_ACTION_PROMPTS'), `Expected ${label} to use shared quick action prompts`);
  assert(!source.includes('修复这段文字的语法问题\','), `Expected ${label} not to duplicate grammar prompt literals`);
  assert(!source.includes('改善这段文字的表达，保持原意\','), `Expected ${label} not to duplicate clarity prompt literals`);
  assert(!source.includes('在不丢失关键信息的前提下缩短这段文字\','), `Expected ${label} not to duplicate shorter prompt literals`);
  assert(!source.includes('[For @proof to review]'), `Expected ${label} not to generate @proof review comments`);
}

assert(contextMenu.includes('AGENT_REVIEW_COMMENT_TEMPLATE'), 'Expected context menu comments to use shared review template');
assert(keybindings.includes('AGENT_REVIEW_COMMENT_TEMPLATE'), 'Expected keyboard comments to use shared review template');
assert(agentInputDialog.includes('>修复语法<'), 'Expected agent input quick action labels to be Chinese');
assert(agentInputDialog.includes('>改善表达<'), 'Expected agent input quick action labels to be Chinese');
assert(agentInputDialog.includes('>缩短<'), 'Expected agent input quick action labels to be Chinese');
assert(agentInputDialog.includes('>取消<'), 'Expected cancel button to be localized');
assert(agentInputDialog.includes('>发送<'), 'Expected submit button to be localized');

assert(editorIndex.includes('buildAgentMentionPrompt(prompt)'), 'Expected manual agent invocation to generate @zoon prompts');
assert(editorIndex.includes('persistAgentRequestCommentsForExternalAgents'), 'Expected @zoon comment requests to be durable for external agent polling');
assert(editorIndex.includes('shareClient.pushMarks(actionMetadata, actor)'), 'Expected @zoon comment requests to emit server-side comment events in share mode');
assert(!editorIndex.includes('`@proof ${prompt}`'), 'Expected manual agent invocation not to generate @proof prompts');
assert(comments.includes('hasAgentMention(text)'), 'Expected comment mention detection to use the shared detector');
assert(triggerService.includes('hasAgentMention(text)'), 'Expected trigger service to use the shared detector');
assert(triggerService.includes('extractAgentMentions(text)'), 'Expected trigger service to use shared mention extraction');

console.log('✓ Agent command branding and mention compatibility are wired');
