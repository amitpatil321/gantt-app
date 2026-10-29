import { useCallback, useEffect, useRef, useState } from 'react';
import { scheduleApi } from '@/api/scheduleApi';
import { getErrorMessage } from '@/api/httpClient';
import type { SaveStatus, Schedule } from '@/types';

type SnapshotGetter = () => Schedule;

/**
 * Debounced, serialized autosave for a project's schedule.
 * Callers pass a snapshot getter so the latest Gantt state is read at save time.
 */
export function useScheduleAutosave(projectId: string | undefined, enabled: boolean, delay = 900) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timer = useRef<number | null>(null);
  const pending = useRef<SnapshotGetter | null>(null);
  const lastGetter = useRef<SnapshotGetter | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const flush = useCallback(async (): Promise<void> => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (!projectId) return;
    while (inFlight.current) await inFlight.current;

    const getter = pending.current;
    if (!getter) return;
    pending.current = null;

    setStatus('saving');
    const run = scheduleApi
      .save(projectId, getter())
      .then((res) => {
        setLastSavedAt(res.savedAt);
        setError(null);
        setStatus(pending.current ? 'pending' : 'saved');
      })
      .catch((err: unknown) => {
        pending.current = pending.current ?? getter;
        setError(getErrorMessage(err, 'Could not save changes'));
        setStatus('error');
      })
      .finally(() => {
        inFlight.current = null;
      });
    inFlight.current = run;
    await run;
  }, [projectId]);

  const queueSave = useCallback(
    (getter: SnapshotGetter) => {
      if (!enabled) return;
      pending.current = getter;
      lastGetter.current = getter;
      setStatus('pending');
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), delay);
    },
    [enabled, delay, flush],
  );

  const retry = useCallback(() => {
    if (!pending.current && lastGetter.current) pending.current = lastGetter.current;
    void flush();
  }, [flush]);

  // Warn before leaving with unsaved changes; flush on unmount.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current || inFlight.current) {
        event.preventDefault();
        void flush();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      void flush();
    };
  }, [flush]);

  return { status, lastSavedAt, error, queueSave, flush, retry };
}
