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

assert(skill.includes('## Core Rules'), 'skill must start with compact core rules');
assert(skill.includes('## Direct Write'), 'skill must document the direct write path');
assert(skill.includes('## Comments And Suggestions'), 'skill must document opt-in review paths');
assert(skill.includes('POST /documents/:slug/edit/v2'), 'skill must promote canonical document edit route');
assert(skill.includes('Compatibility routes under `/api/agent/:slug/*` still work'), 'skill must mention legacy compatibility without promoting it');

assert(!/Shortcut trigger:\s*`\/zoon`/.test(skill), 'skill must not carry the old /zoon shortcut mode');
assert(!/新建一个 doc/.test(skill), 'skill must not offer old /zoon mode A');
assert(!/贴到已有 doc/.test(skill), 'skill must not offer old /zoon mode B');
assert(!/Parse failure|URL 看起来不对/i.test(skill), 'skill must not include old /zoon URL parse flow');

console.log('✓ Zoon skill is Proof-style HTTP protocol, not /zoon session mode');
