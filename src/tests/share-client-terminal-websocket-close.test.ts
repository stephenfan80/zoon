export {};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

type TimeoutCall = {
  delay: number;
};

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = FakeWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(): void {
    // no-op
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.({} as Event);
  }

  closeFromServer(code: number, reason: string): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code, reason } as CloseEvent);
  }
}

async function run(): Promise<void> {
  const prevWindow = (globalThis as { window?: unknown }).window;
  const prevWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket;
  const prevSetTimeout = globalThis.setTimeout;
  const prevClearTimeout = globalThis.clearTimeout;
  const timeoutCalls: TimeoutCall[] = [];

  try {
    (globalThis as { window?: unknown }).window = {
      location: {
        origin: 'https://www.proofeditor.ai',
        protocol: 'https:',
        host: 'www.proofeditor.ai',
        pathname: '/d/test-slug',
        search: '?token=query-token',
      },
      __PROOF_CONFIG__: {},
    };
    (globalThis as { WebSocket?: unknown }).WebSocket = FakeWebSocket;
    globalThis.setTimeout = (((handler: TimerHandler, timeout?: number) => {
      void handler;
      timeoutCalls.push({ delay: typeof timeout === 'number' ? timeout : 0 });
      return timeoutCalls.length as unknown as ReturnType<typeof setTimeout>;
    }) as unknown) as typeof setTimeout;
    globalThis.clearTimeout = ((_id?: ReturnType<typeof setTimeout>) => undefined) as typeof clearTimeout;

    const mod = await import('../bridge/share-client.ts');
    const client = new mod.ShareClient();

    client.connectWebSocket();
    const terminalSocket = FakeWebSocket.instances.at(-1);
    assert(Boolean(terminalSocket), 'Expected terminal test socket to be created');
    terminalSocket!.open();
    terminalSocket!.closeFromServer(4001, 'Document unshared');
    assert(timeoutCalls.length === 0, `Expected no reconnect after terminal close, got ${timeoutCalls.length}`);

    client.connectWebSocket();
    const deletedSocket = FakeWebSocket.instances.at(-1);
    assert(Boolean(deletedSocket) && deletedSocket !== terminalSocket, 'Expected deleted test socket to be created');
    deletedSocket!.open();
    deletedSocket!.closeFromServer(4401, 'collab:deleted');
    assert(timeoutCalls.length === 0, `Expected no reconnect after deleted close reason, got ${timeoutCalls.length}`);

    client.connectWebSocket();
    const transientSocket = FakeWebSocket.instances.at(-1);
    assert(Boolean(transientSocket) && transientSocket !== deletedSocket, 'Expected transient test socket to be created');
    transientSocket!.open();
    transientSocket!.closeFromServer(1006, '');
    assert(timeoutCalls.length === 1, `Expected one reconnect after transient close, got ${timeoutCalls.length}`);
    assert(timeoutCalls[0]?.delay === 1000, `Expected initial reconnect delay of 1000ms, got ${String(timeoutCalls[0]?.delay)}`);

    console.log('✓ share client skips reconnects for terminal websocket closes');
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
    if (prevWebSocket === undefined) {
      delete (globalThis as { WebSocket?: unknown }).WebSocket;
    } else {
      (globalThis as { WebSocket?: unknown }).WebSocket = prevWebSocket;
    }
    globalThis.setTimeout = prevSetTimeout;
    globalThis.clearTimeout = prevClearTimeout;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
