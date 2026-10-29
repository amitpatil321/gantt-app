import type { Application } from 'express';
import type { ProjectController } from '../controllers/projectController';
import type { ScheduleController } from '../controllers/scheduleController';
import type { UserController } from '../controllers/userController';
import { currentUserMiddleware } from '../middleware/currentUser';
import { asyncHandler } from '../utils/asyncHandler';

export interface Controllers {
  users: UserController;
  projects: ProjectController;
  schedules: ScheduleController;
}

/**
 * REST API surface:
 *   GET    /api/me
 *   GET    /api/projects?scope=mine|all|trash&search=
 *   GET    /api/projects/counts
 *   POST   /api/projects
 *   GET    /api/projects/:id
 *   PATCH  /api/projects/:id
 *   DELETE /api/projects/:id              (move to trash)
 *   POST   /api/projects/:id/restore
 *   POST   /api/projects/:id/copy         (duplicate into the caller's projects)
 *   DELETE /api/projects/:id/permanent
 *   GET    /api/projects/:id/schedule
 *   PUT    /api/projects/:id/schedule
 */
export function registerRoutes(app: Application, { users, projects, schedules }: Controllers): void {
  app.use('/api', currentUserMiddleware);

  app.get('/api/me', asyncHandler(users.me));

  app.get('/api/projects', asyncHandler(projects.list));
  app.get('/api/projects/counts', asyncHandler(projects.counts));
  app.post('/api/projects', asyncHandler(projects.create));
  app.get('/api/projects/:id', asyncHandler(projects.get));
  app.patch('/api/projects/:id', asyncHandler(projects.update));
  app.delete('/api/projects/:id', asyncHandler(projects.trash));
  app.post('/api/projects/:id/restore', asyncHandler(projects.restore));
  app.post('/api/projects/:id/copy', asyncHandler(projects.copy));
  app.delete('/api/projects/:id/permanent', asyncHandler(projects.destroy));

  app.get('/api/projects/:id/schedule', asyncHandler(schedules.get));
  app.put('/api/projects/:id/schedule', asyncHandler(schedules.save));
}
