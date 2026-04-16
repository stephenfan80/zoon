import { __isDefaultTitleForTests, deriveTitleFromMarkdown } from '../../server/document-title.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function run(): void {
  // Basic: first H1 wins
  assertEqual(deriveTitleFromMarkdown('# Hello world\n\nsome content'), 'Hello world', 'basic h1');

  // Strip common inline markup
  assertEqual(
    deriveTitleFromMarkdown('# **Bold** title with `code` and _em_'),
    'Bold title with code and em',
    'strip inline markup',
  );

  // Any ATX heading level derives a title (editor may start with H2)
  assertEqual(deriveTitleFromMarkdown('## Just h2 here'), 'Just h2 here', 'h2 fallback');

  // Skip leading blank lines
  assertEqual(deriveTitleFromMarkdown('\n\n\n# After blanks'), 'After blanks', 'leading blanks');

  // First non-empty line is prose → no auto-title (don't scan past it)
  assertEqual(
    deriveTitleFromMarkdown('Just a paragraph.\n\n# Later heading'),
    null,
    'prose-first skips auto-title',
  );

  // Empty / whitespace markdown
  assertEqual(deriveTitleFromMarkdown(''), null, 'empty');
  assertEqual(deriveTitleFromMarkdown('   \n\n  '), null, 'whitespace only');

  // Trailing hashes & spaces stripped
  assertEqual(deriveTitleFromMarkdown('# Title ##  '), 'Title', 'trailing hashes trimmed');

  // Implausibly long headings ignored (treat as prose, not title)
  const longHeading = `# ${'x'.repeat(200)}`;
  assertEqual(deriveTitleFromMarkdown(longHeading), null, 'long heading rejected');

  // CJK title works
  assertEqual(deriveTitleFromMarkdown('# 我的第一个文档'), '我的第一个文档', 'cjk heading');

  // Link text preserved, link URL stripped
  assertEqual(
    deriveTitleFromMarkdown('# Check out [our blog](https://example.com)'),
    'Check out our blog',
    'link stripped to text',
  );

  // Heading with only markup → empty after cleaning → null
  assertEqual(deriveTitleFromMarkdown('# ****'), null, 'empty after strip');

  // Default-title tokens: these must all be treated as "overwritable" so that
  // auto-derive kicks in on first real edit. Critical: '新文档' is the literal
  // default in server/routes.ts for new docs — if this assertion breaks,
  // the title="新文档" bug will silently come back.
  assert(__isDefaultTitleForTests(''), 'empty string is default');
  assert(__isDefaultTitleForTests('  '), 'whitespace is default');
  assert(__isDefaultTitleForTests('Untitled'), 'Untitled is default');
  assert(__isDefaultTitleForTests('untitled'), 'lowercase untitled is default');
  assert(__isDefaultTitleForTests('新文档'), '新文档 is default (routes.ts新建默认)');
  assert(__isDefaultTitleForTests('新建文档'), '新建文档 is default');
  assert(__isDefaultTitleForTests('未命名'), '未命名 is default');
  assert(!__isDefaultTitleForTests('My Real Title'), 'real title is NOT default');
  assert(!__isDefaultTitleForTests('U'), 'single char "U" is NOT default (human-set)');

  console.log('✓ document title auto-derive');
}

run();
