import { ButtonLink } from '../../components/ui/Button.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="mx-auto max-w-xl px-4 py-24 sm:px-6">
      <p className="font-mono text-sm text-faint">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
        There's no page at this address
      </h1>
      <p className="mt-3 text-muted">Check the link, or go back to the start.</p>
      <ButtonLink to="/" variant="secondary" className="mt-6">
        Go to the home page
      </ButtonLink>
    </div>
  );
}
