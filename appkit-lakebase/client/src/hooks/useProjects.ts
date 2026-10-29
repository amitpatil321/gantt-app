import { useCallback, useEffect, useState } from 'react';
import { projectsApi } from '@/api/projectsApi';
import { getErrorMessage, isAbortError } from '@/api/httpClient';
import type { Project, ProjectCounts, ProjectScope } from '@/types';

interface ProjectsState {
  items: Project[];
  loading: boolean;
  error: string | null;
}

/** Loads the project list for a scope (mine / all / trash) with optional search. */
export function useProjects(scope: ProjectScope, search: string) {
  const [state, setState] = useState<ProjectsState>({ items: [], loading: true, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    projectsApi
      .list(scope, search || undefined, controller.signal)
      .then((items) => setState({ items, loading: false, error: null }))
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
      });
    return () => controller.abort();
  }, [scope, search, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const removeLocally = useCallback((id: string) => {
    setState((s) => ({ ...s, items: s.items.filter((p) => p.id !== id) }));
  }, []);

  return { ...state, reload, removeLocally };
}

/** Loads the badge counts shown on the landing page tabs. */
export function useProjectCounts() {
  const [counts, setCounts] = useState<ProjectCounts | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    projectsApi
      .counts(controller.signal)
      .then(setCounts)
      .catch((err: unknown) => {
        if (!isAbortError(err)) console.warn('Failed to load project counts', err);
      });
    return () => controller.abort();
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { counts, reload };
}
