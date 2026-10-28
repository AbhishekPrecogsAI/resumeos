import { useMemo, useState } from 'react';
import { Columns2, Image as ImageIcon, Palette, Rows3 } from 'lucide-react';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { ACCENT_SWATCHES } from '@resumeos/shared/templates/color.js';
import { sampleResume, SAMPLE_LABEL } from '@resumeos/shared/sample/sampleResume.js';
import { SAMPLE_PHOTO } from '@resumeos/shared/sample/samplePhoto.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { TemplatePreview } from '../../components/preview/TemplatePreview.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { cx } from '../../lib/cx.js';

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'one', label: 'One column', test: (t) => t.columns === 1 },
  { id: 'two', label: 'Two columns', test: (t) => t.columns === 2 },
  { id: 'photo', label: 'Supports a photo', test: (t) => Boolean(t.photo) },
  { id: 'accent', label: 'Accent colours', test: (t) => Boolean(t.accent) },
];

const samplePhotoFor = (t) => (t.photo ? SAMPLE_PHOTO : null);

function Features({ t }) {
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
            <Palette className="size-3" aria-hidden="true" /> Accent colours
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

function AccentSwatches({ template, value, onChange }) {
  const options = [
    { name: 'Template default', hex: template.accent.default },
    ...ACCENT_SWATCHES.filter((s) => s.hex !== template.accent.default),
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Accent colour"
      className="flex flex-wrap items-center gap-1.5"
    >
      {options.map((s) => {
        const selected = (value ?? template.accent.default) === s.hex;
        return (
          <button
            key={s.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={s.name}
            title={s.name}
            onClick={() => onChange(s.hex)}
            className={cx(
              'size-7 rounded-full border-2 transition-transform',
              selected ? 'scale-110 border-ink' : 'border-transparent',
            )}
            style={{ background: s.hex }}
          />
        );
      })}
    </div>
  );
}

function TemplateDetail({ template: t, onClose }) {
  const [pageSize, setPageSize] = useState('A4');
  const [accent, setAccent] = useState(null);
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={t.name}
      description={`${t.style}. Template version ${t.version}.`}
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <fieldset className="inline-flex rounded-md border border-rule p-0.5">
              <legend className="sr-only">Page size</legend>
              {['A4', 'Letter'].map((size) => (
                <label
                  key={size}
                  className={cx(
                    'cursor-pointer rounded-[5px] px-3 py-1 text-sm has-focus-visible:outline-2 has-focus-visible:outline-accent',
                    pageSize === size ? 'bg-sunken font-medium text-ink' : 'text-muted',
                  )}
                >
                  <input
                    type="radio"
                    name={`detail-size-${t.id}`}
                    value={size}
                    checked={pageSize === size}
                    onChange={() => setPageSize(size)}
                    className="sr-only"
                  />
                  {size === 'Letter' ? 'US Letter' : 'A4'}
                </label>
              ))}
            </fieldset>
            {t.accent && <AccentSwatches template={t} value={accent} onChange={setAccent} />}
          </div>
          <div className="theme-light overflow-hidden rounded-md shadow-paper">
            <TemplatePreview
              content={sampleResume}
              templateId={t.id}
              pageSize={pageSize}
              accentColor={accent}
              photo={samplePhotoFor(t)}
              title={`${t.name} template preview, ${pageSize}, sample data`}
            />
          </div>
          <p className="mt-2 text-xs text-faint">
            {SAMPLE_LABEL}
            {t.photo ? '; the photo is a placeholder silhouette.' : ''}
          </p>
        </div>
        <div className="grid content-start gap-5">
          <Features t={t} />
          <dl className="grid gap-4">
            {[
              ['Best for', t.bestFor],
              ['Trade-offs', t.tradeOffs],
              ['Parsing and accessibility', t.parsingNotes],
            ].map(([term, desc]) => (
              <div key={term}>
                <dt className="text-sm font-semibold text-ink">{term}</dt>
                <dd className="mt-1 text-sm text-muted">{desc}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`/app/resumes/new?template=${t.id}`}>Use {t.name}</ButtonLink>
          </div>
          <p className="text-xs text-faint">
            Asks you to sign in first. You can switch templates any time in the editor.
          </p>
        </div>
      </div>
    </Dialog>
  );
}

export function TemplatesPage() {
  useDocumentTitle('Templates');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const visible = useMemo(
    () => TEMPLATES.filter(FILTERS.find((f) => f.id === filter).test),
    [filter],
  );
  const open = TEMPLATES.find((t) => t.id === openId);

  return (
    <>
      <PageHeader
        title="Resume templates"
        lead="Classic and modern designs with icons, photos, sidebars and accent colours. Every one passes the same export checks before it ships, and each lists its trade-offs."
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div role="radiogroup" aria-label="Filter templates" className="mb-8 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
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
          <span className="self-center text-sm text-muted" aria-live="polite">
            {visible.length} {visible.length === 1 ? 'template' : 'templates'}
          </span>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <li
              key={t.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-rule bg-surface transition-shadow hover:shadow-paper"
            >
              <button
                type="button"
                onClick={() => setOpenId(t.id)}
                className="block bg-sunken p-4 text-left"
                aria-label={`Preview ${t.name}`}
              >
                <div className="theme-light pointer-events-none overflow-hidden rounded-md shadow-paper">
                  <TemplatePreview
                    content={sampleResume}
                    templateId={t.id}
                    firstPageOnly
                    photo={samplePhotoFor(t)}
                    title={`${t.name} thumbnail, sample data`}
                  />
                </div>
              </button>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{t.name}</h2>
                  <p className="text-sm text-muted">{t.style}</p>
                </div>
                <Features t={t} />
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  <ButtonLink to={`/app/resumes/new?template=${t.id}`} size="sm">
                    Use template
                  </ButtonLink>
                  <button
                    type="button"
                    onClick={() => setOpenId(t.id)}
                    className="h-8 rounded-md px-3 text-sm font-medium text-accent hover:bg-sunken"
                  >
                    Preview and details
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted">
          Applying through an applicant tracking system? Single-column templates, and Clarity in
          particular, are the safer choice. Two-column designs and photos suit referrals, networking
          and direct applications.
        </p>
      </div>
      {open && <TemplateDetail template={open} onClose={() => setOpenId(null)} />}
    </>
  );
}
