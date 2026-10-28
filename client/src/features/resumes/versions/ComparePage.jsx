import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { versionsApi } from '../../../api/versions.api.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { AppPage } from '../../../components/layout/AppPage.jsx';
import { ButtonLink } from '../../../components/ui/Button.jsx';
import { LoadingState, ErrorState } from '../../../components/ui/States.jsx';
import { DiffView } from '../../../components/versioning/DiffView.jsx';
import { formatDateTime } from '../../../lib/formatters.js';

function SideLabel({ meta, side }) {
  return (
    <div className="min-w-0 rounded-lg border border-rule bg-surface px-4 py-3">
      <p className="text-xs font-medium text-muted">{side}</p>
      <p className="truncate font-medium text-ink">{meta.label}</p>
      <p className="text-sm text-muted">
        {meta.type === 'draft'
          ? `Unsaved working copy, revision ${meta.draftRevision}`
          : `Saved ${formatDateTime(meta.createdAt)}`}
      </p>
    </div>
  );
}

export function ComparePage() {
  const { resumeId, leftVersionId, rightVersionId } = useParams();
  useDocumentTitle('Compare versions');
  const query = useQuery({
    queryKey: ['compare', resumeId, leftVersionId, rightVersionId],
    queryFn: () => versionsApi.compare(resumeId, leftVersionId, rightVersionId),
  });

  return (
    <AppPage
      title="Compare versions"
      actions={
        <ButtonLink to={`/app/resumes/${resumeId}/versions`} variant="secondary">
          <ArrowLeft className="size-4" aria-hidden="true" /> Version history
        </ButtonLink>
      }
    >
      {query.isPending ? (
        <LoadingState label="Comparing" />
      ) : query.isError ? (
        <ErrorState
          title={
            query.error.status === 404
              ? 'One of these versions no longer exists'
              : "Couldn't compare these versions"
          }
          error={query.error}
          onRetry={query.error.status === 404 ? undefined : query.refetch}
        />
      ) : (
        <div className="grid gap-6">
          <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <SideLabel meta={query.data.left} side="Before" />
            <span aria-hidden="true" className="hidden text-faint sm:block">
              →
            </span>
            <SideLabel meta={query.data.right} side="After" />
          </div>
          <DiffView diff={query.data.diff} />
          <p className="text-sm text-muted">
            <Link
              to={`/app/resumes/${resumeId}/compare/${rightVersionId}/${leftVersionId}`}
              className="text-accent underline underline-offset-2"
            >
              Swap before and after
            </Link>
          </p>
        </div>
      )}
    </AppPage>
  );
}
