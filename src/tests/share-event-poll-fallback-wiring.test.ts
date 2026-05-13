import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const shareClientSource = readFileSync(path.join(repoRoot, 'src', 'bridge', 'share-client.ts'), 'utf8');
const editorSource = readFileSync(path.join(repoRoot, 'src', 'editor', 'index.ts'), 'utf8');

assert(
  shareClientSource.includes('async fetchPendingEvents(')
    && shareClientSource.includes('/agent/${this.slug}/events/pending?'),
  'Expected ShareClient to expose a pending-events fetch helper for cross-instance share refresh fallback',
);

assert(
  editorSource.includes('private handleTerminalShareAccessFailure(status: number): void')
    && editorSource.includes('this.shareTerminalAccessFailure = true;')
    && editorSource.includes('this.stopShareEventPoll();')
    && editorSource.includes('clearTimeout(this.shareDocumentUpdatedTimer);')
    && editorSource.includes('clearTimeout(this.shareMarksRefreshTimer);')
    && editorSource.includes('this.pendingShareMarksRefresh = false;')
    && editorSource.includes('shareClient.disconnect();')
    && editorSource.includes('this.teardownCollabRuntimeAfterTerminalRefreshFailure();'),
  'Expected share-mode editor to stop polling and disconnect transports after terminal share access failures',
);

assert(
  editorSource.includes('if (this.shareTerminalAccessFailure) return;')
    && editorSource.includes('this.handleTerminalShareAccessFailure(contextResponse.error.status);')
    && editorSource.includes('if (this.shareTerminalAccessFailure) {')
    && editorSource.includes("message.includes('deleted')")
    && editorSource.includes('let shouldContinuePolling = true;')
    && editorSource.includes('payload.error.status === 401 || payload.error.status === 403 || payload.error.status === 404 || payload.error.status === 410')
    && editorSource.includes('shouldContinuePolling = false;')
    && editorSource.includes('this.handleTerminalShareAccessFailure(payload.error.status);')
    && editorSource.includes('if (shouldContinuePolling && this.isShareMode && !this.shareTerminalAccessFailure)'),
  'Expected share init and event polling to treat terminal access errors as terminal and avoid retrying',
);

assert(
  editorSource.includes("event.type === 'agent.edit.v2'")
    && editorSource.includes('private shouldSkipForcedCollabRefreshFromPendingEvent(): boolean')
    && editorSource.includes("this.collabConnectionStatus === 'connected'")
    && editorSource.includes('this.collabIsSynced')
    && editorSource.includes('if (this.shouldSkipForcedCollabRefreshFromPendingEvent()) return;')
    && editorSource.includes('this.scheduleShareDocumentUpdatedRefresh(true);'),
  'Expected pending event handler to skip forced collab refresh when the live room is already healthy',
);

assert(
  editorSource.includes("return event.type.startsWith('comment.')")
    && editorSource.includes("|| event.type.startsWith('suggestion.');")
    && editorSource.includes('this.scheduleShareMarksRefresh();')
    && editorSource.includes('this.pendingShareMarksRefresh = true;')
    && editorSource.includes('clearTimeout(this.shareMarksRefreshTimer);')
    && editorSource.includes('void shareClient.fetchOpenContext()')
    && editorSource.includes('this.applyAuthoritativeShareMarks(serverMarks);'),
  'Expected pending comment/suggestion events to refresh authoritative marks for healthy share sessions',
);

assert(
  editorSource.includes('private stopShareEventPoll(): void')
    && editorSource.includes('private scheduleShareMarksRefresh(): void')
    && editorSource.includes('private shareMarksRefreshTimer: ReturnType<typeof setTimeout> | null = null;')
    && editorSource.includes('private pendingShareMarksRefresh: boolean = false;')
    && editorSource.includes('if (this.shareMarksRefreshTimer) {')
    && editorSource.includes('this.stopShareEventPoll();'),
  'Expected share event poller and marks refresh timer to be cleaned up during share/editor teardown',
);

assert(
  shareClientSource.includes('socket.onclose = (event) => {')
    && shareClientSource.includes('if (this.ws !== socket) return;')
    && shareClientSource.includes("this.setConnectionState('disconnected');")
    && shareClientSource.includes('if (this.isTerminalWebSocketClose(event)) {')
    && shareClientSource.includes('this.scheduleReconnect();'),
  'Expected ShareClient to ignore stale socket closes and only reconnect non-terminal closes',
);

assert(
  shareClientSource.includes('private isTerminalWebSocketClose(event: CloseEvent): boolean')
    && shareClientSource.includes("reason === 'document unshared'")
    && shareClientSource.includes("reason === 'collab:deleted'")
    && shareClientSource.includes("reason === 'collab:revoked'")
    && shareClientSource.includes('event.code >= 4000 && event.code < 4100'),
  'Expected ShareClient to classify deleted/unshared/revoked bridge socket closes as terminal',
);

console.log('✓ share event poll fallback wiring checks');
