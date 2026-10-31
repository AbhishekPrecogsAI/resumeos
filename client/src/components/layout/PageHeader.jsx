import { useParallax } from '../../hooks/useParallax.js';
import { cx } from '../../lib/cx.js';

/**
 * Header for public pages, in the landing page's style: drifting gradient glows (scroll
 * parallax), a dot grid, and an optional gradient phrase after the title.
 */
export function PageHeader({ title, accent, lead, children, align = 'left' }) {
  const ref = useParallax();
  return (
    <div ref={ref} className="page-hero relative isolate overflow-hidden border-b border-rule">
      <div className="hero2-mesh" aria-hidden="true">
        <span className="glow glow-indigo" data-parallax="0.2" />
        <span className="glow glow-pink" data-parallax="0.32" />
        <span className="glow glow-amber" data-parallax="0.14" />
      </div>
      <div className="hero2-dots" aria-hidden="true" />
      <div
        className={cx(
          'mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 lg:pt-20 lg:pb-16',
          align === 'center' && 'text-center',
        )}
      >
        <h1
          className={cx(
            'max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-balance text-ink sm:text-5xl lg:text-[3.4rem] lg:leading-[1.06]',
            align === 'center' && 'mx-auto',
          )}
        >
          {title}
          {accent && (
            <>
              {' '}
              <span className="grad-text">{accent}</span>
            </>
          )}
        </h1>
        {lead && (
          <p
            className={cx(
              'mt-5 max-w-2xl text-lg leading-relaxed text-muted',
              align === 'center' && 'mx-auto',
            )}
          >
            {lead}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

/** Long-form text (legal, security) in a frosted card on a soft glow. */
export function Prose({ children }) {
  return (
    <div className="relative isolate px-4 py-12 sm:px-6 lg:py-16">
      <div className="section-glow section-glow-right" aria-hidden="true">
        <span />
      </div>
      <div className="glass-card mx-auto max-w-3xl p-6 sm:p-10 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_h2:first-child]:mt-0 [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:text-muted [&_strong]:text-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted [&_ul]:marker:text-[var(--g-violet)]">
        {children}
      </div>
    </div>
  );
}
