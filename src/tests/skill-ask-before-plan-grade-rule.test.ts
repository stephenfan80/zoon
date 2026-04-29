import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const skill = readFileSync(path.join(repoRoot, 'docs', 'zoon-agent.skill.md'), 'utf8');

const lineCount = skill.trimEnd().split('\n').length;
assert(lineCount >= 80 && lineCount <= 120, `Expected concise Proof-style skill between 80 and 120 lines, got ${lineCount}`);

assert(skill.includes('Use HTTP. Do not automate the browser UI.'), 'Expected skill to forbid browser automation');
assert(skill.includes('Accept: application/json'), 'Expected skill to document JSON content negotiation');
assert(skill.includes('Accept: text/markdown'), 'Expected skill to document markdown content negotiation');
assert(skill.includes('Every write includes `by: "ai:<agent-name>"`'), 'Expected skill to require ai:<agent-name> authorship');
assert(skill.includes('rejects missing, blank, or non-`ai:` authors'), 'Expected skill to document edit/v2 author validation');
assert(skill.includes('X-Agent-Id'), 'Expected skill to require agent-scoped presence identity');
assert(skill.includes('Default to direct edits'), 'Expected skill to make direct edits the default path');
assert(skill.includes('Zoon does not force edits over human text into approval'), 'Expected skill to remove forced approval routing');
assert(skill.includes('Suggestions are opt-in'), 'Expected skill to make suggestions opt-in');
assert(skill.includes('POST /documents/:slug/edit/v2'), 'Expected skill to promote canonical edit/v2 route');
assert(skill.includes('~/.codex/skills/zoon/SKILL.md'), 'Expected skill to include Codex install path');

assert(!skill.includes('push plan-grade'), 'Expected skill not to contain old plan-grade routing policy');
assert(!skill.includes('推到 Zoon'), 'Expected skill not to ask whether to push long output to Zoon');
assert(!skill.includes('pending replacement'), 'Expected skill not to describe forced pending replacements');
assert(!skill.includes('/api/agent/<slug>/edit/v2'), 'Expected skill not to promote legacy /api/agent edit route');

console.log('✓ skill is concise, Proof-aligned, and agent-native');
