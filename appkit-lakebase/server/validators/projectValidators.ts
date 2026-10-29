import { z } from 'zod';
import type { ProjectScope } from '../types/domain';
import { HttpError } from '../utils/httpError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(1000).default(''),
  color: z.string().regex(HEX_COLOR_RE, 'Color must be a hex value').default('#6366f1'),
  template: z.enum(['blank', 'sample']).default('blank'),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    color: z.string().regex(HEX_COLOR_RE).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const taskSchema = z.object({
  id: z.string().min(1).max(120),
  text: z.string().max(500),
  start: z.string().nullable(),
  end: z.string().nullable(),
  duration: z.number().nullable(),
  progress: z.number().min(0).max(100),
  type: z.enum(['task', 'summary', 'milestone']),
  parent: z.string().max(120).nullable(),
  open: z.boolean(),
  sortOrder: z.number().int(),
});

const linkSchema = z.object({
  id: z.string().min(1).max(120),
  source: z.string().min(1).max(120),
  target: z.string().min(1).max(120),
  type: z.enum(['e2s', 's2s', 'e2e', 's2e']),
});

export const saveScheduleSchema = z.object({
  tasks: z.array(taskSchema).max(2000),
  links: z.array(linkSchema).max(5000),
});

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw HttpError.badRequest('Invalid request body', parsed.error.issues);
  }
  return parsed.data;
}

export function parseProjectId(value: unknown): string {
  const id = typeof value === 'string' ? value : '';
  if (!UUID_RE.test(id)) throw HttpError.badRequest('Invalid project id');
  return id;
}

export function parseScope(value: unknown): ProjectScope {
  return value === 'mine' || value === 'trash' ? value : 'all';
}

export function parseSearch(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : undefined;
}
