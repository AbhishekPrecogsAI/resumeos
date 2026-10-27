export function PageHeader({ title, lead, children }) {
  return (
    <div className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.02em] text-balance text-ink sm:text-5xl">
          {title}
        </h1>
        {lead && <p className="mt-5 max-w-2xl text-lg text-muted">{lead}</p>}
        {children}
      </div>
    </div>
  );
}

export function Prose({ children }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:text-muted [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-ink">
      {children}
    </div>
  );
}
