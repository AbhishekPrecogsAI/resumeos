import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderRoute } from './render.jsx';
import { mockApi, SIGNED_IN } from './fetchMock.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { emptyContent, defaultLayout } from '@resumeos/shared/resumeModel.js';
import { buildBaselines } from '@resumeos/shared/sync.js';

const profileContent = { ...structuredClone(sampleResume), evidenceItems: [] };
const profileBody = (revision = 3, content = profileContent) => ({
  profile: { revision, content, updatedAt: new Date().toISOString() },
});

function resumeBody(overrides = {}) {
  const content = structuredClone(sampleResume);
  return {
    resume: {
      id: 'r1',
      title: 'Platform roles',
      targetRole: 'Platform Engineer',
      templateId: 'clarity',
      pageSize: 'A4',
      archived: false,
      updatedAt: new Date().toISOString(),
      draftRevision: 4,
      draft: { content, layout: defaultLayout(content), baselines: buildBaselines(content) },
      ...overrides,
    },
  };
}

describe('profile page', () => {
  it('autosaves edits with the loaded revision', async () => {
    const { calls } = mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [200, profileBody(3)],
      'PUT /api/v1/profile': (init) => [200, profileBody(4, JSON.parse(init.body).content)],
    });
    renderRoute('/app/profile');
    const headline = await screen.findByLabelText('Headline');
    fireEvent.change(headline, { target: { value: 'Platform engineer' } });
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true), {
      timeout: 3000,
    });
    const put = calls.find((c) => c.method === 'PUT');
    expect(put.headers['if-match']).toBe('"3"');
    expect(put.body.content.headline).toBe('Platform engineer');
    expect(await screen.findByText(/^Saved/)).toBeInTheDocument();
  });

  it('shows the conflict banner on a stale revision', async () => {
    mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [200, profileBody(3)],
      'PUT /api/v1/profile': [
        409,
        {
          error: {
            code: 'STALE_REVISION',
            message: 'Changed elsewhere',
            details: { currentRevision: 5 },
          },
        },
      ],
    });
    renderRoute('/app/profile');
    fireEvent.change(await screen.findByLabelText('Headline'), { target: { value: 'Mine' } });
    expect(
      await screen.findByText(
        'Your profile was changed in another tab or device',
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load latest version' })).toBeInTheDocument();
    expect(screen.getByLabelText('Headline')).toHaveValue('Mine');
  });

  it('shows the completion checklist with explicit rules', async () => {
    mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [200, profileBody(0, { ...emptyContent(), evidenceItems: [] })],
    });
    renderRoute('/app/profile');
    expect(await screen.findByText(/Profile checklist: 0 of 9 done/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /To do: Add your name/ })).toHaveAttribute(
      'href',
      '#contact',
    );
  });
});

describe('new resume', () => {
  it('creates from the target role and opens the editor', async () => {
    const { calls } = mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [200, profileBody(3)],
      'POST /api/v1/resumes': [201, resumeBody()],
      'GET /api/v1/resumes/r1': [200, resumeBody()],
    });
    const { router } = renderRoute('/app/resumes/new?template=clarity');
    fireEvent.change(await screen.findByLabelText(/Target role/), {
      target: { value: 'Platform Engineer' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create resume' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/resumes/r1/edit'));
    expect(calls.find((c) => c.method === 'POST').body).toMatchObject({
      title: 'Platform Engineer resume',
      templateId: 'clarity',
      pageSize: 'A4',
    });
  });
});

describe('resume editor', () => {
  it('renders sections, preview and save status', async () => {
    mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [200, profileBody(3)],
      'GET /api/v1/resumes/r1': [200, resumeBody()],
    });
    renderRoute('/app/resumes/r1/edit');
    expect(await screen.findByLabelText('Resume name')).toHaveValue('Platform roles');
    const nav = screen.getByRole('navigation', { name: 'Resume sections' });
    expect(within(nav).getByRole('button', { name: /^Experience/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getAllByText('Saved').length).toBeGreaterThan(0);
  });

  it('hides a section and saves the layout with the draft revision', async () => {
    const { calls } = mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [200, profileBody(3)],
      'GET /api/v1/resumes/r1': [200, resumeBody()],
      'PUT /api/v1/resumes/r1/draft': (init) => [
        200,
        resumeBody({ draftRevision: 5, draft: JSON.parse(init.body) }),
      ],
    });
    renderRoute('/app/resumes/r1/edit');
    fireEvent.click(await screen.findByRole('button', { name: 'Hide Projects from resume' }));
    expect(screen.getByRole('button', { name: 'Show Projects on resume' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true), {
      timeout: 3000,
    });
    const put = calls.find((c) => c.method === 'PUT');
    expect(put.headers['if-match']).toBe('"4"');
    expect(put.body.layout.hiddenSections).toEqual(['projects']);
  });

  it('offers a profile update and applies it only when asked', async () => {
    const updatedProfile = structuredClone(profileContent);
    updatedProfile.experience[0].title = 'Staff Backend Engineer';
    mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [200, profileBody(4, updatedProfile)],
      'GET /api/v1/resumes/r1': [200, resumeBody()],
    });
    renderRoute('/app/resumes/r1/edit');
    const nav = await screen.findByRole('navigation', { name: 'Resume sections' });
    fireEvent.click(within(nav).getByRole('button', { name: /^Experience/ }));
    expect(await screen.findByText('Updated in profile')).toBeInTheDocument();
    expect(
      screen.getByText('Senior Backend Engineer, Northwind Freight (sample)'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use profile version' }));
    expect(screen.queryByText('Updated in profile')).not.toBeInTheDocument();
    expect(
      screen.getByText('Staff Backend Engineer, Northwind Freight (sample)'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Updated in profile')).toBeInTheDocument();
  });

  it('shows not-found for a missing resume', async () => {
    mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [200, profileBody(3)],
      'GET /api/v1/resumes/nope': [404, { error: { code: 'NOT_FOUND', message: 'Not found' } }],
    });
    renderRoute('/app/resumes/nope/edit');
    expect(await screen.findByText('Resume not found', {}, { timeout: 4000 })).toBeInTheDocument();
  });
});
