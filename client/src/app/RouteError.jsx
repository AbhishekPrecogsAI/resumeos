import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorState } from '../components/ui/States.jsx';
import { NotFoundPage } from '../features/public/NotFoundPage.jsx';

// Loading a page's code failed: a deploy (or, in development, an edit) replaced modules this tab
// still refers to. Chrome, Firefox and Safari word it differently.
const STALE_CODE =
  /dynamically imported module|Importing a module script failed|does not provide an export named|Failed to fetch|error loading dynamically imported module/i;
const RELOADED_KEY = 'resumeos:reloadedForStaleCode';

export function isStaleCodeError(error) {
  return STALE_CODE.test(error?.message ?? '');
}

export function RouteError() {
  const error = useRouteError();
  const stale = isStaleCodeError(error);

  // Reload once to pick up current code; if that didn't help, show the error instead of looping.
  useEffect(() => {
    if (!stale) return;
    try {
      if (sessionStorage.getItem(RELOADED_KEY) === window.location.pathname) return;
      sessionStorage.setItem(RELOADED_KEY, window.location.pathname);
    } catch {
      return;
    }
    window.location.reload();
  }, [stale]);

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <ErrorState
      title={stale ? 'A newer version is available' : 'This page hit an error'}
      error={{
        message: stale ? 'Reload to get the latest version.' : 'Reload the page to try again.',
      }}
      onRetry={() => window.location.reload()}
      className="py-24"
    >
      {import.meta.env.DEV && error && (
        <pre className="mx-auto mt-6 max-w-2xl overflow-x-auto rounded-md bg-sunken p-3 text-left text-xs text-muted">
          {String(error?.stack ?? error?.message ?? error)}
        </pre>
      )}
    </ErrorState>
  );
}
