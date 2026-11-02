import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { ApiError, apiRequest } from '@/api/client';

/**
 * Detects whether the optional mobile endpoints are deployed on the current
 * backend. The public production server already serves chat, Flow and Brain;
 * the `/api/mobile/*` routes are a separate, later deployment.
 *
 * 401/403/429 mean the route exists and is protected or rate-limited.
 * 404 means it is not deployed. 5xx means it is deployed but not ready
 * (for example, migrations have not been applied yet).
 */
async function probeMobileBackend(): Promise<boolean> {
  try {
    await apiRequest('/api/mobile/overview', { timeoutMs: 8_000 });
    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      const status = error.status ?? 0;
      if (status === 401 || status === 403 || status === 429) return true;
      if (status === 404 || status >= 500) return false;
    }

    // A transient network failure must not permanently hide the features.
    // The next app-active or manual refresh will probe again.
    return false;
  }
}

type MobileBackendValue = {
  available: boolean;
  checking: boolean;
  checkedAt: Date | null;
  refresh: () => Promise<boolean>;
};

const MobileBackendContext = React.createContext<MobileBackendValue | null>(null);

export function MobileBackendProvider({ children }: React.PropsWithChildren) {
  const [available, setAvailable] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [checkedAt, setCheckedAt] = React.useState<Date | null>(null);
  const mounted = React.useRef(true);
  const inFlight = React.useRef<Promise<boolean> | null>(null);

  const refresh = React.useCallback(async (): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;

    setChecking(true);

    const promise = (async () => {
      const next = await probeMobileBackend();

      if (mounted.current) {
        setAvailable(next);
        setCheckedAt(new Date());
        setChecking(false);
      }

      return next;
    })().finally(() => {
      inFlight.current = null;
    });

    inFlight.current = promise;
    return promise;
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    void refresh();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void refresh();
    });

    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [refresh]);

  const value = React.useMemo<MobileBackendValue>(
    () => ({ available, checking, checkedAt, refresh }),
    [available, checking, checkedAt, refresh]
  );

  return (
    <MobileBackendContext.Provider value={value}>{children}</MobileBackendContext.Provider>
  );
}

export function useMobileBackend(): MobileBackendValue {
  const value = React.useContext(MobileBackendContext);

  if (!value) {
    throw new Error('useMobileBackend must be used inside MobileBackendProvider.');
  }

  return value;
}
