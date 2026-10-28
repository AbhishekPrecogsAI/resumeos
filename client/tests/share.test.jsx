import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderRoute, renderWithProviders } from './render.jsx';
import { mockApi, SIGNED_OUT } from './fetchMock.js';
import { ShareDialog } from '../src/features/resumes/editor/ShareDialog.jsx';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';

const share = (over = {}) => ({
  id: 's1',
  resumeId: 'r1',
  path: '/r/abcdefghijklmnopqrstuvwx',
  label: 'Recruiter at Acme',
  versionId: null,
  versionLabel: null,
  versionMissing: false,
  allowDownload: true,
  hideContactDetails: false,
  enabled: true,
  expiresAt: null,
  expired: false,
  viewCount: 0,
  lastViewedAt: null,
  downloadCount: 0,
  createdAt: new Date().toISOString(),
  ...over,
});

const VERSIONS = {
  'GET /api/v1/resumes/r1/versions': [
    200,
    { items: [{ id: 'v1', versionNumber: 1, name: 'Sent to Acme' }], total: 1 },
  ],
};

describe('ShareDialog', () => {
  it('saves first, then creates a link with the chosen options', async () => {
    const flush = vi.fn(async () => true);
    const { calls } = mockApi({
      ...VERSIONS,
      'GET /api/v1/resumes/r1/shares': [200, { shares: [] }],
      'POST /api/v1/resumes/r1/shares': [201, { share: share() }],
    });
    renderWithProviders(<ShareDialog open onClose={() => {}} resumeId="r1" flush={flush} />);
    expect(await screen.findByText(/No links yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Who is it for/), {
      target: { value: 'Recruiter at Acme' },
    });
    fireEvent.change(screen.getByLabelText('Link expires'), { target: { value: '30' } });
    fireEvent.click(screen.getByLabelText('Hide email and phone'));
    fireEvent.click(screen.getByRole('button', { name: /Create link/ }));
    await vi.waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(flush).toHaveBeenCalled();
    expect(calls.find((c) => c.method === 'POST').body).toEqual({
      label: 'Recruiter at Acme',
      versionId: null,
      allowDownload: true,
      hideContactDetails: true,
      expiresInDays: 30,
    });
  });

  it('pins a saved version without saving the draft', async () => {
    const flush = vi.fn(async () => false);
    const { calls } = mockApi({
      ...VERSIONS,
      'GET /api/v1/resumes/r1/shares': [200, { shares: [] }],
      'POST /api/v1/resumes/r1/shares': [201, { share: share({ versionId: 'v1' }) }],
    });
    renderWithProviders(<ShareDialog open onClose={() => {}} resumeId="r1" flush={flush} />);
    await screen.findByRole('option', { name: /v1: Sent to Acme/ });
    fireEvent.change(screen.getByLabelText('What they see'), { target: { value: 'v1' } });
    fireEvent.click(screen.getByRole('button', { name: /Create link/ }));
    await vi.waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(flush).not.toHaveBeenCalled();
    expect(calls.find((c) => c.method === 'POST').body.versionId).toBe('v1');
  });

  it("won't create a live link when the latest edits couldn't be saved", async () => {
    const { calls } = mockApi({
      ...VERSIONS,
      'GET /api/v1/resumes/r1/shares': [200, { shares: [] }],
    });
    renderWithProviders(
      <ShareDialog open onClose={() => {}} resumeId="r1" flush={vi.fn(async () => false)} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Create link/ }));
    expect(await screen.findByText(/couldn't be saved/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('lists links with their status and changes options in place', async () => {
    const { calls } = mockApi({
      ...VERSIONS,
      'GET /api/v1/resumes/r1/shares': [
        200,
        {
          shares: [
            share({ viewCount: 3, lastViewedAt: new Date().toISOString() }),
            share({ id: 's2', label: '', enabled: false }),
          ],
        },
      ],
      'PATCH /api/v1/resumes/r1/shares/s1': [200, { share: share({ allowDownload: false }) }],
    });
    renderWithProviders(<ShareDialog open onClose={() => {}} resumeId="r1" />);
    const first = (await screen.findByText('Recruiter at Acme')).closest('li');
    expect(within(first).getByDisplayValue(/\/r\/abcdefghijklmnopqrstuvwx$/)).toBeInTheDocument();
    expect(within(first).getByText(/Opened 3 times/)).toBeInTheDocument();
    expect(within(first).getByText('Active')).toBeInTheDocument();
    const second = screen.getByText('Untitled link').closest('li');
    expect(within(second).getByText('Turned off')).toBeInTheDocument();

    fireEvent.click(within(first).getByLabelText('Allow PDF download'));
    await vi.waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    expect(calls.find((c) => c.method === 'PATCH').body).toEqual({ allowDownload: false });
  });
});

describe('shared resume page', () => {
  const TOKEN = 'abcdefghijklmnopqrstuvwx';
  const view = (over = {}) => ({
    name: sampleResume.contact.name,
    headline: sampleResume.headline,
    content: sampleResume,
    layout: defaultLayout(sampleResume),
    photo: null,
    templateId: 'orbit',
    pageSize: 'A4',
    accentColor: null,
    backgroundPattern: 'network',
    updatedAt: new Date().toISOString(),
    allowDownload: true,
    expiresAt: null,
    ...over,
  });

  it('shows the resume read-only with a download button when allowed', async () => {
    mockApi({ ...SIGNED_OUT, [`GET /api/v1/shared/${TOKEN}`]: [200, { resume: view() }] });
    renderRoute(`/r/${TOKEN}`);
    // jsdom has no layout, so the preview iframe isn't mounted; the header shows the data loaded.
    expect(await screen.findByRole('button', { name: /Download PDF/ })).toBeInTheDocument();
    expect(screen.getByText(sampleResume.contact.name)).toBeInTheDocument();
    expect(document.title).toBe(`${sampleResume.contact.name}'s resume | ResumeOS`);
    expect(document.head.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow');
  });

  it('has no download button when the owner hasn’t allowed it', async () => {
    mockApi({
      ...SIGNED_OUT,
      [`GET /api/v1/shared/${TOKEN}`]: [200, { resume: view({ allowDownload: false }) }],
    });
    renderRoute(`/r/${TOKEN}`);
    await screen.findByText(sampleResume.headline);
    expect(screen.queryByRole('button', { name: /Download PDF/ })).toBeNull();
  });

  it.each([
    [410, 'SHARE_EXPIRED', /This link has expired/],
    [404, 'SHARE_UNAVAILABLE', /This link isn't active/],
  ])('explains a %s link', async (status, code, heading) => {
    mockApi({
      ...SIGNED_OUT,
      [`GET /api/v1/shared/${TOKEN}`]: [status, { error: { code, message: 'x' } }],
    });
    renderRoute(`/r/${TOKEN}`);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
