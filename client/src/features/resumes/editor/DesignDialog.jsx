import { useId, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { FONT_CHOICES } from '@resumeos/shared/templates/fonts.js';
import { resolveSectionOrder, sectionTitle } from '@resumeos/shared/resumeModel.js';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { SelectField } from '../../../components/ui/Field.jsx';
import { resumesApi } from '../../../api/resumes.api.js';
import { TemplatePreview } from '../../../components/preview/TemplatePreview.jsx';
import { applyPreset, matchingPreset, presetsFor, sidebarSide } from '@resumeos/shared/layouts.js';
import { cx } from '../../../lib/cx.js';

const SPACING = [
  { id: 'compact', label: 'Compact' },
  { id: 'normal', label: 'Normal' },
  { id: 'relaxed', label: 'Relaxed' },
];

/** A small radio group drawn as joined buttons. */
function Segmented({ label, value, options, onChange, size = 'md' }) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      className="inline-flex rounded-md border border-rule-strong bg-surface p-0.5"
    >
      <span id={`${id}-label`} className="sr-only">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx(
            'rounded px-2.5 text-sm transition-colors',
            size === 'sm' ? 'h-7' : 'h-8',
            value === o.id ? 'bg-accent font-medium text-on-accent' : 'text-ink hover:bg-sunken',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Drop keys set to undefined, so default settings aren't stored at all. */
const withSettings = (layout, changes) => {
  const next = { ...layout, ...changes };
  for (const [k, v] of Object.entries(changes)) if (v === undefined) delete next[k];
  return next;
};

/**
 * Design settings stored in the resume layout: font, text size, spacing and, on two-column
 * templates, which column each section goes in. All of it is undoable like any other edit.
 */
export function DesignDialog({ open, onClose, resumeId, draft, setDraft, meta, flush, photo }) {
  const template = getTemplate(meta.templateId);
  const { content, layout } = draft;
  const [fit, setFit] = useState(null); // { status, message }
  const scale = layout.fontScale ?? 1;
  const spacing = layout.spacing ?? 'normal';
  const placement = layout.placement ?? {};
  const update = (changes) => setDraft((d) => ({ ...d, layout: withSettings(d.layout, changes) }));

  const setScale = (value) => update({ fontScale: value === 1 ? undefined : value });
  const setPlacement = (key, where) => {
    const next = { ...placement };
    if (where === 'default') delete next[key];
    else next[key] = where;
    update({ placement: Object.keys(next).length ? next : undefined });
  };

  const runFit = async () => {
    setFit({ status: 'working' });
    try {
      // The server measures the saved draft, so save pending edits first.
      if (flush && !(await flush())) {
        setFit({
          status: 'warn',
          message:
            "Your latest edits couldn't be saved, so they can't be measured. Fix the save problem and try again.",
        });
        return;
      }
      const result = await resumesApi.fitOnePage(resumeId);
      if (result.alreadyFits) setFit({ status: 'ok', message: 'It already fits on one page.' });
      else if (result.settings) {
        const { spacing: s, fontScale: f } = result.settings;
        update({ spacing: s === 'normal' ? undefined : s, fontScale: f === 1 ? undefined : f });
        setFit({
          status: 'ok',
          message: `Fits on one page with compact spacing${f < 1 ? ` and ${Math.round(f * 100)}% text` : ''}, measured on the exported PDF. Undo to go back.`,
        });
      } else
        setFit({
          status: 'warn',
          message: `Still ${result.pages} pages at the smallest setting (compact, 85% text). Hide older entries or shorten bullets, then try again.`,
        });
    } catch (err) {
      setFit({ status: 'warn', message: err.message || "Couldn't measure the page. Try again." });
    }
  };

  const columnSections = template.sideSections
    ? resolveSectionOrder(content, layout).filter(
        (key) => !(layout.hiddenSections ?? []).includes(key),
      )
    : [];
  const defaultFor = (key) =>
    template.fullWidthSections?.includes(key)
      ? 'full'
      : template.sideSections?.includes(key)
        ? 'side'
        : 'main';

  return (
    <Dialog
      open={open}
      onClose={() => {
        setFit(null);
        onClose();
      }}
      title="Design"
      size="lg"
      description="Font, size and spacing for this resume. Your text doesn't change."
    >
      <div className="grid gap-6">
        <section aria-labelledby="design-layout" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 id="design-layout" className="text-sm font-medium text-ink">
              Layout
            </h3>
            {template.sideSections && (
              <Segmented
                label="Sidebar side"
                value={sidebarSide(template, layout)}
                options={[
                  { id: 'left', label: 'Sidebar left' },
                  { id: 'right', label: 'Sidebar right' },
                ]}
                onChange={(id) =>
                  update({ sidebarSide: id === template.sidebarSide ? undefined : id })
                }
              />
            )}
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Layout presets">
            {presetsFor(template).map((preset) => {
              const applied = applyPreset(template, content, layout, preset.id);
              const current = matchingPreset(template, content, layout) === preset.id;
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    aria-pressed={current}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        layout: applyPreset(template, d.content, d.layout, preset.id),
                      }))
                    }
                    className={cx(
                      'group block w-full rounded-lg border-2 p-1.5 text-left transition-colors',
                      current ? 'border-accent' : 'border-rule hover:border-rule-strong',
                    )}
                  >
                    <span className="theme-light pointer-events-none block overflow-hidden rounded bg-white">
                      <TemplatePreview
                        content={content}
                        layout={applied}
                        templateId={template.id}
                        pageSize={meta.pageSize}
                        accentColor={meta.accentColor}
                        pattern={meta.backgroundPattern}
                        photo={photo}
                        firstPageOnly
                        lazy
                        title={`${preset.name} layout preview`}
                      />
                    </span>
                    <span className="mt-1.5 block text-xs font-medium text-ink">{preset.name}</span>
                    <span className="block text-[11px] leading-snug text-muted">
                      {preset.description}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <SelectField
          label="Font"
          hint={
            layout.font
              ? 'Used for body text. Templates with a display font keep it for your name and headings.'
              : undefined
          }
          value={layout.font ?? ''}
          onChange={(e) => update({ font: e.target.value || undefined })}
        >
          <option value="">Template default ({template.fonts.at(-1)})</option>
          {['Sans-serif', 'Serif'].map((kind) => (
            <optgroup key={kind} label={kind}>
              {FONT_CHOICES.filter((f) => f.kind === kind).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="design-size" className="text-sm font-medium text-ink">
              Text size
            </label>
            <span className="text-sm tabular-nums text-muted">{Math.round(scale * 100)}%</span>
          </div>
          <input
            id="design-size"
            type="range"
            min="0.8"
            max="1.2"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            aria-valuetext={`${Math.round(scale * 100)}%`}
            className="mt-2 w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-faint">
            <span>80%</span>
            <button
              type="button"
              onClick={() => setScale(1)}
              disabled={scale === 1}
              className="text-accent underline-offset-2 hover:underline disabled:text-faint disabled:no-underline"
            >
              Reset to 100%
            </button>
            <span>120%</span>
          </div>
        </div>

        <div className="grid gap-2">
          <p className="text-sm font-medium text-ink">Spacing</p>
          <Segmented
            label="Spacing"
            value={spacing}
            options={SPACING}
            onChange={(id) => update({ spacing: id === 'normal' ? undefined : id })}
          />
        </div>

        <div className="rounded-lg border border-rule bg-sunken/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink">Fit to one page</p>
              <p className="text-sm text-muted">
                Tightens spacing, then reduces text size down to 85%, until the exported PDF is one
                page.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={runFit}
              loading={fit?.status === 'working'}
              loadingLabel="Measuring"
            >
              <Minimize2 className="size-4" aria-hidden="true" /> Fit to one page
            </Button>
          </div>
          {fit && fit.status !== 'working' && (
            <p
              role="status"
              className={cx('mt-2 text-sm', fit.status === 'ok' ? 'text-added' : 'text-warn')}
            >
              {fit.message}
            </p>
          )}
        </div>

        {template.sideSections ? (
          <section aria-labelledby="design-columns">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 id="design-columns" className="text-sm font-medium text-ink">
                Section columns
              </h3>
              {Object.keys(placement).length > 0 && (
                <button
                  type="button"
                  onClick={() => update({ placement: undefined })}
                  className="text-sm text-accent underline-offset-2 hover:underline"
                >
                  Reset to {template.name}'s layout
                </button>
              )}
            </div>
            <ul className="grid gap-1.5">
              {columnSections.map((key) => {
                const fallback = defaultFor(key);
                const current = placement[key] ?? fallback;
                const options = [
                  ...(fallback === 'full' ? [{ id: 'full', label: 'Full width' }] : []),
                  { id: 'main', label: 'Main' },
                  { id: 'side', label: 'Side' },
                ];
                return (
                  <li key={key} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-ink">
                      {sectionTitle(content, key)}
                    </span>
                    <Segmented
                      label={`Column for ${sectionTitle(content, key)}`}
                      size="sm"
                      value={current}
                      options={options}
                      onChange={(id) => setPlacement(key, id === fallback ? 'default' : id)}
                    />
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-faint">
              The side column is read first by applicant tracking systems, so keep your main
              experience in the main column.
            </p>
          </section>
        ) : (
          <p className="text-sm text-muted">
            {template.name} is a single-column template, so every section runs full width.
            {layout.placement && ' Column choices you made on another template are kept.'}
          </p>
        )}
      </div>
    </Dialog>
  );
}
