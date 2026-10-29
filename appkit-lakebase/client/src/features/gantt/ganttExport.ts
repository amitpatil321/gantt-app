import type { Project, Schedule } from '@/types';

/** Client-side exports of a project's schedule: CSV, Excel (.xlsx) and PNG. */

export type ExportFormat = 'csv' | 'xlsx' | 'png';

type Cell = string | number;

const HEADERS = ['ID', 'Task', 'Type', 'Parent', 'Start', 'End', 'Duration (days)', 'Progress (%)', 'Depends on'];

function dateOnly(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toRows(schedule: Schedule): Cell[][] {
  const names = new Map(schedule.tasks.map((t) => [t.id, t.text]));
  const deps = new Map<string, string[]>();
  for (const link of schedule.links) {
    const list = deps.get(link.target) ?? [];
    list.push(names.get(link.source) ?? link.source);
    deps.set(link.target, list);
  }
  return [...schedule.tasks]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((t) => [
      t.id,
      t.text,
      t.type,
      t.parent ? (names.get(t.parent) ?? t.parent) : '',
      dateOnly(t.start),
      dateOnly(t.end),
      t.duration ?? '',
      t.progress,
      (deps.get(t.id) ?? []).join('; '),
    ]);
}

export function exportFileName(project: Project, ext: string): string {
  const safe = project.name.replace(/[^a-z0-9-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'project';
  return `${safe}-${dateOnly(new Date().toISOString())}.${ext}`;
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(value: Cell): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(project: Project, schedule: Schedule) {
  const lines = [HEADERS, ...toRows(schedule)].map((row) => row.map(csvEscape).join(','));
  // BOM so Excel opens UTF-8 correctly.
  download(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), exportFileName(project, 'csv'));
}

export async function exportXlsx(project: Project, schedule: Schedule) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...toRows(schedule)]);
  sheet['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 10 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 30 }];
  const info = XLSX.utils.aoa_to_sheet([
    ['Project', project.name],
    ['Description', project.description],
    ['Owner', `${project.owner.name} <${project.owner.email}>`],
    ['Exported at', new Date().toISOString()],
  ]);
  info['!cols'] = [{ wch: 14 }, { wch: 60 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Tasks');
  XLSX.utils.book_append_sheet(book, info, 'Project');
  const data = XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  download(
    new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    exportFileName(project, 'xlsx'),
  );
}

export async function exportPng(project: Project, node: HTMLElement) {
  const { toPng } = await import('html-to-image');
  const background = getComputedStyle(document.body).backgroundColor || '#ffffff';
  const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: background, cacheBust: true });
  const blob = await (await fetch(dataUrl)).blob();
  download(blob, exportFileName(project, 'png'));
}
