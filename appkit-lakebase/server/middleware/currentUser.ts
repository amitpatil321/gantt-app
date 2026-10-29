import type { NextFunction, Request, Response } from 'express';
import type { CurrentUser } from '../types/domain';
import { HttpError } from '../utils/httpError';

/**
 * Databricks Apps forwards the signed-in user's identity via these headers.
 * See: https://docs.databricks.com/aws/en/dev-tools/databricks-apps/http-headers
 */
const EMAIL_HEADER = 'x-forwarded-email';
const USERNAME_HEADER = 'x-forwarded-preferred-username';

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  const first = Array.isArray(value) ? value[0] : value;
  return first && first.trim() ? first.trim() : undefined;
}

function toDisplayName(identifier: string): string {
  const local = identifier.split('@')[0] ?? identifier;
  const words = local
    .replace(/[0-9]+/g, ' ')
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.length > 0 ? words.join(' ') : identifier;
}

export function resolveCurrentUser(req: Request): CurrentUser {
  const email =
    header(req, EMAIL_HEADER) ??
    (process.env.NODE_ENV !== 'production' ? process.env.DEV_USER_EMAIL ?? 'developer@local.dev' : undefined);
  if (!email) {
    throw new HttpError(401, 'Unable to resolve the signed-in user');
  }
  const username = header(req, USERNAME_HEADER) ?? email;
  return { email: email.toLowerCase(), username, name: toDisplayName(username) };
}

/** Attaches the signed-in user to `res.locals.currentUser` for every API request. */
export function currentUserMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    res.locals.currentUser = resolveCurrentUser(req);
    next();
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 401;
    res.status(status).json({ error: (err as Error).message });
  }
}

export function getCurrentUser(res: Response): CurrentUser {
  const user = res.locals.currentUser as CurrentUser | undefined;
  if (!user) throw new HttpError(401, 'Not authenticated');
  return user;
}
