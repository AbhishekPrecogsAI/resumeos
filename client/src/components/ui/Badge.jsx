import { cx } from '../../lib/cx.js';

const tones = {
  neutral: 'bg-sunken text-muted',
  accent: 'bg-accent-soft text-accent',
  added: 'bg-added-soft text-added',
  removed: 'bg-removed-soft text-removed',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
