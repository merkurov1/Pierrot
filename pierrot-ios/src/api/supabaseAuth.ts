import { ApiError } from '@/api/client';
import { env, isAuthConfigured } from '@/config/env';
import type { AuthUser } from '@/api/types';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
};

type SupabaseUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type SupabaseSessionPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: SupabaseUser;
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
};

function requireConfig(): { url: string; key: string } {
  if (!isAuthConfigured || !env.supabaseUrl || !env.supabaseAnonKey) {
    throw new ApiError('Authentication is not configured for this build.', {
      code: 'AUTH_NOT_CONFIGURED',
    });
  }

  return { url: env.supabaseUrl, key: env.supabaseAnonKey };
}

function authHeaders(key: string, token?: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${token ?? key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function errorMessage(payload: SupabaseSessionPayload | null, fallback: string): string {
  return (
    payload?.msg ||
    payload?.message ||
    payload?.error_description ||
    (payload?.error && payload.error !== 'invalid_grant' ? payload.error : null) ||
    fallback
  );
}

async function supabaseFetch(
  path: string,
  init: RequestInit,
  timeoutMs = 20_000
): Promise<SupabaseSessionPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.supabaseUrl}${path}`, {
      ...init,
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = (text ? JSON.parse(text) : null) as SupabaseSessionPayload | null;

    if (!response.ok) {
      throw new ApiError(errorMessage(payload, `Authentication failed (${response.status}).`), {
        status: response.status,
        code: response.status === 429 ? 'RATE_LIMIT' : 'HTTP_ERROR',
        details: payload,
      });
    }

    return payload ?? {};
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Authentication request timed out.', { code: 'TIMEOUT' });
    }

    throw new ApiError('Could not reach the authentication service.', {
      code: 'NETWORK',
      details: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function mapUser(user: SupabaseUser | undefined, fallback?: AuthUser): AuthUser {
  if (!user) {
    return (
      fallback ?? {
        id: '',
        email: null,
        name: null,
        image: null,
      }
    );
  }

  const metadata = user.user_metadata ?? {};
  const name =
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    metadata.preferred_username ||
    metadata.given_name ||
    fallback?.name ||
    null;

  const image =
    metadata.avatar_url ||
    metadata.picture ||
    metadata.image ||
    metadata.avatar ||
    fallback?.image ||
    null;

  return {
    id: user.id,
    email: user.email ?? fallback?.email ?? null,
    name: typeof name === 'string' && name.trim() ? name.trim() : null,
    image: typeof image === 'string' && image.trim() ? image.trim() : null,
  };
}

function mapSession(payload: SupabaseSessionPayload, fallbackUser?: AuthUser): AuthSession {
  if (!payload.access_token || !payload.refresh_token) {
    throw new ApiError('The authentication service returned an incomplete session.', {
      code: 'INVALID_RESPONSE',
    });
  }

  const expiresAt =
    typeof payload.expires_at === 'number'
      ? payload.expires_at
      : Math.floor(Date.now() / 1000) + (payload.expires_in ?? 3600);

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt,
    user: mapUser(payload.user, fallbackUser),
  };
}

/** Sends the same Supabase email OTP used by /login on merkurov.love. */
export async function requestEmailCode(email: string): Promise<void> {
  const { url, key } = requireConfig();

  await supabaseFetch(`${url}/auth/v1/otp`, {
    method: 'POST',
    headers: authHeaders(key),
    body: JSON.stringify({
      email: email.trim(),
      create_user: true,
    }),
  });
}

export async function verifyEmailCode(email: string, token: string): Promise<AuthSession> {
  const { url, key } = requireConfig();

  const payload = await supabaseFetch(`${url}/auth/v1/verify`, {
    method: 'POST',
    headers: authHeaders(key),
    body: JSON.stringify({
      type: 'email',
      email: email.trim(),
      token: token.trim(),
    }),
  });

  return mapSession(payload);
}

export async function refreshAuthSession(session: AuthSession): Promise<AuthSession> {
  const { url, key } = requireConfig();

  const payload = await supabaseFetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: authHeaders(key),
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });

  return mapSession(payload, session.user);
}

export async function revokeAuthSession(session: AuthSession): Promise<void> {
  const { url, key } = requireConfig();

  try {
    await supabaseFetch(
      `${url}/auth/v1/logout`,
      {
        method: 'POST',
        headers: authHeaders(key, session.accessToken),
      },
      8_000
    );
  } catch {
    // A local sign-out must still succeed if the device is offline.
  }
}
