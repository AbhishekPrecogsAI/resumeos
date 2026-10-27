import { useId, useState } from 'react';
import { parseMonth } from '@resumeos/shared/dates.js';
import { cx } from '../../lib/cx.js';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const control =
  'h-10 rounded-md border border-rule-strong bg-surface px-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:bg-sunken disabled:text-muted';

/**
 * Month + year picker storing "YYYY-MM", "YYYY" or "". Uses a select and a text input rather than
 * <input type="month">, which isn't supported in every browser. Month is optional.
 */
export function MonthField({ label, value, onChange, disabled, hint }) {
  const id = useId();
  const parsed = parseMonth(value);
  const [yearText, setYearText] = useState(parsed ? String(parsed.year) : '');
  const [prevValue, setPrevValue] = useState(value);
  // Follow external changes (undo, sync from profile) without clobbering a half-typed year.
  if (value !== prevValue) {
    setPrevValue(value);
    const external = parsed ? String(parsed.year) : '';
    if (external !== yearText && (value || /^\d{4}$/.test(yearText))) setYearText(external);
  }
  const month = parsed?.month ? String(parsed.month).padStart(2, '0') : '';
  const yearValid = /^\d{4}$/.test(yearText);

  const emit = (y, m) => {
    if (!y) onChange('');
    else if (/^\d{4}$/.test(y)) onChange(m ? `${y}-${m}` : y);
  };

  return (
    <fieldset className="grid gap-1.5" disabled={disabled}>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="flex gap-2">
        <label htmlFor={`${id}-m`} className="sr-only">
          {label} month
        </label>
        <select
          id={`${id}-m`}
          value={month}
          onChange={(e) => emit(yearText, e.target.value)}
          className={cx(control, 'min-w-0 flex-1')}
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, '0')}>
              {name}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-y`} className="sr-only">
          {label} year
        </label>
        <input
          id={`${id}-y`}
          inputMode="numeric"
          placeholder="Year"
          maxLength={4}
          value={yearText}
          aria-invalid={yearText && !yearValid ? true : undefined}
          aria-describedby={hint || (yearText && !yearValid) ? `${id}-hint` : undefined}
          onChange={(e) => {
            const y = e.target.value.replace(/\D/g, '').slice(0, 4);
            setYearText(y);
            emit(y, month);
          }}
          className={cx(control, 'w-24', yearText && !yearValid && 'border-danger')}
        />
      </div>
      {yearText && !yearValid ? (
        <p id={`${id}-hint`} className="text-sm font-medium text-danger">
          Enter a four-digit year.
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}
