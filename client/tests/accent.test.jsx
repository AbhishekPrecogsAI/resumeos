import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, renderRoute } from './render.jsx';
import { mockApi, SIGNED_IN } from './fetchMock.js';
import { AccentPicker } from '../src/components/editor/AccentPicker.jsx';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';
import { buildBaselines } from '@resumeos/shared/sync.js';

describe('AccentPicker', () => {
  it('chooses a swatch, resets to the default, and validates custom colours', () => {
    const onChange = vi.fn();
    renderWithProviders(<AccentPicker value={null} defaultAccent="#17323f" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Accent/ }));
    expect(screen.getByRole('radio', { name: 'Template default' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Wine' }));
    expect(onChange).toHaveBeenLastCalledWith('#8a1f3d');

    fireEvent.click(screen.getByRole('button', { name: /Accent/ }));
    const input = screen.getByLabelText('Custom colour');
    fireEvent.change(input, { target: { value: '#ffee00' } });
    expect(screen.getByText(/too light/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '#1F4FB4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(onChange).toHaveBeenLastCalledWith('#1f4fb4');

    fireEvent.click(screen.getByRole('button', { name: /Accent/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Template default' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('editor accent control', () => {
  const resume = (templateId, accentColor = null) => {
    const content = structuredClone(sampleResume);
    return {
      id: 'r1',
      title: 'R',
      targetRole: '',
      templateId,
      pageSize: 'A4',
      accentColor,
      draftRevision: 1,
      qualityDismissals: [],
      draft: { content, layout: defaultLayout(content), baselines: buildBaselines(content) },
    };
  };

  it('is offered for accent templates and saves the choice', async () => {
    const { calls } = mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [
        200,
        { profile: { revision: 1, content: { ...sampleResume, evidenceItems: [] } } },
      ],
      'GET /api/v1/resumes/r1': [200, { resume: resume('meridian') }],
      'PATCH /api/v1/resumes/r1': (init) => [
        200,
        { resume: { ...resume('meridian'), ...JSON.parse(init.body) } },
      ],
    });
    renderRoute('/app/resumes/r1/edit');
    fireEvent.click(await screen.findByRole('button', { name: /Accent/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Forest' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ accentColor: '#245b34' }),
    );
  });

  it('is not offered for Clarity', async () => {
    mockApi({
      ...SIGNED_IN,
      'GET /api/v1/profile': [
        200,
        { profile: { revision: 1, content: { ...sampleResume, evidenceItems: [] } } },
      ],
      'GET /api/v1/resumes/r1': [200, { resume: resume('clarity') }],
    });
    renderRoute('/app/resumes/r1/edit');
    await screen.findByLabelText('Resume name');
    expect(screen.queryByRole('button', { name: /Accent/ })).not.toBeInTheDocument();
  });
});
