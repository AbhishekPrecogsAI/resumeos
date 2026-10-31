import { beforeEach, describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderRoute } from './render.jsx';
import { mockApi, SIGNED_IN } from './fetchMock.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { SAMPLE_PHOTO } from '@resumeos/shared/sample/samplePhoto.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';
import { buildBaselines } from '@resumeos/shared/sync.js';

const resume = (templateId) => {
  const content = structuredClone(sampleResume);
  return {
    id: 'r1',
    title: 'R',
    targetRole: '',
    templateId,
    pageSize: 'A4',
    accentColor: null,
    draftRevision: 1,
    qualityDismissals: [],
    draft: { content, layout: defaultLayout(content), baselines: buildBaselines(content) },
  };
};
const base = (templateId, photo) => ({
  ...SIGNED_IN,
  'GET /api/v1/profile': [
    200,
    { profile: { revision: 1, content: { ...sampleResume, evidenceItems: [] } } },
  ],
  'GET /api/v1/profile/photo': [200, { photo }],
  'GET /api/v1/resumes/r1': [200, { resume: resume(templateId) }],
  'PUT /api/v1/resumes/r1/draft': (init) => [
    200,
    { resume: { ...resume(templateId), draftRevision: 2, draft: JSON.parse(init.body) } },
  ],
});

// These cover the form view; the page (canvas) view has its own tests in canvas.test.jsx.
beforeEach(() => localStorage.setItem('resumeos:editorView', 'form'));

describe('show photo toggle', () => {
  it('turns the photo on for this resume and saves it in the layout', async () => {
    const { calls } = mockApi(base('orbit', { dataUrl: SAMPLE_PHOTO, width: 160, height: 160 }));
    renderRoute('/app/resumes/r1/edit');
    const toggle = await screen.findByLabelText('Show my photo on this resume');
    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true), {
      timeout: 3000,
    });
    expect(calls.find((c) => c.method === 'PUT').body.layout.showPhoto).toBe(true);
  });

  it('lets you upload a photo right there when none has been uploaded', async () => {
    mockApi(base('orbit', null));
    renderRoute('/app/resumes/r1/edit');
    expect(await screen.findByLabelText('Show my photo on this resume')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Upload photo/ })).toBeInTheDocument();
    expect(screen.getByText(/Upload a photo above first/)).toBeInTheDocument();
  });

  it('explains when the template has no photo, and names ones that do', async () => {
    mockApi(base('clarity', { dataUrl: SAMPLE_PHOTO }));
    renderRoute('/app/resumes/r1/edit');
    await screen.findByLabelText('Resume name');
    expect(screen.queryByLabelText('Show my photo on this resume')).not.toBeInTheDocument();
    expect(
      await screen.findByText(/Clarity doesn't show a photo\. Templates that do: Orbit/),
    ).toBeInTheDocument();
  });
});
