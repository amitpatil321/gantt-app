import type { ProjectScope } from '@/types';

export const APP_NAME = 'Timeline Studio 2';

export const PROJECT_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#0ea5e9',
  '#64748b',
] as const;

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];

export const SCOPE_META: Record<ProjectScope, { label: string; empty: string; emptyHint: string }> = {
  mine: {
    label: 'My projects',
    empty: 'You have not created any projects yet',
    emptyHint: 'Start from a blank canvas or explore the sample product launch plan.',
  },
  all: {
    label: 'All projects',
    empty: 'No projects in this workspace yet',
    emptyHint: 'Be the first one to plan something great.',
  },
  trash: {
    label: 'Trash',
    empty: 'Trash is empty',
    emptyHint: 'Projects you delete show up here. You can restore them at any time.',
  },
};

export const SCOPES: ProjectScope[] = ['mine', 'all', 'trash'];
