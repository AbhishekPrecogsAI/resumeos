import { useMemo, useState } from 'react';
import { Check, Columns2, Image as ImageIcon, Palette, Rows3 } from 'lucide-react';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { SAMPLE_PHOTO } from '@resumeos/shared/sample/samplePhoto.js';
import { TemplatePreview } from '../preview/TemplatePreview.jsx';
import { Badge } from '../ui/Badge.jsx';
import { cx } from '../../lib/cx.js';

export const TEMPLATE_FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'one', label: 'One column', test: (t) => t.columns === 1 },
  { id: 'two', label: 'Two columns', test: (t) => t.columns === 2 },
  { id: 'photo', label: 'With photo', test: (t) => Boolean(t.photo) },
  { id: 'accent', label: 'Colour options', test: (t) => Boolean(t.accent) },
];

export const samplePhotoFor = (t) => (t.photo ? SAMPLE_PHOTO : null);

export function TemplateFeatures({ t }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Features">
      <li>
        <Badge>
          {t.columns === 1 ? (
            <Rows3 className="size-3" aria-hidden="true" />
          ) : (
            <Columns2 className="size-3" aria-hidden="true" />
          )}
          {t.columns === 1 ? 'One column' : 'Two columns'}
        </Badge>
      </li>
      {t.photo && (
        <li>
          <Badge>
            <ImageIcon className="size-3" aria-hidden="true" /> Photo
          </Badge>
        </li>
      )}
      {t.accent && (
        <li>
          <Badge>
            <Palette className="size-3" aria-hidden="true" /> Colours
          </Badge>
        </li>
      )}
      {t.id === 'clarity' && (
        <li>
          <Badge tone="added">Safest for ATS</Badge>
        </li>
      )}
    </ul>
  );
}

/**
 * Filterable grid of template thumbnails. `renderActions(t)` supplies each card's buttons;
 * `selectedId` marks the current choice (for pickers).
 */
export function TemplateGrid({
  renderActions,
  onCardClick,
  cardLabel = 'Preview',
  selectedId,
  content = sampleResume,
  photo,
  accentColor,
  pattern = 'none',
  compact = false,
}) {
  const [filter, setFilter] = useState('all');
  const visible = useMemo(
    () => TEMPLATES.filter(TEMPLATE_FILTERS.find((f) => f.id === filter).test),
    [filter],
  );

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Filter templates"
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        {TEMPLATE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cx(
              'rounded-full border px-4 py-1.5 text-sm transition-colors',
              filter === f.id
                ? 'border-accent bg-accent text-on-accent'
                : 'border-rule-strong bg-surface text-ink hover:bg-sunken',
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="text-sm text-muted" aria-live="polite">
          {visible.length} {visible.length === 1 ? 'template' : 'templates'}
        </span>
      </div>
      <ul
        className={cx(
          'grid gap-6',
          compact ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {visible.map((t) => {
          const selected = selectedId === t.id;
          return (
            <li
              key={t.id}
              className={cx(
                'group flex flex-col overflow-hidden rounded-xl border bg-surface transition-shadow hover:shadow-paper',
                selected ? 'border-accent ring-2 ring-accent' : 'border-rule',
              )}
            >
              <button
                type="button"
                onClick={() => onCardClick?.(t)}
                className="relative block bg-sunken p-3 text-left"
                aria-label={`${cardLabel} ${t.name}`}
                aria-pressed={selectedId ? selected : undefined}
              >
                <div className="theme-light pointer-events-none overflow-hidden rounded-md shadow-paper">
                  <TemplatePreview
                    content={content}
                    templateId={t.id}
                    firstPageOnly
                    photo={photo === undefined ? samplePhotoFor(t) : t.photo ? photo : null}
                    accentColor={accentColor && t.accent ? accentColor : null}
                    pattern={pattern}
                    title={`${t.name} thumbnail`}
                  />
                </div>
                {selected && (
                  <span className="absolute top-5 right-5 grid size-7 place-items-center rounded-full bg-accent text-on-accent shadow-paper">
                    <Check className="size-4" aria-hidden="true" />
                    <span className="sr-only">Current template</span>
                  </span>
                )}
              </button>
              <div className={cx('flex flex-1 flex-col gap-2.5', compact ? 'p-3' : 'p-4')}>
                <div>
                  <h3 className={cx('font-semibold text-ink', compact ? 'text-base' : 'text-lg')}>
                    {t.name}
                  </h3>
                  {!compact && <p className="text-sm text-muted">{t.style}</p>}
                </div>
                <TemplateFeatures t={t} />
                {renderActions && (
                  <div className="mt-auto flex flex-wrap gap-2 pt-1">{renderActions(t)}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
