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
assert(nav.includes('const OUTLINE_CLOSE_DELAY_MS = 140;'), 'Outline hover panel should close after a short grace delay');
assert(nav.includes('const OUTLINE_THUMBNAIL_MAX_TICKS = 14;'), 'Outline thumbnail should keep the right rail compact');
assert(nav.includes("this.outlineShell.addEventListener('pointerenter', this.handleOutlinePointerEnter);"), 'Outline should open on pointer hover');
assert(nav.includes("this.outlineShell.addEventListener('pointerleave', this.handleOutlinePointerLeave);"), 'Outline should close after pointer leaves');
assert(nav.includes("this.outlineShell.addEventListener('focusin', this.handleOutlineFocusIn);"), 'Outline should open for keyboard focus');
assert(nav.includes("this.outlineShell.addEventListener('focusout', this.handleOutlineFocusOut);"), 'Outline should close after keyboard focus leaves');
assert(nav.includes('private renderOutlineThumbnail(): void'), 'Outline should render a title thumbnail rail');
assert(nav.includes("tick.className = 'editor-outline-tick';"), 'Outline thumbnail should render one tick per visible heading');
assert(nav.includes("tick.style.setProperty('--outline-level', String(item.level));"), 'Outline thumbnail ticks should preserve heading levels');
assert(!nav.includes('OUTLINE_OPEN_STORAGE_KEY'), 'Outline hover state should not persist as a user preference');
assert(!nav.includes('readStoredOutlineOpen()'), 'Outline should not restore the old drawer preference on startup');
assert(!nav.includes('writeStoredOutlineOpen'), 'Outline should not write drawer state to localStorage');
assert(nav.includes('this.outlineShell.dataset.open = String(this.outlineOpen);'), 'Outline shell should expose open state for styling and diagnostics');
assert(nav.includes("headerLabel.textContent = '目录';"), 'Expanded outline panel should label the floating table of contents');
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
assert(html.includes('--bg-color: #fff;'), 'Editor background should default to white');
assert(html.includes('--font-size: 14px;'), 'Editor default document font size should be 14px');
assert(html.includes('--content-max-width: 1040px;'), 'Default editor layout should use a narrower centered reading width');
assert(html.includes('--editor-side-padding: clamp(44px, 6vw, 92px);'), 'Desktop editor padding should be driven by a shared layout token');
assert(html.includes('--document-sidebar-width: 272px;'), 'Share editor should reserve room for the left document list');
assert(html.includes('--provenance-bar-width: 4px;'), 'Provenance color rail should be visually narrower');
assert(html.includes('--provenance-gutter-left:'), 'Provenance gutter should be positioned by a shared layout token');
assert(html.includes('left: var(--provenance-gutter-left);'), 'Provenance gutter should sit near the text instead of the viewport edge');
assert(html.includes('right: var(--outline-nav-right);'), 'Outline thumbnail rail should sit on the document right side');
assert(html.includes('right: var(--outline-panel-right);'), 'Outline panel should open beside the right thumbnail rail');
assert(html.includes('top: clamp(116px, 24vh, 220px);'), 'Outline thumbnail rail should sit near the upper reading area');
assert(!html.includes('left: var(--outline-nav-left);'), 'Outline handle should no longer sit on the old left-side rail');
assert(!html.includes('--outline-panel-left:'), 'Outline panel should no longer use left-side drawer geometry');
assert(html.includes('html,\n    body'), 'Document chrome should share the editor background color');
assert(html.includes('.editor-outline-toggle-icon'), 'Outline handle should use a heading thumbnail icon');
assert(html.includes('.editor-outline-toggle-label'), 'Outline handle should keep an accessible table-of-contents label');
assert(html.includes('--outline-nav-width: 34px;'), 'Desktop outline handle should default to a compact thumbnail width');
assert(html.includes('.editor-outline-tick'), 'Outline handle should render heading thumbnail ticks');
assert(html.includes('.editor-outline-tick[data-active="true"]'), 'Outline thumbnail should show the active heading');
assert(html.includes('.editor-outline-nav:hover .editor-outline-toggle'), 'Outline handle should react on hover');
assert(html.includes('border-radius: 999px;'), 'Collapsed outline handle should read as a slim thumbnail pill');
assert(html.includes('width: min(300px, calc(100vw - var(--document-sidebar-width-active) - 96px));'), 'Outline panel should use the compact right-side width');
assert(html.includes('.editor-outline-panel-header'), 'Outline panel should expose a directory header');
assert(html.includes('border-radius: 12px;'), 'Outline panel should use compact editor panel radius');
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
