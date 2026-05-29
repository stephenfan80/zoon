export type ShareCollabUnavailableInfo = {
  collabAvailable: false;
  code?: string;
  retryAfterMs?: number | null;
  requestId?: string | null;
  snapshotUrl?: string | null;
};

export type ShareCollabUnavailableRecovery = {
  retryable: boolean;
  retryDelayMs: number | null;
  message: string;
};

const RETRYABLE_UNAVAILABLE_CODES = new Set([
  'COLLAB_ADMISSION_GUARDED',
  'COLLAB_AUTO_QUARANTINED',
]);

const MIN_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 2 * 60 * 1000;
const DEFAULT_RETRYABLE_CODE_DELAY_MS = 15_000;
const DEFAULT_RECOVERY_POLL_DELAY_MS = 30_000;

function normalizeRetryDelayMs(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(MIN_RETRY_DELAY_MS, Math.trunc(value)));
}

function formatRetryDelay(delayMs: number): string {
  const seconds = Math.max(1, Math.ceil(delayMs / 1000));
  return `${seconds}s`;
}

export function getShareCollabUnavailableRecovery(
  unavailable: ShareCollabUnavailableInfo,
): ShareCollabUnavailableRecovery {
  const retryAfterMs = normalizeRetryDelayMs(unavailable.retryAfterMs);
  const code = typeof unavailable.code === 'string' ? unavailable.code.trim().toUpperCase() : '';
  const retryableByCode = RETRYABLE_UNAVAILABLE_CODES.has(code);
  const retryDelayMs = retryAfterMs ?? (retryableByCode ? DEFAULT_RETRYABLE_CODE_DELAY_MS : null);

  if (retryDelayMs !== null) {
    return {
      retryable: true,
      retryDelayMs,
      message: `文档正在恢复同步，暂时只读；将在 ${formatRetryDelay(retryDelayMs)} 后自动重试。`,
    };
  }

  if (code !== 'HOT_SLUG_QUARANTINED') {
    return {
      retryable: true,
      retryDelayMs: DEFAULT_RECOVERY_POLL_DELAY_MS,
      message: `文档正在恢复同步，暂时只读；将在 ${formatRetryDelay(DEFAULT_RECOVERY_POLL_DELAY_MS)} 后自动重试。`,
    };
  }

  return {
    retryable: false,
    retryDelayMs: null,
    message: '这份文档暂时无法开启实时协作，当前显示只读副本。',
  };
}
