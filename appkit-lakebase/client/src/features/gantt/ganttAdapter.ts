import type { LinkType, ScheduleLink, ScheduleStats, ScheduleTask, TaskType } from '@/types';

/**
 * Converters between the REST schedule DTOs and the data shape used by
 * SVAR React Gantt (https://docs.svar.dev/react/gantt/).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SvarTask {
  id: string | number;
  text: string;
  start: Date;
  end: Date;
  duration: number;
  progress: number;
  type: TaskType;
  parent?: string | number;
  open?: boolean;
}

export interface SvarLink {
  id: string | number;
  source: string | number;
  target: string | number;
  type: LinkType;
}

type Rec = Record<string, unknown>;
const asRecord = (value: unknown): Rec => (value && typeof value === 'object' ? (value as Rec) : {});

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function toTaskType(value: unknown): TaskType {
  return value === 'summary' || value === 'milestone' ? value : 'task';
}

function toLinkType(value: unknown): LinkType {
  return value === 's2s' || value === 'e2e' || value === 's2e' ? value : 'e2s';
}

function toParent(value: unknown): string | null {
  if (value === undefined || value === null || value === 0 || value === '0' || value === '') return null;
  return String(value);
}

const clampProgress = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function toSvarTasks(tasks: ScheduleTask[]): SvarTask[] {
  return [...tasks]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => {
      const start = t.start ? new Date(t.start) : startOfToday();
      const end = t.end ? new Date(t.end) : new Date(start.getTime() + (t.duration ?? 1) * DAY_MS);
      const duration = t.duration ?? Math.max(0, Math.round((end.getTime() - start.getTime()) / DAY_MS));
      const task: SvarTask = {
        id: t.id,
        text: t.text,
        start,
        end,
        duration,
        progress: t.progress,
        type: t.type,
        open: t.open,
      };
      if (t.parent) task.parent = t.parent;
      return task;
    });
}

export function toSvarLinks(links: ScheduleLink[]): SvarLink[] {
  return links.map((l) => ({ id: l.id, source: l.source, target: l.target, type: l.type }));
}

/** Normalizes tasks read back from the Gantt API into REST DTOs. */
export function fromSvarTasks(raw: unknown[]): ScheduleTask[] {
  return raw
    .map(asRecord)
    .filter((t) => t.id !== undefined && t.id !== null)
    .map((t, index) => {
      const start = toIso(t.start);
      const duration = typeof t.duration === 'number' && Number.isFinite(t.duration) ? t.duration : null;
      let end = toIso(t.end);
      if (!end && start && duration !== null) {
        end = new Date(new Date(start).getTime() + duration * DAY_MS).toISOString();
      }
      const progress = Number(t.progress ?? 0);
      return {
        id: String(t.id),
        text: (typeof t.text === 'string' ? t.text : String(t.text ?? '')).slice(0, 500),
        start,
        end,
        duration,
        progress: clampProgress(Number.isFinite(progress) ? progress : 0),
        type: toTaskType(t.type),
        parent: toParent(t.parent),
        open: t.open !== false,
        sortOrder: index,
      };
    });
}

export function fromSvarLink(id: unknown, raw: unknown): ScheduleLink | null {
  const l = asRecord(raw);
  const linkId = id ?? l.id;
  if (linkId === undefined || linkId === null || l.source === undefined || l.target === undefined) return null;
  return { id: String(linkId), source: String(l.source), target: String(l.target), type: toLinkType(l.type) };
}

/** Live statistics shown in the project header. */
export function computeStats(tasks: ScheduleTask[]): ScheduleStats {
  const work = tasks.filter((t) => t.type === 'task');
  const milestones = tasks.filter((t) => t.type === 'milestone');
  const progress = work.length ? Math.round(work.reduce((sum, t) => sum + t.progress, 0) / work.length) : 0;
  const starts = tasks.map((t) => t.start).filter((v): v is string => Boolean(v)).sort();
  const ends = tasks.map((t) => t.end ?? t.start).filter((v): v is string => Boolean(v)).sort();
  return {
    taskCount: work.length,
    milestoneCount: milestones.length,
    progress,
    startDate: starts[0] ?? null,
    endDate: ends[ends.length - 1] ?? null,
  };
}
