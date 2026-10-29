import { ProjectController } from '../controllers/projectController';
import { ScheduleController } from '../controllers/scheduleController';
import { UserController } from '../controllers/userController';
import { Database } from '../db/database';
import { runMigrations } from '../db/migrations';
import { ProjectRepository } from '../repositories/projectRepository';
import { ScheduleRepository } from '../repositories/scheduleRepository';
import { registerRoutes } from '../routes';
import { ProjectService } from '../services/projectService';
import { ScheduleService } from '../services/scheduleService';
import type { AppKitInstance } from '../types/appkit';

/** Composition root: wires repositories -> services -> controllers -> routes. */
export async function bootstrap(appkit: AppKitInstance): Promise<void> {
  const db = new Database(appkit.lakebase);

  try {
    await runMigrations(db);
  } catch (err) {
    console.error('[db] Migration failed:', (err as Error).message);
    console.error('[db] API routes are registered but database calls may fail.');
  }

  const projectRepository = new ProjectRepository(db);
  const scheduleRepository = new ScheduleRepository(db);
  const projectService = new ProjectService(projectRepository, scheduleRepository);
  const scheduleService = new ScheduleService(projectService, scheduleRepository);

  appkit.server.extend((app) => {
    registerRoutes(app, {
      users: new UserController(),
      projects: new ProjectController(projectService),
      schedules: new ScheduleController(scheduleService),
    });
  });
}
