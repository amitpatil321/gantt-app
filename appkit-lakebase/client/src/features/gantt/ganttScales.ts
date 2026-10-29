import type { ZoomLevel } from '@/types';

/** Timeline scale presets for the SVAR Gantt `scales` prop. */

export interface ScaleConfig {
  unit: 'year' | 'quarter' | 'month' | 'week' | 'day';
  step: number;
  format: (date: Date) => string;
}

export interface ZoomPreset {
  label: string;
  cellWidth: number;
  scales: ScaleConfig[];
}

const formatter = (options: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat(undefined, options);
  return (date: Date) => f.format(date);
};

const monthYear = formatter({ month: 'long', year: 'numeric' });
const dayNum = formatter({ day: 'numeric' });
const dayMonth = formatter({ month: 'short', day: 'numeric' });
const shortMonth = formatter({ month: 'short' });
const year = formatter({ year: 'numeric' });

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export const ZOOM_PRESETS: Record<ZoomLevel, ZoomPreset> = {
  day: {
    label: 'Day',
    cellWidth: 40,
    scales: [
      { unit: 'month', step: 1, format: monthYear },
      { unit: 'day', step: 1, format: dayNum },
    ],
  },
  week: {
    label: 'Week',
    cellWidth: 96,
    scales: [
      { unit: 'month', step: 1, format: monthYear },
      { unit: 'week', step: 1, format: (d) => `W${isoWeek(d)} · ${dayMonth(d)}` },
    ],
  },
  month: {
    label: 'Month',
    cellWidth: 120,
    scales: [
      { unit: 'year', step: 1, format: year },
      { unit: 'month', step: 1, format: shortMonth },
    ],
  },
  quarter: {
    label: 'Quarter',
    cellWidth: 160,
    scales: [
      { unit: 'year', step: 1, format: year },
      { unit: 'quarter', step: 1, format: (d) => `Q${Math.floor(d.getMonth() / 3) + 1}` },
    ],
  },
};

export const ZOOM_LEVELS: ZoomLevel[] = ['day', 'week', 'month', 'quarter'];
