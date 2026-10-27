export function SkipLink({ target = '#main' }) {
  return (
    <a
      href={target}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:font-medium focus:text-ink focus:shadow-paper"
    >
      Skip to content
    </a>
  );
}
