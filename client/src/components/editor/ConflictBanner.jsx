import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

export function ConflictBanner({ what = 'This', onReload, onOverwrite, busy }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-lg border border-warn/40 bg-warn-soft p-4 text-sm"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{what} was changed in another tab or device</p>
        <p className="mt-1 text-muted">
          Your recent edits are still on screen but haven't been saved. Load the latest version to
          discard them, or keep yours to replace what was saved elsewhere.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onReload} disabled={busy}>
            Load latest version
          </Button>
          <Button size="sm" variant="ghost" onClick={onOverwrite} disabled={busy}>
            Keep my edits
          </Button>
        </div>
      </div>
    </div>
  );
}
