import { RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';

const LABELS = {
  contact: 'Contact details',
  headline: 'Headline',
  summary: 'Summary',
};

function describeEntry(change) {
  if (LABELS[change.section]) return LABELS[change.section];
  const e = change.profileEntry ?? change.resumeEntry ?? {};
  const name =
    [e.title, e.company].filter(Boolean).join(', ') || e.name || e.institution || 'Untitled entry';
  return name;
}

const STATUS = {
  'profile-updated': {
    tone: 'accent',
    label: 'Updated in profile',
    text: "Changed in your profile since this resume copied it. This resume hasn't been edited here.",
  },
  conflict: {
    tone: 'warn',
    label: 'Changed in both',
    text: 'Changed in your profile and edited in this resume. Using the profile version replaces your edits here.',
  },
  'not-in-resume': {
    tone: 'neutral',
    label: 'Not in this resume',
    text: 'In your profile but not included in this resume.',
  },
  'removed-from-profile': {
    tone: 'neutral',
    label: 'Removed from profile',
    text: 'Deleted from your profile. This resume still has its copy.',
  },
};

/** Actionable profile changes for the selected section. Every change needs an explicit choice. */
export function ProfileSyncPanel({ changes, onPull, onKeep }) {
  if (!changes.length) return null;
  return (
    <section
      aria-labelledby="sync-heading"
      className="mb-6 rounded-lg border border-rule bg-sunken/60 p-4"
    >
      <h3 id="sync-heading" className="flex items-center gap-2 text-sm font-semibold text-ink">
        <RefreshCw className="size-4 text-accent" aria-hidden="true" />
        Differences from your master profile
      </h3>
      <ul className="mt-3 grid gap-3">
        {changes.map((c) => {
          const s = STATUS[c.status];
          return (
            <li key={c.key} className="rounded-md border border-rule bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">{describeEntry(c)}</span>
                <Badge tone={s.tone}>{s.label}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {c.status === 'not-in-resume' ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => onPull(c)}>
                      Add to this resume
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onKeep(c)}>
                      Leave it out
                    </Button>
                  </>
                ) : c.status === 'removed-from-profile' ? (
                  <Button size="sm" variant="ghost" onClick={() => onKeep(c)}>
                    Keep it in this resume
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => onPull(c)}>
                      {c.status === 'conflict'
                        ? 'Replace with profile version'
                        : 'Use profile version'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onKeep(c)}>
                      Keep this resume's version
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
