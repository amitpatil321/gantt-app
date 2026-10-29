import type { ScheduleRepository } from '../repositories/scheduleRepository';
import type { CurrentUser, LinkDto, ScheduleDto, TaskDto } from '../types/domain';
import type { ProjectService } from './projectService';

/** Reads and persists the Gantt schedule (tasks + dependency links) of a project. */
export class ScheduleService {
  private readonly projects: ProjectService;
  private readonly schedules: ScheduleRepository;

  constructor(projects: ProjectService, schedules: ScheduleRepository) {
    this.projects = projects;
    this.schedules = schedules;
  }

  async get(user: CurrentUser, projectId: string): Promise<ScheduleDto> {
    await this.projects.getRow(user, projectId);
    return this.schedules.get(projectId);
  }

  async save(user: CurrentUser, projectId: string, schedule: ScheduleDto): Promise<{ savedAt: string }> {
    await this.projects.requireOwned(user, projectId, 'active');
    await this.schedules.replace(projectId, ScheduleService.sanitize(schedule));
    return { savedAt: new Date().toISOString() };
  }

  /** Removes duplicates, dangling parents and links that point at missing tasks. */
  static sanitize(schedule: ScheduleDto): ScheduleDto {
    const byId = new Map<string, TaskDto>();
    schedule.tasks.forEach((task) => byId.set(task.id, task));

    const tasks = [...byId.values()].map((task, index) => ({
      ...task,
      text: task.text.trim() || 'Untitled task',
      progress: Math.min(100, Math.max(0, Math.round(task.progress))),
      parent: task.parent && task.parent !== task.id && byId.has(task.parent) ? task.parent : null,
      sortOrder: Number.isFinite(task.sortOrder) ? task.sortOrder : index,
    }));

    const linkIds = new Set<string>();
    const links: LinkDto[] = [];
    for (const link of schedule.links) {
      if (linkIds.has(link.id) || link.source === link.target) continue;
      if (!byId.has(link.source) || !byId.has(link.target)) continue;
      linkIds.add(link.id);
      links.push(link);
    }

    return { tasks, links };
  }
}
