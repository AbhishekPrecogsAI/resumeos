import { cx } from '../../lib/cx.js';

const sizes = { sm: 'size-4 border-2', md: 'size-6 border-2', lg: 'size-8 border-[3px]' };

export function Spinner({ size = 'md', label = 'Loading', className }) {
  return (
    <span role="status" className={cx('inline-flex', className)}>
      <span
        aria-hidden="true"
        className={cx(
          'animate-spin rounded-full border-current border-r-transparent opacity-80',
          sizes[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
