import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { accountApi } from '../../api/account.api.js';
import { fieldErrors } from '../../api/client.js';
import { ME_KEY } from '../../hooks/useAuth.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { Panel } from '../../components/layout/AppPage.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { TextField } from '../../components/ui/Field.jsx';
import { PasswordField } from '../../components/ui/PasswordField.jsx';
import { FormAlert } from '../../components/ui/FormAlert.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

// What deletion removes. Each product area adds its line as it ships.
export const DELETED_DATA = [
  'Your account, email address and password',
  'Your master profile, including evidence notes',
  'Your profile photo, if you uploaded one',
  'Every resume, its draft and its saved versions',
  'Export history and any export files not yet expired',
  'Saved job descriptions and their term lists',
  'Your application records and notes',
  'Every share link, which stops working immediately',
  'Every signed-in session, on all devices',
];

function downloadJson(data, filename) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function ExportPanel() {
  const toast = useToast();
  const exporter = useMutation({
    mutationFn: accountApi.exportData,
    onSuccess: (data) => {
      downloadJson(data, `resumeos-export-${data.exportedAt.slice(0, 10)}.json`);
      toast.success('Export downloaded', 'Your data was saved as a JSON file.');
    },
    onError: (err) => toast.error("Couldn't export your data", err.message),
  });
  return (
    <Panel
      title="Export your data"
      description="Download everything stored for your account as a JSON file. Passwords and session tokens are never included."
      footer={
        <Button
          variant="secondary"
          onClick={() => exporter.mutate()}
          loading={exporter.isPending}
          loadingLabel="Preparing export"
        >
          <Download className="size-4" aria-hidden="true" /> Download JSON export
        </Button>
      }
    >
      <p className="text-sm text-muted">
        The file is generated when you click and isn't kept on our servers.
      </p>
    </Panel>
  );
}

function DeletePanel() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: accountApi.remove,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(ME_KEY, null);
      toast.success('Account deleted', 'Your data was removed and every session ended.');
      navigate('/', { replace: true });
    },
    onError: (err) => setErrors(fieldErrors(err)),
  });

  const close = () => {
    setOpen(false);
    setPassword('');
    setConfirmation('');
    setErrors({});
    remove.reset();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!password) next.password = 'Enter your password.';
    if (confirmation !== 'DELETE') next.confirmation = 'Type DELETE in capital letters to confirm.';
    setErrors(next);
    if (!Object.keys(next).length) remove.mutate({ password, confirmation });
  };

  const formError =
    remove.error && !Object.keys(fieldErrors(remove.error)).length ? remove.error : null;

  return (
    <Panel
      title="Delete account"
      description="Permanently remove your account and everything in it."
      footer={
        <Button variant="danger" onClick={() => setOpen(true)}>
          Delete account…
        </Button>
      }
    >
      <p className="text-sm text-muted">This will delete:</p>
      <ul className="mt-2 list-disc pl-5 text-sm text-muted">
        {DELETED_DATA.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        Nothing is kept for legal retention. Export your data first if you might want it later.
      </p>

      <Dialog
        open={open}
        onClose={close}
        size="sm"
        title="Delete your account?"
        description="This can't be undone. You'll be signed out on every device."
      >
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <FormAlert error={formError} />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />
          <TextField
            label="Type DELETE to confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            error={errors.confirmation}
            autoComplete="off"
            spellCheck={false}
            required
          />
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={remove.isPending}
              loadingLabel="Deleting account"
            >
              Delete account permanently
            </Button>
          </div>
        </form>
      </Dialog>
    </Panel>
  );
}

export function PrivacySettingsPage() {
  useDocumentTitle('Privacy and data');
  return (
    <>
      <ExportPanel />
      <DeletePanel />
    </>
  );
}
