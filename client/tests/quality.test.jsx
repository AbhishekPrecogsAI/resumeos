import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within, waitFor } from '@testing-library/react';
import { renderWithProviders, renderRoute } from './render.jsx';
import { mockApi, SIGNED_IN } from './fetchMock.js';
import { QualityPanel } from '../src/features/resumes/editor/QualityPanel.jsx';
import { runQualityChecks } from '@resumeos/shared/quality/engine.js';
import { emptyContent, defaultLayout } from '@resumeos/shared/resumeModel.js';
import { buildBaselines } from '@resumeos/shared/sync.js';

function content() {
  const c = emptyContent();
  c.contact = { ...c.contact, name: '', email: 'sam@example.com' };
  c.experience = [
    {
      id: 'exp_1',
      company: 'Northwind',
      title: 'Engineer',
      location: '',
      employmentType: '',
      startDate: '2020-01',
      endDate: '2021-01',
      current: false,
      bullets: [
        { id: 'b1', text: 'Built the API', evidenceIds: [] },
        { id: 'b2', text: '', evidenceIds: [] },
      ],
    },
  ];
  return c;
}

describe('QualityPanel', () => {
  it('groups findings by severity with counts and no score', () => {
    const c = content();
    renderWithProviders(
      <QualityPanel
        report={runQualityChecks(c, defaultLayout(c))}
        onJump={() => {}}
        onFix={() => {}}
        onDismiss={() => {}}
        onRestore={() => {}}
      />,
    );
    expect(screen.getByText('1 error, 0 warnings, 1 suggestion.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Errors that can break the document \(1\)/ }),
    ).toBeInTheDocument();
    const errors = screen.getByRole('heading', { name: /Errors that can break/ }).closest('section');
    expect(within(errors).getByText('Missing name')).toBeInTheDocument();
    expect(screen.getByText(/Checks performed/)).toBeInTheDocument();
  });

  it('offers fixes, jumps to the location, and dismisses with a reason', () => {
    const c = content();
    const onFix = vi.fn();
    const onJump = vi.fn();
    const onDismiss = vi.fn();
    renderWithProviders(
      <QualityPanel
        report={runQualityChecks(c, defaultLayout(c))}
        onJump={onJump}
        onFix={onFix}
        onDismiss={onDismiss}
        onRestore={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove the empty bullet/ }));
    expect(onFix.mock.calls[0][0].ruleId).toBe('EMPTY_BULLET');
    fireEvent.click(
      screen.getByRole('button', { name: /Experience: Engineer, Northwind, bullet 2/ }),
    );
    expect(onJump.mock.calls[0][0].section).toBe('experience');
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Dismiss this finding?' });
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'Intentional' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledWith(
      expect.objectContaining({ ruleId: 'EMPTY_REQUIRED_SECTION' }),
      'Intentional',
    );
  });
});

describe('editor checks tab', () => {
  it('applies a fix through the draft, persists it, and Undo restores it', async () => {
    const c = content();
    const { calls } = mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [
        200,
        { profile: { revision: 1, content: { ...c, evidenceItems: [] } } },
      ],
      'GET /api/v1/resumes/r1': [
        200,
        {
          resume: {
            id: 'r1',
            title: 'R',
            targetRole: '',
            templateId: 'clarity',
            pageSize: 'A4',
            draftRevision: 2,
            qualityDismissals: [],
            draft: { content: c, layout: defaultLayout(c), baselines: buildBaselines(c) },
          },
        },
      ],
      'PUT /api/v1/resumes/r1/draft': (init) => [
        200,
        {
          resume: {
            id: 'r1',
            title: 'R',
            templateId: 'clarity',
            pageSize: 'A4',
            draftRevision: 3,
            draft: JSON.parse(init.body),
          },
        },
      ],
    });
    renderRoute('/app/resumes/r1/edit');
    fireEvent.click((await screen.findAllByRole('tab', { name: /Checks \(2\)/ }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: /Remove the empty bullet/ }));
    await waitFor(() =>
      expect(screen.getAllByRole('tab', { name: /Checks \(1\)/ }).length).toBeGreaterThan(0),
    );
    await waitFor(() => expect(calls.some((x) => x.method === 'PUT')).toBe(true), {
      timeout: 3000,
    });
    expect(
      calls.find((x) => x.method === 'PUT').body.content.experience[0].bullets.map((b) => b.id),
    ).toEqual(['b1']);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(screen.getAllByRole('tab', { name: /Checks \(2\)/ }).length).toBeGreaterThan(0),
    );
  });
});
