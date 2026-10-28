import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info } from 'lucide-react';
import { getTemplate } from '@resumeos/shared/templates/index.js';
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
import { TemplateGrid } from '../../components/templates/TemplateGrid.jsx';
import { TemplatePreview } from '../../components/preview/TemplatePreview.jsx';
import { PROFILE_KEY } from '../profile/ProfilePage.jsx';
import { RESUMES_KEY } from './resumeQueries.js';
import { samplePhotoFor } from '../../components/templates/TemplateGrid.jsx';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';

/**
 * Template-first creation: 1) pick a design, 2) name it. The editor then opens on the page itself.
 * A `?template=` link (from the public gallery) skips straight to step 2.
 */
export function NewResumePage() {
  useDocumentTitle('New resume');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const requested = params.get('template');
  const templateId = getTemplate(requested) ? requested : null;
  const [values, setValues] = useState({
    title: '',
    targetRole: '',
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

  if (!templateId) {
    return (
      <AppPage
        title="Choose a template"
        description="Pick a design to start with. You can switch templates and colours any time while editing."
        width="wide"
      >
        <TemplateGrid
          content={
            profile.data && profileCompletion(profile.data.content).done >= 3
              ? { ...sampleResume, ...profile.data.content }
              : sampleResume
          }
          cardLabel="Choose"
          onCardClick={(t) => setParams({ template: t.id })}
          renderActions={(t) => (
            <Button size="sm" onClick={() => setParams({ template: t.id })}>
              Use {t.name}
            </Button>
          )}
        />
      </AppPage>
    );
  }

  const template = getTemplate(templateId);
  const onSubmit = (e) => {
    e.preventDefault();
    const title =
      values.title.trim() ||
      (values.targetRole.trim() ? `${values.targetRole.trim()} resume` : `${template.name} resume`);
    create.mutate({
      title,
      targetRole: values.targetRole.trim(),
      templateId,
      pageSize: values.pageSize,
    });
  };
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const completion = profile.data ? profileCompletion(profile.data.content) : null;
  const formError =
    create.error && !Object.keys(fieldErrors(create.error)).length ? create.error : null;

  return (
    <AppPage
      title={`New resume with ${template.name}`}
      description="It starts as a copy of your master profile. Then you'll edit right on the page."
      width="default"
    >
      <Link
        to="/app/resumes/new"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Choose a different template
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="grid content-start gap-6">
          {completion && completion.done < 3 && (
            <div className="flex gap-3 rounded-lg border border-rule bg-surface p-4 text-sm">
              <Info className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
              <p className="text-muted">
                Your profile is mostly empty, so the page will start with placeholders you can click
                and type into. Anything you add on a resume stays on that resume;{' '}
                <Link
                  to="/app/profile"
                  className="font-medium text-accent underline underline-offset-2"
                >
                  filling your profile
                </Link>{' '}
                lets every resume reuse it.
              </p>
            </div>
          )}
          <form noValidate onSubmit={onSubmit}>
            <Panel
              footer={
                <Button type="submit" loading={create.isPending} loadingLabel="Creating resume">
                  Create and start editing
                </Button>
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
                  optionalLabel
                  value={values.title}
                  onChange={set('title')}
                  error={errors.title}
                  hint="Only you see this."
                  maxLength={120}
                />
                <SelectField label="Page size" value={values.pageSize} onChange={set('pageSize')}>
                  <option value="A4">A4</option>
                  <option value="Letter">US Letter</option>
                </SelectField>
              </div>
            </Panel>
          </form>
        </div>
        <div>
          <div className="theme-light overflow-hidden rounded-md shadow-paper">
            <TemplatePreview
              content={sampleResume}
              templateId={templateId}
              firstPageOnly
              photo={samplePhotoFor(template)}
              title={`${template.name} preview`}
            />
          </div>
          <p className="mt-2 text-xs text-faint">{template.style}</p>
        </div>
      </div>
    </AppPage>
  );
}
