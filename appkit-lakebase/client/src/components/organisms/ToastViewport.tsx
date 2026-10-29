import { X } from 'lucide-react';
import type { ToastItem } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

const variantClasses: Record<NonNullable<ToastItem['variant']>, string> = {
  default: 'border-border bg-background text-foreground',
  success: 'border-green-500/40 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
  error: 'border-red-500/40 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
};

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-md border p-4 shadow-lg',
            variantClasses[t.variant ?? 'default'],
          )}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && <p className="mt-1 text-sm opacity-90">{t.description}</p>}
            {t.action && (
              <button
                type="button"
                className="mt-2 text-sm font-medium underline underline-offset-2"
                onClick={() => {
                  t.action?.onClick();
                  onDismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="opacity-70 hover:opacity-100"
            onClick={() => onDismiss(t.id)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
