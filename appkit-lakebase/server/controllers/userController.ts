import type { Request, Response } from 'express';
import { getCurrentUser } from '../middleware/currentUser';

/** HTTP layer for /api/me: returns the Databricks user signed in to the app. */
export class UserController {
  me = async (_req: Request, res: Response): Promise<void> => {
    res.json(getCurrentUser(res));
  };
}
