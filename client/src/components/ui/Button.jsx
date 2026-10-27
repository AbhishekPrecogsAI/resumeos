import { Link } from 'react-router';
import { cx } from '../../lib/cx.js';
import { Spinner } from './Spinner.jsx';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55 select-none';

const variants = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-rule-strong bg-surface text-ink hover:bg-sunken',
  ghost: 'text-ink hover:bg-sunken',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-sunken',
  link: 'text-accent underline-offset-4 hover:underline px-0! h-auto!',
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-[0.9375rem]',
  lg: 'h-12 px-5 text-base',
  icon: 'size-9',
};

export function buttonClasses({ variant = 'primary', size = 'md', className } = {}) {
  return cx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  loading = false,
  loadingLabel,
  disabled,
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" label={loadingLabel ?? 'Working'} />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, to, children, ...props }) {
  return (
    <Link to={to} className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
