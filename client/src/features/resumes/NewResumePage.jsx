import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { TEMPLATES, getTemplate, DEFAULT_TEMPLATE_ID } from '@resumeos/shared/templates/index.js';
import { profileCompletion } from '@resumeos/shared/completion.js';
import { resumesApi } from '../../api/resumes.api.js';
import { profileApi } from '../../api/profile.api.js';
import { fieldErrors } from '../../api/client.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { AppPage, Panel } from '../../components/layout/AppPage.jsx';
import { TextField, SelectField } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormAlert } from '../../components/ui/FormAlert.jsx';
import { PROFILE_KEY } from '../profile/ProfilePage.jsx';
import { RESUMES_KEY } from './resumeQueries.js';

export function NewResumePage() {
  useDocumentTitle('New resume');
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requested = params.get('template');
  const [values, setValues] = useState({
    title: '',
    targetRole: '',
    templateId: getTemplate(requested) ? requested : DEFAULT_TEMPLATE_ID,
    pageSize: user.preferences.pageSize,
  });
  const [errors, setErrors] = useState({});
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: profileApi.get });

  const create = useMutation({
    mutationFn: resumesApi.create,
    onSuccess: (resume) => {
      queryClient.invalidateQueries({ queryKey: RESUMES_KEY });
      navigate(`/app/resumes/${resume.id}/edit`, { replace: true });
    },
    onError: (err) => setErrors(fieldErrors(err)),
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const title =
      values.title.trim() || (values.targetRole.trim() ? `${values.targetRole.trim()} resume` : '');
    if (!title) {
      setErrors({ title: 'Give the resume a name, or enter a target role.' });
      return;
    }
    create.mutate({ ...values, title });
  };

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const completion = profile.data ? profileCompletion(profile.data.content) : null;
  const formError =
    create.error && !Object.keys(fieldErrors(create.error)).length ? create.error : null;

  return (
    <AppPage
      title="New resume"
      description="The resume starts as a copy of your master profile. Tailor it freely; the profile stays as it is."
      width="narrow"
    >
      {completion && completion.done < 3 && (
        <div className="mb-6 flex gap-3 rounded-lg border border-rule bg-surface p-4 text-sm">
          <Info className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
          <p className="text-muted">
            Your profile is mostly empty ({completion.done} of {completion.total} checklist items),
            so this resume will start nearly blank.{' '}
            <Link
              to="/app/profile"
              className="font-medium text-accent underline underline-offset-2"
            >
              Fill in your profile first
            </Link>{' '}
            to reuse it across every resume.
          </p>
        </div>
      )}
      <form noValidate onSubmit={onSubmit}>
        <Panel
          footer={
            <>
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending} loadingLabel="Creating resume">
                Create resume
              </Button>
            </>
          }
        >
          <div className="grid gap-5">
            <FormAlert error={formError} />
            <TextField
              label="Target role"
              optionalLabel
              value={values.targetRole}
              onChange={set('targetRole')}
              hint="The kind of role this version is for, like Platform Engineer."
              maxLength={120}
            />
            <TextField
              label="Resume name"
              value={values.title}
              onChange={set('title')}
              error={errors.title}
              hint="Only you see this. Leave blank to use the target role."
              maxLength={120}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Template"
                value={values.templateId}
                onChange={set('templateId')}
                hint={getTemplate(values.templateId)?.style}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Page size" value={values.pageSize} onChange={set('pageSize')}>
                <option value="A4">A4</option>
                <option value="Letter">US Letter</option>
              </SelectField>
            </div>
          </div>
        </Panel>
      </form>
    </AppPage>
  );
}
