import { AlertTriangle, Lock } from 'lucide-react';
import { cx } from '../../lib/cx.js';
import { Spinner } from './Spinner.jsx';
import { Button } from './Button.jsx';

export function LoadingState({ label = 'Loading', className }) {
  return (
    <div className={cx('flex items-center justify-center gap-3 py-16 text-muted', className)}>
      <Spinner label={label} />
      <span aria-hidden="true">{label}…</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cx(
        'mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center',
        className,
      )}
    >
      {Icon && <Icon className="mb-4 size-8 text-faint" aria-hidden="true" />}
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1.5 text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "This didn't load", error, onRetry, className, children }) {
  const message = error?.message ?? 'An unexpected error occurred.';
  return (
    <div
      role="alert"
      className={cx(
        'mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center',
        className,
      )}
    >
      <AlertTriangle className="mb-4 size-8 text-danger" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 text-muted">{message}</p>
      {error?.requestId && (
        <p className="mt-1 font-mono text-xs text-faint">Reference: {error.requestId}</p>
      )}
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
      {children}
    </div>
  );
}

export function AccessDeniedState({
  title = "You don't have access to this",
  description,
  action,
}) {
  return <EmptyState icon={Lock} title={title} description={description} action={action} />;
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-md bg-sunken', className)} />;
}
