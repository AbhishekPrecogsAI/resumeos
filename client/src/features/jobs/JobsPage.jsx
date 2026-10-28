import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Plus } from 'lucide-react';
import { jobsApi, JOBS_KEY } from '../../api/jobs.api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { AppPage } from '../../components/layout/AppPage.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States.jsx';
import { formatRelative, formatDateTime } from '../../lib/formatters.js';

export function JobsPage() {
  useDocumentTitle('Job descriptions');
  const list = useQuery({ queryKey: JOBS_KEY, queryFn: () => jobsApi.list({ limit: 50 }) });
  return (
    <AppPage
      title="Job descriptions"
      description="Compare a job's terms with your resumes and profile."
      actions={
        <ButtonLink to="/app/jobs/new">
          <Plus className="size-4" aria-hidden="true" /> Add job description
        </ButtonLink>
      }
    >
      {list.isPending ? (
        <LoadingState label="Loading job descriptions" />
      ) : list.isError ? (
        <ErrorState
          title="Couldn't load job descriptions"
          error={list.error}
          onRetry={list.refetch}
        />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No saved job descriptions"
          description="Paste a job description to see which of its terms your resume already covers. Saving it is optional."
          action={<ButtonLink to="/app/jobs/new">Add a job description</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
          {list.data.items.map((j) => (
            <li key={j.id} className="px-4 py-3.5">
              <p className="flex flex-wrap items-center gap-2">
                <Link to={`/app/jobs/${j.id}`} className="font-medium text-ink hover:underline">
                  {j.title}
                </Link>
                {j.company && <span className="text-muted">at {j.company}</span>}
                {j.termsEdited && <Badge>Terms edited</Badge>}
              </p>
              <p className="text-sm text-muted">
                {j.termCount} terms. Updated{' '}
                <time dateTime={j.updatedAt} title={formatDateTime(j.updatedAt)}>
                  {formatRelative(j.updatedAt)}
                </time>
                .
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppPage>
  );
}
