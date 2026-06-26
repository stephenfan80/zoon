import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const skill = readFileSync(path.join(repoRoot, 'docs', 'zoon-agent.skill.md'), 'utf8');

const lineCount = skill.trimEnd().split('\n').length;
assert(lineCount >= 100 && lineCount <= 160, `Expected concise Zoon skill between 100 and 160 lines, got ${lineCount}`);

assert(
  skill.includes('Use HTTP for document reads and writes. Do not automate the editor DOM'),
  'Expected skill to keep document mutations on HTTP instead of editor DOM automation',
);
assert(skill.includes('pastes a Zoon agent invite containing `Doc:`'), 'Expected skill to trigger on pasted Zoon agent invite content');
assert(skill.includes('Codex browser handoff:'), 'Expected skill to include Codex browser handoff guidance');
assert(skill.includes('use\nthe `zoon-open-doc` skill'), 'Expected skill to prefer the Zoon browser-open skill');
assert(skill.includes('right-click the Zoon document URL'), 'Expected skill to keep the manual right-click fallback');
assert(skill.includes('`在 Codex 浏览器中打开` / `Open in Codex Browser`'), 'Expected skill to name the Codex Browser menu item');
assert(
  skill.includes('Browser opening is only for\nviewing and human interaction'),
  'Expected skill to bound browser opening to visible interaction',
);
assert(skill.includes('asks to write into Zoon, push content to Zoon'), 'Expected skill to advertise Zoon write/push triggers');
assert(skill.includes('long plan-grade output such as a plan, spec, design doc, article, or multi-section analysis'), 'Expected skill to advertise long-output routing');
assert(skill.includes('For short answers, quick diagnostics, brief clarifications, and small code snippets, stay in chat'), 'Expected skill to avoid pushing short answers by default');
assert(skill.includes('推到 Zoon，还是在这里直接写？'), 'Expected skill to ask before routing long output to Zoon');
assert(skill.includes('tokenUrl'), 'Expected skill to prefer tokenized create response URL');
assert(
  skill.includes('never share\n`viewUrl`/`viewPath`'),
  'Expected skill to prohibit clean viewUrl/viewPath as agent handoff links',
);
assert(
  skill.includes('use `zoon-open-doc` on that `tokenUrl`'),
  'Expected Codex create-doc flow to prefer zoon-open-doc',
);
assert(skill.includes('## Shortcut Trigger: `/zoon`'), 'Expected skill to document the /zoon shortcut trigger');
assert(skill.includes('Do not create an empty doc'), 'Expected /zoon mode not to create empty documents');
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

assert(!skill.includes('pending replacement'), 'Expected skill not to describe forced pending replacements');
assert(!skill.includes('/api/agent/<slug>/edit/v2'), 'Expected skill not to promote legacy /api/agent edit route');

console.log('✓ skill is concise, Zoon-triggered, and agent-native');
