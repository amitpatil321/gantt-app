import type { Request, Response } from 'express';
import { getCurrentUser } from '../middleware/currentUser';
import type { ScheduleService } from '../services/scheduleService';
import { parseBody, parseProjectId, saveScheduleSchema } from '../validators/projectValidators';

/** HTTP layer for /api/projects/:id/schedule. */
export class ScheduleController {
  private readonly service: ScheduleService;

  constructor(service: ScheduleService) {
    this.service = service;
  }

  get = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.get(getCurrentUser(res), parseProjectId(req.params.id)));
  };

  save = async (req: Request, res: Response): Promise<void> => {
    const schedule = parseBody(saveScheduleSchema, req.body);
    res.json(await this.service.save(getCurrentUser(res), parseProjectId(req.params.id), schedule));
  };
}
