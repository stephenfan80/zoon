import { readFileSync } from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const popover = readFileSync(path.join(root, 'src/editor/plugins/mark-popover.ts'), 'utf8');
const marks = readFileSync(path.join(root, 'src/editor/plugins/marks.ts'), 'utf8');
const html = readFileSync(path.join(root, 'src/index.html'), 'utf8');

assert(popover.includes('确认 AI 替换？'), 'Expected AI replacement confirmation copy');
assert(popover.includes('保留原文'), 'Expected keep-original action copy');
assert(popover.includes('复制重写任务'), 'Expected normal AI-authored span rewrite task action');
assert(popover.includes("mark.kind === 'authored' ? 'authored' : 'suggestion'"), 'Expected authored marks to open their own popover mode');
assert(popover.includes('formatSuggestionPreviewContent'), 'Expected suggestion popover to format block markdown previews');

assert(marks.includes('mark-authored-ai'), 'Expected AI-authored decoration class');
assert(marks.includes('replace_insert_ai'), 'Expected AI replacement insert style');
assert(marks.includes('formatReplacementPreviewContent'), 'Expected block markdown replacement content to be formatted for preview');
assert(marks.includes("contentMode: meta?.contentMode"), 'Expected replacement data to carry contentMode into the UI');
assert(marks.includes("'data-mark-by': mark.by"), 'Expected decorated marks to expose author identity');

assert(html.includes('.mark-replace-insert-ai'), 'Expected static CSS for AI replacement insert');
assert(html.includes('.mark-authored-ai'), 'Expected static CSS for clickable AI authored text');
assert(html.includes('margin-left: 0.35em;'), 'Expected replacement insert preview to be visually separated from old text');

console.log('✓ AI/human collaboration editor UI wiring is present');
