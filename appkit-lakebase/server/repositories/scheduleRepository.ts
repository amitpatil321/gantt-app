import type { Database } from '../db/database';
import type { LinkDto, LinkType, ScheduleDto, TaskDto, TaskType } from '../types/domain';

interface TaskRow {
  task_id: string;
  title: string;
  start_date: Date | string | null;
  end_date: Date | string | null;
  duration: number | null;
  progress: number;
  type: TaskType;
  parent_id: string | null;
  is_open: boolean;
  sort_order: number;
}

interface LinkRow {
  link_id: string;
  source: string;
  target: string;
  type: LinkType;
}

const toIso = (value: Date | string | null): string | null =>
  value === null ? null : new Date(value).toISOString();

/**
 * Replaces a project's full schedule (tasks + links) in a single atomic statement
 * using data-modifying CTEs, then bumps the project's `updated_at`.
 */
const REPLACE_SCHEDULE_SQL = `
  WITH del_links AS (
    DELETE FROM app.gantt_links WHERE project_id = $1::uuid
  ),
  del_tasks AS (
    DELETE FROM app.gantt_tasks WHERE project_id = $1::uuid
  ),
  ins_tasks AS (
    INSERT INTO app.gantt_tasks
      (project_id, task_id, title, start_date, end_date, duration, progress, type, parent_id, is_open, sort_order)
    SELECT $1::uuid, t.task_id, t.title, t.start_date, t.end_date, t.duration, t.progress,
           t.type, t.parent_id, t.is_open, t.sort_order
    FROM jsonb_to_recordset($2::jsonb) AS t(
      task_id TEXT, title TEXT, start_date TIMESTAMPTZ, end_date TIMESTAMPTZ,
      duration DOUBLE PRECISION, progress DOUBLE PRECISION, type TEXT,
      parent_id TEXT, is_open BOOLEAN, sort_order INTEGER
    )
    RETURNING 1
  ),
  ins_links AS (
    INSERT INTO app.gantt_links (project_id, link_id, source, target, type)
    SELECT $1::uuid, l.link_id, l.source, l.target, l.type
    FROM jsonb_to_recordset($3::jsonb) AS l(link_id TEXT, source TEXT, target TEXT, type TEXT)
    RETURNING 1
  )
  UPDATE app.gantt_projects
     SET updated_at = NOW()
   WHERE id = $1::uuid`;

export class ScheduleRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async get(projectId: string): Promise<ScheduleDto> {
    const [taskRows, linkRows] = await Promise.all([
      this.db.many<TaskRow>(
        `SELECT task_id, title, start_date, end_date, duration, progress, type, parent_id, is_open, sort_order
         FROM app.gantt_tasks WHERE project_id = $1::uuid ORDER BY sort_order, row_id`,
        [projectId],
      ),
      this.db.many<LinkRow>(
        `SELECT link_id, source, target, type FROM app.gantt_links WHERE project_id = $1::uuid ORDER BY row_id`,
        [projectId],
      ),
    ]);

    const tasks: TaskDto[] = taskRows.map((r) => ({
      id: r.task_id,
      text: r.title,
      start: toIso(r.start_date),
      end: toIso(r.end_date),
      duration: r.duration === null ? null : Number(r.duration),
      progress: Number(r.progress),
      type: r.type,
      parent: r.parent_id,
      open: r.is_open,
      sortOrder: r.sort_order,
    }));
    const links: LinkDto[] = linkRows.map((r) => ({
      id: r.link_id,
      source: r.source,
      target: r.target,
      type: r.type,
    }));
    return { tasks, links };
  }

  async replace(projectId: string, schedule: ScheduleDto): Promise<void> {
    const taskJson = schedule.tasks.map((t) => ({
      task_id: t.id,
      title: t.text,
      start_date: t.start,
      end_date: t.end,
      duration: t.duration,
      progress: t.progress,
      type: t.type,
      parent_id: t.parent,
      is_open: t.open,
      sort_order: t.sortOrder,
    }));
    const linkJson = schedule.links.map((l) => ({
      link_id: l.id,
      source: l.source,
      target: l.target,
      type: l.type,
    }));
    await this.db.many(REPLACE_SCHEDULE_SQL, [projectId, JSON.stringify(taskJson), JSON.stringify(linkJson)]);
  }
}
