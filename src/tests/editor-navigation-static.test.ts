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
assert(nav.includes("outlineToggleLabel.textContent = '目录';"), 'Outline toggle should tell users that the control opens the table of contents');
assert(nav.includes("headerLabel.textContent = '收合目录';"), 'Expanded outline panel should include an obvious collapse affordance');
assert(nav.includes("button.dataset.level = String(item.level);"), 'Outline items should keep the heading level for visual hierarchy');
assert(nav.includes("document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);"), 'Open navigation panels should listen for outside clicks');
assert(nav.includes("document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);"), 'Outside click listener should be cleaned up on destroy');
assert(nav.includes('this.root.contains(target)'), 'Navigation should keep clicks inside the nav surface from closing the panel');
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
assert(html.includes('--outline-panel-left: max(0px, calc(var(--provenance-gutter-left) - 304px));'), 'Outline panel should open as a left-side drawer rather than beside the old rail');
assert(html.includes('top: calc(50vh - 29px);'), 'Outline handle should avoid transforms so fixed child panels stay viewport anchored');
assert(html.includes('top: 96px;'), 'Expanded outline panel should open as a left-top drawer like the reference');
assert(!html.includes('.editor-outline-nav {\n      position: fixed;\n      left: var(--outline-nav-left);\n      top: 50%;\n      transform: translateY(-50%);'), 'Outline handle must not transform its fixed-position panel containing block');
assert(html.includes('html,\n    body'), 'Document chrome should share the editor background color');
assert(html.includes('.editor-outline-toggle-icon'), 'Outline handle should use a menu icon next to the visible label');
assert(html.includes('.editor-outline-toggle-label'), 'Outline handle should include a visible table-of-contents label');
assert(html.includes('--outline-nav-width: 112px;'), 'Desktop outline handle should be wide enough for the 目录 label');
assert(html.includes('border-radius: 0 22px 22px 0;'), 'Collapsed outline handle should read as a left-edge pill');
assert(html.includes('width: min(344px, calc(100vw - 28px));'), 'Outline panel should use the compact left drawer width');
assert(html.includes('.editor-outline-panel-header'), 'Outline panel should expose a header control for collapsing the drawer');
assert(html.includes('border-radius: 0 26px 26px 0;'), 'Outline panel should match the rounded right-edge reference treatment');
assert(html.includes('left: var(--outline-panel-left);'), 'Outline panel should open from the shared left-side navigation geometry');
assert(html.includes('overscroll-behavior-y: contain;'), 'Navigation panels should contain vertical overscroll');
assert(html.includes('overscroll-behavior-x: none;'), 'Navigation panels should avoid horizontal overscroll chaining');
assert(html.includes('-webkit-overflow-scrolling: touch;'), 'Navigation panels should keep native momentum scrolling on touch devices');
assert(!html.includes('.editor-outline-nav[data-scrolling="true"]'), 'Outline handle should not hide or move away while scrolling');
assert(html.includes('#provenance-gutter {\n        display: none;'), 'Mobile layout should keep the provenance gutter hidden');
assert(html.includes('@media (max-width: 720px)'), 'Navigation should have a mobile bottom-sheet treatment');

assert(nav.includes('function installPanelScrollBoundaryGuard(panel: HTMLElement): () => void'), 'Navigation should install scroll boundary guards on floating panels');
assert(nav.includes("panel.addEventListener('wheel', handleWheel, activeListenerOptions);"), 'Panel wheel events should use an active listener');
assert(nav.includes("panel.addEventListener('touchmove', handleTouchMove, activeListenerOptions);"), 'Panel touch moves should use an active listener');
assert(nav.includes('event.preventDefault();'), 'Panel boundary scroll should be preventable before it reaches the document');
assert(nav.includes('installPanelScrollBoundaryGuard(this.outlinePanel)'), 'Outline panel should block scroll chaining at its own boundaries');
assert(nav.includes('installPanelScrollBoundaryGuard(this.commentPanel)'), 'Comment panel should share the same scroll boundary protection');
assert(nav.includes('destroyScrollBoundaryGuards'), 'Panel scroll guards should be cleaned up on navigation destroy');

assert(heatmap.includes("gutterEl.style.left = '';"), 'Desktop heatmap runtime should preserve CSS-positioned gutter left');
assert(!heatmap.includes("gutterEl.style.left = '0px';"), 'Desktop heatmap runtime must not force the gutter back to the viewport edge');

assert(contract.includes('POST /documents/:slug/edit/v2'), 'Agent contract content route should remain documented');
assert(contract.includes('POST /documents/:slug/ops'), 'Agent contract metadata route should remain documented');

console.log('✓ Progressive editor navigation UI wiring is present');
