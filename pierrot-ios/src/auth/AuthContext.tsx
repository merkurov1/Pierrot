import React from 'react';
import * as SecureStore from 'expo-secure-store';

import { ApiError, friendlyApiMessage } from '@/api/client';
import { getMe } from '@/api/account';
import type { AuthMeResponse, PierrotConsentState } from '@/api/types';
import {
  refreshAuthSession,
  requestEmailCode,
  revokeAuthSession,
  verifyEmailCode,
  type AuthSession,
} from '@/api/supabaseAuth';
import { isAuthConfigured } from '@/config/env';

const SESSION_KEY = 'pierrot.auth.session.v1';
const CONSENT_KEY = 'pierrot.consent.v1';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  me: AuthMeResponse | null;
  isAdmin: boolean;
  authConfigured: boolean;
  consent: PierrotConsentState;
  error: string | null;
  requestCode: (email: string) => Promise<void>;
  signIn: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  setConsent: (state: PierrotConsentState) => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function sessionIsFresh(session: AuthSession): boolean {
  return session.expiresAt * 1000 > Date.now() + 60_000;
}

async function readSession(): Promise<AuthSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AuthSession;

    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function writeSession(session: AuthSession | null): Promise<void> {
  try {
    if (!session) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return;
    }

    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // Authentication still works for this session if secure storage is not
    // available; only persistence across launches is lost.
  }
}

async function readConsent(): Promise<PierrotConsentState> {
  try {
    const raw = await SecureStore.getItemAsync(CONSENT_KEY);
    return raw === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

async function writeConsent(state: PierrotConsentState): Promise<void> {
  try {
    await SecureStore.setItemAsync(CONSENT_KEY, state, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // Non-fatal: the choice still applies to the current process.
  }
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [me, setMe] = React.useState<AuthMeResponse | null>(null);
  const [consent, setConsentState] = React.useState<PierrotConsentState>('denied');
  const [error, setError] = React.useState<string | null>(null);

  const sessionRef = React.useRef<AuthSession | null>(null);
  const refreshPromiseRef = React.useRef<Promise<AuthSession | null> | null>(null);

  const applySession = React.useCallback((next: AuthSession | null) => {
    sessionRef.current = next;
    setSession(next);
    void writeSession(next);
  }, []);

  const loadMe = React.useCallback(async (token: string): Promise<AuthMeResponse | null> => {
    try {
      const result = await getMe(token);
      setMe(result);
      return result;
    } catch (requestError) {
      setMe(null);
      if (requestError instanceof ApiError && requestError.status === 401) {
        setError('Your session expired. Sign in again.');
      }
      return null;
    }
  }, []);

  const refreshOnce = React.useCallback(async (): Promise<AuthSession | null> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const current = sessionRef.current;

    if (!current) return null;

    const promise = (async () => {
      try {
        const next = await refreshAuthSession(current);
        applySession(next);
        return next;
      } catch {
        applySession(null);
        setMe(null);
        setStatus('signedOut');
        setError('Your session expired. Sign in again.');
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, [applySession]);

  const getAccessToken = React.useCallback(async (): Promise<string | null> => {
    const current = sessionRef.current;

    if (!current) return null;
    if (sessionIsFresh(current)) return current.accessToken;

    const refreshed = await refreshOnce();
    return refreshed?.accessToken ?? null;
  }, [refreshOnce]);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const storedConsent = await readConsent();
      if (mounted) setConsentState(storedConsent);

      const stored = await readSession();

      if (!mounted) return;

      if (!stored) {
        setStatus('signedOut');
        return;
      }

      sessionRef.current = stored;
      setSession(stored);

      const active = sessionIsFresh(stored) ? stored : await refreshOnce();

      if (!mounted) return;

      if (!active) {
        setStatus('signedOut');
        return;
      }

      setStatus('signedIn');
      await loadMe(active.accessToken);
    })();

    return () => {
      mounted = false;
    };
  }, [loadMe, refreshOnce]);

  const requestCode = React.useCallback(async (email: string) => {
    setError(null);
    try {
      await requestEmailCode(email);
    } catch (requestError) {
      const message = friendlyApiMessage(requestError);
      setError(message);
      throw requestError;
    }
  }, []);

  const signIn = React.useCallback(
    async (email: string, code: string) => {
      setError(null);

      try {
        const next = await verifyEmailCode(email, code);
        applySession(next);
        setStatus('signedIn');
        await loadMe(next.accessToken);
      } catch (requestError) {
        const message = friendlyApiMessage(requestError);
        setError(message);
        throw requestError;
      }
    },
    [applySession, loadMe]
  );

  const signOut = React.useCallback(async () => {
    const current = sessionRef.current;

    if (current) {
      await revokeAuthSession(current);
    }

    applySession(null);
    setMe(null);
    setError(null);
    setStatus('signedOut');

    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {
      // Local sign-out still succeeds if the Keychain is unavailable.
    }
  }, [applySession]);

  const refreshMe = React.useCallback(async () => {
    setError(null);

    const token = await getAccessToken();

    if (!token) {
      setMe(null);
      return;
    }

    const result = await loadMe(token);

    if (!result) {
      const refreshed = await refreshOnce();
      if (refreshed) await loadMe(refreshed.accessToken);
    }
  }, [getAccessToken, loadMe, refreshOnce]);

  const setConsent = React.useCallback(async (state: PierrotConsentState) => {
    setConsentState(state);
    await writeConsent(state);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      me,
      isAdmin: Boolean(me?.isAdmin),
      authConfigured: isAuthConfigured,
      consent,
      error,
      requestCode,
      signIn,
      signOut,
      refreshMe,
      getAccessToken,
      setConsent,
    }),
    [
      status,
      session,
      me,
      consent,
      error,
      requestCode,
      signIn,
      signOut,
      refreshMe,
      getAccessToken,
      setConsent,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = React.useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return value;
}
