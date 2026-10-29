const DAY_MS = 24 * 60 * 60 * 1000;

const shortDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const longDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(iso: string | null | undefined, withYear = false): string {
  const date = parse(iso);
  if (!date) return '—';
  return (withYear ? longDate : shortDate).format(date);
}

export function formatDateRange(start: string | null, end: string | null): string {
  const s = parse(start);
  const e = parse(end);
  if (!s || !e) return 'No dates yet';
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${sameYear ? shortDate.format(s) : longDate.format(s)} – ${longDate.format(e)}`;
}

export function daysBetween(start: string | null, end: string | null): number {
  const s = parse(start);
  const e = parse(end);
  if (!s || !e) return 0;
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / DAY_MS));
}

export function formatRelative(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return '';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), 'day');
  if (abs < 86400 * 365) return relative.format(Math.round(seconds / (86400 * 30)), 'month');
  return relative.format(Math.round(seconds / (86400 * 365)), 'year');
}

export function initials(name: string): string {
  const parts = name.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? '' : parts[0]?.charAt(1) ?? '';
  return `${first}${last}`.toUpperCase();
}

export function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
