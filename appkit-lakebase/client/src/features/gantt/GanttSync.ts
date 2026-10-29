import type { Schedule, ScheduleLink } from '@/types';
import { fromSvarLink, fromSvarTasks } from './ganttAdapter';

type GanttEvent = Record<string, unknown>;
type Rec = Record<string, unknown>;

/** The subset of the SVAR Gantt API (`init={(api) => ...}`) used for persistence. */
export interface SvarGanttApi {
  on(event: string, handler: (ev: GanttEvent) => void): void;
  getTask?(id: unknown): unknown;
  serialize?(): unknown;
}

const asRecord = (value: unknown): Rec => (value && typeof value === 'object' ? (value as Rec) : {});

/**
 * Listens to SVAR Gantt data events and can produce a full schedule snapshot
 * at any time. The snapshot is what gets PUT to the REST API on autosave.
 */
export class GanttSync {
  private readonly api: SvarGanttApi;
  private readonly onChange: () => void;
  private readonly tasks = new Map<string, Rec>();
  private readonly links = new Map<string, ScheduleLink>();

  constructor(api: SvarGanttApi, initial: Schedule, onChange: () => void) {
    this.api = api;
    this.onChange = onChange;
    initial.tasks.forEach((t) => this.tasks.set(t.id, { ...t }));
    initial.links.forEach((l) => this.links.set(l.id, l));
    this.listen();
  }

  private listen() {
    const changed = (ev: GanttEvent) => {
      if (ev.inProgress) return; // ignore intermediate drag frames
      this.onChange();
    };

    this.api.on('add-task', (ev) => {
      this.trackTask(ev.id, ev.task);
      changed(ev);
    });
    this.api.on('update-task', (ev) => {
      this.trackTask(ev.id, ev.task);
      changed(ev);
    });
    for (const name of ['move-task', 'copy-task', 'indent-task', 'open-task']) {
      this.api.on(name, (ev) => {
        this.trackTask(ev.id);
        changed(ev);
      });
    }
    this.api.on('delete-task', (ev) => {
      this.removeTask(ev.id);
      changed(ev);
    });
    this.api.on('add-link', (ev) => {
      this.trackLink(ev.id, ev.link);
      changed(ev);
    });
    this.api.on('update-link', (ev) => {
      this.trackLink(ev.id, ev.link);
      changed(ev);
    });
    this.api.on('delete-link', (ev) => {
      this.links.delete(String(ev.id));
      changed(ev);
    });
  }

  private trackTask(id: unknown, partial?: unknown) {
    if (id === undefined || id === null) return;
    const key = String(id);
    const live = this.api.getTask ? this.api.getTask(id) : undefined;
    this.tasks.set(key, { ...(this.tasks.get(key) ?? {}), ...asRecord(partial), ...asRecord(live), id });
  }

  private removeTask(id: unknown) {
    if (id === undefined || id === null) return;
    const doomed = new Set<string>([String(id)]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const [key, task] of this.tasks) {
        const parent = task.parent;
        if (!doomed.has(key) && parent !== undefined && parent !== null && doomed.has(String(parent))) {
          doomed.add(key);
          grew = true;
        }
      }
    }
    doomed.forEach((key) => this.tasks.delete(key));
  }

  private trackLink(id: unknown, raw: unknown) {
    const link = fromSvarLink(id, raw);
    if (link) this.links.set(link.id, link);
  }

  /** Prefers the Gantt's own serializer (preserves tree order); falls back to tracked state. */
  private rawTasks(): unknown[] {
    if (typeof this.api.serialize === 'function') {
      try {
        const out = this.api.serialize();
        if (Array.isArray(out)) return out;
        const tasks = asRecord(out).tasks;
        if (Array.isArray(tasks)) return tasks;
      } catch (err) {
        console.warn('[gantt] serialize() failed, using tracked state', err);
      }
    }
    return [...this.tasks.values()];
  }

  snapshot(): Schedule {
    const tasks = fromSvarTasks(this.rawTasks());
    const ids = new Set(tasks.map((t) => t.id));
    const links = [...this.links.values()].filter((l) => ids.has(l.source) && ids.has(l.target));
    return { tasks, links };
  }
}
