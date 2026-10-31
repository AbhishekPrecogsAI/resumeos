import { LogoMark } from '../../components/layout/Logo.jsx';

/** Sign-in, registration and password pages: a frosted card over the site's gradient glows. */
export function AuthShell({ title, lead, children, footer }) {
  return (
    <div className="page-hero relative isolate overflow-hidden px-4 py-12 sm:py-20">
      <div className="hero2-mesh" aria-hidden="true">
        <span className="glow glow-indigo" />
        <span className="glow glow-pink" />
        <span className="glow glow-amber" />
      </div>
      <div className="hero2-dots" aria-hidden="true" />
      <div className="glass-card mx-auto w-full max-w-md p-6 sm:p-8">
        <LogoMark className="size-10" />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {lead && <p className="mt-2 text-muted">{lead}</p>}
        <div className="mt-8">{children}</div>
        {footer && (
          <div className="mt-8 border-t border-rule pt-6 text-sm text-muted">{footer}</div>
        )}
      </div>
    </div>
  );
}
