export function AuthShell({ title, lead, children, footer }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      {lead && <p className="mt-2 text-muted">{lead}</p>}
      <div className="mt-8">{children}</div>
      {footer && <div className="mt-8 border-t border-rule pt-6 text-sm text-muted">{footer}</div>}
    </div>
  );
}
