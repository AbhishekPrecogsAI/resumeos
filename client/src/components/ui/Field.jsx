import { useId } from 'react';
import { cx } from '../../lib/cx.js';

const control =
  'block w-full rounded-md border bg-surface px-3 text-ink placeholder:text-faint transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent disabled:bg-sunken disabled:text-muted';

function useFieldIds(id, hint, error) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return {
    inputId,
    hintId,
    errorId,
    describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined,
  };
}

function FieldShell({
  label,
  hint,
  error,
  required,
  inputId,
  hintId,
  errorId,
  className,
  children,
  optionalLabel,
}) {
  return (
    <div className={cx('grid gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="text-muted"> (required)</span>
        ) : optionalLabel ? (
          <span className="font-normal text-muted"> (optional)</span>
        ) : null}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  id,
  className,
  required,
  optionalLabel,
  inputClassName,
  ...props
}) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell
      {...ids}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
      className={className}
    >
      <input
        id={ids.inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cx(
          control,
          'h-10',
          error ? 'border-danger' : 'border-rule-strong',
          inputClassName,
        )}
        {...props}
      />
    </FieldShell>
  );
}

export function TextArea({
  label,
  hint,
  error,
  id,
  className,
  required,
  optionalLabel,
  rows = 4,
  ...props
}) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell
      {...ids}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
      className={className}
    >
      <textarea
        id={ids.inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cx(
          control,
          'py-2 leading-relaxed',
          error ? 'border-danger' : 'border-rule-strong',
        )}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, id, className, required, children, ...props }) {
  const ids = useFieldIds(id, hint, error);
  return (
    <FieldShell
      {...ids}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <select
        id={ids.inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cx(control, 'h-10 pr-8', error ? 'border-danger' : 'border-rule-strong')}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function Checkbox({ label, hint, id, className, ...props }) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className={cx('flex gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
        {...props}
      />
      <div>
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint && (
          <p id={`${inputId}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
