import assert from 'node:assert/strict';
import {
  deleteOwnedDocument,
  filterAccountDocumentsByTitle,
  getLocalOwnerSecret,
  loadRecentDocs,
  removeAccountDocumentVisit,
  removeRecentDoc,
  sortAccountDocumentsByCreatedAtDesc,
  type AccountDocument,
} from '../ui/recent-docs';

type Stored = Record<string, string>;

const store: Stored = {};
const localStorageMock = {
  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem(key: string, value: string): void {
    store[key] = value;
  },
  removeItem(key: string): void {
    delete store[key];
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

function seedRecent(): void {
  store['zoon:recent-docs'] = JSON.stringify([
    { slug: 'owned-doc', title: 'Owned doc', href: '/d/owned-doc?token=viewer', ts: 20 },
    { slug: 'shared-doc', title: 'Shared doc', href: '/d/shared-doc?token=viewer', ts: 10 },
  ]);
  store['zoon:owner:owned-doc'] = 'owner-secret';
}

async function main(): Promise<void> {
  const accountDocs: AccountDocument[] = [
    {
      slug: 'older-gtm',
      title: 'ZOON 双市场 GTM 战略 2.0',
      shareState: 'ACTIVE',
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      lastVisitedAt: '2026-05-12T01:00:00.000Z',
      isOwned: true,
      webUrl: '/d/older-gtm',
    },
    {
      slug: 'newer-playbook',
      title: 'ZOON 产品推广基础版 Playbook',
      shareState: 'ACTIVE',
      createdAt: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
      lastVisitedAt: null,
      isOwned: true,
      webUrl: '/d/newer-playbook',
    },
    {
      slug: 'middle-design',
      title: '产品设计简报',
      shareState: 'ACTIVE',
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
      lastVisitedAt: '2026-05-13T00:00:00.000Z',
      isOwned: false,
      webUrl: '/d/middle-design',
    },
  ];
  assert.deepEqual(
    sortAccountDocumentsByCreatedAtDesc(accountDocs).map((doc) => doc.slug),
    ['newer-playbook', 'middle-design', 'older-gtm'],
    'Account docs should sort by createdAt, not lastVisitedAt',
  );
  assert.deepEqual(
    filterAccountDocumentsByTitle(accountDocs, 'gtm').map((doc) => doc.slug),
    ['older-gtm'],
    'Account docs should filter by title query',
  );

  seedRecent();

  assert.equal(getLocalOwnerSecret('owned-doc'), 'owner-secret');
  removeRecentDoc('shared-doc');
  assert.deepEqual(loadRecentDocs().map((doc) => doc.slug), ['owned-doc']);

  let deleteRequest: { url: string; init?: RequestInit } | null = null;
  Object.defineProperty(globalThis, 'fetch', {
    value: async (url: string, init?: RequestInit) => {
      deleteRequest = { url, init };
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
    configurable: true,
  });

  await deleteOwnedDocument('owned-doc', getLocalOwnerSecret('owned-doc'));
  assert(deleteRequest);
  const sentDeleteRequest = deleteRequest as { url: string; init?: RequestInit };
  assert.equal(sentDeleteRequest.url, '/api/documents/owned-doc');
  assert.equal(sentDeleteRequest.init?.method, 'DELETE');
  const deleteHeaders = sentDeleteRequest.init?.headers as Record<string, string>;
  assert.equal(deleteHeaders?.['x-share-token'], 'owner-secret');
  assert.equal(deleteHeaders?.['X-Proof-Client-Version'], '0.31.1');
  assert.equal(deleteHeaders?.['X-Proof-Client-Build'], 'web');
  assert.equal(deleteHeaders?.['X-Proof-Client-Protocol'], '3');
  assert.equal(getLocalOwnerSecret('owned-doc'), null);
  assert.deepEqual(loadRecentDocs(), []);

  let visitRequest: { url: string; init?: RequestInit } | null = null;
  Object.defineProperty(globalThis, 'fetch', {
    value: async (url: string, init?: RequestInit) => {
      visitRequest = { url, init };
      return new Response(JSON.stringify({ success: true, removed: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
    configurable: true,
  });

  const removed = await removeAccountDocumentVisit('shared-doc');
  assert.equal(removed, true);
  assert(visitRequest);
  const sentVisitRequest = visitRequest as { url: string; init?: RequestInit };
  assert.equal(sentVisitRequest.url, '/api/account/documents/shared-doc/visit');
  assert.equal(sentVisitRequest.init?.method, 'DELETE');
  const visitHeaders = sentVisitRequest.init?.headers as Record<string, string>;
  assert.equal(visitHeaders?.['X-Proof-Client-Version'], '0.31.1');
  assert.equal(visitHeaders?.['X-Proof-Client-Build'], 'web');
  assert.equal(visitHeaders?.['X-Proof-Client-Protocol'], '3');

  seedRecent();
  Object.defineProperty(globalThis, 'fetch', {
    value: async () => new Response(JSON.stringify({ error: 'nope' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    }),
    configurable: true,
  });
  await assert.rejects(() => deleteOwnedDocument('owned-doc', 'bad-secret'), /nope/);
  assert.deepEqual(loadRecentDocs().map((doc) => doc.slug), ['owned-doc', 'shared-doc']);
  assert.equal(getLocalOwnerSecret('owned-doc'), 'owner-secret');

  console.log('✓ recent docs delete/remove helpers');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
