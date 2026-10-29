/** Shared domain types for the Gantt REST API. */

export type ProjectScope = 'mine' | 'all' | 'trash';
export type ProjectTemplate = 'blank' | 'sample';
export type TaskType = 'task' | 'summary' | 'milestone';
export type LinkType = 'e2s' | 's2s' | 'e2e' | 's2e';

export interface CurrentUser {
  email: string;
  name: string;
  username: string;
}

/** Raw row returned by project queries. */
export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  template: ProjectTemplate;
  owner_email: string;
  owner_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
  deleted_by: string | null;
  task_count: number;
  milestone_count: number;
  avg_progress: number;
  start_date: Date | string | null;
  end_date: Date | string | null;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string;
  color: string;
  template: ProjectTemplate;
  owner: { email: string; name: string };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  stats: {
    taskCount: number;
    milestoneCount: number;
    progress: number;
    startDate: string | null;
    endDate: string | null;
  };
  permissions: { isOwner: boolean; canEdit: boolean };
}

export interface ProjectCountsDto {
  mine: number;
  all: number;
  trash: number;
}

export interface TaskDto {
  id: string;
  text: string;
  start: string | null;
  end: string | null;
  duration: number | null;
  progress: number;
  type: TaskType;
  parent: string | null;
  open: boolean;
  sortOrder: number;
}

export interface LinkDto {
  id: string;
  source: string;
  target: string;
  type: LinkType;
}

export interface ScheduleDto {
  tasks: TaskDto[];
  links: LinkDto[];
}

export interface CreateProjectInput {
  name: string;
  description: string;
  color: string;
  template: ProjectTemplate;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
}
