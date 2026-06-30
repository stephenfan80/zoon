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
assertIncludes(
  homepageV2,
  '<a href="#collaboration">怎么协作</a>',
  'Homepage V2 should link to the collaboration model from desktop navigation',
);
assertIncludes(
  homepageV2,
  '如何跟 Agent 协作',
  'Homepage V2 should explain how users collaborate with agents',
);
assertIncludes(
  homepageV2,
  '评论</span>',
  'Homepage V2 should name comments as a collaboration layer',
);
assertIncludes(
  homepageV2,
  '任务 / 讨论',
  'Homepage V2 should explain comments as tasks or discussion',
);
assertIncludes(
  homepageV2,
  '建议</span>',
  'Homepage V2 should name suggestions as a collaboration layer',
);
assertIncludes(
  homepageV2,
  '待确认改动',
  'Homepage V2 should explain suggestions as pending changes',
);
assertIncludes(
  homepageV2,
  '接受 / 拒绝建议后，文档正文才真正变化',
  'Homepage V2 should explain that accept or reject is the real document-changing step',
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
