import { readFileSync } from 'node:fs';
import path from 'node:path';
import { collectEditorOutline } from '../ui/editor-navigation.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const nav = readFileSync(path.join(root, 'src/ui/editor-navigation.ts'), 'utf8');
const editor = readFileSync(path.join(root, 'src/editor/index.ts'), 'utf8');
const html = readFileSync(path.join(root, 'src/index.html'), 'utf8');
const heatmap = readFileSync(path.join(root, 'src/editor/plugins/heatmap-decorations.ts'), 'utf8');
const contract = readFileSync(path.join(root, 'docs/ZOON_AGENT_CONTRACT.md'), 'utf8');

const outline = collectEditorOutline({
  descendants(callback: (node: any, pos: number) => boolean) {
    callback({ type: { name: 'paragraph' }, textContent: 'Body', attrs: {} }, 0);
    callback({ type: { name: 'heading' }, textContent: ' Overview ', attrs: { level: 1 } }, 4);
    callback({ type: { name: 'heading' }, textContent: 'Details', attrs: { level: 3 } }, 18);
    callback({ type: { name: 'heading' }, textContent: 'Ignored impossible level', attrs: { level: 20 } }, 30);
    callback({ type: { name: 'heading' }, textContent: '   ', attrs: { level: 2 } }, 42);
    return true;
  },
} as any);

assert(outline.length === 3, `Expected 3 non-empty headings, got ${outline.length}`);
assert(outline[0]?.text === 'Overview' && outline[0]?.level === 1 && outline[0]?.pos === 4, 'Expected first outline entry to preserve heading text, level, and position');
assert(outline[1]?.text === 'Details' && outline[1]?.level === 3, 'Expected nested heading level to be preserved');
assert(outline[2]?.level === 6, 'Expected heading levels to be clamped for UI indentation');

assert(nav.includes('const OUTLINE_MIN_HEADINGS = 4;'), 'Outline should only appear for long documents');
assert(nav.includes("node.type.name !== 'heading'"), 'Outline should derive from ProseMirror heading nodes');
assert(nav.includes('collectEditorOutline(view.state.doc)'), 'Navigation should derive outline from editor state');
assert(nav.includes("mark.kind === 'comment' && !mark.orphaned"), 'Comment navigation should reuse comment marks');
assert(nav.includes('onNavigateToMark(mark.id)'), 'Comment items should navigate by existing markId anchors');
assert(nav.includes("this.root.hidden = !showOutline && !showComments"), 'Navigation should stay hidden when neither progressive feature applies');
assert(nav.includes('this.outlineToggle.textContent = \'\';'), 'Outline toggle should render as an icon handle, not a text button');
assert(!nav.includes('OUTLINE_SCROLL_IDLE_MS'), 'Outline should not hide itself behind a scroll idle delay');
assert(!nav.includes('outlineScrolling'), 'Outline should remain visible while the document scrolls');
assert(!nav.includes('dataset.scrolling'), 'Outline shell should not expose a hidden-on-scroll state');
assert(!nav.includes('/documents/:slug/edit/v2'), 'UI navigation must not know about agent content mutation routes');
assert(!nav.includes('/documents/:slug/ops'), 'UI navigation must not know about agent metadata mutation routes');

assert(editor.includes('createEditorNavigation({'), 'Editor should install the progressive human navigation controller');
assert(editor.includes('this.refreshEditorNavigation(view);'), 'Editor should render navigation after initialization');
assert(editor.includes('this.scheduleEditorNavigationRefresh();'), 'Editor should refresh navigation after document or mark changes');
assert(editor.includes('getUnresolvedMarkComments(getMarks(currentView.state))'), 'Editor should pass unresolved comment marks to navigation');
assert(editor.includes('window.scrollTo({ top: targetY, behavior: \'smooth\' });'), 'Mark navigation should scroll the document window');

assert(html.includes('.editor-outline-nav'), 'Static CSS should include the outline navigation surface');
assert(html.includes('.editor-comment-nav'), 'Static CSS should include the comment navigation surface');
assert(html.includes('--content-max-width: 1220px;'), 'Default editor layout should use a centered desktop reading width');
assert(html.includes('--editor-side-padding: clamp(56px, 7vw, 112px);'), 'Desktop editor padding should be driven by a shared layout token');
assert(html.includes('--provenance-gutter-left:'), 'Provenance gutter should be positioned by a shared layout token');
assert(html.includes('left: var(--provenance-gutter-left);'), 'Provenance gutter should sit near the text instead of the viewport edge');
assert(html.includes('left: var(--outline-nav-left);'), 'Outline handle should be positioned relative to the provenance gutter');
assert(html.includes('html,\n    body'), 'Document chrome should share the editor background color');
assert(html.includes('.editor-outline-toggle::before'), 'Outline handle should use a compact line icon instead of visible text');
assert(html.includes('width: 28px;'), 'Desktop outline handle width should be half of the prior 56px handle');
assert(html.includes('min-width: 28px;'), 'Desktop outline handle min-width should match the compact handle');
assert(html.includes('width: min(516px, calc(100vw - 112px));'), 'Outline panel should match the wider screenshot reference width');
assert(html.includes('left: var(--outline-panel-left);'), 'Outline panel should open from the shared left-side navigation geometry');
assert(html.includes('top: 32px;'), 'Outline panel should open near the top of the viewport');
assert(!html.includes('.editor-outline-nav[data-scrolling="true"]'), 'Outline handle should not hide or move away while scrolling');
assert(html.includes('#provenance-gutter {\n        display: none;'), 'Mobile layout should keep the provenance gutter hidden');
assert(html.includes('@media (max-width: 720px)'), 'Navigation should have a mobile bottom-sheet treatment');

assert(heatmap.includes("gutterEl.style.left = '';"), 'Desktop heatmap runtime should preserve CSS-positioned gutter left');
assert(!heatmap.includes("gutterEl.style.left = '0px';"), 'Desktop heatmap runtime must not force the gutter back to the viewport edge');

assert(contract.includes('POST /documents/:slug/edit/v2'), 'Agent contract content route should remain documented');
assert(contract.includes('POST /documents/:slug/ops'), 'Agent contract metadata route should remain documented');

console.log('✓ Progressive editor navigation UI wiring is present');
