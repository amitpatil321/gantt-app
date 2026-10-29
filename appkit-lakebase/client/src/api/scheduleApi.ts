import type { Schedule } from '@/types';
import { http } from './httpClient';

const path = (projectId: string) => `/projects/${encodeURIComponent(projectId)}/schedule`;

export const scheduleApi = {
  get(projectId: string, signal?: AbortSignal): Promise<Schedule> {
    return http.get<Schedule>(path(projectId), signal);
  },

  /** Replaces the full schedule (tasks + links) of a project. */
  save(projectId: string, schedule: Schedule): Promise<{ savedAt: string }> {
    return http.put<{ savedAt: string }>(path(projectId), schedule);
  },
};
