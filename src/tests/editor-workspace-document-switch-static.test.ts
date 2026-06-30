import { readFileSync } from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertIncludes(source: string, needle: string, message: string): void {
  assert(source.includes(needle), message);
}

function assertNotIncludes(source: string, needle: string, message: string): void {
  assert(!source.includes(needle), message);
}

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(startIndex >= 0, `Expected source to include ${start}`);
  assert(endIndex > startIndex, `Expected source to include ${end} after ${start}`);
  return source.slice(startIndex, endIndex);
}

const root = process.cwd();
const editor = readFileSync(path.join(root, 'src/editor/index.ts'), 'utf8');
const sidebar = readFileSync(path.join(root, 'src/ui/editor-document-sidebar.ts'), 'utf8');
const shareClient = readFileSync(path.join(root, 'src/bridge/share-client.ts'), 'utf8');

assertIncludes(sidebar, 'onSelectDocument?(document:', 'History cards should expose an editor-workspace selection callback');
assertIncludes(sidebar, 'event.preventDefault();', 'Normal history card clicks should stay inside the current editor tab');
assertIncludes(sidebar, 'this.options.onSelectDocument({', 'History cards should delegate document switching to the editor runtime');
assertIncludes(sidebar, 'card.href = options.href;', 'History cards should keep hrefs for copy/open-link behavior');

assertIncludes(editor, 'switchShareDocument(href: string): Promise<boolean>;', 'ProofEditor should expose a document switch API');
assertIncludes(editor, 'async switchShareDocument(href: string): Promise<boolean> {', 'Editor should implement in-workspace document switching');
assertIncludes(editor, 'window.history.pushState({ zoonDocumentSlug: target.slug }, \'\', target.url.href);', 'Document switching should update the URL without reloading the page');
assertIncludes(editor, 'shareClient.setDocumentContextFromHref(target.url.href)', 'Document switching should rebuild share context from the target URL');
assertIncludes(editor, 'this.teardownShareDocumentRuntime(true);', 'Document switching should tear down the previous share/collab runtime first');
assertIncludes(editor, 'onSelectDocument: ({ href }) => this.switchShareDocument(href),', 'Left history sidebar should call the switch API');
assertIncludes(editor, 'this.isReadOnly = false;', 'Share document switching should clear stale read-only state before loading the next document');
assertIncludes(editor, 'this.shareAllowLocalEdits = true;', 'Share activation should start from an editable-capable state before the live gate resolves');

const initFromShare = sliceBetween(
  editor,
  'private async initFromShare(options?: ShareRuntimeActivationOptions): Promise<void> {',
  'private deriveDefaultShareViewerName(): string {',
);
const loadIdx = initFromShare.indexOf('this.loadDocument(contentWithMarks, { allowShareContentMutation: true });');
const connectIdx = initFromShare.indexOf('collabClient.connect(collabSession.session);');
assert(loadIdx >= 0, 'Share init should render canonical document content before collaboration connects');
assert(connectIdx >= 0, 'Share init should still connect live collaboration');
assert(loadIdx < connectIdx, 'Canonical document content should render before waiting for live collab sync');
assertIncludes(initFromShare, 'this.pendingCollabRebindResetDoc = false;', 'Initial collab bind should not blank the editor before sync');
assertIncludes(initFromShare, 'const expectedSlug = shareClient.getSlug();', 'Share init should bind async results to the slug that started the attempt');
assertIncludes(initFromShare, 'const isCurrentShareAttempt = (): boolean => (', 'Share init should expose a stale-attempt guard');
assertIncludes(initFromShare, 'if (!isCurrentShareAttempt()) return;', 'Share init should ignore late responses from previously opened documents');

const refreshCollabSessionAndReconnect = sliceBetween(
  editor,
  'private async refreshCollabSessionAndReconnect(preserveLocalState: boolean): Promise<void> {',
  '/**\n   * In share mode, allow text selection',
);
assertIncludes(refreshCollabSessionAndReconnect, 'const sessionAtStart = this.activeCollabSession;', 'Collab refresh should bind async results to the session that started the refresh');
assertIncludes(refreshCollabSessionAndReconnect, 'const slugAtStart = shareClient.getSlug();', 'Collab refresh should bind async results to the current document slug');
assertIncludes(refreshCollabSessionAndReconnect, 'if (!isCurrentRefresh()) return;', 'Collab refresh should ignore late responses after switching documents');

assertIncludes(editor, 'hydrateAnchors: this.collabCanEdit', 'Suggestion accept should use the Proof share-mode hydration gate');
assertIncludes(editor, "by: 'human:legacy-owner'", 'Legacy documents with no source marks should receive a human baseline for the left color rail');

const shareBanner = sliceBetween(
  editor,
  'private showShareBanner(viewers: number): void {',
  'private ensureDocumentSidebar(): void {',
);
assertIncludes(shareBanner, 'left: var(--document-sidebar-width-active, 0px);', 'Share toolbar should be centered inside the right editor workspace');
assertIncludes(shareBanner, 'right: 0;', 'Share toolbar should use the right workspace boundary');
assertIncludes(shareBanner, 'margin-left: auto;', 'Share toolbar should auto-center in the workspace');
assertIncludes(shareBanner, 'margin-right: auto;', 'Share toolbar should auto-center in the workspace');
assertNotIncludes(shareBanner, 'transform: translateX(-50%);', 'Share toolbar should not use body-centered transform positioning');

assertIncludes(shareClient, 'setDocumentContextFromHref(href: string): boolean {', 'ShareClient should support URL-derived context switching');
assertIncludes(shareClient, 'proofConfig.shareToken = this.shareToken ?? undefined;', 'ShareClient should clear stale URL tokens when switching to clean account URLs');

console.log('✓ editor workspace document switch contract');
