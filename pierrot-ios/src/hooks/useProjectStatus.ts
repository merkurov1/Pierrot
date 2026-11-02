import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getProjectStatus, type ProjectStatus } from '@/api/mobile';
import { useAuth } from '@/auth/AuthContext';
import { useMobileBackend } from '@/mobile/MobileBackendContext';

type State = {
  data: ProjectStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Refresh on mount and whenever the app becomes active. No interval, no
 * background polling, no hidden AI work.
 */
export function useProjectStatus(): State {
  const { session, isAdmin, getAccessToken } = useAuth();
  const { available } = useMobileBackend();
  const [data, setData] = React.useState<ProjectStatus | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const mounted = React.useRef(true);

  const load = React.useCallback(
    async (force = false) => {
      if (!session || !isAdmin || !available) {
        setData(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getAccessToken();
        if (!token) {
          setError('Session expired.');
          return;
        }

        const result = await getProjectStatus(token, force);
        if (mounted.current) setData(result);
      } catch (requestError) {
        if (mounted.current) {
          setError(requestError instanceof Error ? requestError.message : 'Status unavailable.');
        }
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [available, getAccessToken, isAdmin, session]
  );

  React.useEffect(() => {
    mounted.current = true;
    // Initial network load; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void load();
    });

    return () => {
      mounted.current = false;
      subscription.remove();
    };
  }, [load]);

  return { data, loading, error, refresh: () => load(true) };
}
