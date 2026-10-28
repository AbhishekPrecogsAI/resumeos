import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleDashed, FolderSearch } from 'lucide-react';
import { coverage } from '@resumeos/shared/jobs/coverage.js';
import { applySuggestions } from '@resumeos/shared/jobs/tailor.js';
import { resumesApi } from '../../api/resumes.api.js';
import { profileApi } from '../../api/profile.api.js';
import { Button, ButtonLink } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { SelectField } from '../../components/ui/Field.jsx';
import { LoadingState, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { PROFILE_KEY } from '../profile/ProfilePage.jsx';
import { RESUMES_KEY, resumeKey } from '../resumes/resumeQueries.js';

const suggestionKey = (s) => `${s.type}:${s.section}:${s.id ?? ''}`;

function TermRow({ r, approved, onToggle }) {
  return (
    <li className="rounded-md border border-rule bg-surface px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-ink">{r.term.term}</span>
        {r.status === 'in-resume' && (
          <Badge tone={r.match === 'exact' ? 'added' : 'accent'}>
            {r.match === 'exact' ? 'Exact match' : 'Normalized match'}
          </Badge>
        )}
        {r.term.importance === 'preferred' && <Badge>Nice to have</Badge>}
      </div>
      {r.resumeLocations.length > 0 && (
        <p className="mt-1 text-muted">
          On this resume: {r.resumeLocations.slice(0, 3).join('; ')}
        </p>
      )}
      {r.profileLocations.length > 0 && (
        <p className="mt-1 text-muted">
          In your profile: {r.profileLocations.slice(0, 3).join('; ')}
        </p>
      )}
      {r.status === 'in-profile' && r.suggestions.length === 0 && (
        <p className="mt-1 text-xs text-faint">
          It's in your profile's wording (for example the summary). Edit this resume if it applies.
        </p>
      )}
      {r.suggestions.length > 0 && (
        <fieldset className="mt-2 grid gap-1.5">
          <legend className="sr-only">Changes you can approve for {r.term.term}</legend>
          {r.suggestions.map((s) => (
            <label key={suggestionKey(s)} className="flex items-start gap-2 text-ink">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--accent)]"
                checked={approved.has(suggestionKey(s))}
                onChange={() => onToggle(s)}
              />
              {s.label}
            </label>
          ))}
        </fieldset>
      )}
    </li>
  );
}

/**
 * Coverage of job terms against a chosen resume, computed locally with the shared engine.
 * Suggested changes only reuse existing profile content and apply only when approved.
 */
export function CoverageReport({ terms, job }) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const resumes = useQuery({
    queryKey: [...RESUMES_KEY, { page: 1, includeArchived: false, limit: 50 }],
    queryFn: () => resumesApi.list({ limit: 50 }),
  });
  const [resumeId, setResumeId] = useState('');
  const chosenId = resumeId || resumes.data?.items[0]?.id || '';
  const resume = useQuery({
    queryKey: resumeKey(chosenId),
    queryFn: () => resumesApi.get(chosenId),
    enabled: Boolean(chosenId),
  });
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: profileApi.get });
  const [approvedMap, setApprovedMap] = useState({});
  const [busy, setBusy] = useState(false);

  const report = useMemo(
    () =>
      resume.data && profile.data ? coverage(terms, resume.data.draft, profile.data.content) : null,
    [terms, resume.data, profile.data],
  );
  const approvedForResume = approvedMap[chosenId] ?? {};
  const approved = new Set(Object.keys(approvedForResume));
  const toggle = (s) =>
    setApprovedMap((m) => {
      const current = { ...(m[chosenId] ?? {}) };
      if (current[suggestionKey(s)]) delete current[suggestionKey(s)];
      else current[suggestionKey(s)] = s;
      return { ...m, [chosenId]: current };
    });

  if (resumes.isPending || profile.isPending) return <LoadingState label="Loading your resumes" />;
  if (resumes.isError)
    return (
      <ErrorState
        title="Couldn't load your resumes"
        error={resumes.error}
        onRetry={resumes.refetch}
      />
    );
  if (!resumes.data.items.length) {
    return (
      <div className="rounded-lg border border-rule bg-surface p-5 text-sm">
        <p className="text-ink">Create a resume first, then compare it with this job.</p>
        <ButtonLink to="/app/resumes/new" size="sm" className="mt-3">
          Create a resume
        </ButtonLink>
      </div>
    );
  }

  const chosen = Object.values(approvedForResume);
  const title = `${job?.title || 'Tailored'}${job?.company ? ` at ${job.company}` : ''}`.slice(
    0,
    120,
  );

  const createCopy = async () => {
    setBusy(true);
    try {
      const copy = await resumesApi.duplicate(chosenId, {
        title,
        ...(job?.title ? { targetRole: job.title.slice(0, 120) } : {}),
      });
      const draft = applySuggestions(copy.draft, profile.data.content, chosen);
      await resumesApi.saveDraft(copy.id, copy.draftRevision, draft);
      if (job?.id) await resumesApi.update(copy.id, { jobId: job.id });
      queryClient.invalidateQueries({ queryKey: RESUMES_KEY });
      toast.success(
        'Tailored resume created',
        `${chosen.length} approved ${chosen.length === 1 ? 'change' : 'changes'} applied. The original is unchanged.`,
      );
      navigate(`/app/resumes/${copy.id}/edit`);
    } catch (err) {
      toast.error("Couldn't create the tailored resume", err.message);
    } finally {
      setBusy(false);
    }
  };

  const applyHere = async () => {
    setBusy(true);
    try {
      const latest = await resumesApi.get(chosenId);
      const draft = applySuggestions(latest.draft, profile.data.content, chosen);
      const saved = await resumesApi.saveDraft(chosenId, latest.draftRevision, draft);
      queryClient.setQueryData(resumeKey(chosenId), saved);
      setApprovedMap((m) => ({ ...m, [chosenId]: {} }));
      toast.success(
        'Changes applied',
        `${chosen.length} approved ${chosen.length === 1 ? 'change was' : 'changes were'} applied to "${latest.title}".`,
      );
    } catch (err) {
      toast.error("Couldn't apply the changes", err.message);
    } finally {
      setBusy(false);
    }
  };

  const groups = report && [
    {
      key: 'in-resume',
      icon: CheckCircle2,
      iconClass: 'text-added',
      title: 'In this resume',
      items: report.results.filter((r) => r.status === 'in-resume'),
    },
    {
      key: 'in-profile',
      icon: FolderSearch,
      iconClass: 'text-accent',
      title: 'In your profile but not on this resume',
      items: report.results.filter((r) => r.status === 'in-profile'),
    },
    {
      key: 'not-found',
      icon: CircleDashed,
      iconClass: 'text-faint',
      title: 'Not found in your saved profile',
      items: report.results.filter((r) => r.status === 'not-found'),
    },
  ];

  return (
    <div className="grid gap-5">
      <SelectField
        label="Compare with resume"
        value={chosenId}
        onChange={(e) => setResumeId(e.target.value)}
        hint="Compares the resume's current draft. Only text that prints counts as on the resume."
      >
        {resumes.data.items.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </SelectField>

      {resume.isPending ? (
        <LoadingState label="Comparing" />
      ) : resume.isError ? (
        <ErrorState
          title="Couldn't load that resume"
          error={resume.error}
          onRetry={resume.refetch}
        />
      ) : report ? (
        <>
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-rule bg-surface p-4"
          >
            <p className="text-lg font-semibold text-ink">
              {report.counts.inResume} of {report.counts.total} job terms found in this resume
            </p>
            <p className="mt-1 text-sm text-muted">
              {report.counts.exact} exact, {report.counts.normalized} normalized.{' '}
              {report.counts.inProfile} more in your profile, {report.counts.notFound} not found in
              your saved profile.
            </p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-muted hover:text-ink">
                How this is calculated
              </summary>
              <p className="mt-1 text-muted">{report.method}</p>
              <p className="mt-1 text-muted">
                This is a count of terms, not a prediction of how a hiring team or an applicant
                tracking system will rate the resume.
              </p>
            </details>
          </div>

          {groups.map((g) =>
            g.items.length ? (
              <section key={g.key} aria-labelledby={`cov-${g.key}`}>
                <h3
                  id={`cov-${g.key}`}
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"
                >
                  <g.icon className={`size-4 ${g.iconClass}`} aria-hidden="true" /> {g.title} (
                  {g.items.length})
                </h3>
                {g.key === 'not-found' && (
                  <p className="mb-2 text-sm text-muted">
                    This only means these terms aren't in what you've saved; it says nothing about
                    your actual experience. If you have relevant experience, add it to your profile
                    in your own words. Don't add terms you can't talk about in an interview.
                  </p>
                )}
                <ul className="grid gap-2">
                  {g.items.map((r) => (
                    <TermRow key={r.term.id} r={r} approved={approved} onToggle={toggle} />
                  ))}
                </ul>
              </section>
            ) : null,
          )}

          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-surface/95 p-3 backdrop-blur">
            <p className="text-sm text-muted">
              {chosen.length
                ? `${chosen.length} ${chosen.length === 1 ? 'change' : 'changes'} approved.`
                : 'Tick the changes you want. Nothing changes until you choose.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={applyHere}
                disabled={!chosen.length || busy}
              >
                Apply to this resume
              </Button>
              <Button
                size="sm"
                onClick={createCopy}
                loading={busy}
                loadingLabel="Working"
                disabled={busy}
              >
                Create a tailored copy{chosen.length ? ` with ${chosen.length}` : ''}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
