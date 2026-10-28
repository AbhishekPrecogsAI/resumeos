import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  applicationsApi,
  APPLICATIONS_KEY,
  STATUSES,
  STATUS_BY_VALUE,
  OPEN_STATUSES,
  formatDay,
  localToday,
} from '../../api/applications.api.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { AppPage } from '../../components/layout/AppPage.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { cx } from '../../lib/cx.js';
import { ApplicationDialog } from './ApplicationDialog.jsx';

export function ApplicationsPage() {
  useDocumentTitle('Applications');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const today = localToday();
  const list = useQuery({
    queryKey: [...APPLICATIONS_KEY, { status }],
    queryFn: () => applicationsApi.list({ status: status || undefined }),
  });

  const remove = useMutation({
    mutationFn: (a) => applicationsApi.remove(a.id),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
      toast.success('Application deleted');
    },
    onError: (err) => toast.error("Couldn't delete the application", err.message),
  });

  return (
    <AppPage
      title="Applications"
      description="Where you applied, with which resume, and what happens next."
      actions={
        <Button onClick={() => setEditing({})}>
          <Plus className="size-4" aria-hidden="true" /> Record an application
        </Button>
      }
    >
      <div role="radiogroup" aria-label="Filter by status" className="mb-5 flex flex-wrap gap-1">
        {[{ value: '', label: 'All' }, ...STATUSES].map((s) => (
          <button
            key={s.value || 'all'}
            type="button"
            role="radio"
            aria-checked={status === s.value}
            onClick={() => setStatus(s.value)}
            className={cx(
              'rounded-md px-3 py-1.5 text-sm',
              status === s.value ? 'bg-sunken font-medium text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {list.isPending ? (
        <LoadingState label="Loading applications" />
      ) : list.isError ? (
        <ErrorState title="Couldn't load applications" error={list.error} onRetry={list.refetch} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            status
              ? `No ${STATUS_BY_VALUE[status].label.toLowerCase()} applications`
              : 'No applications yet'
          }
          description="Record an application to keep the exact resume version you sent alongside its status and follow-up date."
          action={<Button onClick={() => setEditing({})}>Record an application</Button>}
        />
      ) : (
        <ul className="grid gap-3">
          {list.data.items.map((a) => {
            const s = STATUS_BY_VALUE[a.status];
            const due =
              a.nextFollowUpAt && OPEN_STATUSES.has(a.status) && a.nextFollowUpAt <= today;
            return (
              <li key={a.id} className="rounded-lg border border-rule bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{a.role}</span>
                      <span className="text-muted">at {a.company}</span>
                      <Badge tone={s.tone}>{s.label}</Badge>
                      {due && <Badge tone="warn">Follow-up due</Badge>}
                    </p>
                    <dl className="mt-1.5 grid gap-x-6 gap-y-0.5 text-sm text-muted sm:grid-cols-2">
                      {a.appliedAt && (
                        <div>
                          <dt className="inline">Applied: </dt>
                          <dd className="inline">{formatDay(a.appliedAt)}</dd>
                        </div>
                      )}
                      {a.nextFollowUpAt && (
                        <div>
                          <dt className="inline">Follow up: </dt>
                          <dd className="inline">{formatDay(a.nextFollowUpAt)}</dd>
                        </div>
                      )}
                      {a.resumeLabel && (
                        <div>
                          <dt className="inline">Resume: </dt>
                          <dd className="inline">
                            {a.resumeId ? (
                              <Link
                                to={
                                  a.resumeVersionId
                                    ? `/app/resumes/${a.resumeId}/compare/${a.resumeVersionId}/draft`
                                    : `/app/resumes/${a.resumeId}/edit`
                                }
                                className="text-accent underline underline-offset-2"
                              >
                                {a.resumeLabel}
                              </Link>
                            ) : (
                              <>{a.resumeLabel} (deleted)</>
                            )}
                          </dd>
                        </div>
                      )}
                      {a.jobLabel && (
                        <div>
                          <dt className="inline">Job: </dt>
                          <dd className="inline">
                            {a.jobDescriptionId ? (
                              <Link
                                to={`/app/jobs/${a.jobDescriptionId}`}
                                className="text-accent underline underline-offset-2"
                              >
                                {a.jobLabel}
                              </Link>
                            ) : (
                              <>{a.jobLabel} (deleted)</>
                            )}
                          </dd>
                        </div>
                      )}
                    </dl>
                    {a.notes && (
                      <p className="mt-2 text-sm whitespace-pre-wrap text-ink">{a.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(a)}
                      aria-label={`Edit application to ${a.company}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(a)}
                      aria-label={`Delete application to ${a.company}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <ApplicationDialog
          key={editing.id ?? 'new'}
          open
          onClose={() => setEditing(null)}
          application={editing.id ? editing : null}
          initial={editing.id ? null : editing}
        />
      )}
      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        size="sm"
        title={`Delete the application to ${pendingDelete?.company}?`}
        description="Only this record is deleted. The resume, its versions and the job description stay."
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
              Delete application
            </Button>
          </>
        }
      />
    </AppPage>
  );
}
