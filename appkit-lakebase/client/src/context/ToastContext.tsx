import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastViewport } from '@/components/organisms/ToastViewport';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: number;
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current.slice(-3), { ...options, id }]);
      window.setTimeout(() => dismiss(id), options.duration ?? 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
