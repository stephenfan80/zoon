import { readFileSync } from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const popover = readFileSync(path.join(root, 'src/editor/plugins/mark-popover.ts'), 'utf8');
const marks = readFileSync(path.join(root, 'src/editor/plugins/marks.ts'), 'utf8');
const heatmap = readFileSync(path.join(root, 'src/editor/plugins/heatmap-decorations.ts'), 'utf8');
const html = readFileSync(path.join(root, 'src/index.html'), 'utf8');

assert(popover.includes('确认 AI 替换？'), 'Expected AI replacement confirmation copy');
assert(popover.includes('保留原文'), 'Expected keep-original action copy');
assert(popover.includes('复制重写任务'), 'Expected normal AI-authored span rewrite task action');
assert(popover.includes("header.textContent = aiAuthored ? 'AI 写入' : '人类写入';"), 'Expected authored source popover to distinguish human and AI authorship');
assert(popover.includes('if (aiAuthored) {'), 'Expected AI-only rewrite action to stay off human-authored source popovers');
assert(popover.includes("mark.kind === 'authored' ? 'authored' : 'suggestion'"), 'Expected authored marks to open their own popover mode');
assert(popover.includes('formatSuggestionPreviewContent'), 'Expected suggestion popover to format block markdown previews');

assert(marks.includes('mark-authored-ai'), 'Expected AI-authored decoration class');
assert(marks.includes('mark-authored-human'), 'Expected human-authored decoration class');
assert(marks.includes("authored_human: 'background-color: transparent; border-bottom: 0;"), 'Expected human-authored text to stay visually neutral in the document body');
assert(marks.includes("authored_ai: 'background-color: transparent; border-bottom: 0;"), 'Expected agent-authored text to stay visually neutral in the document body');
assert(!marks.includes('authored_human: \'background-color: rgba(136, 194, 160'), 'Expected human authorship color not to paint the full text background');
assert(!marks.includes('authored_ai: \'background-color: rgba(185, 165, 232'), 'Expected agent authorship color not to paint the full text background');
assert(marks.includes('replace_insert_ai'), 'Expected AI replacement insert style');
assert(marks.includes('formatReplacementPreviewContent'), 'Expected block markdown replacement content to be formatted for preview');
assert(marks.includes("contentMode: meta?.contentMode"), 'Expected replacement data to carry contentMode into the UI');
assert(marks.includes("'data-mark-by': mark.by"), 'Expected decorated marks to expose author identity');
assert(marks.includes('delete_ai'), 'Expected agent-authored deletion suggestions to have their own proposal style');
assert(marks.includes('rgba(147, 197, 253, 0.20)'), 'Expected agent suggestion styling to use a visible cool proposal palette');
assert(marks.includes('mark-suggestion-ai'), 'Expected agent suggestions to carry a distinct class');
assert(marks.includes('text-decoration-thickness: 0.08em'), 'Expected deletion suggestion styling to use a light strike-through');
assert(!marks.includes('border-bottom: 2px solid #22C55E'), 'Expected suggestion styling to avoid harsh green underlines');
assert(!marks.includes('border-bottom: 2px solid #7E57C2'), 'Expected AI suggestion styling to avoid harsh purple underlines');

assert(html.includes('.mark-replace-insert-ai'), 'Expected static CSS for AI replacement insert');
assert(html.includes('.mark-authored-ai'), 'Expected static CSS for clickable AI authored text');
assert(html.includes('.mark-authored-human'), 'Expected static CSS for clickable human authored text');
assert(html.includes('span[data-proof="authored"][data-by^="ai:"]'), 'Expected persisted agent-authored spans to use the neutral body style');
assert(html.includes('background-color: transparent;'), 'Expected authored spans to avoid full-line color fills');
assert(!html.includes('span[data-proof="authored"][data-by^="human:"] {\n      background-color: rgba(136, 194, 160'), 'Expected persisted human-authored spans not to paint the body text green');
assert(!html.includes('.document-sidebar-provenance-legend'), 'Expected collaboration color legend to stay out of the history sidebar');
assert(html.includes('#provenance-gutter::before'), 'Expected left provenance gutter to keep only a subtle neutral rail');
assert(html.includes('z-index: 1;'), 'Expected colored provenance segments to render above the neutral rail');
assert(html.includes('margin-left: 0.35em;'), 'Expected replacement insert preview to be visually separated from old text');
assert(html.includes('[data-by^="ai:"]'), 'Expected persisted agent suggestions to be distinguishable from human suggestions');
assert(html.includes('rgba(147, 197, 253, 0.20)'), 'Expected AI proposal preview to be visually distinct from human/provenance colors');
assert(html.includes('text-decoration-color: rgba(99, 102, 241, 0.30);'), 'Expected agent replacement deletion text to use a muted proposal strike color');
assert(heatmap.includes("type GutterStatus = 'flagged' | 'edit' | 'comment' | 'normal';"), 'Expected left provenance gutter to expose edit status');
assert(heatmap.includes("const suggestionKinds: MarkKind[] = ['insert', 'delete', 'replace'];"), 'Expected left provenance gutter to treat suggestions as edits');
assert(heatmap.includes("return getMarkColor('replace');"), 'Expected edit status to use the shared modification color');
assert(!heatmap.includes('ai += unmarked;'), 'Expected unknown/unmarked text not to be falsely colored as agent-authored');
assert(!heatmap.includes('return DEFAULT_GUTTER_COLOR;'), 'Expected unknown provenance not to fill the colored segment rail with gray');
assert(!heatmap.includes('const DEFAULT_GUTTER_COLOR'), 'Expected gray provenance to stay a subtle CSS rail, not a block color fallback');

console.log('✓ AI/human collaboration editor UI wiring is present');
