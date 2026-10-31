import { useState } from 'react';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { ACCENT_SWATCHES } from '@resumeos/shared/templates/color.js';
import { sampleResume, SAMPLE_LABEL } from '@resumeos/shared/sample/sampleResume.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import {
  TemplateGrid,
  TemplateFeatures,
  samplePhotoFor,
} from '../../components/templates/TemplateGrid.jsx';
import { TemplatePreview } from '../../components/preview/TemplatePreview.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { cx } from '../../lib/cx.js';

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
          <TemplateFeatures t={t} />
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
  const [openId, setOpenId] = useState(null);
  const open = TEMPLATES.find((t) => t.id === openId);

  return (
    <>
      <PageHeader
        title="Resume templates"
        accent="from classic to bold"
        lead="Pick a design, then type straight onto the page. Classic and modern templates with icons, photos, sidebars and colour options; every one passes the same export checks and lists its trade-offs."
      />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <TemplateGrid
          onCardClick={(t) => setOpenId(t.id)}
          renderActions={(t) => (
            <>
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
            </>
          )}
        />
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
