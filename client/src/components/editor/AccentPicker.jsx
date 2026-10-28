import { useEffect, useId, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { ACCENT_SWATCHES, accentProblem } from '@resumeos/shared/templates/color.js';
import { cx } from '../../lib/cx.js';

/**
 * Accent colour choice for templates that support it. Swatches are pre-checked for contrast;
 * a custom colour is accepted only if it's readable as text on white and behind white text.
 */
export function AccentPicker({ value, defaultAccent, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(value ?? '');
  const ref = useRef(null);
  const id = useId();
  const current = value ?? defaultAccent;
  const problem = custom ? accentProblem(custom.trim()) : null;

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (hex) => {
    onChange(hex);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-md border border-rule-strong bg-surface px-2 text-sm text-ink hover:bg-sunken"
      >
        <span
          aria-hidden="true"
          className="size-4 rounded-sm border border-rule"
          style={{ background: current }}
        />
        <span className="hidden sm:inline">Accent</span>
        <span className="sr-only">
          colour:{' '}
          {value
            ? (ACCENT_SWATCHES.find((s) => s.hex === value)?.name ?? value)
            : 'template default'}
        </span>
      </button>
      {open && (
        <div
          id={`${id}-panel`}
          className="absolute right-0 z-30 mt-1.5 w-64 rounded-lg border border-rule bg-surface p-3 shadow-paper"
        >
          <p
            id={`${id}-label`}
            className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink"
          >
            <Palette className="size-4 text-muted" aria-hidden="true" /> Accent colour
          </p>
          <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid grid-cols-4 gap-2">
            {ACCENT_SWATCHES.map((s) => {
              const selected = value === s.hex;
              return (
                <button
                  key={s.hex}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={s.name}
                  title={s.name}
                  onClick={() => choose(s.hex)}
                  className={cx(
                    'grid h-8 place-items-center rounded-md border-2',
                    selected ? 'border-ink' : 'border-transparent',
                  )}
                  style={{ background: s.hex }}
                >
                  {selected && <Check className="size-4 text-white" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            role="radio"
            aria-checked={!value}
            onClick={() => choose(null)}
            className={cx(
              'mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sunken',
              !value ? 'font-medium text-ink' : 'text-muted',
            )}
          >
            <span
              aria-hidden="true"
              className="size-4 rounded-sm"
              style={{ background: defaultAccent }}
            />
            Template default
          </button>
          <form
            className="mt-3 border-t border-rule pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              const hex = custom.trim().toLowerCase();
              if (!accentProblem(hex)) choose(hex);
            }}
          >
            <label htmlFor={`${id}-custom`} className="text-sm font-medium text-ink">
              Custom colour
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="color"
                aria-label="Pick a custom colour"
                value={/^#[0-9a-f]{6}$/i.test(custom) ? custom : current}
                onChange={(e) => setCustom(e.target.value)}
                className="h-9 w-10 shrink-0 cursor-pointer rounded border border-rule-strong bg-surface p-0.5"
              />
              <input
                id={`${id}-custom`}
                value={custom}
                placeholder="#1f4fb4"
                maxLength={7}
                spellCheck={false}
                onChange={(e) => setCustom(e.target.value)}
                aria-invalid={problem ? true : undefined}
                aria-describedby={`${id}-hint`}
                className="h-9 min-w-0 flex-1 rounded-md border border-rule-strong bg-surface px-2 font-mono text-sm text-ink"
              />
              <button
                type="submit"
                disabled={!custom || Boolean(problem)}
                className="h-9 rounded-md bg-accent px-3 text-sm font-medium text-on-accent disabled:opacity-50"
              >
                Use
              </button>
            </div>
            <p
              id={`${id}-hint`}
              className={cx('mt-1.5 text-xs', problem ? 'font-medium text-danger' : 'text-muted')}
            >
              {problem ?? 'Must be dark enough to read as text and behind white text.'}
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
