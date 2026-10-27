import { useQuery } from '@tanstack/react-query';
import { getReadiness } from '../api/health.api.js';

const STATES = {
  loading: { label: 'Checking…', dot: 'bg-gray-400' },
  ok: { label: 'API and database reachable', dot: 'bg-emerald-600' },
  degraded: { label: 'API reachable, database unavailable', dot: 'bg-amber-500' },
  error: { label: "Couldn't reach the API", dot: 'bg-red-600' },
};

export function SystemStatus() {
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['health', 'ready'],
    queryFn: ({ signal }) => getReadiness({ signal }),
  });

  const key = isPending ? 'loading' : isError ? 'error' : data.status === 'ok' ? 'ok' : 'degraded';
  const state = STATES[key];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${state.dot}`} />
      <span role="status" aria-live="polite" className="text-gray-800">
        {state.label}
      </span>
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="ml-auto rounded-md px-2 py-1 font-medium text-accent-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:opacity-50"
      >
        Recheck
      </button>
    </div>
  );
}
