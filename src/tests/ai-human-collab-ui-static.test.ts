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
assert(popover.includes('private shouldOpenMarkFromEditorClick(markId: string): boolean'), 'Expected editor clicks to filter mark popovers by mark kind');
assert(popover.includes("return mark.kind !== 'authored';"), 'Expected plain authored text clicks not to open a source popover');
assert(popover.includes("mark.kind === 'flagged' ? 'flagged' : 'suggestion'"), 'Expected flagged marks to open an independent popover mode');
assert(popover.includes("unflagButton.textContent = '取消标记';"), 'Expected flagged popover to support canceling the mark');
assert(popover.includes("closeButton.textContent = '关闭';"), 'Expected flagged popover to support closing without extra explanation fields');
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
assert(marks.includes("attrs['data-mark-by'] = mark.by;"), 'Expected interactive decorated marks to expose author identity');
assert(marks.includes("attrs['data-authored-by'] = mark.by;"), 'Expected authored decorations to keep provenance identity outside the interactive mark namespace');
assert(marks.includes("if (mark.kind === 'authored')"), 'Expected authored decorations to avoid taking over explicit interaction marks');
assert(marks.includes('delete_ai'), 'Expected agent-authored deletion suggestions to have their own proposal style');
assert(marks.includes("text-decoration-style: wavy"), 'Expected flagged text to use a red wavy underline');
assert(marks.includes("text-decoration-color: #EF4444"), 'Expected flagged underline to use the red reading marker color');
assert(marks.includes('mark-flagged'), 'Expected flagged marks to carry an independent decoration class');
assert(marks.includes("comment: 'background-color: rgba(252, 211, 77, 0.34);"), 'Expected comment anchors to have a visible Proof-style yellow body highlight');
assert(marks.includes('box-shadow: inset 0 -0.46em 0 rgba(245, 158, 11, 0.16); cursor: pointer; box-decoration-break: clone;'), 'Expected comment anchors to stay visible across multi-line selections');
assert(marks.includes("compose_anchor: 'background-color: rgba(252, 211, 77, 0.30);"), 'Expected comment composer selection to stay visibly anchored while the user types');
assert(marks.includes('rgba(147, 197, 253, 0.20)'), 'Expected agent suggestion styling to use a visible cool proposal palette');
assert(marks.includes('mark-suggestion-ai'), 'Expected agent suggestions to carry a distinct class');
assert(marks.includes('text-decoration-thickness: 0.08em'), 'Expected deletion suggestion styling to use a light strike-through');
assert(!marks.includes('border-bottom: 2px solid #22C55E'), 'Expected suggestion styling to avoid harsh green underlines');
assert(!marks.includes('border-bottom: 2px solid #7E57C2'), 'Expected AI suggestion styling to avoid harsh purple underlines');

assert(html.includes('.mark-replace-insert-ai'), 'Expected static CSS for AI replacement insert');
assert(html.includes('.mark-comment,'), 'Expected static CSS for visible comment anchors');
assert(html.includes('span[data-proof="comment"]'), 'Expected persisted comment spans to keep visible styling after hydration');
assert(html.includes('box-shadow: inset 0 -0.46em 0 rgba(245, 158, 11, 0.16);'), 'Expected comment CSS to use a visible anchored highlight');
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
assert(heatmap.includes('function getActorGutterColor(actor: string): string | null'), 'Expected left provenance gutter to resolve colors through actor identity');
assert(heatmap.includes("if (isAI(actor) || isSystem(actor)) return getMarkColor('ai');"), 'Expected system/default content to use the agent provenance color');
assert(heatmap.includes("const priorityKinds: MarkKind[] = ['flagged', 'insert', 'delete', 'replace', 'comment'];"), 'Expected interaction marks to inherit actor colors when they own the active block');
assert(!heatmap.includes("return getMarkColor('replace');"), 'Expected edit suggestions not to add a third provenance color');
assert(!heatmap.includes("return getMarkColor('comment');"), 'Expected comments not to add a third provenance color');
assert(!heatmap.includes("return getMarkColor('flagged');"), 'Expected flags not to add a third provenance color');
assert(!heatmap.includes("return getMarkColor('system');"), 'Expected system/default authorship not to add a blue provenance color');
assert(!heatmap.includes('ai += unmarked;'), 'Expected unknown/unmarked text not to be falsely colored as agent-authored');
assert(!heatmap.includes('return DEFAULT_GUTTER_COLOR;'), 'Expected unknown provenance not to fill the colored segment rail with gray');
assert(!heatmap.includes('const DEFAULT_GUTTER_COLOR'), 'Expected gray provenance to stay a subtle CSS rail, not a block color fallback');

console.log('✓ AI/human collaboration editor UI wiring is present');
