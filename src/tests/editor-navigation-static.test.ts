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

assert(nav.includes('const OUTLINE_MIN_HEADINGS = 2;'), 'Outline should appear for normal multi-heading documents');
assert(nav.includes("node.type.name !== 'heading'"), 'Outline should derive from ProseMirror heading nodes');
assert(nav.includes('collectEditorOutline(view.state.doc)'), 'Navigation should derive outline from editor state');
assert(nav.includes("mark.kind === 'comment' && !mark.orphaned"), 'Comment navigation should reuse comment marks');
assert(nav.includes('onNavigateToMark(mark.id)'), 'Comment items should navigate by existing markId anchors');
assert(nav.includes("this.root.hidden = !showOutline && !showComments"), 'Navigation should stay hidden when neither progressive feature applies');
assert(nav.includes("outlineToggleLabel.textContent = '目录';"), 'Outline toggle should tell users that the control opens the table of contents');
assert(nav.includes('const OUTLINE_THUMBNAIL_MAX_TICKS = 14;'), 'Outline thumbnail should keep the right rail compact');
assert(nav.includes("this.outlineShell.addEventListener('pointerenter', this.openOutlinePanel);"), 'Desktop outline thumbnail should open the directory on hover');
assert(nav.includes("this.outlineShell.addEventListener('pointerleave', this.scheduleOutlineClose);"), 'Desktop outline popover should close after pointer leaves');
assert(nav.includes('const OUTLINE_CLOSE_DELAY_MS = 160;'), 'Outline popover should use a small close delay for forgiving hover');
assert(nav.includes('private renderOutlineThumbnail(): void'), 'Outline should render a title thumbnail rail');
assert(nav.includes("tick.className = 'editor-outline-tick';"), 'Outline thumbnail should render one tick per visible heading');
assert(nav.includes("tick.style.setProperty('--outline-level', String(item.level));"), 'Outline thumbnail ticks should preserve heading levels');
assert(!nav.includes('OUTLINE_OPEN_STORAGE_KEY'), 'Outline hover state should not persist as a user preference');
assert(!nav.includes('readStoredOutlineOpen()'), 'Outline should not restore the old drawer preference on startup');
assert(!nav.includes('writeStoredOutlineOpen'), 'Outline should not write drawer state to localStorage');
assert(nav.includes('this.outlineShell.dataset.open = String(this.outlineOpen);'), 'Outline shell should expose open state for styling and diagnostics');
assert(nav.includes("document.body.classList.toggle('editor-outline-visible', showOutline);"), 'Outline availability should stay visible to layout diagnostics');
assert(nav.includes("document.body.classList.remove('editor-outline-visible');"), 'Outline layout state should be cleaned up on destroy');
assert(nav.includes("headerLabel.textContent = '目录';"), 'Outline popover should label the table of contents');
assert(nav.includes("button.dataset.level = String(item.level);"), 'Outline items should keep the heading level for visual hierarchy');
assert(nav.includes("document.addEventListener('pointerdown', this.handleDocumentPointerDown, true);"), 'Open navigation panels should listen for outside clicks');
assert(nav.includes("document.removeEventListener('pointerdown', this.handleDocumentPointerDown, true);"), 'Outside click listener should be cleaned up on destroy');
assert(nav.includes('this.root.contains(target)'), 'Navigation should keep clicks inside the nav surface from closing the panel');
assert(nav.includes('this.outlinePanel.hidden = !this.outlineOpen;'), 'Outline panel should only be visible while the thumbnail popover is open');
assert(nav.includes('this.outlineOpen = false;'), 'Outline item clicks should close the floating panel after navigation');
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
assert(html.includes('--provenance-bar-width: 6px;'), 'Provenance color rail should be visible enough for the collaboration color system');
assert(html.includes('--provenance-gutter-left:'), 'Provenance gutter should be positioned by a shared layout token');
assert(html.includes('left: var(--provenance-gutter-left);'), 'Provenance gutter should sit near the text instead of the viewport edge');
assert(html.includes('--outline-aside-width: 184px;'), 'Desktop outline popover should keep a readable compact width');
assert(html.includes('--editor-outline-reserve: 0px;'), 'Outline reserve should default to zero when no outline is available');
assert(html.includes('--editor-right-padding: calc(var(--editor-side-padding) + var(--editor-outline-reserve));'), 'Editor right padding should honor the outline safety reserve');
assert(html.includes('body.editor-outline-visible'), 'Document layout should retain an outline-visible state hook');
assert(html.includes('body.editor-outline-visible {\n      --editor-outline-reserve: calc(var(--outline-nav-width) + var(--outline-aside-gap));'), 'Outline state should reserve only the thumbnail safety zone');
assert(!html.includes('--editor-outline-reserve: var(--outline-aside-width);'), 'Outline state should not reserve the full popover width');
assert(html.includes('right: var(--outline-nav-right);'), 'Outline aside should sit on the document right side');
assert(html.includes('top: clamp(118px, 18vh, 176px);'), 'Outline aside should sit near the upper reading area');
assert(!html.includes('left: var(--outline-nav-left);'), 'Outline handle should no longer sit on the old left-side rail');
assert(!html.includes('--outline-panel-left:'), 'Outline panel should no longer use left-side drawer geometry');
assert(html.includes('html,\n    body'), 'Document chrome should share the editor background color');
assert(html.includes('.editor-outline-toggle-icon'), 'Outline handle should use a heading thumbnail icon');
assert(html.includes('.editor-outline-toggle-label'), 'Outline handle should keep an accessible table-of-contents label');
assert(html.includes('--outline-nav-width: 34px;'), 'Desktop outline handle should default to a compact thumbnail width');
assert(html.includes('.editor-outline-tick'), 'Outline handle should render heading thumbnail ticks');
assert(html.includes('.editor-outline-tick[data-active="true"]'), 'Outline thumbnail should show the active heading');
assert(html.includes('.editor-outline-toggle {\n      align-items: center;\n      background: transparent;'), 'Desktop outline thumbnail should not use a white container');
assert(html.includes('display: flex;'), 'Desktop outline thumbnail should remain visible in collapsed state');
assert(html.includes('right: calc(var(--outline-nav-width) + 12px);'), 'Outline panel should float beside the thumbnail rail');
assert(html.includes('box-shadow: var(--editor-nav-shadow);'), 'Outline panel should look like the hover directory popover');
assert(html.includes('.editor-outline-panel-header'), 'Outline popover should expose a directory header');
assert(html.includes('overscroll-behavior-y: contain;'), 'Navigation panels should contain vertical overscroll');
assert(html.includes('overscroll-behavior-x: none;'), 'Navigation panels should avoid horizontal overscroll chaining');
assert(html.includes('-webkit-overflow-scrolling: touch;'), 'Navigation panels should keep native momentum scrolling on touch devices');
assert(!html.includes('.editor-outline-nav[data-scrolling="true"]'), 'Outline handle should not hide or move away while scrolling');
assert(html.includes('#provenance-gutter {\n        display: none;'), 'Mobile layout should keep the provenance gutter hidden');
assert(html.includes('@media (max-width: 720px)'), 'Navigation should have mobile responsive rules');
assert(html.includes('.editor-outline-nav {\n        display: none;'), 'Mobile layout should not force a desktop right outline into the viewport');

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
