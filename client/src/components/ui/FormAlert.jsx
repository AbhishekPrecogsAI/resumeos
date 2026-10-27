import { AlertTriangle } from 'lucide-react';

/** Form-level error summary. Rendered as an alert so screen readers announce it. */
export function FormAlert({ error, title }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex gap-2.5 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-ink"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        <p>{error.message ?? String(error)}</p>
      </div>
    </div>
  );
}
