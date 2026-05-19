import { getDocumentBySlug, getDocumentProjectionBySlug, hasMaintenanceRun, recordMaintenanceRun } from './db.js';
import { resetCollabStateFromCanonical } from './canonical-document.js';

const RUN_KEY = 'reset-collab-from-canonical:0ieaen6e:2026-05-19';
const TARGET_SLUG = '0ieaen6e';

export function runReset0ieaen6eCollabOnce(): void {
  if (hasMaintenanceRun(RUN_KEY)) {
    console.log('[maintenance] 0ieaen6e collab reset already completed');
    return;
  }

  const doc = getDocumentBySlug(TARGET_SLUG);
  if (!doc) {
    console.log('[maintenance] 0ieaen6e collab reset skipped; document not present in this DB');
    return;
  }

  const before = getDocumentProjectionBySlug(TARGET_SLUG);
  void resetCollabStateFromCanonical(TARGET_SLUG, { actor: 'maintenance:reset-0ieaen6e-collab' })
    .then((result) => {
      recordMaintenanceRun(RUN_KEY, {
        success: result.ok,
        before: before ? { health: before.health, reason: before.health_reason } : null,
        after: result.ok ? result.after : null,
        code: result.ok ? null : result.code,
        error: result.ok ? null : result.error,
      });
      if (result.ok) {
        console.log('[maintenance] 0ieaen6e collab reset complete', {
          yStateVersion: result.yStateVersion,
          clearedUpdates: result.clearedUpdates,
          clearedSnapshots: result.clearedSnapshots,
          projectionSource: result.projectionSource,
        });
      } else {
        console.error('[maintenance] 0ieaen6e collab reset failed', result);
      }
    })
    .catch((error) => {
      console.error('[maintenance] 0ieaen6e collab reset crashed', error);
    });
}
