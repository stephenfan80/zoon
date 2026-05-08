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
assert(nav.includes('const OUTLINE_SCROLL_IDLE_MS = 220;'), 'Outline should restore its handle after the expected scroll idle delay');
assert(nav.includes('private outlineScrolling = false;'), 'Outline should track a scrolling state separately from the comment nav');
assert(nav.includes('this.outlineToggle.textContent = \'\';'), 'Outline toggle should render as an icon handle, not a text button');
assert(nav.includes('this.outlineShell.dataset.scrolling'), 'Outline shell should expose scroll state for the collapsed handle styling');
assert(nav.includes('this.outlineOpen = false;'), 'Outline panel should close when the page scrolls');
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
assert(html.includes('padding: 72px clamp(56px, 7vw, 112px) 56px;'), 'Desktop editor padding should reserve responsive side whitespace');
assert(html.includes('.editor-outline-toggle::before'), 'Outline handle should use a compact line icon instead of visible text');
assert(html.includes('width: min(516px, calc(100vw - 112px));'), 'Outline panel should match the wider screenshot reference width');
assert(html.includes('left: 80px;'), 'Outline panel should open beside the left handle with the screenshot reference offset');
assert(html.includes('top: 32px;'), 'Outline panel should open near the top of the viewport');
assert(html.includes('@media (max-width: 720px)'), 'Navigation should have a mobile bottom-sheet treatment');

assert(contract.includes('POST /documents/:slug/edit/v2'), 'Agent contract content route should remain documented');
assert(contract.includes('POST /documents/:slug/ops'), 'Agent contract metadata route should remain documented');

console.log('✓ Progressive editor navigation UI wiring is present');
