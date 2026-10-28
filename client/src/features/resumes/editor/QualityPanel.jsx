import { useState } from 'react';
import { AlertOctagon, AlertTriangle, ChevronRight, Info, Wand2 } from 'lucide-react';
import { CATEGORIES } from '@resumeos/shared/quality/engine.js';
import { Button } from '../../../components/ui/Button.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { TextField } from '../../../components/ui/Field.jsx';
import { cx } from '../../../lib/cx.js';

const SEVERITY = {
  error: {
    label: 'Error',
    tone: 'danger',
    icon: AlertOctagon,
    group: 'Errors that can break the document',
  },
  warning: {
    label: 'Warning',
    tone: 'warn',
    icon: AlertTriangle,
    group: 'Warnings about structure or consistency',
  },
  info: { label: 'Suggestion', tone: 'accent', icon: Info, group: 'Suggestions for your review' },
};

function Finding({ f, onJump, onFix, onDismiss }) {
  const s = SEVERITY[f.severity];
  const Icon = s.icon;
  return (
    <li className="rounded-lg border border-rule bg-surface p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={s.tone}>
          <Icon className="size-3" aria-hidden="true" /> {s.label}
        </Badge>
        <span className="text-sm font-medium text-ink">{f.title}</span>
      </div>
      <button
        type="button"
        onClick={() => onJump(f)}
        className="mt-1.5 flex items-center gap-1 text-left text-sm text-accent hover:underline"
      >
        {f.location}
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Go to this section</span>
      </button>
      {f.excerpt && (
        <p className="mt-1.5 rounded bg-sunken px-2 py-1 font-mono text-xs break-words text-muted">
          {f.excerpt}
        </p>
      )}
      <p className="mt-2 text-sm text-ink">{f.message}</p>
      <p className="mt-1 text-sm text-muted">{f.suggestion}</p>
      <details className="mt-1.5 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">Why this matters</summary>
        <p className="mt-1 text-muted">{f.whyItMatters}</p>
        <p className="mt-1 font-mono text-xs text-faint">{f.ruleId}</p>
      </details>
      <div className="mt-3 flex flex-wrap gap-2">
        {f.fix ? (
          <Button size="sm" variant="secondary" onClick={() => onFix(f)}>
            <Wand2 className="size-4" aria-hidden="true" /> {f.fix.label}
          </Button>
        ) : (
          <span className="self-center text-xs text-faint">Fix by editing the text.</span>
        )}
        <Button size="sm" variant="ghost" onClick={() => onDismiss(f)}>
          Dismiss
        </Button>
      </div>
    </li>
  );
}

/**
 * Quality report for the live draft. Findings are grouped by severity; there is no overall score.
 * Fixes change content only when clicked, through the editor's undo history.
 */
export function QualityPanel({ report, onJump, onFix, onDismiss, onRestore }) {
  const [pendingDismiss, setPendingDismiss] = useState(null);
  const [reason, setReason] = useState('');
  const [showDismissed, setShowDismissed] = useState(false);
  const { findings, counts, rulesRun, dismissed } = report;
  const categories = Object.entries(CATEGORIES).filter(([key]) => counts.byCategory[key]);

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm text-ink" role="status" aria-live="polite">
          {findings.length === 0
            ? `No findings from ${rulesRun.length} checks.`
            : `${counts.bySeverity.error} ${counts.bySeverity.error === 1 ? 'error' : 'errors'}, ${counts.bySeverity.warning} ${counts.bySeverity.warning === 1 ? 'warning' : 'warnings'}, ${counts.bySeverity.info} ${counts.bySeverity.info === 1 ? 'suggestion' : 'suggestions'}.`}
        </p>
        {categories.length > 0 && (
          <p className="mt-1 text-xs text-muted">
            {categories.map(([key, label]) => `${label}: ${counts.byCategory[key]}`).join('. ')}.
          </p>
        )}
        <p className="mt-2 text-xs text-faint">
          Checks run on what will print; hidden sections and entries are skipped. There's no overall
          score, and passing every check doesn't guarantee how an applicant tracking system will
          read your resume.
        </p>
      </div>

      {['error', 'warning', 'info'].map((severity) => {
        const group = findings.filter((f) => f.severity === severity);
        if (!group.length) return null;
        return (
          <section key={severity} aria-labelledby={`q-${severity}`}>
            <h3 id={`q-${severity}`} className="mb-2 text-sm font-semibold text-ink">
              {SEVERITY[severity].group} ({group.length})
            </h3>
            <ul className="grid gap-2.5">
              {group.map((f) => (
                <Finding
                  key={f.key}
                  f={f}
                  onJump={onJump}
                  onFix={onFix}
                  onDismiss={(x) => {
                    setReason('');
                    setPendingDismiss(x);
                  }}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {dismissed.length > 0 && (
        <section aria-labelledby="q-dismissed">
          <button
            type="button"
            aria-expanded={showDismissed}
            onClick={() => setShowDismissed((v) => !v)}
            className="flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
          >
            <ChevronRight
              className={cx('size-4 transition-transform', showDismissed && 'rotate-90')}
              aria-hidden="true"
            />
            <span id="q-dismissed">Dismissed ({dismissed.length})</span>
          </button>
          {showDismissed && (
            <ul className="mt-2 grid gap-2">
              {dismissed.map((f) => (
                <li
                  key={f.key}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-rule px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-ink">
                      {f.title}: <span className="text-muted">{f.location}</span>
                    </p>
                    {f.dismissal.reason && (
                      <p className="text-xs text-muted">Reason: {f.dismissal.reason}</p>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onRestore(f)}>
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <details className="rounded-lg border border-rule bg-surface">
        <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-medium text-ink">
          Checks performed ({rulesRun.length})
        </summary>
        <ul className="grid gap-2.5 border-t border-rule px-3.5 py-3">
          {rulesRun.map((r) => (
            <li key={r.id} className="text-sm">
              <p className="text-ink">
                {r.title} <span className="text-xs text-faint">({CATEGORIES[r.category]})</span>
              </p>
              <p className="text-muted">{r.description}</p>
              <p className="text-xs text-faint">Limitations: {r.limitations}</p>
            </li>
          ))}
        </ul>
      </details>

      <Dialog
        open={Boolean(pendingDismiss)}
        onClose={() => setPendingDismiss(null)}
        size="sm"
        title="Dismiss this finding?"
        description="It moves to the dismissed list for this resume and comes back if the flagged text changes. Your resume isn't changed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDismiss(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onDismiss(pendingDismiss, reason.trim());
                setPendingDismiss(null);
              }}
            >
              Dismiss
            </Button>
          </>
        }
      >
        <TextField
          label="Reason"
          optionalLabel
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          hint='For example "The overlap is accurate: part-time contract".'
        />
      </Dialog>
    </div>
  );
}
