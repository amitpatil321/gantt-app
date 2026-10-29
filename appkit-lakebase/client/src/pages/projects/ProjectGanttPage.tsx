import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Input, Skeleton } from '@databricks/appkit-ui/react';
import {
  ArrowLeft,
  Check,
  Cloud,
  CloudOff,
  Copy,
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  Pencil,
  UserRound,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Gantt as SvarGantt, Willow, WillowDark } from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import { projectsApi } from '@/api/projectsApi';
import { getErrorMessage } from '@/api/httpClient';
import { useToast } from '@/hooks/useToast';
import { useColorScheme } from '@/hooks/useColorScheme';
import { exportCsv, exportPng, exportXlsx, type ExportFormat } from '@/features/gantt/ganttExport';
import { useProjectWorkspace } from '@/hooks/useProjectWorkspace';
import { useScheduleAutosave } from '@/hooks/useScheduleAutosave';
import { toSvarTasks, toSvarLinks, computeStats } from '@/features/gantt/ganttAdapter';
import { GanttSync, type SvarGanttApi } from '@/features/gantt/GanttSync';
import { ZOOM_LEVELS, ZOOM_PRESETS } from '@/features/gantt/ganttScales';
import { formatDateRange } from '@/lib/format';
import type { SaveStatus, Schedule, ZoomLevel } from '@/types';

/* ------------------------------------------------------------------ */
/*  Save-status indicator                                              */
/* ------------------------------------------------------------------ */

function SaveIndicator({
  status,
  error,
  onRetry,
}: {
  status: SaveStatus;
  error: string | null;
  onRetry: () => void;
}) {
  switch (status) {
    case 'saving':
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving\u2026
        </span>
      );
    case 'saved':
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3.5 w-3.5" /> Saved
        </span>
      );
    case 'error':
      return (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1 text-xs text-destructive hover:underline"
          title={error ?? 'Save failed'}
        >
          <CloudOff className="h-3.5 w-3.5" /> Retry
        </button>
      );
    case 'pending':
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Cloud className="h-3.5 w-3.5" /> Unsaved
        </span>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Zoom controls                                                      */
/* ------------------------------------------------------------------ */

function ZoomControls({ zoom, onChange }: { zoom: ZoomLevel; onChange: (z: ZoomLevel) => void }) {
  const idx = ZOOM_LEVELS.indexOf(zoom);
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={idx <= 0}
        onClick={() => onChange(ZOOM_LEVELS[idx - 1])}
        title="Zoom in"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
      <span className="text-xs font-medium w-14 text-center">{ZOOM_PRESETS[zoom].label}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        disabled={idx >= ZOOM_LEVELS.length - 1}
        onClick={() => onChange(ZOOM_LEVELS[idx + 1])}
        title="Zoom out"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline-editable project name                                       */
/* ------------------------------------------------------------------ */

function EditableName({
  value,
  color,
  onSave,
  readOnly = false,
}: {
  value: string;
  color: string;
  onSave: (name: string) => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (readOnly) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <h1 className="text-base font-semibold truncate max-w-xs">{value}</h1>
      </div>
    );
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-8 text-base font-semibold max-w-xs"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="flex items-center gap-2 group"
    >
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <h1 className="text-base font-semibold truncate max-w-xs">{value}</h1>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Gantt column definitions                                           */
/* ------------------------------------------------------------------ */

// Loosely typed wrappers: our adapter/sync layer uses its own minimal types.
const Gantt = SvarGantt as unknown as ComponentType<Record<string, unknown>>;
const LightTheme = Willow as unknown as ComponentType<{ children?: ReactNode }>;
const DarkTheme = WillowDark as unknown as ComponentType<{ children?: ReactNode }>;

/* ------------------------------------------------------------------ */
/*  Export menu                                                        */
/* ------------------------------------------------------------------ */

function ExportMenu({ onExport, busy }: { onExport: (f: ExportFormat) => void; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const items: { format: ExportFormat; label: string; Icon: typeof FileText }[] = [
    { format: 'csv', label: 'CSV (.csv)', Icon: FileText },
    { format: 'xlsx', label: 'Excel (.xlsx)', Icon: FileSpreadsheet },
    { format: 'png', label: 'Image (.png)', Icon: FileImage },
  ];

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" size="sm" className="h-8" disabled={busy} onClick={() => setOpen((o) => !o)}>
        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
        Export
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md py-1 min-w-[170px]">
          {items.map(({ format, label, Icon }) => (
            <button
              key={format}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
              onClick={() => {
                setOpen(false);
                onExport(format);
              }}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const COLUMNS = [
  { id: 'text', header: 'Task', flexgrow: 1 },
  { id: 'start', header: 'Start', width: 100, align: 'center' as const },
  { id: 'duration', header: 'Days', width: 60, align: 'center' as const },
  { id: 'progress', header: '%', width: 50, align: 'center' as const },
];

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function ProjectGanttPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { toast } = useToast();
  const scheme = useColorScheme();

  const { project, schedule, loading, error, notFound, updateProject } = useProjectWorkspace(id);
  const canEdit = !!project?.permissions.canEdit;
  const { status, error: saveError, queueSave, retry } = useScheduleAutosave(id, !!schedule && canEdit);

  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const preset = ZOOM_PRESETS[zoom];
  const syncRef = useRef<GanttSync | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleInit = useCallback(
    (api: SvarGanttApi) => {
      if (!schedule) return;
      const sync = new GanttSync(api, schedule, () => {
        if (canEdit) queueSave(() => sync.snapshot());
      });
      syncRef.current = sync;
    },
    [schedule, queueSave, canEdit],
  );

  /** Latest schedule: live Gantt state when available, otherwise what was loaded. */
  const currentSchedule = useCallback((): Schedule | null => {
    if (syncRef.current) {
      try {
        return syncRef.current.snapshot();
      } catch {
        /* fall through */
      }
    }
    return schedule;
  }, [schedule]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!project) return;
      const data = currentSchedule();
      setExporting(true);
      try {
        if (format === 'csv' && data) exportCsv(project, data);
        else if (format === 'xlsx' && data) await exportXlsx(project, data);
        else if (format === 'png' && chartRef.current) await exportPng(project, chartRef.current);
        toast({ title: `Exported ${format.toUpperCase()}`, variant: 'success' });
      } catch (err) {
        toast({ title: 'Export failed', description: getErrorMessage(err), variant: 'error' });
      } finally {
        setExporting(false);
      }
    },
    [project, currentSchedule, toast],
  );

  const handleCopy = useCallback(async () => {
    if (!project) return;
    setCopying(true);
    try {
      const copy = await projectsApi.copy(project.id);
      toast({ title: 'Copy created', description: `"${copy.name}" is now in My projects.`, variant: 'success' });
      navigate(`/projects/${copy.id}`);
    } catch (err) {
      toast({ title: 'Could not create a copy', description: getErrorMessage(err), variant: 'error' });
    } finally {
      setCopying(false);
    }
  }, [project, navigate, toast]);

  const stats = schedule ? computeStats(schedule.tasks) : null;

  /* ---- Loading / error states ---- */

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[calc(100vh-12rem)] w-full" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium">Project not found</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to projects
          </Button>
        </div>
      </div>
    );
  }

  if (error || !project || !schedule) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-destructive">{error ?? 'Failed to load project'}</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to projects
          </Button>
        </div>
      </div>
    );
  }

  const tasks = toSvarTasks(schedule.tasks);
  const links = toSvarLinks(schedule.links);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-4 md:px-6 py-2.5 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <EditableName
          value={project.name}
          color={project.color}
          readOnly={!canEdit}
          onSave={(name) => updateProject({ name })}
        />

        <span
          className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0"
          title={project.owner.email}
        >
          <UserRound className="h-3.5 w-3.5" />
          {project.permissions.isOwner ? 'You' : project.owner.name}
        </span>

        <div className="flex-1" />

        {stats && (
          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {stats.taskCount} task{stats.taskCount !== 1 ? 's' : ''}
            </span>
            <span>{stats.progress}% complete</span>
            <span>{formatDateRange(stats.startDate, stats.endDate)}</span>
          </div>
        )}

        {canEdit && <SaveIndicator status={status} error={saveError} onRetry={retry} />}
        <ZoomControls zoom={zoom} onChange={setZoom} />
        <ExportMenu onExport={(f) => void handleExport(f)} busy={exporting} />
        {!project.permissions.isOwner && (
          <Button size="sm" className="h-8" onClick={() => void handleCopy()} disabled={copying}>
            {copying ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
            Create a copy
          </Button>
        )}
      </header>

      {!canEdit && (
        <div className="px-4 md:px-6 py-2 text-xs flex items-center gap-2 bg-muted text-muted-foreground border-b shrink-0">
          <Lock className="h-3.5 w-3.5" />
          {project.permissions.isOwner ? (
            <span>This project is in the trash and is read-only. Restore it to make changes.</span>
          ) : (
            <span>
              View only. This project is owned by <strong className="text-foreground">{project.owner.name}</strong>.
              Use <strong className="text-foreground">Create a copy</strong> to get your own editable version.
            </span>
          )}
        </div>
      )}

      {/* Gantt chart */}
      <div ref={chartRef} className="gantt-host flex-1 min-h-0 overflow-hidden">
        {(() => {
          const Theme = scheme === 'dark' ? DarkTheme : LightTheme;
          return (
            <Theme>
              <Gantt
                key={canEdit ? 'edit' : 'view'}
                tasks={tasks}
                links={links}
                scales={preset.scales}
                cellWidth={preset.cellWidth}
                columns={COLUMNS}
                readonly={!canEdit}
                init={handleInit}
              />
            </Theme>
          );
        })()}
      </div>
    </div>
  );
}
