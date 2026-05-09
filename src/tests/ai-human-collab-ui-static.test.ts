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
assert(marks.includes('delete_ai'), 'Expected agent-authored deletion suggestions to have their own proposal style');
assert(marks.includes('rgba(147, 197, 253, 0.14)'), 'Expected agent suggestion styling to use a cool proposal palette');
assert(marks.includes('mark-suggestion-ai'), 'Expected agent suggestions to carry a distinct class');
assert(marks.includes('text-decoration-thickness: 0.08em'), 'Expected deletion suggestion styling to use a light strike-through');
assert(!marks.includes('border-bottom: 2px solid #22C55E'), 'Expected suggestion styling to avoid harsh green underlines');
assert(!marks.includes('border-bottom: 2px solid #7E57C2'), 'Expected AI suggestion styling to avoid harsh purple underlines');

assert(html.includes('.mark-replace-insert-ai'), 'Expected static CSS for AI replacement insert');
assert(html.includes('.mark-authored-ai'), 'Expected static CSS for clickable AI authored text');
assert(html.includes('margin-left: 0.35em;'), 'Expected replacement insert preview to be visually separated from old text');
assert(html.includes('[data-by^="ai:"]'), 'Expected persisted agent suggestions to be distinguishable from human suggestions');
assert(html.includes('rgba(147, 197, 253, 0.14)'), 'Expected AI proposal preview to be visually distinct from human/provenance colors');
assert(html.includes('text-decoration-color: rgba(99, 102, 241, 0.30);'), 'Expected agent replacement deletion text to use a muted proposal strike color');

console.log('✓ AI/human collaboration editor UI wiring is present');
