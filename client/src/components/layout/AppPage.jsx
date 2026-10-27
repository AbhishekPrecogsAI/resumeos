import { cx } from '../../lib/cx.js';

export function AppPage({ title, description, actions, children, width = 'default' }) {
  return (
    <div
      className={cx(
        'mx-auto w-full px-4 py-8 sm:px-6 lg:py-10',
        width === 'narrow' ? 'max-w-3xl' : width === 'wide' ? 'max-w-[90rem]' : 'max-w-5xl',
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Panel({ title, description, children, className, footer }) {
  return (
    <section className={cx('rounded-lg border border-rule bg-surface', className)}>
      {(title || description) && (
        <div className="border-b border-rule px-5 py-4">
          {title && <h2 className="font-semibold text-ink">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      )}
      <div className="px-5 py-5">{children}</div>
      {footer && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-rule px-5 py-3">
          {footer}
        </div>
      )}
    </section>
  );
}
