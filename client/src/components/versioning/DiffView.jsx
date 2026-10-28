import { useState } from 'react';
import { ArrowRightLeft, Minus, MoveVertical, Pencil, Plus } from 'lucide-react';
import { formatMonth } from '@resumeos/shared/dates.js';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { Badge } from '../ui/Badge.jsx';
import { cx } from '../../lib/cx.js';

const FIELD_LABELS = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  website: 'Website',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  portfolio: 'Portfolio',
  headline: 'Headline',
  summary: 'Summary',
  title: 'Title',
  company: 'Company',
  employmentType: 'Employment type',
  startDate: 'Start date',
  endDate: 'End date',
  current: 'Current',
  description: 'Description',
  url: 'URL',
  repositoryUrl: 'Repository',
  technologies: 'Technologies',
  category: 'Category',
  context: 'Context',
  institution: 'Institution',
  degree: 'Degree',
  field: 'Field of study',
  notes: 'Notes',
  issuer: 'Issuer',
  issuedDate: 'Issued',
  expiresDate: 'Expires',
  subtitle: 'Subtitle',
  evidenceIds: 'Linked evidence',
  templateId: 'Template',
  pageSize: 'Page size',
  accentColor: 'Accent colour',
};

export const STATUS = {
  added: { label: 'Added', tone: 'added', icon: Plus },
  removed: { label: 'Removed', tone: 'removed', icon: Minus },
  modified: { label: 'Changed', tone: 'accent', icon: Pencil },
  reordered: { label: 'Moved', tone: 'neutral', icon: MoveVertical },
};

function StatusBadge({ status, moved }) {
  const s = STATUS[status];
  if (!s) return null;
  const Icon = s.icon;
  return (
    <span className="inline-flex gap-1">
      <Badge tone={s.tone}>
        <Icon className="size-3" aria-hidden="true" /> {s.label}
      </Badge>
      {moved && status !== 'reordered' && (
        <Badge>
          <MoveVertical className="size-3" aria-hidden="true" /> Moved
        </Badge>
      )}
    </span>
  );
}

function formatValue(field, value) {
  if (field === 'accentColor' && !value) return 'Template default';
  if (value === null || value === undefined || value === '') return '(empty)';
  if (Array.isArray(value))
    return value.length
      ? field === 'evidenceIds'
        ? `${value.length} linked`
        : value.join(', ')
      : '(none)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (/Date$/.test(field)) return formatMonth(value) || String(value);
  if (field === 'templateId') return getTemplate(value)?.name ?? value;
  if (field === 'pageSize') return value === 'Letter' ? 'US Letter' : value;
  return String(value);
}

/** Inline word diff. Changes carry text labels for screen readers, not just colour. */
function Words({ words, side }) {
  return (
    <span className="whitespace-pre-wrap">
      {words.map((w, i) => {
        if (w.type === 'same') return <span key={i}>{w.text}</span>;
        if (w.type === 'del') {
          if (side === 'after') return null;
          return (
            <del key={i} className="rounded-sm bg-removed-soft text-removed decoration-removed/70">
              <span className="sr-only">[removed: </span>
              {w.text}
              <span className="sr-only">]</span>
            </del>
          );
        }
        if (side === 'before') return null;
        return (
          <ins key={i} className="rounded-sm bg-added-soft text-added no-underline">
            <span className="sr-only">[added: </span>
            {w.text}
            <span className="sr-only">]</span>
          </ins>
        );
      })}
    </span>
  );
}

function Change({ field, before, after, words, mode }) {
  const label = FIELD_LABELS[field] ?? field;
  const beforeText = formatValue(field, before);
  const afterText = formatValue(field, after);
  if (mode === 'split') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-sunken/70 p-2.5 text-sm">
          <p className="text-xs font-medium text-muted">{label}, before</p>
          <p className="mt-0.5 text-ink">
            {words ? <Words words={words} side="before" /> : beforeText}
          </p>
        </div>
        <div className="rounded-md bg-sunken/70 p-2.5 text-sm">
          <p className="text-xs font-medium text-muted">{label}, after</p>
          <p className="mt-0.5 text-ink">
            {words ? <Words words={words} side="after" /> : afterText}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="text-sm">
      <p className="text-xs font-medium text-muted">{label}</p>
      {words ? (
        <p className="mt-0.5 text-ink">
          <Words words={words} />
        </p>
      ) : (
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-ink">
          <del className="rounded-sm bg-removed-soft px-1 text-removed">
            <span className="sr-only">Before: </span>
            {beforeText}
          </del>
          <ArrowRightLeft className="size-3.5 text-faint" aria-hidden="true" />
          <ins className="rounded-sm bg-added-soft px-1 text-added no-underline">
            <span className="sr-only">After: </span>
            {afterText}
          </ins>
        </p>
      )}
    </div>
  );
}

function Bullet({ bullet, mode }) {
  if (bullet.status === 'modified' && bullet.words) {
    return (
      <li className="flex flex-wrap items-start gap-2">
        <StatusBadge status="modified" moved={bullet.moved} />
        <div className="min-w-0 flex-1">
          <Change
            field="text"
            before={bullet.before}
            after={bullet.after}
            words={bullet.words}
            mode={mode}
          />
        </div>
      </li>
    );
  }
  const text = bullet.status === 'removed' ? bullet.before : bullet.after;
  return (
    <li className="flex flex-wrap items-start gap-2 text-sm">
      <StatusBadge status={bullet.status} />
      <span
        className={cx(
          'min-w-0 flex-1',
          bullet.status === 'removed'
            ? 'text-removed line-through'
            : bullet.status === 'added'
              ? 'text-added'
              : 'text-ink',
        )}
      >
        {text}
        {bullet.evidenceChanged && <span className="text-muted"> (evidence links changed)</span>}
      </span>
    </li>
  );
}

function Entry({ entry, mode }) {
  return (
    <li className="rounded-md border border-rule bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cx(
            'font-medium',
            entry.status === 'removed' ? 'text-removed line-through' : 'text-ink',
          )}
        >
          {entry.label}
        </span>
        <StatusBadge status={entry.status} moved={entry.moved} />
      </div>
      {entry.fields?.length > 0 && (
        <div className="mt-3 grid gap-3">
          {entry.fields.map((f) => (
            <Change key={f.field} {...f} mode={mode} />
          ))}
        </div>
      )}
      {entry.bullets?.length > 0 && (
        <ul className="mt-3 grid gap-2.5" aria-label="Bullet changes">
          {entry.bullets.map((b) => (
            <Bullet key={b.id} bullet={b} mode={mode} />
          ))}
        </ul>
      )}
      {entry.items?.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {entry.items.map((i) => (
            <Entry key={i.id} entry={i} mode={mode} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function DiffSummary({ diff }) {
  const { added, removed, modified, reordered } = diff.summary;
  const parts = [
    added && `${added} added`,
    removed && `${removed} removed`,
    modified && `${modified} changed`,
    reordered && `${reordered} moved`,
  ].filter(Boolean);
  if (diff.identical) return <p className="text-muted">These two are identical.</p>;
  return (
    <p className="text-ink">
      {parts.length ? `Content: ${parts.join(', ')}.` : 'No content changes.'}
    </p>
  );
}

/** Full diff rendering with unified / side-by-side modes. */
export function DiffView({ diff }) {
  const [mode, setMode] = useState('unified');
  const [showUnchanged, setShowUnchanged] = useState(false);
  const sections = diff.sections.filter((s) => showUnchanged || s.status !== 'unchanged');
  const layoutChanged =
    diff.layout.orderChanged ||
    diff.layout.visibility.length ||
    diff.layout.itemsHidden ||
    diff.layout.itemsShown;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DiffSummary diff={diff} />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
            />
            Show unchanged sections
          </label>
          <div
            role="radiogroup"
            aria-label="Diff layout"
            className="inline-flex rounded-md border border-rule p-0.5"
          >
            {[
              ['unified', 'Unified'],
              ['split', 'Side by side'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={cx(
                  'rounded-[5px] px-3 py-1 text-sm',
                  mode === value ? 'bg-sunken font-medium text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {diff.template.length > 0 && (
        <section
          aria-labelledby="diff-template"
          className="rounded-lg border border-rule bg-surface p-4"
        >
          <h2 id="diff-template" className="text-sm font-semibold text-ink">
            Template and page settings
          </h2>
          <p className="mb-3 text-sm text-muted">
            These change how the resume looks, not what it says.
          </p>
          <div className="grid gap-3">
            {diff.template.map((c) => (
              <Change key={c.field} {...c} mode={mode} />
            ))}
          </div>
        </section>
      )}

      {layoutChanged ? (
        <section
          aria-labelledby="diff-layout"
          className="rounded-lg border border-rule bg-surface p-4"
        >
          <h2 id="diff-layout" className="text-sm font-semibold text-ink">
            Section order and visibility
          </h2>
          <ul className="mt-2 grid gap-1.5 text-sm text-ink">
            {diff.layout.orderChanged && (
              <li>
                <span className="font-medium">Order changed.</span>{' '}
                <span className="text-muted">Before: {diff.layout.beforeOrder.join(', ')}.</span>{' '}
                <span>After: {diff.layout.afterOrder.join(', ')}.</span>
              </li>
            )}
            {diff.layout.visibility.map((v) => (
              <li key={v.section}>
                {v.title}: {v.before} → <span className="font-medium">{v.after}</span>
              </li>
            ))}
            {diff.layout.itemsHidden > 0 && (
              <li>
                {diff.layout.itemsHidden} {diff.layout.itemsHidden === 1 ? 'entry' : 'entries'}{' '}
                newly hidden
              </li>
            )}
            {diff.layout.itemsShown > 0 && (
              <li>
                {diff.layout.itemsShown} {diff.layout.itemsShown === 1 ? 'entry' : 'entries'} shown
                again
              </li>
            )}
          </ul>
        </section>
      ) : null}

      {sections.length === 0 && !diff.identical && (
        <p className="text-sm text-muted">No section content changed.</p>
      )}

      {sections.map((s) => (
        <section key={s.key} aria-labelledby={`diff-${s.key}`} className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2 border-b border-rule pb-2">
            <h2 id={`diff-${s.key}`} className="font-semibold text-ink">
              {s.title}
            </h2>
            {s.status === 'unchanged' ? (
              <Badge>Unchanged</Badge>
            ) : (
              <StatusBadge status={s.status} />
            )}
          </div>
          {s.fields.length > 0 && (
            <div className="grid gap-3">
              {s.fields.map((f) => (
                <Change key={f.field} {...f} mode={mode} />
              ))}
            </div>
          )}
          {s.entries.length > 0 && (
            <ul className="grid gap-2.5">
              {s.entries.map((e) => (
                <Entry key={e.id} entry={e} mode={mode} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
