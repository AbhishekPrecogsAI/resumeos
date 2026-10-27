import { TextField, TextArea, SelectField, Checkbox } from '../ui/Field.jsx';
import { MonthField } from './MonthField.jsx';
import { TagsField } from './TagsField.jsx';
import { BulletsEditor } from './BulletsEditor.jsx';
import { cx } from '../../lib/cx.js';

function RelatedField({ label, hint, value = [], options = [], onChange }) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-sm font-medium text-ink">{label}</legend>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {options.length ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {options.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={value.includes(o.id)}
                onChange={(e) =>
                  onChange(e.target.checked ? [...value, o.id] : value.filter((x) => x !== o.id))
                }
              />
              {o.label}
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nothing to link yet.</p>
      )}
    </fieldset>
  );
}

/**
 * Renders form controls for one entry from a field configuration:
 * { key, label, type, hint, wide, options, disabledWhen(entry), optional }.
 */
export function EntryFields({ fields, value, onChange, context = {}, idPrefix }) {
  const set =
    (key, coalesce = true) =>
    (v, opts) =>
      onChange(
        { ...value, [key]: v },
        opts ?? (coalesce ? { coalesceKey: `${idPrefix}:${key}` } : undefined),
      );

  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      {fields.map((f) => {
        const disabled = f.disabledWhen?.(value) ?? false;
        const common = { label: f.label, hint: f.hint, disabled, optionalLabel: f.optional };
        const wide = f.wide || ['textarea', 'bullets', 'related'].includes(f.type);
        let control;
        switch (f.type) {
          case 'textarea':
            control = (
              <TextArea
                {...common}
                rows={f.rows ?? 3}
                maxLength={f.maxLength}
                value={value[f.key] ?? ''}
                onChange={(e) => set(f.key)(e.target.value)}
              />
            );
            break;
          case 'month':
            control = (
              <MonthField
                key={`${idPrefix}-${f.key}`}
                label={f.label}
                hint={f.hint}
                disabled={disabled}
                value={value[f.key] ?? ''}
                onChange={(v) => set(f.key, false)(v)}
              />
            );
            break;
          case 'checkbox':
            control = (
              <Checkbox
                label={f.label}
                hint={f.hint}
                checked={Boolean(value[f.key])}
                onChange={(e) => set(f.key, false)(e.target.checked)}
              />
            );
            break;
          case 'select':
            control = (
              <SelectField
                {...common}
                value={value[f.key] ?? ''}
                onChange={(e) => set(f.key, false)(e.target.value)}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            );
            break;
          case 'tags':
            control = (
              <TagsField
                {...common}
                value={value[f.key] ?? []}
                onChange={(v) => set(f.key, false)(v)}
              />
            );
            break;
          case 'bullets':
            control = (
              <BulletsEditor
                label={f.label}
                bullets={value[f.key] ?? []}
                onChange={(v, opts) => set(f.key)(v, opts ?? {})}
                evidenceItems={context.evidenceItems}
              />
            );
            break;
          case 'related':
            control = (
              <RelatedField
                label={f.label}
                hint={f.hint}
                value={value[f.key] ?? []}
                options={context.relatedOptions ?? []}
                onChange={(v) => set(f.key, false)(v)}
              />
            );
            break;
          default:
            control = (
              <TextField
                {...common}
                type={f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}
                inputMode={f.type === 'url' ? 'url' : undefined}
                placeholder={f.placeholder}
                autoComplete={f.autoComplete ?? 'off'}
                maxLength={f.maxLength}
                value={value[f.key] ?? ''}
                onChange={(e) => set(f.key)(e.target.value)}
                error={f.validate?.(value[f.key] ?? '')}
              />
            );
        }
        return (
          <div
            key={f.key}
            className={cx(wide && 'sm:col-span-2', f.type === 'checkbox' && 'self-end pb-2')}
          >
            {control}
          </div>
        );
      })}
    </div>
  );
}
