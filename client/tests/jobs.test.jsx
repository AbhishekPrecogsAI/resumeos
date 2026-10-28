import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderRoute, renderWithProviders } from './render.jsx';
import { mockApi, SIGNED_IN } from './fetchMock.js';
import { TermsEditor } from '../src/features/jobs/TermsEditor.jsx';
import { extractTerms } from '@resumeos/shared/jobs/extract.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';
import { buildBaselines } from '@resumeos/shared/sync.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';

const JD = 'Requirements:\n- Node.js and Go services\n- Kubernetes on AWS\n- Elixir\n';

function profileWithOldRole() {
  const p = structuredClone(sampleResume);
  p.experience.push({
    id: 'exp_old',
    company: 'Old Co',
    title: 'Developer',
    location: '',
    employmentType: '',
    startDate: '2015-01',
    endDate: '2018-12',
    current: false,
    bullets: [{ id: 'b_k', text: 'Built Elixir services', evidenceIds: [] }],
  });
  return { ...p, evidenceItems: [] };
}

function resumeDetail(id = 'r1') {
  const content = structuredClone(sampleResume);
  return {
    id,
    title: 'Backend',
    targetRole: '',
    templateId: 'clarity',
    pageSize: 'A4',
    draftRevision: 1,
    qualityDismissals: [],
    updatedAt: new Date().toISOString(),
    draft: { content, layout: defaultLayout(content), baselines: buildBaselines(content) },
  };
}

const api = (extra = {}) => ({
  ...SIGNED_IN,
  'GET /api/v1/resumes': [200, { items: [resumeDetail()], total: 1, page: 1, limit: 50 }],
  'GET /api/v1/resumes/r1': [200, { resume: resumeDetail() }],
  'GET /api/v1/profile': [200, { profile: { revision: 2, content: profileWithOldRole() } }],
  ...extra,
});

describe('TermsEditor', () => {
  function Harness() {
    const [terms, setTerms] = useState(extractTerms(JD));
    return <TermsEditor terms={terms} onChange={setTerms} />;
  }

  it('removes terms and adds custom ones, rejecting duplicates', () => {
    renderWithProviders(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Go' }));
    expect(screen.queryByRole('button', { name: 'Remove Go' })).not.toBeInTheDocument();
    const input = screen.getByLabelText('Add a term the parser missed');
    fireEvent.change(input, { target: { value: 'postgres' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Remove PostgreSQL' })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'Kubernetes' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('"Kubernetes" is already in the list.')).toBeInTheDocument();
  });
});

describe('new job page', () => {
  it('analyzes locally without sending the job description anywhere', async () => {
    const { calls } = mockApi(api());
    renderRoute('/app/jobs/new');
    fireEvent.change(await screen.findByLabelText(/Job description/), { target: { value: JD } });
    expect(screen.getByLabelText('Save this job description to my account')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(await screen.findByText(/job terms found in this resume/)).toBeInTheDocument();
    expect(
      screen.getByText('Not saved. This analysis exists only in this browser tab.'),
    ).toBeInTheDocument();
    expect(calls.filter((c) => c.path.startsWith('/api/v1/jobs'))).toEqual([]);
    expect(JSON.stringify(calls.map((c) => c.body ?? null))).not.toContain('Elixir');
  });

  it('saves only with consent', async () => {
    const { calls } = mockApi(
      api({
        'POST /api/v1/jobs': [
          201,
          {
            job: {
              id: 'j1',
              title: 'Platform',
              company: '',
              terms: [],
              extractedTerms: [],
              descriptionText: JD,
            },
          },
        ],
        'GET /api/v1/jobs/j1': [
          200,
          {
            job: {
              id: 'j1',
              title: 'Platform',
              company: '',
              terms: [],
              extractedTerms: [],
              descriptionText: JD,
            },
          },
        ],
      }),
    );
    const { router } = renderRoute('/app/jobs/new');
    fireEvent.change(await screen.findByLabelText(/Job description/), { target: { value: JD } });
    fireEvent.click(screen.getByLabelText('Save this job description to my account'));
    fireEvent.click(screen.getByRole('button', { name: 'Save and analyze' }));
    expect(await screen.findByText('Add the job title to save it.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Platform' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save and analyze' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/jobs/j1'));
    expect(calls.find((c) => c.method === 'POST' && c.path === '/api/v1/jobs').body).toEqual({
      title: 'Platform',
      company: '',
      descriptionText: JD,
    });
  });
});

describe('coverage and tailoring', () => {
  it('shows the three groups, explains "not found" carefully, and creates a copy with approved changes only', async () => {
    const copy = resumeDetail('r2');
    const { calls } = mockApi(
      api({
        'POST /api/v1/resumes/r1/duplicate': [201, { resume: copy }],
        'PUT /api/v1/resumes/r2/draft': (init) => [
          200,
          { resume: { ...copy, draftRevision: 2, draft: JSON.parse(init.body) } },
        ],
        'GET /api/v1/resumes/r2': [200, { resume: copy }],
      }),
    );
    const { router } = renderRoute('/app/jobs/new');
    fireEvent.change(await screen.findByLabelText(/Job description/), {
      target: { value: `${JD}- Scala\n` },
    });
    fireEvent.change(screen.getByLabelText(/Job title/), {
      target: { value: 'Platform Engineer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));

    const profileGroup = (
      await screen.findByRole('heading', { name: /In your profile but not on this resume/ })
    ).closest('section');
    const suggestion = within(profileGroup).getByLabelText(
      /Add "Experience: Developer, Old Co" from your profile/,
    );
    expect(
      screen.getByRole('heading', { name: /Not found in your saved profile/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/says nothing about your actual experience/)).toBeInTheDocument();

    fireEvent.click(suggestion);
    fireEvent.click(screen.getByRole('button', { name: /Create a tailored copy with 1/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/resumes/r2/edit'));
    expect(calls.find((c) => c.path === '/api/v1/resumes/r1/duplicate').body).toEqual({
      title: 'Platform Engineer',
      targetRole: 'Platform Engineer',
    });
    const put = calls.find((c) => c.method === 'PUT');
    expect(put.body.content.experience.map((e) => e.id)).toContain('exp_old');
    // Nothing was invented: the added role is the profile's own entry.
    expect(put.body.content.skills).toEqual(sampleResume.skills);
  });
});
