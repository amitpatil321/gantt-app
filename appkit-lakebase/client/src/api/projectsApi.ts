import type { CreateProjectInput, Project, ProjectCounts, ProjectScope, UpdateProjectInput } from '@/types';
import { http } from './httpClient';

const base = '/projects';

export const projectsApi = {
  async list(scope: ProjectScope, search?: string, signal?: AbortSignal): Promise<Project[]> {
    const params = new URLSearchParams({ scope });
    if (search) params.set('search', search);
    const res = await http.get<{ items: Project[] }>(`${base}?${params.toString()}`, signal);
    return res.items;
  },

  counts(signal?: AbortSignal): Promise<ProjectCounts> {
    return http.get<ProjectCounts>(`${base}/counts`, signal);
  },

  get(id: string, signal?: AbortSignal): Promise<Project> {
    return http.get<Project>(`${base}/${encodeURIComponent(id)}`, signal);
  },

  create(input: CreateProjectInput): Promise<Project> {
    return http.post<Project>(base, input);
  },

  update(id: string, patch: UpdateProjectInput): Promise<Project> {
    return http.patch<Project>(`${base}/${encodeURIComponent(id)}`, patch);
  },

  /** Soft delete: moves the project to the trash. */
  trash(id: string): Promise<Project> {
    return http.delete<Project>(`${base}/${encodeURIComponent(id)}`);
  },

  restore(id: string): Promise<Project> {
    return http.post<Project>(`${base}/${encodeURIComponent(id)}/restore`);
  },

  /** Duplicates a project (and its schedule) into the current user's projects. */
  copy(id: string): Promise<Project> {
    return http.post<Project>(`${base}/${encodeURIComponent(id)}/copy`);
  },

  destroy(id: string): Promise<void> {
    return http.delete<void>(`${base}/${encodeURIComponent(id)}/permanent`);
  },
};
