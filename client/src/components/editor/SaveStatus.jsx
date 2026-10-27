import { Check, CloudOff, Loader2, AlertTriangle } from 'lucide-react';
import { formatRelative } from '../../lib/formatters.js';
import { cx } from '../../lib/cx.js';

/** Visible autosave state, announced politely to screen readers. */
export function SaveStatus({ status, lastSavedAt, onRetry, className }) {
  let content;
  if (status === 'saving' || status === 'pending') {
    content = (
      <>
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Saving…
      </>
    );
  } else if (status === 'error') {
    content = (
      <>
        <CloudOff className="size-4 text-danger" aria-hidden="true" />
        <span className="text-danger">Couldn't save.</span>
        <button
          type="button"
          onClick={onRetry}
          className="font-medium text-accent underline underline-offset-2"
        >
          Retry
        </button>
      </>
    );
  } else if (status === 'conflict') {
    content = (
      <>
        <AlertTriangle className="size-4 text-warn" aria-hidden="true" />
        <span className="text-warn">Not saved: changed elsewhere</span>
      </>
    );
  } else {
    content = (
      <>
        <Check className="size-4 text-added" aria-hidden="true" />
        {lastSavedAt ? (
          <span title={lastSavedAt.toLocaleString()}>Saved {formatRelative(lastSavedAt)}</span>
        ) : (
          'Saved'
        )}
      </>
    );
  }
  return (
    <p
      role="status"
      aria-live="polite"
      className={cx('flex items-center gap-1.5 text-sm text-muted', className)}
    >
      {content}
    </p>
  );
}
