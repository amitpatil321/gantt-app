import type { Database } from '../db/database';
import type {
  CreateProjectInput,
  CurrentUser,
  ProjectCountsDto,
  ProjectRow,
  ProjectScope,
  UpdateProjectInput,
} from '../types/domain';

/** Project columns plus aggregated schedule statistics. */
const PROJECT_SELECT = `
  SELECT p.id, p.name, p.description, p.color, p.template,
         p.owner_email, p.owner_name, p.created_at, p.updated_at,
         p.deleted_at, p.deleted_by,
         COALESCE(s.task_count, 0)::int       AS task_count,
         COALESCE(s.milestone_count, 0)::int  AS milestone_count,
         COALESCE(s.avg_progress, 0)::int     AS avg_progress,
         s.start_date, s.end_date
  FROM app.gantt_projects p
  LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE t.type = 'task')      AS task_count,
           COUNT(*) FILTER (WHERE t.type = 'milestone') AS milestone_count,
           ROUND(AVG(t.progress) FILTER (WHERE t.type = 'task')) AS avg_progress,
           MIN(t.start_date) AS start_date,
           MAX(COALESCE(t.end_date, t.start_date)) AS end_date
    FROM app.gantt_tasks t
    WHERE t.project_id = p.id
  ) s ON TRUE`;

export interface ListProjectsQuery {
  scope: ProjectScope;
  ownerEmail: string;
  search?: string;
}

export class ProjectRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async list({ scope, ownerEmail, search }: ListProjectsQuery): Promise<ProjectRow[]> {
    const params: unknown[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    const where: string[] = [];
    if (scope === 'mine') {
      where.push(`p.owner_email = ${bind(ownerEmail)}`, 'p.deleted_at IS NULL');
    } else if (scope === 'trash') {
      where.push(`p.owner_email = ${bind(ownerEmail)}`, 'p.deleted_at IS NOT NULL');
    } else {
      where.push('p.deleted_at IS NULL');
    }
    if (search) {
      const term = bind(`%${search}%`);
      where.push(`(p.name ILIKE ${term} OR p.description ILIKE ${term} OR p.owner_email ILIKE ${term})`);
    }

    const orderBy = scope === 'trash' ? 'p.deleted_at DESC' : 'p.updated_at DESC';
    return this.db.many<ProjectRow>(
      `${PROJECT_SELECT} WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT 500`,
      params,
    );
  }

  async counts(ownerEmail: string): Promise<ProjectCountsDto> {
    const row = await this.db.one<{ mine: number; all_count: number; trash: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE owner_email = $1 AND deleted_at IS NULL)::int     AS mine,
         COUNT(*) FILTER (WHERE deleted_at IS NULL)::int                          AS all_count,
         COUNT(*) FILTER (WHERE owner_email = $1 AND deleted_at IS NOT NULL)::int AS trash
       FROM app.gantt_projects`,
      [ownerEmail],
    );
    return { mine: row?.mine ?? 0, all: row?.all_count ?? 0, trash: row?.trash ?? 0 };
  }

  async findById(id: string): Promise<ProjectRow | null> {
    return this.db.one<ProjectRow>(`${PROJECT_SELECT} WHERE p.id = $1::uuid`, [id]);
  }

  async create(input: CreateProjectInput, owner: CurrentUser): Promise<string> {
    const row = await this.db.one<{ id: string }>(
      `INSERT INTO app.gantt_projects (name, description, color, template, owner_email, owner_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [input.name, input.description, input.color, input.template, owner.email, owner.name],
    );
    if (!row) throw new Error('Failed to create project');
    return row.id;
  }

  async update(id: string, patch: UpdateProjectInput): Promise<void> {
    const params: unknown[] = [id];
    const sets: string[] = ['updated_at = NOW()'];
    for (const key of ['name', 'description', 'color'] as const) {
      const value = patch[key];
      if (value !== undefined) {
        params.push(value);
        sets.push(`${key} = $${params.length}`);
      }
    }
    await this.db.many(`UPDATE app.gantt_projects SET ${sets.join(', ')} WHERE id = $1::uuid`, params);
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.db.many(
      `UPDATE app.gantt_projects SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1::uuid`,
      [id, deletedBy],
    );
  }

  async restore(id: string): Promise<void> {
    await this.db.many(
      `UPDATE app.gantt_projects SET deleted_at = NULL, deleted_by = NULL, updated_at = NOW() WHERE id = $1::uuid`,
      [id],
    );
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.many(`DELETE FROM app.gantt_projects WHERE id = $1::uuid`, [id]);
  }
}
