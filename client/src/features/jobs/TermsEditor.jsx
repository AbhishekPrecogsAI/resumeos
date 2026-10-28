import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { customTerm, MAX_TERMS } from '@resumeos/shared/jobs/extract.js';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

const GROUPS = [
  ['required', 'Required or core'],
  ['preferred', 'Nice to have'],
  ['mentioned', 'Mentioned'],
];

/** Edit the extracted term list: remove noise, add what the parser missed, change importance. */
export function TermsEditor({ terms, onChange, onReset, edited, disabled }) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(null);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const term = customTerm(text);
    if (terms.some((t) => t.id === term.id)) {
      setError(`"${term.term}" is already in the list.`);
      return;
    }
    if (terms.length >= MAX_TERMS) {
      setError(`At most ${MAX_TERMS} terms.`);
      return;
    }
    onChange([...terms, term]);
    setDraft('');
    setError(null);
  };

  return (
    <div className="grid gap-4">
      {GROUPS.map(([importance, label]) => {
        const group = terms.filter((t) => t.importance === importance);
        if (!group.length) return null;
        return (
          <div key={importance}>
            <h3 className="mb-2 text-sm font-medium text-muted">
              {label} ({group.length})
            </h3>
            <ul className="flex flex-wrap gap-2">
              {group.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-1 rounded-md border border-rule bg-surface py-1 pr-1 pl-2.5 text-sm"
                >
                  <span className="text-ink">{t.term}</span>
                  {t.count > 1 && <span className="text-xs text-faint">×{t.count}</span>}
                  {t.source === 'candidate' && <Badge>Check</Badge>}
                  {t.source === 'user' && <Badge tone="accent">Added</Badge>}
                  <label className="sr-only" htmlFor={`imp-${t.id}`}>
                    Importance of {t.term}
                  </label>
                  <select
                    id={`imp-${t.id}`}
                    value={t.importance}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(
                        terms.map((x) =>
                          x.id === t.id ? { ...x, importance: e.target.value } : x,
                        ),
                      )
                    }
                    className="ml-1 rounded border border-transparent bg-transparent text-xs text-muted hover:border-rule"
                  >
                    <option value="required">Required</option>
                    <option value="preferred">Nice to have</option>
                    <option value="mentioned">Mentioned</option>
                  </select>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(terms.filter((x) => x.id !== t.id))}
                    aria-label={`Remove ${t.term}`}
                    className="grid size-6 place-items-center rounded text-muted hover:bg-sunken hover:text-ink"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {terms.length === 0 && (
        <p className="text-sm text-muted">
          No terms. Add the skills and technologies this role asks for.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <label htmlFor="add-term" className="text-sm font-medium text-ink">
            Add a term the parser missed
          </label>
          <input
            id="add-term"
            value={draft}
            disabled={disabled}
            maxLength={80}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'add-term-error' : undefined}
            className="mt-1.5 h-9 w-full rounded-md border border-rule-strong bg-surface px-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-9"
          onClick={add}
          disabled={disabled || !draft.trim()}
        >
          <Plus className="size-4" aria-hidden="true" /> Add
        </Button>
        {edited && onReset && (
          <Button variant="ghost" size="sm" className="h-9" onClick={onReset} disabled={disabled}>
            Reset to extracted terms
          </Button>
        )}
      </div>
      {error && (
        <p id="add-term-error" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <p className="text-xs text-faint">
        "Check" marks words that repeat in the posting but aren't in our dictionary; remove any that
        aren't real requirements.
      </p>
    </div>
  );
}
