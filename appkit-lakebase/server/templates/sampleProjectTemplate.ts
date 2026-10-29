import type { LinkDto, LinkType, ScheduleDto, TaskDto } from '../types/domain';

const DAY_MS = 24 * 60 * 60 * 1000;

interface PhaseSeed {
  id: string;
  text: string;
  items: ItemSeed[];
}

interface ItemSeed {
  id: string;
  text: string;
  /** Offset in days from the template anchor date. */
  offset: number;
  /** Length in days; 0 marks a milestone. */
  days: number;
  progress: number;
}

const PHASES: PhaseSeed[] = [
  {
    id: 'p1',
    text: 'Discovery & Planning',
    items: [
      { id: 't1', text: 'Stakeholder interviews', offset: 0, days: 4, progress: 100 },
      { id: 't2', text: 'Market & competitor research', offset: 2, days: 5, progress: 100 },
      { id: 't3', text: 'Requirements & scope definition', offset: 7, days: 4, progress: 90 },
      { id: 'm1', text: 'Scope sign-off', offset: 11, days: 0, progress: 0 },
    ],
  },
  {
    id: 'p2',
    text: 'Product Design',
    items: [
      { id: 't4', text: 'Information architecture', offset: 11, days: 4, progress: 75 },
      { id: 't5', text: 'Wireframes & prototypes', offset: 14, days: 6, progress: 50 },
      { id: 't6', text: 'Visual design system', offset: 18, days: 7, progress: 25 },
      { id: 'm2', text: 'Design approval', offset: 25, days: 0, progress: 0 },
    ],
  },
  {
    id: 'p3',
    text: 'Engineering',
    items: [
      { id: 't7', text: 'Backend services & REST API', offset: 21, days: 12, progress: 15 },
      { id: 't8', text: 'Frontend implementation', offset: 25, days: 14, progress: 5 },
      { id: 't9', text: 'Data pipeline & analytics', offset: 28, days: 8, progress: 0 },
      { id: 't10', text: 'System integration', offset: 39, days: 5, progress: 0 },
    ],
  },
  {
    id: 'p4',
    text: 'Launch',
    items: [
      { id: 't11', text: 'QA & regression testing', offset: 44, days: 6, progress: 0 },
      { id: 't12', text: 'User acceptance testing', offset: 50, days: 4, progress: 0 },
      { id: 't13', text: 'Marketing campaign prep', offset: 36, days: 14, progress: 0 },
      { id: 'm3', text: 'Go-live', offset: 54, days: 0, progress: 0 },
    ],
  },
];

const LINKS: Array<[string, string, LinkType?]> = [
  ['t1', 't3'],
  ['t2', 't3'],
  ['t3', 'm1'],
  ['m1', 't4'],
  ['t4', 't5'],
  ['t5', 't6'],
  ['t6', 'm2'],
  ['t5', 't7', 's2s'],
  ['m2', 't8'],
  ['t7', 't10'],
  ['t8', 't10'],
  ['t9', 't10'],
  ['t10', 't11'],
  ['t11', 't12'],
  ['t12', 'm3'],
  ['t13', 'm3'],
];

/** Monday of last week (UTC), so the demo shows a project already in flight. */
function anchorDate(now = new Date()): Date {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const weekday = new Date(today).getUTCDay();
  const toMonday = (weekday + 6) % 7;
  return new Date(today - (toMonday + 7) * DAY_MS);
}

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS);

/** Builds the "Product Launch" sample schedule used by the sample template. */
export function buildSampleSchedule(now = new Date()): ScheduleDto {
  const anchor = anchorDate(now);
  const tasks: TaskDto[] = [];
  let order = 0;

  for (const phase of PHASES) {
    const starts = phase.items.map((i) => i.offset);
    const ends = phase.items.map((i) => i.offset + i.days);
    const phaseStart = Math.min(...starts);
    const phaseEnd = Math.max(...ends);
    const work = phase.items.filter((i) => i.days > 0);
    const totalDays = work.reduce((sum, i) => sum + i.days, 0);
    const progress = totalDays
      ? Math.round(work.reduce((sum, i) => sum + i.progress * i.days, 0) / totalDays)
      : 0;

    tasks.push({
      id: phase.id,
      text: phase.text,
      start: addDays(anchor, phaseStart).toISOString(),
      end: addDays(anchor, phaseEnd).toISOString(),
      duration: phaseEnd - phaseStart,
      progress,
      type: 'summary',
      parent: null,
      open: true,
      sortOrder: order++,
    });

    for (const item of phase.items) {
      const start = addDays(anchor, item.offset);
      tasks.push({
        id: item.id,
        text: item.text,
        start: start.toISOString(),
        end: addDays(start, item.days).toISOString(),
        duration: item.days,
        progress: item.progress,
        type: item.days === 0 ? 'milestone' : 'task',
        parent: phase.id,
        open: true,
        sortOrder: order++,
      });
    }
  }

  const links: LinkDto[] = LINKS.map(([source, target, type], index) => ({
    id: `l${index + 1}`,
    source,
    target,
    type: type ?? 'e2s',
  }));

  return { tasks, links };
}
