import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const editorSource = readFileSync(path.join(root, 'src/editor/index.ts'), 'utf8');

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertIncludes(source: string, text: string, message: string): void {
  assert(source.includes(text), message);
}

function assertNotIncludes(source: string, text: string, message: string): void {
  assert(!source.includes(text), message);
}

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert(startIndex >= 0, `Expected source to include ${start}`);
  assert(endIndex > startIndex, `Expected source to include ${end} after ${start}`);
  return source.slice(startIndex, endIndex);
}

const statusBody = sliceBetween(
  editorSource,
  'private getShareSyncStatus(): { label: string; color: string } {',
  'private ensureShareStatusPulseStyle(): void {',
);
const textLabelBody = sliceBetween(
  editorSource,
  'private getSyncStatusTextLabel(label: string): string {',
  'private shouldShowStatusText(statusLabel: string): boolean {',
);
const editGateBody = sliceBetween(
  editorSource,
  'private updateShareEditGate(): void {',
  'private ensureShareWebSocketConnection(): void {',
);

assertIncludes(statusBody, "const yellow = '#f59e0b';", 'Status dot should define a yellow connecting/syncing color');
assertIncludes(statusBody, "const red = '#ef4444';", 'Status dot should define a red exceptional color');
assertIncludes(statusBody, "const neutral = '#9ca3af';", 'Status dot should define a neutral read-only color');
assertIncludes(
  statusBody,
  ": { label: 'Live sync unavailable', color: yellow };",
  'Live sync unavailable should be degraded yellow, not red by default',
);
assertIncludes(
  statusBody,
  "label: this.collabCanComment ? 'Comment-only' : 'Read-only'",
  'Healthy non-editing sessions should use comment/read-only labels',
);
assertIncludes(
  statusBody,
  'color: neutral,',
  'Healthy non-editing sessions should use neutral color',
);
assertIncludes(
  statusBody,
  "return { label: 'Offline - reconnecting', color: yellow };",
  'Offline reconnecting without unsaved edits should be yellow',
);
assertIncludes(
  statusBody,
  "return { label: 'Offline - unsaved changes', color: red };",
  'Offline with unsaved edits should stay red',
);
assertIncludes(
  statusBody,
  "return { label: 'Access revoked', color: red };",
  'Revoked access should stay red',
);
assertIncludes(
  statusBody,
  "return { label: 'Document is no longer shared', color: red };",
  'Unshared documents should stay red',
);
assertNotIncludes(
  statusBody,
  "return { label: 'Offline - reconnecting', color: '#ef4444' };",
  'Offline reconnecting should not be hard-coded red',
);
assertNotIncludes(
  statusBody,
  "return { label: 'Live sync unavailable', color: '#ef4444' };",
  'Live sync unavailable should not be hard-coded red',
);
assertIncludes(textLabelBody, "'Comment-only': 'Comment',", 'Comment-only state should have a compact label');
assertIncludes(textLabelBody, "'Read-only': 'Read-only',", 'Read-only state should have a compact label');
assertIncludes(
  editGateBody,
  'this.hideReadOnlyBanner();',
  'Read-only banner should clear when an editable share session is restored',
);

console.log('share-status-dot-static.test.ts: ok');
