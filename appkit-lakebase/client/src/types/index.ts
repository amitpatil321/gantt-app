/** Client-side domain types (mirror the REST API contracts in server/types/domain.ts). */

export type ProjectScope = 'mine' | 'all' | 'trash';
export type ProjectTemplate = 'blank' | 'sample';
export type TaskType = 'task' | 'summary' | 'milestone';
export type LinkType = 'e2s' | 's2s' | 'e2e' | 's2e';
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
export type ZoomLevel = 'day' | 'week' | 'month' | 'quarter';

export interface CurrentUser {
  email: string;
  name: string;
  username: string;
}

export interface ScheduleStats {
  taskCount: number;
  milestoneCount: number;
  progress: number;
  startDate: string | null;
  endDate: string | null;
}

export interface Project {
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
  stats: ScheduleStats;
  permissions: { isOwner: boolean; canEdit: boolean };
}

export interface ProjectCounts {
  mine: number;
  all: number;
  trash: number;
}

export interface ScheduleTask {
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

export interface ScheduleLink {
  id: string;
  source: string;
  target: string;
  type: LinkType;
}

export interface Schedule {
  tasks: ScheduleTask[];
  links: ScheduleLink[];
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
