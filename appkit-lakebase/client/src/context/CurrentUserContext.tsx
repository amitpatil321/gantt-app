import { createContext, useEffect, useState, type ReactNode } from 'react';
import { userApi } from '@/api/userApi';
import { getErrorMessage, isAbortError } from '@/api/httpClient';
import type { CurrentUser } from '@/types';

export interface CurrentUserState {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
}

export const CurrentUserContext = createContext<CurrentUserState>({ user: null, loading: true, error: null });

/** Loads the Databricks user signed in to the app once and shares it app-wide. */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurrentUserState>({ user: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    userApi
      .me(controller.signal)
      .then((user) => setState({ user, loading: false, error: null }))
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setState({ user: null, loading: false, error: getErrorMessage(err) });
      });
    return () => controller.abort();
  }, []);

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}
