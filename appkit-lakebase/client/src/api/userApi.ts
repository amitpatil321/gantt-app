import type { CurrentUser } from '@/types';
import { http } from './httpClient';

export const userApi = {
  /** Returns the Databricks user currently signed in to the app. */
  me(signal?: AbortSignal): Promise<CurrentUser> {
    return http.get<CurrentUser>('/me', signal);
  },
};
