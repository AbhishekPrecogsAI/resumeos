import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle } from 'lucide-react';
import { profileCompletion } from '@resumeos/shared/completion.js';
import { profileApi } from '../../api/profile.api.js';
import { useAutosave } from '../../hooks/useAutosave.js';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { LoadingState, ErrorState } from '../../components/ui/States.jsx';
import { SaveStatus } from '../../components/editor/SaveStatus.jsx';
import { ConflictBanner } from '../../components/editor/ConflictBanner.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { ProfileSection, PROFILE_NAV } from './ProfileSectionsEditor.jsx';
import { cx } from '../../lib/cx.js';

export const PROFILE_KEY = ['profile'];

function CompletionChecklist({ content }) {
  const { items, done, total } = profileCompletion(content);
  return (
    <details className="group rounded-lg border border-rule bg-surface" open={done < total}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-ink">
          Profile checklist: {done} of {total} done
        </span>
        <span className="text-sm text-muted group-open:hidden">Show</span>
        <span className="hidden text-sm text-muted group-open:inline">Hide</span>
      </summary>
      <ul className="grid gap-1.5 border-t border-rule px-4 py-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-added" aria-hidden="true" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
            )}
            <a
              href={`#${item.anchor}`}
              className={cx('hover:underline', item.done ? 'text-muted' : 'text-ink')}
            >
              <span className="sr-only">{item.done ? 'Done: ' : 'To do: '}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <p className="border-t border-rule px-4 py-2.5 text-xs text-muted">
        Each item is a fixed rule. None of them are required to build a resume.
      </p>
    </details>
  );
}

function ProfileEditor({ profile }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [resolving, setResolving] = useState(false);

  const save = useCallback(
    async (revision, content) => {
      const saved = await profileApi.replace(revision, content);
      queryClient.setQueryData(PROFILE_KEY, saved);
      return saved;
    },
    [queryClient],
  );

  const autosave = useAutosave({
    initialData: profile.content,
    initialRevision: profile.revision,
    save,
  });
  const guard = useUnsavedChangesGuard(autosave);
  const content = autosave.data;
  const patch = (changes, opts) => autosave.setData((c) => ({ ...c, ...changes }), opts);

  const reloadLatest = async () => {
    setResolving(true);
    try {
      const latest = await profileApi.get();
      queryClient.setQueryData(PROFILE_KEY, latest);
      autosave.reset(latest.content, latest.revision);
      toast.info('Loaded the latest profile');
    } catch (err) {
      toast.error("Couldn't load the latest profile", err.message);
    } finally {
      setResolving(false);
    }
  };

  const keepMine = async () => {
    setResolving(true);
    try {
      const latest = await profileApi.get();
      if (await autosave.overwrite(latest.revision)) toast.success('Your edits were saved');
    } catch (err) {
      toast.error("Couldn't save your edits", err.message);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      {guard}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Master profile</h1>
          <p className="mt-1 max-w-2xl text-muted">
            Your career record. Resumes copy from it; editing a resume never changes this profile.
          </p>
        </div>
        <SaveStatus
          status={autosave.status}
          lastSavedAt={autosave.lastSavedAt}
          onRetry={autosave.retry}
        />
      </div>

      <div className="mt-6 grid gap-4">
        {autosave.status === 'conflict' && (
          <ConflictBanner
            what="Your profile"
            onReload={reloadLatest}
            onOverwrite={keepMine}
            busy={resolving}
          />
        )}
        {autosave.status === 'error' && autosave.error?.code === 'VALIDATION_FAILED' && (
          <div
            role="alert"
            className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-ink"
          >
            <p className="font-medium">Some fields need attention before this can save:</p>
            <ul className="mt-1 list-disc pl-5">
              {(autosave.error.details?.fields ?? []).slice(0, 6).map((f) => (
                <li key={f.path}>
                  {f.path.replace(/^content\./, '')}: {f.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <CompletionChecklist content={content} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Profile sections" className="hidden lg:block">
          <ul className="sticky top-20 grid gap-0.5 text-sm">
            {PROFILE_NAV.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block rounded-md px-2.5 py-1.5 text-muted hover:bg-sunken hover:text-ink"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid min-w-0 gap-10">
          {PROFILE_NAV.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-heading`}
              className="scroll-mt-20"
            >
              <h2 id={`${s.id}-heading`} className="mb-4 text-lg font-semibold text-ink">
                {s.title}
              </h2>
              <ProfileSection
                id={s.id}
                content={content}
                onChange={patch}
                evidenceItems={content.evidenceItems}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  useDocumentTitle('Master profile');
  // Fetched once per visit; the editor owns the working copy after that.
  const query = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: profileApi.get,
    staleTime: Infinity,
    refetchOnMount: 'always',
  });
  // Wait for a fresh copy so the editor never starts from a stale revision.
  if (query.isPending || (!query.isFetchedAfterMount && query.isFetching))
    return <LoadingState label="Loading your profile" />;
  if (query.isError)
    return (
      <ErrorState title="Couldn't load your profile" error={query.error} onRetry={query.refetch} />
    );
  return <ProfileEditor profile={query.data} />;
}
