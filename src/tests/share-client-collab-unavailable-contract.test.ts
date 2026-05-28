function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

type FetchCall = {
  url: string;
  headers: Record<string, string>;
  method: string;
};

async function run(): Promise<void> {
  const prevWindow = (globalThis as { window?: unknown }).window;
  const prevFetch = globalThis.fetch;

  const calls: FetchCall[] = [];

  try {
    (globalThis as { window?: unknown }).window = {
      location: {
        origin: 'https://www.proofeditor.ai',
        pathname: '/d/test-slug',
        search: '?token=query-token',
      },
      __PROOF_CONFIG__: {},
    };

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({
        url,
        headers,
        method: String(init?.method ?? 'GET').toUpperCase(),
      });

      if (url.endsWith('/api/documents/test-slug/collab-session')) {
        return new Response(JSON.stringify({
          collabAvailable: false,
          snapshotUrl: '/snapshots/test-slug.html',
          code: 'COLLAB_ADMISSION_GUARDED',
          retryAfterMs: 42000,
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'req-collab-session',
          },
        });
      }

      if (url.endsWith('/api/documents/test-slug/open-context')) {
        return new Response(JSON.stringify({
          success: true,
          collabAvailable: false,
          snapshotUrl: '/snapshots/test-slug.html',
          code: 'COLLAB_ADMISSION_GUARDED',
          retryAfterMs: 21000,
          doc: {
            slug: 'test-slug',
            docId: 'doc-test-slug',
            title: 'Test',
            markdown: '# Test',
            marks: {},
            shareState: 'ACTIVE',
            active: true,
            createdAt: '2026-05-27T00:00:00.000Z',
            updatedAt: '2026-05-27T00:00:00.000Z',
            viewers: 0,
          },
          capabilities: {
            canRead: true,
            canComment: false,
            canEdit: false,
          },
          links: {
            webUrl: 'https://www.proofeditor.ai/d/test-slug',
            snapshotUrl: '/snapshots/test-slug.html',
          },
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'req-open-context',
          },
        });
      }

      if (url.endsWith('/api/documents/test-slug/collab-refresh')) {
        return new Response(JSON.stringify({
          error: 'Live collaboration is temporarily unavailable.',
          code: 'COLLAB_AUTO_QUARANTINED',
          retryAfterMs: 12000,
        }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'req-collab-refresh',
          },
        });
      }

      return new Response(JSON.stringify({ error: 'unexpected request' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const mod = await import('../bridge/share-client.ts');
    const client = new mod.ShareClient();

    const unavailable = await client.fetchCollabSession();
    assert(unavailable !== null, 'Expected collab-session response');
    assert(!('error' in unavailable), 'Expected collab-session degraded payload, not request error');
    assert(unavailable.collabAvailable === false, 'Expected collab-session to preserve collabAvailable=false');
    assert(unavailable.code === 'COLLAB_ADMISSION_GUARDED', `Expected collab-session code to survive parsing, got ${String(unavailable.code)}`);
    assert(unavailable.retryAfterMs === 42000, `Expected collab-session retryAfterMs to survive parsing, got ${String(unavailable.retryAfterMs)}`);
    assert(unavailable.requestId === 'req-collab-session', `Expected collab-session request id, got ${String(unavailable.requestId)}`);

    const context = await client.fetchOpenContext();
    assert(context !== null, 'Expected open-context response');
    assert(!('error' in context), 'Expected open-context degraded payload, not request error');
    assert(context.collabAvailable === false, 'Expected open-context to preserve collabAvailable=false');
    assert(context.code === 'COLLAB_ADMISSION_GUARDED', `Expected open-context code to survive parsing, got ${String(context.code)}`);
    assert(context.retryAfterMs === 21000, `Expected open-context retryAfterMs to survive parsing, got ${String(context.retryAfterMs)}`);
    assert(context.requestId === 'req-open-context', `Expected open-context request id, got ${String(context.requestId)}`);
    assert(context.doc.markdown === '# Test', 'Expected open-context to keep read-only document content');

    const refresh = await client.refreshCollabSession();
    assert(refresh !== null && 'error' in refresh, 'Expected collab-refresh request error payload');
    assert(refresh.error.code === 'COLLAB_AUTO_QUARANTINED', `Expected collab-refresh error code, got ${String(refresh.error.code)}`);
    assert(refresh.error.retryAfterMs === 12000, `Expected collab-refresh retryAfterMs, got ${String(refresh.error.retryAfterMs)}`);
    assert(refresh.error.requestId === 'req-collab-refresh', `Expected collab-refresh request id, got ${String(refresh.error.requestId)}`);

    assert(calls.length === 3, `Expected exactly three share client calls, got ${calls.length}`);
    assert(calls[0]?.method === 'GET', `Expected collab-session GET, got ${String(calls[0]?.method)}`);
    assert(calls[1]?.method === 'GET', `Expected open-context GET, got ${String(calls[1]?.method)}`);
    assert(calls[2]?.method === 'POST', `Expected collab-refresh POST, got ${String(calls[2]?.method)}`);
    assert(calls[0]?.headers?.['x-share-token'] === 'query-token', 'Expected share token header on collab-session');
    assert(calls[1]?.headers?.['x-share-token'] === 'query-token', 'Expected share token header on open-context');
    assert(calls[2]?.headers?.['x-share-token'] === 'query-token', 'Expected share token header on collab-refresh');

    console.log('✓ share client preserves retryable collab unavailability details');
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
    globalThis.fetch = prevFetch;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
