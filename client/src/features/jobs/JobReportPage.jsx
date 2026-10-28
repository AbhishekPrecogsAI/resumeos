import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { jobsApi, jobKey, JOBS_KEY } from '../../api/jobs.api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { AppPage } from '../../components/layout/AppPage.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { LoadingState, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { TermsEditor } from './TermsEditor.jsx';
import { CoverageReport } from './CoverageReport.jsx';

export function JobReportPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const job = useQuery({ queryKey: jobKey(jobId), queryFn: () => jobsApi.get(jobId) });
  useDocumentTitle(job.data ? job.data.title : 'Job description');

  const update = useMutation({
    mutationFn: (body) => jobsApi.update(jobId, body),
    onMutate: (body) => {
      const previous = queryClient.getQueryData(jobKey(jobId));
      if (body.terms)
        queryClient.setQueryData(jobKey(jobId), {
          ...previous,
          terms: body.terms,
          termsEdited: true,
        });
      return { previous };
    },
    onSuccess: (saved) => queryClient.setQueryData(jobKey(jobId), saved),
    onError: (err, _b, ctx) => {
      queryClient.setQueryData(jobKey(jobId), ctx.previous);
      toast.error("Couldn't save the term list", err.message);
    },
  });
  const remove = useMutation({
    mutationFn: () => jobsApi.remove(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      toast.success('Job description deleted');
      navigate('/app/jobs', { replace: true });
    },
    onError: (err) => toast.error("Couldn't delete the job description", err.message),
  });

  if (job.isPending) return <LoadingState label="Loading job description" />;
  if (job.isError)
    return (
      <ErrorState
        title={
          job.error.status === 404
            ? 'Job description not found'
            : "Couldn't load this job description"
        }
        error={job.error}
        onRetry={job.error.status === 404 ? undefined : job.refetch}
      />
    );
  const j = job.data;

  return (
    <AppPage
      title={j.title}
      description={j.company ? `at ${j.company}` : undefined}
      actions={
        <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" aria-hidden="true" /> Delete
        </Button>
      }
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="grid content-start gap-8">
          <section aria-labelledby="terms-heading">
            <h2 id="terms-heading" className="mb-3 text-lg font-semibold text-ink">
              Terms ({j.terms.length})
            </h2>
            <TermsEditor
              terms={j.terms}
              edited={j.termsEdited}
              onChange={(terms) => update.mutate({ terms })}
              onReset={() => update.mutate({ resetTerms: true })}
            />
          </section>
          <details className="rounded-lg border border-rule bg-surface">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
              Job description text
            </summary>
            <p className="max-h-96 overflow-auto border-t border-rule px-4 py-3 text-sm whitespace-pre-wrap text-muted">
              {j.descriptionText}
            </p>
          </details>
        </div>
        <section aria-labelledby="coverage-heading">
          <h2 id="coverage-heading" className="mb-3 text-lg font-semibold text-ink">
            Coverage
          </h2>
          <CoverageReport terms={j.terms} job={j} />
        </section>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title="Delete this job description?"
        description="The saved text and term list are deleted. Resumes tailored for it are kept; they just stop linking to it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              loadingLabel="Deleting"
              onClick={() => remove.mutate()}
            >
              Delete job description
            </Button>
          </>
        }
      />
    </AppPage>
  );
}
