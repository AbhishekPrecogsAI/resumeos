import { useEffect, useId, useRef, useState } from 'react';
import { Check, Layers } from 'lucide-react';
import { PATTERNS, patternLayer } from '@resumeos/shared/templates/patterns.js';
import { cx } from '../../lib/cx.js';

const swatchStyle = (id, accent) => {
  const layer = patternLayer(id, accent);
  return { background: layer ? `${layer}, #fff` : '#fff' };
};

/**
 * Page background pattern for templates with an accent. Patterns are faint, tinted from the
 * accent, and drawn as a background layer, so they never change text or reading order.
 */
export function PatternPicker({ value = 'none', accent, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();
  const current = PATTERNS.find((p) => p.id === value) ?? PATTERNS[0];

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

  const choose = (next) => {
    onChange(next);
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
          style={swatchStyle(current.id, accent)}
        />
        <span className="hidden sm:inline">Background</span>
        <span className="sr-only">: {current.name}</span>
      </button>
      {open && (
        <div
          id={`${id}-panel`}
          className="absolute right-0 z-30 mt-1.5 w-72 rounded-lg border border-rule bg-surface p-3 shadow-paper"
        >
          <p
            id={`${id}-label`}
            className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink"
          >
            <Layers className="size-4 text-muted" aria-hidden="true" /> Page background
          </p>
          <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid grid-cols-3 gap-2">
            {PATTERNS.map((p) => {
              const selected = current.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choose(p.id)}
                  className="group grid gap-1 text-left"
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'relative grid h-14 place-items-center rounded-md border-2',
                      selected ? 'border-ink' : 'border-rule group-hover:border-rule-strong',
                    )}
                    style={swatchStyle(p.id, accent)}
                  >
                    {selected && <Check className="size-4 rounded-full bg-ink p-0.5 text-white" />}
                  </span>
                  <span className={cx('text-xs', selected ? 'font-medium text-ink' : 'text-muted')}>
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">
            Patterns are faint and sit behind the text, so they don't affect what applicant tracking
            systems read. Word exports stay plain.
          </p>
        </div>
      )}
    </div>
  );
}
