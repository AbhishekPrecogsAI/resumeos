import { useState } from 'react';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { sampleResume, SAMPLE_LABEL } from '@resumeos/shared/sample/sampleResume.js';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { TemplatePreview } from '../../components/preview/TemplatePreview.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { cx } from '../../lib/cx.js';

function PageSizeSwitch({ value, onChange }) {
  return (
    <fieldset className="flex items-center gap-3">
      <legend className="sr-only">Preview page size</legend>
      <span aria-hidden="true" className="text-sm text-muted">
        Page size
      </span>
      <div className="inline-flex rounded-md border border-rule p-0.5">
        {['A4', 'Letter'].map((size) => (
          <label
            key={size}
            className={cx(
              'cursor-pointer rounded-[5px] px-3 py-1 text-sm has-focus-visible:outline-2 has-focus-visible:outline-accent',
              value === size ? 'bg-sunken font-medium text-ink' : 'text-muted hover:text-ink',
            )}
          >
            <input
              type="radio"
              name="page-size"
              value={size}
              checked={value === size}
              onChange={() => onChange(size)}
              className="sr-only"
            />
            {size === 'Letter' ? 'US Letter' : size}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function TemplatesPage() {
  useDocumentTitle('Templates');
  const [pageSize, setPageSize] = useState('A4');

  return (
    <>
      <PageHeader
        title="Templates"
        lead="We ship one template until it is excellent in preview and export. Each template lists its trade-offs, so you can choose knowingly."
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {TEMPLATES.map((t) => (
          <article
            key={t.id}
            aria-labelledby={`tpl-${t.id}`}
            className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
          >
            <div>
              <h2 id={`tpl-${t.id}`} className="text-2xl font-semibold text-ink">
                {t.name}
              </h2>
              <p className="mt-1 text-muted">
                {t.style}. Template version {t.version}.
              </p>
              <dl className="mt-6 grid gap-5">
                {[
                  ['Layout', t.columns === 1 ? 'One column' : `${t.columns} columns`],
                  ['Best for', t.bestFor],
                  ['Trade-offs', t.tradeOffs],
                  ['Parsing and accessibility', t.parsingNotes],
                ].map(([term, desc]) => (
                  <div key={term}>
                    <dt className="text-sm font-semibold text-ink">{term}</dt>
                    <dd className="mt-1 text-muted">{desc}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to={`/app/resumes/new?template=${t.id}`}>Use template</ButtonLink>
                <ButtonLink to={`/app/resumes/new?template=${t.id}`} variant="secondary">
                  Preview with my data
                </ButtonLink>
              </div>
              <p className="mt-3 text-sm text-faint">Both options ask you to sign in first.</p>
            </div>
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <PageSizeSwitch value={pageSize} onChange={setPageSize} />
                <p className="text-xs text-faint">{SAMPLE_LABEL}</p>
              </div>
              <div className="overflow-hidden rounded-sm shadow-paper">
                <TemplatePreview
                  content={sampleResume}
                  templateId={t.id}
                  pageSize={pageSize}
                  title={`${t.name} template preview, ${pageSize}, sample data`}
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
