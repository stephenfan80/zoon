import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillPath = path.resolve(__dirname, '../../docs/zoon-agent.skill.md');
const skill = readFileSync(skillPath, 'utf8');

// Shortcut trigger must be documented as a standalone subsection in §0.
assert(
  /Shortcut trigger:\s*`\/zoon`/.test(skill),
  'skill must document the /zoon shortcut trigger under §0',
);

// The two branches (new / existing) must both be present.
assert(/新建一个 doc/.test(skill), '/zoon reply must offer option A: 新建一个 doc');
assert(/贴到已有 doc/.test(skill), '/zoon reply must offer option B: 贴到已有 doc');

// Must explicitly tell agent not to pre-create empty docs.
assert(
  /(empty docs?|not.*pre-create|defer until)/i.test(skill),
  'skill must explicitly defer doc creation until plan-grade content exists',
);

// Must handle URL parse failure by asking again, not guessing.
assert(
  /Parse failure|parse.*fail|URL 看起来不对/i.test(skill),
  'skill must tell agent to re-ask on URL parse failure',
);

console.log('✓ /zoon shortcut trigger contract present in skill');
