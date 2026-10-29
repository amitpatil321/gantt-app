import type { ProjectRepository } from '../repositories/projectRepository';
import type { ScheduleRepository } from '../repositories/scheduleRepository';
import { buildSampleSchedule } from '../templates/sampleProjectTemplate';
import type {
  CreateProjectInput,
  CurrentUser,
  ProjectCountsDto,
  ProjectDto,
  ProjectRow,
  ProjectScope,
  UpdateProjectInput,
} from '../types/domain';
import { HttpError } from '../utils/httpError';

const iso = (value: Date | string | null): string | null =>
  value === null ? null : new Date(value).toISOString();

/** Business rules for projects: ownership, trash lifecycle and templates. */
export class ProjectService {
  private readonly projects: ProjectRepository;
  private readonly schedules: ScheduleRepository;

  constructor(projects: ProjectRepository, schedules: ScheduleRepository) {
    this.projects = projects;
    this.schedules = schedules;
  }

  toDto(row: ProjectRow, user: CurrentUser): ProjectDto {
    const isOwner = row.owner_email.toLowerCase() === user.email;
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      color: row.color,
      template: row.template,
      owner: { email: row.owner_email, name: row.owner_name ?? row.owner_email },
      createdAt: iso(row.created_at) ?? '',
      updatedAt: iso(row.updated_at) ?? '',
      deletedAt: iso(row.deleted_at),
      deletedBy: row.deleted_by,
      stats: {
        taskCount: Number(row.task_count) || 0,
        milestoneCount: Number(row.milestone_count) || 0,
        progress: Number(row.avg_progress) || 0,
        startDate: iso(row.start_date),
        endDate: iso(row.end_date),
      },
      permissions: { isOwner, canEdit: isOwner && row.deleted_at === null },
    };
  }

  async list(user: CurrentUser, scope: ProjectScope, search?: string): Promise<ProjectDto[]> {
    const rows = await this.projects.list({ scope, ownerEmail: user.email, search });
    return rows.map((row) => this.toDto(row, user));
  }

  counts(user: CurrentUser): Promise<ProjectCountsDto> {
    return this.projects.counts(user.email);
  }

  /** Loads a project visible to the user. Trashed projects are only visible to their owner. */
  async getRow(user: CurrentUser, id: string): Promise<ProjectRow> {
    const row = await this.projects.findById(id);
    if (!row) throw HttpError.notFound('Project not found');
    if (row.deleted_at !== null && row.owner_email.toLowerCase() !== user.email) {
      throw HttpError.notFound('Project not found');
    }
    return row;
  }

  async get(user: CurrentUser, id: string): Promise<ProjectDto> {
    return this.toDto(await this.getRow(user, id), user);
  }

  /** Ensures the user owns the project; optionally asserts its trash state. */
  async requireOwned(
    user: CurrentUser,
    id: string,
    state: 'active' | 'trashed' | 'any' = 'active',
  ): Promise<ProjectRow> {
    const row = await this.getRow(user, id);
    if (row.owner_email.toLowerCase() !== user.email) {
      throw HttpError.forbidden('Only the project owner can modify this project');
    }
    if (state === 'active' && row.deleted_at !== null) {
      throw HttpError.conflict('Project is in the trash. Restore it first.');
    }
    if (state === 'trashed' && row.deleted_at === null) {
      throw HttpError.conflict('Project must be moved to trash before it can be deleted permanently');
    }
    return row;
  }

  async create(user: CurrentUser, input: CreateProjectInput): Promise<ProjectDto> {
    const id = await this.projects.create(input, user);
    if (input.template === 'sample') {
      await this.schedules.replace(id, buildSampleSchedule());
    }
    return this.get(user, id);
  }

  async update(user: CurrentUser, id: string, patch: UpdateProjectInput): Promise<ProjectDto> {
    await this.requireOwned(user, id, 'active');
    await this.projects.update(id, patch);
    return this.get(user, id);
  }

  async trash(user: CurrentUser, id: string): Promise<ProjectDto> {
    await this.requireOwned(user, id, 'active');
    await this.projects.softDelete(id, user.email);
    return this.get(user, id);
  }

  async restore(user: CurrentUser, id: string): Promise<ProjectDto> {
    await this.requireOwned(user, id, 'trashed');
    await this.projects.restore(id);
    return this.get(user, id);
  }

  /** Creates a copy of any visible project (and its schedule) owned by the current user. */
  async copy(user: CurrentUser, id: string): Promise<ProjectDto> {
    const source = await this.getRow(user, id);
    const schedule = await this.schedules.get(id);
    const name = `${source.name} (copy)`.slice(0, 120);
    const newId = await this.projects.create(
      { name, description: source.description ?? '', color: source.color, template: 'blank' },
      user,
    );
    await this.schedules.replace(newId, schedule);
    return this.get(user, newId);
  }

  async destroy(user: CurrentUser, id: string): Promise<void> {
    await this.requireOwned(user, id, 'trashed');
    await this.projects.hardDelete(id);
  }
}
