import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, FilePlus2, FileText, UserRoundPen } from 'lucide-react';
import { profileCompletion } from '@resumeos/shared/completion.js';
import { profileApi } from '../../api/profile.api.js';
import { resumesApi } from '../../api/resumes.api.js';
import { exportsApi } from '../../api/exports.api.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { AppPage, Panel } from '../../components/layout/AppPage.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';
import { Skeleton, ErrorState } from '../../components/ui/States.jsx';
import { formatRelative, formatDateTime } from '../../lib/formatters.js';
import { PROFILE_KEY } from '../profile/ProfilePage.jsx';
import { RESUMES_KEY } from '../resumes/resumeQueries.js';

function ProfileChecklist() {
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: profileApi.get });
  if (profile.isPending) return <Skeleton className="h-48" />;
  if (profile.isError)
    return (
      <ErrorState
        title="Couldn't load your profile"
        error={profile.error}
        onRetry={profile.refetch}
        className="py-6"
      />
    );
  const { items, done, total } = profileCompletion(profile.data.content);
  const remaining = items.filter((i) => !i.done);
  return (
    <Panel
      title="Master profile"
      description={
        done === total
          ? 'Every checklist item is done.'
          : `${done} of ${total} checklist items done.`
      }
      footer={
        <ButtonLink to="/app/profile" variant="secondary" size="sm">
          {done === 0 ? 'Start your profile' : 'Edit profile'}
        </ButtonLink>
      }
    >
      <div aria-hidden="true" className="mb-4 h-1.5 overflow-hidden rounded-full bg-sunken">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      {remaining.length ? (
        <ul className="grid gap-1.5">
          {remaining.slice(0, 4).map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <Circle className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden="true" />
              <Link to={`/app/profile#${item.anchor}`} className="text-ink hover:underline">
                {item.label}
              </Link>
            </li>
          ))}
          {remaining.length > 4 && (
            <li className="pl-6 text-sm text-muted">and {remaining.length - 4} more</li>
          )}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <CheckCircle2 className="size-4 text-added" aria-hidden="true" /> Your profile covers the
          basics. Keep it current as your work changes.
        </p>
      )}
    </Panel>
  );
}

function RecentResumes() {
  const list = useQuery({
    queryKey: [...RESUMES_KEY, { page: 1, includeArchived: false, limit: 5 }],
    queryFn: () => resumesApi.list({ limit: 5 }),
  });
  if (list.isPending) return <Skeleton className="h-48" />;
  if (list.isError)
    return (
      <ErrorState
        title="Couldn't load your resumes"
        error={list.error}
        onRetry={list.refetch}
        className="py-6"
      />
    );
  const [latest, ...rest] = list.data.items;

  if (!latest) {
    return (
      <Panel title="Resumes">
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted">
            No resumes yet. Each resume starts as a copy of your profile that you tailor for a role.
          </p>
          <ButtonLink to="/app/resumes/new" size="sm">
            Create a resume
          </ButtonLink>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Continue editing"
      footer={
        <ButtonLink to="/app/resumes" variant="ghost" size="sm">
          All resumes ({list.data.total})
        </ButtonLink>
      }
    >
      <Link
        to={`/app/resumes/${latest.id}/edit`}
        className="group flex items-start gap-3 rounded-md p-2 -m-2 hover:bg-sunken"
      >
        <FileText className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block font-medium text-ink group-hover:underline">{latest.title}</span>
          <span className="block text-sm text-muted">
            {latest.targetRole ? `${latest.targetRole}. ` : ''}Edited{' '}
            <time dateTime={latest.updatedAt} title={formatDateTime(latest.updatedAt)}>
              {formatRelative(latest.updatedAt)}
            </time>
          </span>
        </span>
      </Link>
      {rest.length > 0 && (
        <ul className="mt-4 grid gap-2 border-t border-rule pt-4">
          {rest.map((r) => (
            <li key={r.id} className="flex items-baseline justify-between gap-3 text-sm">
              <Link to={`/app/resumes/${r.id}/edit`} className="truncate text-ink hover:underline">
                {r.title}
              </Link>
              <time dateTime={r.updatedAt} className="shrink-0 text-muted">
                {formatRelative(r.updatedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const EXPORT_STATUS = {
  passed: 'all checks passed',
  warnings: 'passed with warnings',
  failed: 'checks failed',
};

function RecentExports() {
  const list = useQuery({
    queryKey: ['exports', { recent: true }],
    queryFn: () => exportsApi.list({ limit: 5 }),
  });
  if (list.isPending) return <Skeleton className="h-32" />;
  if (list.isError)
    return (
      <ErrorState
        title="Couldn't load your exports"
        error={list.error}
        onRetry={list.refetch}
        className="py-6"
      />
    );
  return (
    <Panel title="Recent exports">
      {list.data.items.length === 0 ? (
        <p className="text-sm text-muted">
          No exports yet. Open a resume and choose Export to create a checked PDF.
        </p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {list.data.items.map((x) => (
            <li
              key={x.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
            >
              <span className="min-w-0">
                <Link
                  to={`/app/resumes/${x.resumeId}/edit`}
                  className="font-medium text-ink hover:underline"
                >
                  {x.resumeTitle}
                </Link>
                <span className="text-muted"> PDF, {EXPORT_STATUS[x.validation.status]}</span>
              </span>
              <span className="flex items-baseline gap-3">
                <time dateTime={x.createdAt} className="text-muted">
                  {formatRelative(x.createdAt)}
                </time>
                {x.downloadAvailable ? (
                  <a
                    href={exportsApi.downloadUrl(x.id)}
                    className="font-medium text-accent underline underline-offset-2"
                    aria-label={`Download PDF of ${x.resumeTitle}`}
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-faint">Expired</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const firstName = user.displayName.split(/\s+/)[0];
  return (
    <AppPage
      title={`Welcome, ${firstName}`}
      description="Pick up where you left off."
      actions={
        <>
          <ButtonLink to="/app/profile#experience" variant="secondary">
            <UserRoundPen className="size-4" aria-hidden="true" /> Add experience
          </ButtonLink>
          <ButtonLink to="/app/resumes/new">
            <FilePlus2 className="size-4" aria-hidden="true" /> New resume
          </ButtonLink>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <RecentResumes />
        <ProfileChecklist />
        <RecentExports />
      </div>
    </AppPage>
  );
}
