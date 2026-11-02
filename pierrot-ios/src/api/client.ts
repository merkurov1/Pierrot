import { env } from '@/config/env';

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'INVALID_RESPONSE'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT'
  | 'HTTP_ERROR'
  | 'AUTH_NOT_CONFIGURED';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      retryAfter?: number;
      details?: unknown;
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.code = options.code ?? (options.status ? 'HTTP_ERROR' : 'NETWORK');
    this.retryAfter = options.retryAfter;
    this.details = options.details;
  }
}

function parseErrorPayload(payload: unknown): {
  message?: string;
  code?: string;
  retryAfter?: number;
} {
  if (!payload || typeof payload !== 'object') return {};

  const record = payload as Record<string, unknown>;

  const message =
    typeof record.error === 'string'
      ? record.error
      : typeof record.message === 'string'
        ? record.message
        : typeof record.msg === 'string'
          ? record.msg
          : typeof record.error_description === 'string'
            ? record.error_description
            : undefined;

  return {
    message,
    code: typeof record.code === 'string' ? record.code : undefined,
    retryAfter:
      typeof record.retryAfter === 'number' && Number.isFinite(record.retryAfter)
        ? record.retryAfter
        : undefined,
  };
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 240) };
  }
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {}
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetch(`${env.apiUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });

    const payload = await parseJson(response);

    if (!response.ok) {
      const parsed = parseErrorPayload(payload);

      throw new ApiError(
        parsed.message || `Pierrot returned HTTP ${response.status}.`,
        {
          status: response.status,
          code:
            parsed.code ??
            (response.status === 401
              ? 'UNAUTHORIZED'
              : response.status === 429
                ? 'RATE_LIMIT'
                : 'HTTP_ERROR'),
          retryAfter: parsed.retryAfter,
          details: payload,
        }
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      if (timedOut) {
        throw new ApiError('Pierrot took too long to answer.', {
          code: 'TIMEOUT',
        });
      }

      throw new ApiError('Request cancelled.', { code: 'ABORTED' });
    }

    throw new ApiError('No connection to Pierrot. Check your network.', {
      code: 'NETWORK',
      details: error,
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export function friendlyApiMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : 'Something went wrong.';
  }

  switch (error.code) {
    case 'RATE_LIMIT':
      return 'Too many requests in a short time. Wait a minute and try again.';
    case 'TIMEOUT':
      return 'Pierrot is taking longer than usual. Try again in a moment.';
    case 'UNAUTHORIZED':
      return 'Your session has expired. Sign in again in Settings.';
    case 'AUTH_NOT_CONFIGURED':
      return 'Authentication is not configured for this build.';
    case 'NETWORK':
      return 'No connection to Pierrot. Check your network and try again.';
    case 'ABORTED':
      return 'Request cancelled.';
    default:
      return error.message;
  }
}
