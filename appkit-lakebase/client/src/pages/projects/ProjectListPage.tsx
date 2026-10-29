import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  Input,
  Skeleton,
} from '@databricks/appkit-ui/react';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  RotateCcw,
  AlertTriangle,
  FolderKanban,
  Pencil,
  X,
  Copy,
  UserRound,
} from 'lucide-react';
import { useProjects, useProjectCounts } from '@/hooks/useProjects';
import { useToast } from '@/hooks/useToast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { projectsApi } from '@/api/projectsApi';
import { getErrorMessage } from '@/api/httpClient';
import { formatDateRange } from '@/lib/format';
import {
  APP_NAME,
  DEFAULT_PROJECT_COLOR,
  PROJECT_COLORS,
  SCOPE_META,
  SCOPES,
} from '@/lib/constants';
import type { ProjectScope, ProjectTemplate, Project } from '@/types';

/* ------------------------------------------------------------------ */
/*  Create-project dialog                                              */
/* ------------------------------------------------------------------ */

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, color: string, template: ProjectTemplate) => void;
  busy: boolean;
}

function CreateDialog({ open, onClose, onCreate, busy }: CreateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_PROJECT_COLOR);
  const [template, setTemplate] = useState<ProjectTemplate>('blank');

  const reset = useCallback(() => {
    setName('');
    setDescription('');
    setColor(DEFAULT_PROJECT_COLOR);
    setTemplate('blank');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New project</h2>
          <button type="button" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              placeholder="e.g. Product launch Q1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <Input
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Template</label>
            <div className="flex gap-2">
              {(['blank', 'sample'] as const).map((t) => (
                <Button
                  key={t}
                  variant={template === t ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTemplate(t)}
                >
                  {t === 'blank' ? 'Blank' : 'Sample plan'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onCreate(name.trim(), description.trim(), color, template)}
            disabled={busy || !name.trim()}
          >
            {busy ? 'Creating\u2026' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Actions dropdown (vanilla, no shadcn DropdownMenu dependency)      */
/* ------------------------------------------------------------------ */

interface ActionsMenuProps {
  scope: ProjectScope;
  isOwner: boolean;
  onCopy: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDestroy: () => void;
  onRename: () => void;
}

function ActionsMenu({ scope, isOwner, onCopy, onTrash, onRestore, onDestroy, onRename }: ActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md py-1 min-w-[160px]">
          {scope !== 'trash' && (
            <button
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
              onClick={(e) => { e.stopPropagation(); setOpen(false); onCopy(); }}
            >
              <Copy className="h-3.5 w-3.5" /> Create a copy
            </button>
          )}
          {scope !== 'trash' && isOwner && (
            <>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                onClick={(e) => { e.stopPropagation(); setOpen(false); onRename(); }}
              >
                <Pencil className="h-3.5 w-3.5" /> Rename
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted text-destructive flex items-center gap-2"
                onClick={(e) => { e.stopPropagation(); setOpen(false); onTrash(); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Move to trash
              </button>
            </>
          )}
          {scope === 'trash' && (
            <>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
                onClick={(e) => { e.stopPropagation(); setOpen(false); onRestore(); }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted text-destructive flex items-center gap-2"
                onClick={(e) => { e.stopPropagation(); setOpen(false); onDestroy(); }}
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Delete forever
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rename dialog                                                      */
/* ------------------------------------------------------------------ */

function RenameDialog({
  project,
  onClose,
  onSave,
  busy,
}: {
  project: Project | null;
  onClose: () => void;
  onSave: (id: string, name: string) => void;
  busy: boolean;
}) {
  const [name, setName] = useState(project?.name ?? '');

  useEffect(() => {
    if (project) setName(project.name);
  }, [project]);

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Rename project</h2>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(project.id, name.trim())}
            disabled={busy || !name.trim()}
          >
            {busy ? 'Saving\u2026' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Project card                                                       */
/* ------------------------------------------------------------------ */

function ProjectCard({
  project,
  scope,
  onClick,
  onCopy,
  onTrash,
  onRestore,
  onDestroy,
  onRename,
}: {
  project: Project;
  scope: ProjectScope;
  onClick: () => void;
  onCopy: () => void;
  onTrash: () => void;
  onRestore: () => void;
  onDestroy: () => void;
  onRename: () => void;
}) {
  const { stats } = project;
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group relative overflow-hidden"
      onClick={onClick}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: project.color }} />
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{project.name}</h3>
            {project.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{project.description}</p>
            )}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <ActionsMenu
              scope={scope}
              isOwner={project.permissions.isOwner}
              onCopy={onCopy}
              onTrash={onTrash}
              onRestore={onRestore}
              onDestroy={onDestroy}
              onRename={onRename}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {stats.taskCount} task{stats.taskCount !== 1 ? 's' : ''}
              {' \u00b7 '}
              {stats.milestoneCount} milestone{stats.milestoneCount !== 1 ? 's' : ''}
            </span>
            <span>{stats.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${stats.progress}%`, backgroundColor: project.color }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{formatDateRange(stats.startDate, stats.endDate)}</span>
            <span className="flex items-center gap-1 truncate" title={project.owner.email}>
              <UserRound className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {project.permissions.isOwner ? `${project.owner.name} (you)` : project.owner.name}
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function ProjectListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { counts, reload: reloadCounts } = useProjectCounts();

  const [scope, setScope] = useState<ProjectScope>('mine');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const { items, loading, error, reload, removeLocally } = useProjects(scope, debouncedSearch);

  const [creating, setCreating] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [renameBusy, setRenameBusy] = useState(false);

  const handleCreate = useCallback(
    async (name: string, description: string, color: string, template: ProjectTemplate) => {
      setCreateBusy(true);
      try {
        const project = await projectsApi.create({ name, description, color, template });
        setCreating(false);
        reloadCounts();
        navigate(`/projects/${project.id}`);
      } catch (err) {
        toast({ title: 'Failed to create project', description: getErrorMessage(err), variant: 'error' });
      } finally {
        setCreateBusy(false);
      }
    },
    [navigate, reloadCounts, toast],
  );

  const handleRename = useCallback(
    async (id: string, name: string) => {
      setRenameBusy(true);
      try {
        await projectsApi.update(id, { name });
        setRenaming(null);
        reload();
        toast({ title: 'Project renamed', variant: 'success' });
      } catch (err) {
        toast({ title: 'Failed to rename', description: getErrorMessage(err), variant: 'error' });
      } finally {
        setRenameBusy(false);
      }
    },
    [reload, toast],
  );

  const handleTrash = useCallback(
    async (project: Project) => {
      try {
        await projectsApi.trash(project.id);
        removeLocally(project.id);
        reloadCounts();
        toast({ title: `"${project.name}" moved to trash` });
      } catch (err) {
        toast({ title: 'Failed to trash project', description: getErrorMessage(err), variant: 'error' });
      }
    },
    [removeLocally, reloadCounts, toast],
  );

  const handleRestore = useCallback(
    async (project: Project) => {
      try {
        await projectsApi.restore(project.id);
        removeLocally(project.id);
        reloadCounts();
        toast({ title: `"${project.name}" restored`, variant: 'success' });
      } catch (err) {
        toast({ title: 'Failed to restore', description: getErrorMessage(err), variant: 'error' });
      }
    },
    [removeLocally, reloadCounts, toast],
  );

  const handleCopy = useCallback(
    async (project: Project) => {
      try {
        const copy = await projectsApi.copy(project.id);
        reloadCounts();
        toast({ title: 'Copy created', description: `"${copy.name}" is now in My projects.`, variant: 'success' });
        navigate(`/projects/${copy.id}`);
      } catch (err) {
        toast({ title: 'Could not create a copy', description: getErrorMessage(err), variant: 'error' });
      }
    },
    [navigate, reloadCounts, toast],
  );

  const handleDestroy = useCallback(
    async (project: Project) => {
      if (!window.confirm(`Permanently delete "${project.name}"? This cannot be undone.`)) return;
      try {
        await projectsApi.destroy(project.id);
        removeLocally(project.id);
        reloadCounts();
        toast({ title: `"${project.name}" deleted permanently`, variant: 'success' });
      } catch (err) {
        toast({ title: 'Failed to delete', description: getErrorMessage(err), variant: 'error' });
      }
    },
    [removeLocally, reloadCounts, toast],
  );

  const meta = SCOPE_META[scope];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">{APP_NAME}</h1>
        </div>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New project
        </Button>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b">
          {SCOPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setScope(s);
                setSearch('');
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                scope === s
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {SCOPE_META[s].label}
              {counts && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {counts[s]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search projects\u2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={`skel-${i}`}>
                <div className="h-1.5 w-full bg-muted" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-1.5 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">{meta.empty}</p>
            <p className="text-sm text-muted-foreground">{meta.emptyHint}</p>
            {scope === 'mine' && (
              <Button className="mt-4" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create your first project
              </Button>
            )}
          </div>
        )}

        {/* Project grid */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                scope={scope}
                onClick={() => navigate(`/projects/${project.id}`)}
                onTrash={() => handleTrash(project)}
                onRestore={() => handleRestore(project)}
                onDestroy={() => handleDestroy(project)}
                onCopy={() => handleCopy(project)}
                onRename={() => setRenaming(project)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateDialog open={creating} onClose={() => setCreating(false)} onCreate={handleCreate} busy={createBusy} />
      <RenameDialog project={renaming} onClose={() => setRenaming(null)} onSave={handleRename} busy={renameBusy} />
    </div>
  );
}
