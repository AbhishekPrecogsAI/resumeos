import { ButtonLink } from '../../components/ui/Button.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="page-hero relative isolate overflow-hidden">
      <div className="hero2-mesh" aria-hidden="true">
        <span className="glow glow-indigo" />
        <span className="glow glow-pink" />
      </div>
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <p className="grad-text text-7xl font-semibold tracking-tight sm:text-8xl">404</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
          There's no page at this address
        </h1>
        <p className="mt-3 text-muted">Check the link, or go back to the start.</p>
        <ButtonLink to="/" className="grad-button mt-8">
          Go to the home page
        </ButtonLink>
      </div>
    </div>
  );
}
