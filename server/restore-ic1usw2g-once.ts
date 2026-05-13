import { randomUUID } from 'crypto';
import { getDb, hasMaintenanceRun, recordMaintenanceRun } from './db.js';
import { refreshSnapshotForSlug } from './snapshot.js';

const RUN_KEY = 'restore-deleted-doc-ic1usw2g-2026-05-13';
const SLUG = 'ic1usw2g';
const TOKEN_HASH = '696cf2f5615f28904bd517b995e1c3b9ec3026a6a5ff1fe3ba3fa8d916697770';

export function restoreIc1usw2gOnce(): void {
  if (hasMaintenanceRun(RUN_KEY)) return;

  const db = getDb();
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    const doc = db.prepare(`
      SELECT slug, share_state AS shareState
      FROM documents
      WHERE slug = ?
      LIMIT 1
    `).get(SLUG) as { slug?: string; shareState?: string } | undefined;

    if (!doc?.slug) {
      recordMaintenanceRun(RUN_KEY, { slug: SLUG, restored: false, reason: 'missing' });
      return { restored: false, reason: 'missing' };
    }

    if (doc.shareState !== 'DELETED') {
      recordMaintenanceRun(RUN_KEY, { slug: SLUG, restored: false, reason: `state:${doc.shareState ?? 'unknown'}` });
      return { restored: false, reason: `state:${doc.shareState ?? 'unknown'}` };
    }

    db.prepare(`
      UPDATE documents
      SET share_state = 'ACTIVE',
          active = 1,
          deleted_at = NULL,
          updated_at = ?,
          access_epoch = access_epoch + 1
      WHERE slug = ?
    `).run(now, SLUG);

    const reactivated = db.prepare(`
      UPDATE document_access
      SET role = 'editor',
          revoked_at = NULL
      WHERE document_slug = ?
        AND secret_hash = ?
    `).run(SLUG, TOKEN_HASH).changes;

    if (reactivated <= 0) {
      db.prepare(`
        INSERT INTO document_access (token_id, document_slug, role, secret_hash, created_at, revoked_at)
        VALUES (?, ?, 'editor', ?, ?, NULL)
      `).run(randomUUID(), SLUG, TOKEN_HASH, now);
    }

    db.prepare(`
      INSERT INTO events (document_slug, event_type, event_data, actor, created_at)
      VALUES (?, 'document.restored', ?, 'operator', ?)
    `).run(SLUG, JSON.stringify({ runKey: RUN_KEY }), now);

    recordMaintenanceRun(RUN_KEY, {
      slug: SLUG,
      restored: true,
      previousState: doc.shareState,
      accessToken: reactivated > 0 ? 'reactivated' : 'inserted',
    });
    return { restored: true, accessToken: reactivated > 0 ? 'reactivated' : 'inserted' };
  });

  const result = tx() as { restored: boolean; reason?: string; accessToken?: string };
  if (result.restored) {
    refreshSnapshotForSlug(SLUG);
    console.log('[maintenance] Restored deleted document', { slug: SLUG, accessToken: result.accessToken });
  } else {
    console.log('[maintenance] Skipped deleted document restore', { slug: SLUG, reason: result.reason });
  }
}
