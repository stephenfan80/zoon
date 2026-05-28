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
]);

const MIN_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 2 * 60 * 1000;
const DEFAULT_RETRYABLE_CODE_DELAY_MS = 15_000;

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
      message: `Live collaboration is temporarily unavailable. Showing a read-only copy and retrying in ${formatRetryDelay(retryDelayMs)}.`,
    };
  }

  return {
    retryable: false,
    retryDelayMs: null,
    message: 'Live collaboration is unavailable for this document. Showing a read-only copy; retry when the document has recovered.',
  };
}
