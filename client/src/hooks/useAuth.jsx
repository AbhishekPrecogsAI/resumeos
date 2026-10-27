import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api.js';
import { ApiError, UNAUTHORIZED_EVENT } from '../api/client.js';

export const ME_KEY = ['auth', 'me'];

async function fetchMe({ signal }) {
  try {
    return (await authApi.me({ signal })).user;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/** Current user: undefined while loading, null when signed out. */
export function useAuth() {
  const query = useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 5 * 60_000, retry: 1 });
  return {
    user: query.data,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Any API 401 means the session ended elsewhere: drop the cached user and all private data. */
export function useSessionExpiryListener() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const onUnauthorized = () => {
      if (queryClient.getQueryData(ME_KEY)) {
        queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
        queryClient.setQueryData(ME_KEY, null);
      }
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [queryClient]);
}

export function useSignedIn() {
  const queryClient = useQueryClient();
  return (user) => {
    queryClient.clear();
    queryClient.setQueryData(ME_KEY, user);
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(ME_KEY, null);
    },
  });
}

/** Only allow redirects to in-app paths, never to other origins. */
export function safeNextPath(next, fallback = '/app') {
  if (
    typeof next !== 'string' ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('\\')
  )
    return fallback;
  return next;
}
