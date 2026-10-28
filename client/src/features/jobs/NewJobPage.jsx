import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { extractTerms, MAX_JOB_DESCRIPTION_CHARS } from '@resumeos/shared/jobs/extract.js';
import { jobsApi, JOBS_KEY } from '../../api/jobs.api.js';
import { fieldErrors } from '../../api/client.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { AppPage, Panel } from '../../components/layout/AppPage.jsx';
import { TextField, TextArea, Checkbox } from '../../components/ui/Field.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormAlert } from '../../components/ui/FormAlert.jsx';
import { TermsEditor } from './TermsEditor.jsx';
import { CoverageReport } from './CoverageReport.jsx';

/**
 * Paste a job description. Without consent to save, extraction and comparison run entirely in
 * the browser and nothing is sent to the server.
 */
export function NewJobPage() {
  useDocumentTitle('Add job description');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ title: '', company: '', descriptionText: '' });
  const [save, setSave] = useState(false);
  const [errors, setErrors] = useState({});
  const [analysis, setAnalysis] = useState(null);

  const create = useMutation({
    mutationFn: jobsApi.create,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY });
      navigate(`/app/jobs/${job.id}`, { replace: true });
    },
    onError: (err) => setErrors(fieldErrors(err)),
  });

  const chars = values.descriptionText.length;
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const job = useMemo(
    () => ({ title: values.title.trim(), company: values.company.trim() }),
    [values.title, values.company],
  );

  const onSubmit = (e) => {
    e.preventDefault();
    const next = {};
    if (values.descriptionText.trim().length < 20)
      next.descriptionText = 'Paste the full job description (at least a few sentences).';
    if (chars > MAX_JOB_DESCRIPTION_CHARS)
      next.descriptionText = `Job descriptions can be at most ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString()} characters. Trim boilerplate like benefits or legal text.`;
    if (save && !values.title.trim()) next.title = 'Add the job title to save it.';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (save)
      create.mutate({
        title: values.title.trim(),
        company: values.company.trim(),
        descriptionText: values.descriptionText,
      });
    else setAnalysis({ terms: extractTerms(values.descriptionText) });
  };

  return (
    <AppPage title="Add job description" width="narrow">
      <form noValidate onSubmit={onSubmit}>
        <Panel
          footer={
            <Button type="submit" loading={create.isPending} loadingLabel="Saving">
              {save ? 'Save and analyze' : 'Analyze'}
            </Button>
          }
        >
          <div className="grid gap-5">
            <FormAlert
              error={
                create.error && !Object.keys(fieldErrors(create.error)).length ? create.error : null
              }
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Job title"
                optionalLabel={!save}
                required={save}
                value={values.title}
                onChange={set('title')}
                error={errors.title}
                maxLength={160}
              />
              <TextField
                label="Company"
                optionalLabel
                value={values.company}
                onChange={set('company')}
                maxLength={160}
              />
            </div>
            <TextArea
              label="Job description"
              rows={12}
              value={values.descriptionText}
              onChange={(e) => {
                set('descriptionText')(e);
                setAnalysis(null);
              }}
              error={errors.descriptionText}
              hint={`${chars.toLocaleString()} of ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString()} characters. Paste the text; links to job sites aren't fetched.`}
            />
            <Checkbox
              label="Save this job description to my account"
              hint="Off by default. When off, the analysis runs in your browser and the text isn't sent to or stored on our servers. When on, it's stored until you delete it."
              checked={save}
              onChange={(e) => setSave(e.target.checked)}
            />
          </div>
        </Panel>
      </form>

      {analysis && (
        <div className="mt-8 grid gap-8">
          <p className="flex items-start gap-2 rounded-lg border border-rule bg-surface p-3 text-sm text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-added" aria-hidden="true" />
            Not saved. This analysis exists only in this browser tab.
          </p>
          <section aria-labelledby="terms-heading">
            <h2 id="terms-heading" className="mb-3 text-lg font-semibold text-ink">
              Terms found ({analysis.terms.length})
            </h2>
            <TermsEditor terms={analysis.terms} onChange={(terms) => setAnalysis({ terms })} />
          </section>
          <section aria-labelledby="coverage-heading">
            <h2 id="coverage-heading" className="mb-3 text-lg font-semibold text-ink">
              Coverage
            </h2>
            <CoverageReport terms={analysis.terms} job={job} />
          </section>
        </div>
      )}
    </AppPage>
  );
}
