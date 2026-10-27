import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth, safeNextPath, useSessionExpiryListener } from '../hooks/useAuth.jsx';
import { LoadingState, ErrorState } from '../components/ui/States.jsx';

export function RequireAuth() {
  useSessionExpiryListener();
  const { user, isLoading, error, refetch } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Checking your session" className="min-h-dvh" />;
  if (error)
    return (
      <ErrorState
        title="Couldn't check your session"
        error={error}
        onRetry={refetch}
        className="min-h-dvh"
      />
    );
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function RedirectIfSignedIn() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Checking your session" />;
  if (user) {
    const next = new URLSearchParams(location.search).get('next');
    return <Navigate to={safeNextPath(next)} replace />;
  }
  return <Outlet />;
}
