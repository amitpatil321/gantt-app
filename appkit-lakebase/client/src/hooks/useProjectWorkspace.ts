import { useCallback, useEffect, useState } from 'react';
import { projectsApi } from '@/api/projectsApi';
import { scheduleApi } from '@/api/scheduleApi';
import { ApiError, getErrorMessage, isAbortError } from '@/api/httpClient';
import type { Project, Schedule, UpdateProjectInput } from '@/types';

interface WorkspaceState {
  project: Project | null;
  schedule: Schedule | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

/** Loads a project and its Gantt schedule, and exposes project-level mutations. */
export function useProjectWorkspace(projectId: string | undefined) {
  const [state, setState] = useState<WorkspaceState>({
    project: null,
    schedule: null,
    loading: true,
    error: null,
    notFound: false,
  });

  useEffect(() => {
    if (!projectId) return undefined;
    const controller = new AbortController();
    setState({ project: null, schedule: null, loading: true, error: null, notFound: false });
    Promise.all([projectsApi.get(projectId, controller.signal), scheduleApi.get(projectId, controller.signal)])
      .then(([project, schedule]) => setState({ project, schedule, loading: false, error: null, notFound: false }))
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        const notFound = err instanceof ApiError && (err.status === 404 || err.status === 400);
        setState({ project: null, schedule: null, loading: false, error: getErrorMessage(err), notFound });
      });
    return () => controller.abort();
  }, [projectId]);

  const updateProject = useCallback(
    async (patch: UpdateProjectInput) => {
      if (!projectId) return;
      const project = await projectsApi.update(projectId, patch);
      setState((s) => ({ ...s, project }));
    },
    [projectId],
  );

  const trashProject = useCallback(async () => {
    if (!projectId) return;
    const project = await projectsApi.trash(projectId);
    setState((s) => ({ ...s, project }));
  }, [projectId]);

  return { ...state, updateProject, trashProject };
}
