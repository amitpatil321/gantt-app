import type { Request, Response } from 'express';
import { getCurrentUser } from '../middleware/currentUser';
import type { ProjectService } from '../services/projectService';
import {
  createProjectSchema,
  parseBody,
  parseProjectId,
  parseScope,
  parseSearch,
  updateProjectSchema,
} from '../validators/projectValidators';

/** HTTP layer for /api/projects: parses input, delegates to the service, shapes responses. */
export class ProjectController {
  private readonly service: ProjectService;

  constructor(service: ProjectService) {
    this.service = service;
  }

  list = async (req: Request, res: Response): Promise<void> => {
    const user = getCurrentUser(res);
    const projects = await this.service.list(user, parseScope(req.query.scope), parseSearch(req.query.search));
    res.json({ items: projects });
  };

  counts = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.service.counts(getCurrentUser(res)));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.get(getCurrentUser(res), parseProjectId(req.params.id)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = parseBody(createProjectSchema, req.body);
    const project = await this.service.create(getCurrentUser(res), input);
    res.status(201).json(project);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const patch = parseBody(updateProjectSchema, req.body);
    res.json(await this.service.update(getCurrentUser(res), parseProjectId(req.params.id), patch));
  };

  trash = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.trash(getCurrentUser(res), parseProjectId(req.params.id)));
  };

  restore = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.service.restore(getCurrentUser(res), parseProjectId(req.params.id)));
  };

  copy = async (req: Request, res: Response): Promise<void> => {
    const project = await this.service.copy(getCurrentUser(res), parseProjectId(req.params.id));
    res.status(201).json(project);
  };

  destroy = async (req: Request, res: Response): Promise<void> => {
    await this.service.destroy(getCurrentUser(res), parseProjectId(req.params.id));
    res.status(204).send();
  };
}
