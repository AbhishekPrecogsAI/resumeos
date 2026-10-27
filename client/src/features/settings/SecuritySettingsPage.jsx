import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitorSmartphone } from 'lucide-react';
import { passwordError, PASSWORD_MIN } from '@resumeos/shared/validation/auth.js';
import { authApi } from '../../api/auth.api.js';
import { fieldErrors } from '../../api/client.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { Panel } from '../../components/layout/AppPage.jsx';
import { PasswordField } from '../../components/ui/PasswordField.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { FormAlert } from '../../components/ui/FormAlert.jsx';
import { LoadingState, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeUserAgent, formatRelative, formatDateTime } from '../../lib/formatters.js';

const SESSIONS_KEY = ['auth', 'sessions'];

function ChangePasswordForm() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const empty = { currentPassword: '', newPassword: '', confirm: '' };
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const change = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      setValues(empty);
      setErrors({});
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      toast.success('Password changed', 'Other devices were signed out.');
    },
    onError: (err) => setErrors(fieldErrors(err)),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!values.currentPassword) next.currentPassword = 'Enter your current password.';
    const pw = passwordError(values.newPassword);
    if (pw) next.newPassword = pw;
    else if (values.newPassword !== values.confirm) next.confirm = "The passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;
    change.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword });
  };

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const formError =
    change.error && !Object.keys(fieldErrors(change.error)).length ? change.error : null;

  return (
    <form noValidate onSubmit={onSubmit}>
      <Panel
        title="Password"
        description="Changing your password signs out every other device."
        footer={
          <Button type="submit" loading={change.isPending} loadingLabel="Changing password">
            Change password
          </Button>
        }
      >
        <div className="grid gap-5">
          <FormAlert error={formError} />
          <PasswordField
            label="Current password"
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={set('currentPassword')}
            error={errors.currentPassword}
            required
          />
          <PasswordField
            label="New password"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={set('newPassword')}
            error={errors.newPassword}
            hint={`At least ${PASSWORD_MIN} characters.`}
            required
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
            required
          />
        </div>
      </Panel>
    </form>
  );
}

function SessionsPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: SESSIONS_KEY, queryFn: authApi.sessions });
  const refresh = () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
  const revoke = useMutation({
    mutationFn: authApi.revokeSession,
    onSuccess: () => {
      toast.success('Device signed out');
      refresh();
    },
    onError: (err) => toast.error("Couldn't sign out that device", err.message),
  });
  const revokeOthers = useMutation({
    mutationFn: authApi.revokeOtherSessions,
    onSuccess: ({ revoked }) => {
      toast.success(
        revoked
          ? `Signed out ${revoked} other ${revoked === 1 ? 'device' : 'devices'}`
          : 'No other devices were signed in',
      );
      refresh();
    },
    onError: (err) => toast.error("Couldn't sign out other devices", err.message),
  });

  const items = sessions.data?.items ?? [];
  const others = items.filter((s) => !s.current).length;

  return (
    <Panel
      title="Where you're signed in"
      description="Sessions expire after 30 days. Signing out a device ends its session immediately."
      footer={
        <Button
          variant="secondary"
          onClick={() => revokeOthers.mutate()}
          loading={revokeOthers.isPending}
          disabled={!others}
        >
          Sign out all other devices
        </Button>
      }
    >
      {sessions.isPending ? (
        <LoadingState label="Loading sessions" className="py-6" />
      ) : sessions.isError ? (
        <ErrorState
          title="Couldn't load sessions"
          error={sessions.error}
          onRetry={sessions.refetch}
          className="py-6"
        />
      ) : (
        <ul className="divide-y divide-rule">
          {items.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <MonitorSmartphone className="size-5 text-faint" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {describeUserAgent(s.userAgent)}
                  {s.current && <Badge tone="accent">This device</Badge>}
                </p>
                <p className="text-sm text-muted">
                  Signed in {formatDateTime(s.createdAt)}. Last active{' '}
                  <time dateTime={s.lastSeenAt}>{formatRelative(s.lastSeenAt)}</time>.
                </p>
              </div>
              {!s.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revoke.mutate(s.id)}
                  disabled={revoke.isPending}
                  aria-label={`Sign out ${describeUserAgent(s.userAgent)}, signed in ${formatDateTime(s.createdAt)}`}
                >
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function SecuritySettingsPage() {
  useDocumentTitle('Security settings');
  return (
    <>
      <ChangePasswordForm />
      <SessionsPanel />
    </>
  );
}
