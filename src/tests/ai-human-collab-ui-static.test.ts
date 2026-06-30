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
assert(popover.includes('proof.markAccept(mark.id);'), 'Expected suggestion accept to use Proof-style sync API');
assert(popover.includes('proof.markReject(mark.id);'), 'Expected suggestion reject to use Proof-style sync API');
assert(!popover.includes('markAcceptAsync'), 'Expected no Zoon async suggestion accept path');
assert(!popover.includes('formatSuggestionPreviewContent'), 'Expected no block-markdown suggestion preview special case');

assert(marks.includes("authored_human: 'background-color: rgba(110, 231, 183, 0.08);'"), 'Expected Proof human authored color');
assert(marks.includes("authored_ai: 'background-color: rgba(165, 180, 252, 0.12);'"), 'Expected Proof AI authored color');
assert(marks.includes("insert: 'background-color: rgba(34, 197, 94, 0.25); border-bottom: 2px solid #22C55E;'"), 'Expected Proof insert suggestion style');
assert(marks.includes("delete: 'background-color: rgba(239, 68, 68, 0.2); text-decoration: line-through; color: #666;'"), 'Expected Proof delete suggestion style');
assert(!marks.includes('replace_insert_ai'), 'Expected no Zoon AI replacement insert style');
assert(!marks.includes('mark-suggestion-ai'), 'Expected no Zoon AI suggestion class');
assert(!marks.includes('collectInlineCommentAnchorDecorations'), 'Expected no extra comment-anchor decoration fallback');
assert(!marks.includes('contentMode'), 'Expected no block markdown contentMode branch');

assert(html.includes('span[data-proof="suggestion"][data-kind="insert"]'), 'Expected persisted suggestion insert CSS');
assert(html.includes('background-color: rgba(34, 197, 94, 0.25);'), 'Expected persisted Proof insert color');
assert(html.includes('border-bottom: 2px solid #22C55E;'), 'Expected persisted Proof insert underline');
assert(!html.includes('.mark-replace-insert-ai'), 'Expected no Zoon AI replacement insert CSS');
assert(!html.includes('span[data-proof="comment"]'), 'Expected no extra persisted comment span styling');
assert(!html.includes('.mark-authored-ai'), 'Expected no Zoon authored mark static styling');

console.log('✓ collaboration mark UI follows Proof static behavior');
