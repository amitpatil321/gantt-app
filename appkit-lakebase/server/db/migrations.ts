import type { Database } from './database';

/** Idempotent schema setup, executed once on server start. */
const MIGRATIONS: string[] = [
  `CREATE SCHEMA IF NOT EXISTS app`,
  `CREATE TABLE IF NOT EXISTS app.gantt_projects (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     description TEXT NOT NULL DEFAULT '',
     color TEXT NOT NULL DEFAULT '#6366f1',
     template TEXT NOT NULL DEFAULT 'blank',
     owner_email TEXT NOT NULL,
     owner_name TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     deleted_at TIMESTAMPTZ,
     deleted_by TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS gantt_projects_owner_idx ON app.gantt_projects (owner_email)`,
  `CREATE TABLE IF NOT EXISTS app.gantt_tasks (
     row_id BIGSERIAL PRIMARY KEY,
     project_id UUID NOT NULL REFERENCES app.gantt_projects(id) ON DELETE CASCADE,
     task_id TEXT NOT NULL,
     title TEXT NOT NULL DEFAULT '',
     start_date TIMESTAMPTZ,
     end_date TIMESTAMPTZ,
     duration DOUBLE PRECISION,
     progress DOUBLE PRECISION NOT NULL DEFAULT 0,
     type TEXT NOT NULL DEFAULT 'task',
     parent_id TEXT,
     is_open BOOLEAN NOT NULL DEFAULT TRUE,
     sort_order INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE INDEX IF NOT EXISTS gantt_tasks_project_idx ON app.gantt_tasks (project_id)`,
  `CREATE TABLE IF NOT EXISTS app.gantt_links (
     row_id BIGSERIAL PRIMARY KEY,
     project_id UUID NOT NULL REFERENCES app.gantt_projects(id) ON DELETE CASCADE,
     link_id TEXT NOT NULL,
     source TEXT NOT NULL,
     target TEXT NOT NULL,
     type TEXT NOT NULL DEFAULT 'e2s'
   )`,
  `CREATE INDEX IF NOT EXISTS gantt_links_project_idx ON app.gantt_links (project_id)`,
];

export async function runMigrations(db: Database): Promise<void> {
  for (const statement of MIGRATIONS) {
    await db.many(statement);
  }
  console.log('[db] Gantt schema is ready');
}
