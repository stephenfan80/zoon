import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function assertIncludes(haystack: string, needle: string, message: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(message);
  }
}

function assertMatches(haystack: string, pattern: RegExp, message: string): void {
  if (!pattern.test(haystack)) {
    throw new Error(message);
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const homepageV2 = readFileSync(path.join(root, 'server', 'homepage-v2.ts'), 'utf8');
const readme = readFileSync(path.join(root, 'README.md'), 'utf8');

assertIncludes(
  homepageV2,
  'codex plugin marketplace add</span> <span class="str">stephenfan80/zoon-codex-plugin</span>',
  'Homepage V2 should show the public Zoon Codex plugin marketplace install command',
);
assertIncludes(
  homepageV2,
  '<div class="name">Codex Plugin</div><div class="meta">Marketplace · 推荐</div>',
  'Homepage V2 should make Codex Plugin a visible recommended option',
);
assertIncludes(
  homepageV2,
  '在 Codex 的 Plugins 列表里启用 Zoon',
  'Homepage V2 should tell users to enable Zoon after adding the marketplace',
);
assertIncludes(
  homepageV2,
  '用 Zoon 继续改这份方案',
  'Homepage V2 should position the Codex trigger as continuing a document in Zoon',
);
assertMatches(
  homepageV2,
  /var codeBlocks = \{\s+codexPlugin:/,
  'Homepage V2 should keep Codex plugin as the first code-block option',
);
assertIncludes(
  readme,
  'codex plugin marketplace add stephenfan80/zoon-codex-plugin',
  'README should include the public Codex plugin marketplace install command',
);

console.log('✓ Homepage V2 Codex plugin discovery copy is present');
