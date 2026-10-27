import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { displayNameError } from '@resumeos/shared/validation/auth.js';
import { accountApi } from '../../api/account.api.js';
import { fieldErrors } from '../../api/client.js';
import { useAuth, ME_KEY } from '../../hooks/useAuth.jsx';
import { useTheme } from '../../hooks/useTheme.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { Panel } from '../../components/layout/AppPage.jsx';
import { TextField, SelectField } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormAlert } from '../../components/ui/FormAlert.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountApi.update,
    onSuccess: ({ user }) => queryClient.setQueryData(ME_KEY, user),
  });
}

function DisplayNameForm({ user }) {
  const toast = useToast();
  const update = useUpdateAccount();
  const [name, setName] = useState(user.displayName);
  const [error, setError] = useState(null);
  const dirty = name.trim() !== user.displayName;

  const onSubmit = (e) => {
    e.preventDefault();
    const err = displayNameError(name);
    setError(err);
    if (err) return;
    update.mutate(
      { displayName: name.trim() },
      {
        onSuccess: () => toast.success('Name saved'),
        onError: (er) => setError(fieldErrors(er).displayName ?? null),
      },
    );
  };

  return (
    <form noValidate onSubmit={onSubmit}>
      <Panel
        title="Account"
        description="How you appear inside ResumeOS. Your resume header is edited separately."
        footer={
          <Button type="submit" disabled={!dirty} loading={update.isPending} loadingLabel="Saving">
            Save name
          </Button>
        }
      >
        <div className="grid gap-5">
          <FormAlert error={update.error && !error ? update.error : null} />
          <TextField
            label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error}
            autoComplete="name"
            required
          />
          <TextField
            label="Email"
            value={user.email}
            readOnly
            disabled
            hint="Changing your email isn't available yet."
          />
        </div>
      </Panel>
    </form>
  );
}

function PreferencesForm({ user }) {
  const toast = useToast();
  const update = useUpdateAccount();
  const { setPreference } = useTheme();

  const save = (preferences, label) =>
    update.mutate(
      { preferences },
      {
        onSuccess: () => toast.success(`${label} saved`),
        onError: (err) => toast.error(`Couldn't save ${label.toLowerCase()}`, err.message),
      },
    );

  return (
    <Panel
      title="Preferences"
      description="Saved to your account, so they follow you across devices."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Theme"
          value={user.preferences.theme}
          disabled={update.isPending}
          onChange={(e) => {
            setPreference(e.target.value);
            save({ theme: e.target.value }, 'Theme');
          }}
        >
          <option value="system">Match system</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </SelectField>
        <SelectField
          label="Default page size"
          hint="Used for new resumes and exports."
          value={user.preferences.pageSize}
          disabled={update.isPending}
          onChange={(e) => save({ pageSize: e.target.value }, 'Page size')}
        >
          <option value="A4">A4</option>
          <option value="Letter">US Letter</option>
        </SelectField>
      </div>
    </Panel>
  );
}

export function ProfileSettingsPage() {
  useDocumentTitle('Profile settings');
  const { user } = useAuth();
  return (
    <>
      <DisplayNameForm key={user.displayName} user={user} />
      <PreferencesForm user={user} />
    </>
  );
}
