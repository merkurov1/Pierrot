import { createClient } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

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

  // Supabase sends a 6-digit token, but mail clients and clipboard sometimes add
  // spaces or invisible characters. Normalise to digits before verification.
  const digits = token.replace(/\D/g, '');

  if (!digits) {
    throw new ApiError('Enter the numeric code from the email.', {
      code: 'INVALID_RESPONSE',
    });
  }

  // GoTrue distinguishes signup, magiclink and email OTP token types. A code
  // requested for an existing user is normally `email`; a code created while
  // signing up a new user can be `signup`. A wrong type does not consume the
  // token, so try the compatible types in order and surface the last error.
  const candidateTypes = ['email', 'magiclink', 'signup'] as const;
  let lastError: unknown = null;

  for (const type of candidateTypes) {
    try {
      const payload = await supabaseFetch(`${url}/auth/v1/verify`, {
        method: 'POST',
        headers: authHeaders(key),
        body: JSON.stringify({
          type,
          email: email.trim(),
          token: digits,
        }),
      });

      return mapSession(payload);
    } catch (error) {
      lastError = error;

      if (
        !(error instanceof ApiError) ||
        ![400, 401, 403, 422].includes(error.status ?? 0)
      ) {
        throw error;
      }
    }
  }

  throw lastError;
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

// ---------------------------------------------------------------------------
// OAuth / native ID token sign-in
// ---------------------------------------------------------------------------

/**
 * Supabase's PKCE verifier is kept only for the duration of the OAuth browser
 * ceremony. The actual access/refresh session is stored by AuthContext in
 * SecureStore after the exchange.
 */
const oauthMemory = new Map<string, string>();

function createOAuthClient() {
  const { url, key } = requireConfig();

  return createClient(url, key, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: {
        getItem: async (name: string) => oauthMemory.get(name) ?? null,
        setItem: async (name: string, value: string) => {
          oauthMemory.set(name, value);
        },
        removeItem: async (name: string) => {
          oauthMemory.delete(name);
        },
      },
    },
  });
}

function fromSupabaseSession(session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
  expires_in?: number | null;
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null };
}): AuthSession {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt:
      typeof session.expires_at === 'number'
        ? session.expires_at
        : Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    user: mapUser(session.user as never),
  };
}

export async function signInWithGoogleOAuth(): Promise<AuthSession> {
  const client = createOAuthClient();
  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    throw new ApiError(error?.message || 'Google sign-in could not be started.', {
      code: 'HTTP_ERROR',
    });
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    throw new ApiError('Google sign-in was cancelled.', { code: 'ABORTED' });
  }

  const code = new URL(result.url).searchParams.get('code');

  if (!code) {
    throw new ApiError('Google sign-in returned no authorization code.', {
      code: 'INVALID_RESPONSE',
    });
  }

  const exchanged = await client.auth.exchangeCodeForSession(code);

  if (exchanged.error || !exchanged.data.session) {
    throw new ApiError(exchanged.error?.message || 'Google session exchange failed.', {
      code: 'HTTP_ERROR',
    });
  }

  return fromSupabaseSession(exchanged.data.session);
}

export async function signInWithAppleNative(): Promise<AuthSession> {
  const available = await AppleAuthentication.isAvailableAsync();

  if (!available) {
    throw new ApiError('Sign in with Apple is not available on this device.', {
      code: 'AUTH_NOT_CONFIGURED',
    });
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new ApiError('Apple returned no identity token.', { code: 'INVALID_RESPONSE' });
  }

  const client = createOAuthClient();
  const { data, error } = await client.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });

  if (error || !data.session) {
    throw new ApiError(error?.message || 'Apple session exchange failed.', {
      code: 'HTTP_ERROR',
    });
  }

  const fullName = [
    credential.fullName?.givenName,
    credential.fullName?.middleName,
    credential.fullName?.familyName,
  ]
    .filter(Boolean)
    .join(' ');

  if (fullName.trim()) {
    await client.auth.updateUser({
      data: {
        full_name: fullName,
        given_name: credential.fullName?.givenName ?? null,
        family_name: credential.fullName?.familyName ?? null,
      },
    });
  }

  return fromSupabaseSession(data.session);
}

/**
 * Fallback for Supabase email templates that contain a magic link rather than
 * (or in addition to) a 6-digit code. The user must COPY the link from the
 * email and paste it here without opening it; opening it consumes the token in
 * the browser.
 *
 * Supabase action links have the shape:
 *   https://<project>/auth/v1/verify?token=<hashed_token>&type=magiclink&redirect_to=...
 * The verify endpoint expects the hashed token as `token_hash`.
 */
export async function verifyEmailLink(link: string): Promise<AuthSession> {
  const { url, key } = requireConfig();

  let parsed: URL;

  try {
    parsed = new URL(link.trim());
  } catch {
    throw new ApiError('Paste the full link from the email.', { code: 'INVALID_RESPONSE' });
  }

  const tokenHash =
    parsed.searchParams.get('token_hash') ||
    parsed.searchParams.get('token') ||
    parsed.searchParams.get('code');
  const type = parsed.searchParams.get('type') || 'magiclink';

  if (!tokenHash) {
    throw new ApiError('This email link does not contain a token.', {
      code: 'INVALID_RESPONSE',
    });
  }

  const payload = await supabaseFetch(`${url}/auth/v1/verify`, {
    method: 'POST',
    headers: authHeaders(key),
    body: JSON.stringify({
      token_hash: tokenHash,
      type,
    }),
  });

  return mapSession(payload);
}
