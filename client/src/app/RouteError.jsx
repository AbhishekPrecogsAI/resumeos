import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorState } from '../components/ui/States.jsx';
import { NotFoundPage } from '../features/public/NotFoundPage.jsx';

export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  // A stale deploy can fail to load a lazy chunk; a reload fixes it.
  const chunkFailed = /dynamically imported module|Importing a module script failed/i.test(
    error?.message ?? '',
  );
  return (
    <ErrorState
      title={chunkFailed ? 'A newer version is available' : 'This page hit an error'}
      error={{
        message: chunkFailed
          ? 'Reload to get the latest version.'
          : 'Reload the page to try again.',
      }}
      onRetry={() => window.location.reload()}
      className="py-24"
    />
  );
}
