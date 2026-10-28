import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderRoute, renderWithProviders } from './render.jsx';
import { mockApi, SIGNED_IN } from './fetchMock.js';
import { DiffView } from '../src/components/versioning/DiffView.jsx';
import { diffResumes } from '@resumeos/shared/diff.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { buildBaselines } from '@resumeos/shared/sync.js';

const state = () => {
  const content = structuredClone(sampleResume);
  return { content, layout: defaultLayout(content), templateId: 'clarity', pageSize: 'A4' };
};

const resume = () => {
  const content = structuredClone(sampleResume);
  return {
    id: 'r1',
    title: 'Platform roles',
    targetRole: 'Platform Engineer',
    templateId: 'clarity',
    pageSize: 'A4',
    draftRevision: 3,
    draft: { content, layout: defaultLayout(content), baselines: buildBaselines(content) },
  };
};

const version = (n, extra = {}) => ({
  id: `v${n}`.padEnd(24, '0'),
  resumeId: 'r1',
  versionNumber: n,
  kind: 'manual',
  name: `Version ${n}`,
  changeNote: '',
  parentVersionId: null,
  restoredFromVersionId: null,
  templateId: 'clarity',
  templateVersion: '1.0.0',
  pageSize: 'A4',
  contentHash: '0'.repeat(16),
  createdAt: new Date().toISOString(),
  exported: false,
  ...extra,
});

describe('DiffView', () => {
  it('labels changes in text, not only colour, and switches layouts', () => {
    const right = state();
    right.content.experience[0].bullets[0].text =
      right.content.experience[0].bullets[0].text.replace('310 ms', '290 ms');
    right.content.projects = [];
    right.pageSize = 'Letter';
    renderWithProviders(<DiffView diff={diffResumes(state(), right)} />);
    expect(screen.getByText('Content: 1 removed, 1 changed.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Template and page settings' })).toBeInTheDocument();
    expect(screen.getByText('[removed:', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText('Removed').length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Education' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Show unchanged sections'));
    expect(screen.getByRole('heading', { name: 'Education' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Side by side' }));
    expect(screen.getAllByText(/, before$/).length).toBeGreaterThan(0);
  });

  it('says when two versions are identical', () => {
    renderWithProviders(<DiffView diff={diffResumes(state(), state())} />);
    expect(screen.getByText('These two are identical.')).toBeInTheDocument();
  });
});

describe('version history page', () => {
  it('lists versions with status badges and restores after confirmation', async () => {
    const v1 = version(1, { exported: true });
    const v2 = version(2, { parentVersionId: v1.id, name: 'Platform' });
    const { calls } = mockApi({
      ...SIGNED_IN,
      'GET /api/v1/resumes/r1': [200, { resume: resume() }],
      'GET /api/v1/resumes/r1/versions': [
        200,
        {
          items: [v2, v1],
          total: 2,
          page: 1,
          limit: 50,
          currentVersionId: v2.id,
          draftMatchesCurrent: false,
        },
      ],
      [`POST /api/v1/resumes/r1/versions/${v1.id}/restore`]: [
        201,
        {
          resume: resume(),
          restored: version(4, { kind: 'restore' }),
          autoSaved: version(3, { kind: 'auto' }),
        },
      ],
    });
    renderRoute('/app/resumes/r1/versions');
    expect(await screen.findByText('has changes since v2')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Saved versions, newest first' });
    expect(within(list).getByText('Current')).toBeInTheDocument();
    expect(within(list).getByText('Exported')).toBeInTheDocument();
    expect(within(list).getByText(/from v1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore v1' }));
    const dialog = screen.getByRole('dialog', { name: 'Restore v1?' });
    expect(dialog).toHaveAccessibleDescription(/saved as a new version/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restore v1' }));
    expect(await screen.findByText('Restored as v4')).toBeInTheDocument();
    expect(screen.getByText('Your unsaved draft was kept as v3.')).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });

  it('enables compare only with two selections', async () => {
    const v1 = version(1);
    const v2 = version(2);
    const v3 = version(3);
    mockApi({
      ...SIGNED_IN,
      'GET /api/v1/resumes/r1': [200, { resume: resume() }],
      'GET /api/v1/resumes/r1/versions': [
        200,
        { items: [v3, v2, v1], total: 3, currentVersionId: v3.id, draftMatchesCurrent: true },
      ],
    });
    renderRoute('/app/resumes/r1/versions');
    fireEvent.click(await screen.findByLabelText('Select v3 to compare'));
    expect(screen.queryByRole('link', { name: /Compare selected/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Select v1 to compare'));
    expect(screen.getByRole('link', { name: /Compare selected/ })).toHaveAttribute(
      'href',
      `/app/resumes/r1/compare/${v1.id}/${v3.id}`,
    );
  });

  it('shows an empty state before any version is saved', async () => {
    mockApi({
      ...SIGNED_IN,
      'GET /api/v1/resumes/r1': [200, { resume: resume() }],
      'GET /api/v1/resumes/r1/versions': [
        200,
        { items: [], total: 0, currentVersionId: null, draftMatchesCurrent: false },
      ],
    });
    renderRoute('/app/resumes/r1/versions');
    expect(await screen.findByText('No saved versions yet')).toBeInTheDocument();
  });
});

describe('compare page', () => {
  it('renders both sides and the diff', async () => {
    const right = state();
    right.content.headline = 'Platform engineer';
    const v1 = version(1);
    mockApi({
      ...SIGNED_IN,
      [`GET /api/v1/resumes/r1/compare?left=${v1.id}&right=draft`]: [
        200,
        {
          left: { type: 'version', label: 'v1: Version 1', createdAt: new Date().toISOString() },
          right: { type: 'draft', label: 'Current draft', draftRevision: 5 },
          diff: diffResumes(state(), right),
        },
      ],
    });
    renderRoute(`/app/resumes/r1/compare/${v1.id}/draft`);
    expect(await screen.findByText('Current draft')).toBeInTheDocument();
    expect(screen.getByText('Unsaved working copy, revision 5')).toBeInTheDocument();
    expect(screen.getByText('Content: 1 changed.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Swap before and after' })).toHaveAttribute(
        'href',
        `/app/resumes/r1/compare/draft/${v1.id}`,
      ),
    );
  });
});
