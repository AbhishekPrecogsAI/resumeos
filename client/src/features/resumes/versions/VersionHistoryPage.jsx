import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, GitBranch, GitCompare, History, RotateCcw, Save, Trash2 } from 'lucide-react';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { resumesApi } from '../../../api/resumes.api.js';
import { versionsApi, versionsKey } from '../../../api/versions.api.js';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { AppPage } from '../../../components/layout/AppPage.jsx';
import { Button, ButtonLink } from '../../../components/ui/Button.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { TextField } from '../../../components/ui/Field.jsx';
import { LoadingState, ErrorState, EmptyState } from '../../../components/ui/States.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { formatDateTime, formatRelative } from '../../../lib/formatters.js';
import { RESUMES_KEY, resumeKey } from '../resumeQueries.js';
import { SaveVersionDialog } from './SaveVersionDialog.jsx';

const KIND = { auto: 'Saved automatically', restore: 'Restore' };

export function VersionHistoryPage() {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [saveOpen, setSaveOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [pendingRestore, setPendingRestore] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingBranch, setPendingBranch] = useState(null);
  const [branchRole, setBranchRole] = useState('');

  const resume = useQuery({
    queryKey: resumeKey(resumeId),
    queryFn: () => resumesApi.get(resumeId),
  });
  const versions = useQuery({
    queryKey: versionsKey(resumeId),
    queryFn: () => versionsApi.list(resumeId),
  });
  useDocumentTitle(resume.data ? `History: ${resume.data.title}` : 'Version history');

  const restore = useMutation({
    mutationFn: (v) => versionsApi.restore(resumeId, v.id),
    onSuccess: (res) => {
      queryClient.setQueryData(resumeKey(resumeId), res.resume);
      queryClient.invalidateQueries({ queryKey: versionsKey(resumeId) });
      queryClient.invalidateQueries({ queryKey: RESUMES_KEY });
      setPendingRestore(null);
      toast.success(
        `Restored as v${res.restored.versionNumber}`,
        res.autoSaved
          ? `Your unsaved draft was kept as v${res.autoSaved.versionNumber}.`
          : undefined,
      );
    },
    onError: (err) => toast.error("Couldn't restore that version", err.message),
  });
  const remove = useMutation({
    mutationFn: (v) => versionsApi.remove(resumeId, v.id),
    onSuccess: (_, v) => {
      setPendingDelete(null);
      setSelected((s) => s.filter((id) => id !== v.id));
      queryClient.invalidateQueries({ queryKey: versionsKey(resumeId) });
      toast.success(`Deleted v${v.versionNumber}`);
    },
    onError: (err) => toast.error("Couldn't delete that version", err.message),
  });
  const branch = useMutation({
    mutationFn: (v) =>
      resumesApi.duplicate(resumeId, {
        fromVersionId: v.id,
        ...(branchRole.trim() ? { targetRole: branchRole.trim() } : {}),
      }),
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: RESUMES_KEY });
      toast.success('New resume created', `"${copy.title}" starts from that version.`);
      navigate(`/app/resumes/${copy.id}/edit`);
    },
    onError: (err) => toast.error("Couldn't create the new resume", err.message),
  });

  if (resume.isPending || versions.isPending)
    return <LoadingState label="Loading version history" />;
  if (resume.isError)
    return (
      <ErrorState
        title={resume.error.status === 404 ? 'Resume not found' : "Couldn't load this resume"}
        error={resume.error}
      />
    );
  if (versions.isError)
    return (
      <ErrorState
        title="Couldn't load versions"
        error={versions.error}
        onRetry={versions.refetch}
      />
    );

  const { items, currentVersionId, draftMatchesCurrent } = versions.data;
  const byId = new Map(items.map((v) => [v.id, v]));
  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]));
  const compareHref = () => {
    const [a, b] = [...selected]
      .map((id) => byId.get(id))
      .sort((x, y) => x.versionNumber - y.versionNumber);
    return `/app/resumes/${resumeId}/compare/${a.id}/${b.id}`;
  };

  return (
    <AppPage
      title="Version history"
      description={resume.data.title}
      actions={
        <>
          <ButtonLink to={`/app/resumes/${resumeId}/edit`} variant="secondary">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to editor
          </ButtonLink>
          <Button onClick={() => setSaveOpen(true)}>
            <Save className="size-4" aria-hidden="true" /> Save current draft as a version
          </Button>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-surface px-4 py-3 text-sm">
        <p className="text-ink">
          <span className="font-medium">Current draft: </span>
          {currentVersionId
            ? draftMatchesCurrent
              ? `matches v${byId.get(currentVersionId)?.versionNumber ?? '?'}`
              : `has changes since v${byId.get(currentVersionId)?.versionNumber ?? '?'}`
            : 'no versions saved yet'}
        </p>
        <div className="flex flex-wrap gap-2">
          {currentVersionId && !draftMatchesCurrent && (
            <ButtonLink
              to={`/app/resumes/${resumeId}/compare/${currentVersionId}/draft`}
              variant="ghost"
              size="sm"
            >
              <GitCompare className="size-4" aria-hidden="true" /> See draft changes
            </ButtonLink>
          )}
          {selected.length === 2 ? (
            <ButtonLink to={compareHref()} size="sm">
              <GitCompare className="size-4" aria-hidden="true" /> Compare selected
            </ButtonLink>
          ) : (
            <span className="self-center text-muted">Select two versions to compare.</span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={History}
          title="No saved versions yet"
          description="Save a version before tailoring this resume, so you can compare or go back later."
          action={<Button onClick={() => setSaveOpen(true)}>Save the first version</Button>}
        />
      ) : (
        <ol
          className="relative grid gap-3 border-l border-rule pl-5"
          aria-label="Saved versions, newest first"
        >
          {items.map((v) => {
            const parent = v.parentVersionId ? byId.get(v.parentVersionId) : null;
            const restoredFrom = v.restoredFromVersionId ? byId.get(v.restoredFromVersionId) : null;
            const checked = selected.includes(v.id);
            return (
              <li key={v.id} className="relative rounded-lg border border-rule bg-surface p-4">
                <span
                  aria-hidden="true"
                  className="absolute top-5 -left-[1.6rem] size-2.5 rounded-full border-2 border-surface bg-accent"
                />
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(v.id)}
                    aria-label={`Select v${v.versionNumber} to compare`}
                    className="mt-1 size-4 accent-[var(--accent)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-muted">v{v.versionNumber}</span>
                      <span className="font-medium text-ink">{v.name}</span>
                      {v.id === currentVersionId && <Badge tone="accent">Current</Badge>}
                      {KIND[v.kind] && <Badge>{KIND[v.kind]}</Badge>}
                      {v.exported && <Badge tone="added">Exported</Badge>}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      <time dateTime={v.createdAt} title={formatDateTime(v.createdAt)}>
                        {formatRelative(v.createdAt)}
                      </time>
                      {parent
                        ? `, from v${parent.versionNumber}`
                        : v.parentVersionId
                          ? ', from a deleted version'
                          : ''}
                      {restoredFrom ? `, restores v${restoredFrom.versionNumber}` : ''}.{' '}
                      {getTemplate(v.templateId)?.name ?? v.templateId} {v.templateVersion},{' '}
                      {v.pageSize === 'Letter' ? 'US Letter' : 'A4'}.
                    </p>
                    {v.changeNote && (
                      <p className="mt-1.5 text-sm whitespace-pre-wrap text-ink">{v.changeNote}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1 pl-7">
                  <ButtonLink
                    to={`/app/resumes/${resumeId}/compare/${v.id}/draft`}
                    variant="ghost"
                    size="sm"
                    aria-label={`Compare v${v.versionNumber} with the current draft`}
                  >
                    <GitCompare className="size-4" aria-hidden="true" /> Compare with draft
                  </ButtonLink>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingRestore(v)}
                    aria-label={`Restore v${v.versionNumber}`}
                  >
                    <RotateCcw className="size-4" aria-hidden="true" /> Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBranchRole(resume.data.targetRole);
                      setPendingBranch(v);
                    }}
                    aria-label={`New resume from v${v.versionNumber}`}
                  >
                    <GitBranch className="size-4" aria-hidden="true" /> New resume from this
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(v)}
                    aria-label={`Delete v${v.versionNumber}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-6 text-xs text-faint">
        A resume keeps up to 100 saved versions. Versions are deleted only when you delete them, the
        resume, or your account.
      </p>

      <SaveVersionDialog open={saveOpen} onClose={() => setSaveOpen(false)} resumeId={resumeId} />

      <Dialog
        open={Boolean(pendingRestore)}
        onClose={() => setPendingRestore(null)}
        size="sm"
        title={`Restore v${pendingRestore?.versionNumber}?`}
        description="The draft will be replaced with this version's content, template and page size. Nothing is deleted: the restore is saved as a new version, and if the draft has unsaved changes they're saved as a version first."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingRestore(null)}>
              Cancel
            </Button>
            <Button
              loading={restore.isPending}
              loadingLabel="Restoring"
              onClick={() => restore.mutate(pendingRestore)}
            >
              Restore v{pendingRestore?.versionNumber}
            </Button>
          </>
        }
      />
      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        size="sm"
        title={`Delete v${pendingDelete?.versionNumber}?`}
        description="This saved version is removed permanently and can't be compared or restored afterwards. The current draft isn't affected. Version numbers aren't reused."
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
              Delete version
            </Button>
          </>
        }
      />
      <Dialog
        open={Boolean(pendingBranch)}
        onClose={() => setPendingBranch(null)}
        size="sm"
        title={`New resume from v${pendingBranch?.versionNumber}`}
        description="Creates a separate resume starting from this version, for tailoring to another role. This resume and its history stay as they are."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingBranch(null)}>
              Cancel
            </Button>
            <Button
              loading={branch.isPending}
              loadingLabel="Creating"
              onClick={() => branch.mutate(pendingBranch)}
            >
              Create resume
            </Button>
          </>
        }
      >
        <TextField
          label="Target role"
          optionalLabel
          value={branchRole}
          onChange={(e) => setBranchRole(e.target.value)}
          maxLength={120}
        />
      </Dialog>
    </AppPage>
  );
}
