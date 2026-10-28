import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, APPLICATIONS_KEY, STATUSES } from '../../api/applications.api.js';
import { resumesApi } from '../../api/resumes.api.js';
import { jobsApi, JOBS_KEY } from '../../api/jobs.api.js';
import { versionsApi, versionsKey } from '../../api/versions.api.js';
import { fieldErrors } from '../../api/client.js';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextField, TextArea, SelectField } from '../../components/ui/Field.jsx';
import { FormAlert } from '../../components/ui/FormAlert.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { RESUMES_KEY } from '../resumes/resumeQueries.js';

const empty = {
  company: '',
  role: '',
  status: 'planned',
  appliedAt: '',
  nextFollowUpAt: '',
  notes: '',
  jobDescriptionId: '',
  resumeId: '',
  resumeVersionId: '',
};

/** Create or edit an application. `initial` pre-fills from a job or an existing record. */
export function ApplicationDialog({ open, onClose, application, initial }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [values, setValues] = useState(() => ({
    ...empty,
    ...(initial ?? {}),
    ...(application
      ? Object.fromEntries(Object.entries(application).map(([k, v]) => [k, v ?? '']))
      : {}),
  }));
  const [errors, setErrors] = useState({});

  const resumes = useQuery({
    queryKey: [...RESUMES_KEY, { page: 1, includeArchived: true, limit: 50 }],
    queryFn: () => resumesApi.list({ limit: 50, includeArchived: true }),
    enabled: open,
  });
  const jobs = useQuery({
    queryKey: [...JOBS_KEY, { picker: true }],
    queryFn: () => jobsApi.list({ limit: 50 }),
    enabled: open,
  });
  const versions = useQuery({
    queryKey: versionsKey(values.resumeId),
    queryFn: () => versionsApi.list(values.resumeId),
    enabled: open && Boolean(values.resumeId),
  });

  const save = useMutation({
    mutationFn: (body) =>
      application ? applicationsApi.update(application.id, body) : applicationsApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
      toast.success(application ? 'Application updated' : 'Application recorded');
      onClose();
    },
    onError: (err) => setErrors(fieldErrors(err)),
  });

  const set = (k) => (e) =>
    setValues((v) => ({
      ...v,
      [k]: e.target.value,
      ...(k === 'resumeId' ? { resumeVersionId: '' } : {}),
    }));

  const onSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (!values.company.trim()) next.company = 'Add the company.';
    if (!values.role.trim()) next.role = 'Add the role.';
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate({
      company: values.company.trim(),
      role: values.role.trim(),
      status: values.status,
      appliedAt: values.appliedAt,
      nextFollowUpAt: values.nextFollowUpAt,
      notes: values.notes,
      jobDescriptionId: values.jobDescriptionId || null,
      resumeId: values.resumeId || null,
      resumeVersionId: values.resumeVersionId || null,
    });
  };

  const formError = save.error && !Object.keys(fieldErrors(save.error)).length ? save.error : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={application ? 'Edit application' : 'Record an application'}
      description="Keep track of where you applied and exactly which resume you sent."
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <FormAlert error={formError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Company"
            required
            value={values.company}
            onChange={set('company')}
            error={errors.company}
            maxLength={160}
          />
          <TextField
            label="Role"
            required
            value={values.role}
            onChange={set('role')}
            error={errors.role}
            maxLength={160}
          />
          <SelectField label="Status" value={values.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Applied on"
            optionalLabel
            type="date"
            value={values.appliedAt}
            onChange={set('appliedAt')}
            error={errors.appliedAt}
          />
          <TextField
            label="Follow up on"
            optionalLabel
            type="date"
            value={values.nextFollowUpAt}
            onChange={set('nextFollowUpAt')}
            error={errors.nextFollowUpAt}
            hint="Shown on your dashboard when due. No emails are sent."
          />
          <SelectField
            label="Job description"
            value={values.jobDescriptionId}
            onChange={set('jobDescriptionId')}
            error={errors.jobDescriptionId}
            hint={jobs.data && !jobs.data.items.length ? 'No saved job descriptions.' : undefined}
          >
            <option value="">None</option>
            {(jobs.data?.items ?? []).map((j) => (
              <option key={j.id} value={j.id}>
                {j.company ? `${j.title} at ${j.company}` : j.title}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Resume sent"
            value={values.resumeId}
            onChange={set('resumeId')}
            error={errors.resumeId}
          >
            <option value="">Not recorded</option>
            {(resumes.data?.items ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Saved version"
            value={values.resumeVersionId}
            onChange={set('resumeVersionId')}
            error={errors.resumeVersionId}
            disabled={!values.resumeId}
            hint={
              values.resumeId && versions.data && !versions.data.items.length
                ? 'This resume has no saved versions. Save one to record exactly what you sent.'
                : 'Pick the version you sent, so you can see it later.'
            }
          >
            <option value="">
              {values.resumeId ? 'Current draft (not pinned)' : 'Choose a resume first'}
            </option>
            {(versions.data?.items ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber}: {v.name}
              </option>
            ))}
          </SelectField>
        </div>
        <TextArea
          label="Notes"
          optionalLabel
          rows={3}
          value={values.notes}
          onChange={set('notes')}
          maxLength={4000}
          error={errors.notes}
        />
        {application?.resumeLabel && !values.resumeId && (
          <p className="text-sm text-muted">Previously recorded: {application.resumeLabel}</p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending} loadingLabel="Saving">
            {application ? 'Save changes' : 'Record application'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
