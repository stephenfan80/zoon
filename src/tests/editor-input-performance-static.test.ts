import { readFileSync } from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
const html = readFileSync(path.join(root, 'src/index.html'), 'utf8');
const editor = readFileSync(path.join(root, 'src/editor/index.ts'), 'utf8');
const heatmap = readFileSync(path.join(root, 'src/editor/plugins/heatmap-decorations.ts'), 'utf8');

assert(html.includes('--provenance-gutter-gap: 20px;'), 'Expected provenance gutter to reserve an explicit text gap');
assert(
  html.includes('padding-left: calc(var(--editor-side-padding) + var(--provenance-bar-width) + var(--provenance-gutter-gap));'),
  'Expected editor text padding to include the provenance gutter gap'
);
assert(html.includes('#provenance-gutter {\n        display: none;'), 'Expected mobile layout to keep the provenance gutter hidden');

assert(heatmap.includes('const HEATMAP_TYPING_REBUILD_DELAY_MS = 320;'), 'Expected heatmap rebuilds to defer during typing');
assert(heatmap.includes('const HEATMAP_RESIZE_REBUILD_DELAY_MS = 180;'), 'Expected resize-driven heatmap rebuilds to be debounced');
assert(heatmap.includes('function areSegmentsEqual('), 'Expected heatmap DOM rebuilds to be skipped when segment geometry is unchanged');
assert(heatmap.includes('function getMarksStateForHeatmap(state: EditorState): unknown'), 'Expected heatmap updates to compare marks state cheaply');
assert(heatmap.includes("tr.getMeta('heatmapUpdate')"), 'Expected explicit heatmap refresh transactions to remain supported');
assert(heatmap.includes('const scheduleDeferredRebuild = (delayMs = HEATMAP_TYPING_REBUILD_DELAY_MS)'), 'Expected ordinary content edits to use a deferred heatmap rebuild');
assert(heatmap.includes('update(view, prevState)'), 'Expected heatmap view updates to inspect previous editor state');
assert(heatmap.includes('if (forcedRefresh || modeChanged || (marksChanged && !docChanged))'), 'Expected non-typing heatmap changes to refresh immediately');
assert(heatmap.includes('if (docChanged || marksChanged) {\n            scheduleDeferredRebuild();'), 'Expected typing/doc changes to refresh the heatmap after the input path');
assert(heatmap.includes("editorView.dom.addEventListener('load', onEditorResourceLoad, true);"), 'Expected loaded images/resources to schedule a later heatmap layout refresh');
assert(!heatmap.includes('new ResizeObserver'), 'Expected heatmap to avoid ResizeObserver rebuilds on every editor height change');
assert(!heatmap.includes('update() {\n          scheduleRender(true);'), 'Expected heatmap update not to force a full rebuild on every editor update');

assert(editor.includes('private readonly editorNavigationRefreshDelayMs: number = 160;'), 'Expected editor navigation refreshes to be lightly debounced');
assert(editor.includes('private readonly contentSyncDelayMs: number = 420;'), 'Expected content sync serialization to wait for a short typing pause');
assert(editor.includes('clearTimeout(this.editorNavigationRefreshTimer);'), 'Expected navigation refresh debounce to reset during continuous input');
assert(editor.includes('}, this.editorNavigationRefreshDelayMs);'), 'Expected navigation refresh to use the debounce token');
assert(editor.includes('this.contentSyncTimeout = null;'), 'Expected content sync timer state to clear after it fires');
assert(editor.includes('}, this.contentSyncDelayMs);'), 'Expected content sync to use the input-friendly delay token');
assert(!editor.includes('}, 150);\n  }\n\n  /**\n   * Initialize the agent integration'), 'Expected content sync not to serialize on the old 150ms cadence');

console.log('✓ Editor input performance guardrails are present');
