import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './httpError';

type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>;

export function sendError(err: unknown, res: Response): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  console.error('[api] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

/** Wraps an async controller method so rejected promises become JSON error responses. */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, _next: NextFunction): void => {
    handler(req, res).catch((err: unknown) => sendError(err, res));
  };
}
