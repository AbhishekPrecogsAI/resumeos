import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cx } from '../../lib/cx.js';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircle2, className: 'text-added' },
  error: { icon: AlertTriangle, className: 'text-danger' },
  info: { icon: Info, className: 'text-accent' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    ({ tone = 'info', title, message, duration }) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, tone, title, message }]);
      const ms = duration ?? (tone === 'error' ? 8000 : 4500);
      if (ms > 0) setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      show,
      dismiss,
      success: (title, message) => show({ tone: 'success', title, message }),
      error: (title, message) => show({ tone: 'error', title, message }),
      info: (title, message) => show({ tone: 'info', title, message }),
    }),
    [show, dismiss],
  );

  const polite = toasts.filter((t) => t.tone !== 'error');
  const assertive = toasts.filter((t) => t.tone === 'error');

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
        <div role="status" aria-live="polite" className="contents">
          {polite.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
        <div role="alert" aria-live="assertive" className="contents">
          {assertive.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { icon: Icon, className } = TONES[toast.tone] ?? TONES.info;
  return (
    <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-rule bg-surface p-3.5 text-sm shadow-paper">
      <Icon className={cx('mt-0.5 size-4 shrink-0', className)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-muted">{toast.message}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-m-1 rounded p-1 text-muted hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
