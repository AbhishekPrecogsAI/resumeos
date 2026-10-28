import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, FileText, History, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { resumesApi } from '../../api/resumes.api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { AppPage } from '../../components/layout/AppPage.jsx';
import { Button, ButtonLink } from '../../components/ui/Button.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { Checkbox } from '../../components/ui/Field.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatRelative, formatDateTime } from '../../lib/formatters.js';
import { RESUMES_KEY } from './resumeQueries.js';
import { ShareDialog } from './editor/ShareDialog.jsx';

const PAGE_SIZE = 20;

export function ResumesPage() {
  useDocumentTitle('Resumes');
  const [page, setPage] = useState(1);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [sharing, setSharing] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  const list = useQuery({
    queryKey: [...RESUMES_KEY, { page, includeArchived }],
    queryFn: () => resumesApi.list({ page, limit: PAGE_SIZE, includeArchived }),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: RESUMES_KEY });
  const duplicate = useMutation({
    mutationFn: (r) => resumesApi.duplicate(r.id),
    onSuccess: (copy) => {
      invalidate();
      toast.success('Resume duplicated', `"${copy.title}" is ready to edit.`);
      navigate(`/app/resumes/${copy.id}/edit`);
    },
    onError: (err) => toast.error("Couldn't duplicate the resume", err.message),
  });
  const remove = useMutation({
    mutationFn: (r) => resumesApi.remove(r.id),
    onSuccess: (_, r) => {
      setPendingDelete(null);
      invalidate();
      toast.success('Resume deleted', `"${r.title}" was removed.`);
    },
    onError: (err) => toast.error("Couldn't delete the resume", err.message),
  });
  const archive = useMutation({
    mutationFn: ({ r, archived }) => resumesApi.update(r.id, { archived }),
    onSuccess: (_, { archived }) => {
      invalidate();
      toast.success(archived ? 'Resume archived' : 'Resume restored');
    },
    onError: (err) => toast.error("Couldn't update the resume", err.message),
  });

  const data = list.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <AppPage
      title="Resumes"
      description="Each resume is its own copy of your profile, tailored for a role."
      actions={
        <ButtonLink to="/app/resumes/new">
          <Plus className="size-4" aria-hidden="true" /> New resume
        </ButtonLink>
      }
    >
      <Checkbox
        label="Show archived resumes"
        checked={includeArchived}
        onChange={(e) => {
          setIncludeArchived(e.target.checked);
          setPage(1);
        }}
        className="mb-4"
      />
      {list.isPending ? (
        <LoadingState label="Loading resumes" />
      ) : list.isError ? (
        <ErrorState title="Couldn't load your resumes" error={list.error} onRetry={list.refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={includeArchived ? 'No resumes yet' : 'No active resumes'}
          description="Create a resume from your master profile. You can tailor it without changing the profile."
          action={<ButtonLink to="/app/resumes/new">Create your first resume</ButtonLink>}
        />
      ) : (
        <>
          <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
            {data.items.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/app/resumes/${r.id}/edit`}
                      className="font-medium text-ink hover:underline"
                    >
                      {r.title}
                    </Link>
                    {r.archived && <Badge>Archived</Badge>}
                  </p>
                  <p className="text-sm text-muted">
                    {[
                      r.targetRole,
                      getTemplate(r.templateId)?.name,
                      r.pageSize === 'Letter' ? 'US Letter' : 'A4',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                    . Edited{' '}
                    <time dateTime={r.updatedAt} title={formatDateTime(r.updatedAt)}>
                      {formatRelative(r.updatedAt)}
                    </time>
                    .
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <ButtonLink
                    to={`/app/resumes/${r.id}/edit`}
                    variant="secondary"
                    size="sm"
                    aria-label={`Edit ${r.title}`}
                  >
                    <Pencil className="size-4" aria-hidden="true" /> Edit
                  </ButtonLink>
                  <ButtonLink
                    to={`/app/resumes/${r.id}/versions`}
                    variant="ghost"
                    size="sm"
                    aria-label={`Version history of ${r.title}`}
                  >
                    <History className="size-4" aria-hidden="true" /> History
                  </ButtonLink>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSharing(r)}
                    aria-label={`Share ${r.title}`}
                  >
                    <Share2 className="size-4" aria-hidden="true" /> Share
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicate.mutate(r)}
                    disabled={duplicate.isPending}
                    aria-label={`Duplicate ${r.title}`}
                  >
                    <Copy className="size-4" aria-hidden="true" /> Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => archive.mutate({ r, archived: !r.archived })}
                    aria-label={`${r.archived ? 'Restore' : 'Archive'} ${r.title}`}
                  >
                    {r.archived ? 'Restore' : 'Archive'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(r)}
                    aria-label={`Delete ${r.title}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav
              aria-label="Resume pages"
              className="mt-4 flex items-center justify-between gap-3 text-sm"
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-muted">
                Page {page} of {pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}

      <ShareDialog
        open={Boolean(sharing)}
        onClose={() => setSharing(null)}
        resumeId={sharing?.id}
        resumeTitle={sharing?.title}
      />
      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        size="sm"
        title={`Delete "${pendingDelete?.title}"?`}
        description="The resume and its draft are deleted permanently. Your master profile isn't affected. Archive it instead if you might need it later."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              loadingLabel="Deleting"
              onClick={() => remove.mutate(pendingDelete)}
            >
              Delete resume
            </Button>
          </>
        }
      />
    </AppPage>
  );
}
