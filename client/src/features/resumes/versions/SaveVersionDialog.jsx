import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { versionsApi, versionsKey } from '../../../api/versions.api.js';
import { fieldErrors } from '../../../api/client.js';
import { Dialog } from '../../../components/ui/Dialog.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { TextField, TextArea } from '../../../components/ui/Field.jsx';
import { FormAlert } from '../../../components/ui/FormAlert.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';

/** Name and save the current draft as an immutable version. `flush` saves pending edits first. */
export function SaveVersionDialog({ open, onClose, resumeId, flush, defaultName = '' }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(defaultName);
  const [changeNote, setChangeNote] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      if (flush && !(await flush()))
        throw new Error(
          "Your latest edits couldn't be saved yet, so the version would miss them. Fix the save problem and try again.",
        );
      return versionsApi.create(resumeId, { name: name.trim() || undefined, changeNote });
    },
    onSuccess: (version) => {
      queryClient.invalidateQueries({ queryKey: versionsKey(resumeId) });
      toast.success(`Saved v${version.versionNumber}`, version.name);
      setName('');
      setChangeNote('');
      onClose();
    },
  });

  const errors = fieldErrors(save.error);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Save a version"
      description="A saved version is a snapshot you can compare against or restore later. It can't be edited afterwards."
    >
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <FormAlert error={save.error && !Object.keys(errors).length ? save.error : null} />
        <TextField
          label="Version name"
          optionalLabel
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          hint='For example "Platform roles, shorter projects". Leave blank for "Version N".'
          error={errors.name}
        />
        <TextArea
          label="Change note"
          optionalLabel
          rows={3}
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          maxLength={1000}
          hint="What changed and why. Only you see this."
          error={errors.changeNote}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} loadingLabel="Saving version">
            Save version
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
