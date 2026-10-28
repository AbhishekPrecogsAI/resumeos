import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderRoute, renderWithProviders } from './render.jsx';
import { mockApi, SIGNED_IN } from './fetchMock.js';
import { ExportDialog } from '../src/features/resumes/editor/ExportDialog.jsx';
import { formatDay, localToday } from '../src/api/applications.api.js';

const app = (extra = {}) => ({
  id: 'a1',
  company: 'Example Co',
  role: 'Platform Engineer',
  status: 'applied',
  appliedAt: '2026-10-20',
  nextFollowUpAt: '2026-10-01',
  notes: '',
  jobDescriptionId: null,
  jobLabel: 'Platform Engineer at Example Co',
  resumeId: null,
  resumeVersionId: null,
  resumeLabel: 'Backend, v2: Sent',
  updatedAt: new Date().toISOString(),
  ...extra,
});

describe('date helpers', () => {
  it('formats date-only values without shifting the day', () => {
    expect(formatDay('2026-01-01')).toMatch(/2026/);
    expect(formatDay('2026-01-01')).toMatch(/1/);
    expect(formatDay('nope')).toBe('');
    expect(localToday(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('applications page', () => {
  it('shows status, due follow-ups and preserved labels of deleted links', async () => {
    mockApi({ ...SIGNED_IN, 'GET /api/v1/applications': [200, { items: [app()], total: 1 }] });
    renderRoute('/app/applications');
    expect(await screen.findByText('Platform Engineer')).toBeInTheDocument();
    expect(screen.getByText('Follow-up due')).toBeInTheDocument();
    expect(screen.getByText('Backend, v2: Sent (deleted)')).toBeInTheDocument();
    expect(screen.getByText('Platform Engineer at Example Co (deleted)')).toBeInTheDocument();
  });

  it('records an application with validation', async () => {
    const { calls } = mockApi({
      ...SIGNED_IN,
      'GET /api/v1/applications': [200, { items: [], total: 0 }],
      'GET /api/v1/resumes': [200, { items: [{ id: 'r1', title: 'Backend' }], total: 1 }],
      'GET /api/v1/jobs': [200, { items: [], total: 0 }],
      'GET /api/v1/resumes/r1/versions': [
        200,
        { items: [{ id: 'v1', versionNumber: 1, name: 'Sent' }], total: 1 },
      ],
      'POST /api/v1/applications': [201, { application: app() }],
    });
    renderRoute('/app/applications');
    fireEvent.click((await screen.findAllByRole('button', { name: 'Record an application' }))[0]);
    const dialog = screen.getByRole('dialog', { name: 'Record an application' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record application' }));
    expect(within(dialog).getByText('Add the company.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Company/), { target: { value: 'Example Co' } });
    fireEvent.change(within(dialog).getByLabelText(/^Role/), {
      target: { value: 'Platform Engineer' },
    });
    await waitFor(() =>
      expect(within(dialog).getByRole('option', { name: 'Backend' })).toBeInTheDocument(),
    );
    fireEvent.change(within(dialog).getByLabelText('Resume sent'), { target: { value: 'r1' } });
    await waitFor(() =>
      expect(within(dialog).getByRole('option', { name: 'v1: Sent' })).toBeInTheDocument(),
    );
    fireEvent.change(within(dialog).getByLabelText('Saved version'), { target: { value: 'v1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Record application' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(calls.find((c) => c.method === 'POST').body).toMatchObject({
      company: 'Example Co',
      role: 'Platform Engineer',
      status: 'planned',
      resumeId: 'r1',
      resumeVersionId: 'v1',
      jobDescriptionId: null,
    });
    expect(await screen.findByText('Application recorded')).toBeInTheDocument();
  });

  it('shows follow-ups due on the dashboard', async () => {
    mockApi({
      ...SIGNED_IN,
      [`GET /api/v1/applications/due?today=${localToday()}`]: [200, { items: [app()] }],
      'GET /api/v1/resumes': [200, { items: [], total: 0 }],
      'GET /api/v1/exports': [200, { items: [], total: 0 }],
      'GET /api/v1/jobs': [200, { items: [], total: 0 }],
      'GET /api/v1/profile': [
        200,
        {
          profile: {
            revision: 0,
            content: { contact: {}, experience: [], skills: [], education: [], certifications: [] },
          },
        },
      ],
    });
    renderRoute('/app');
    expect(await screen.findByRole('heading', { name: 'Follow-ups due' })).toBeInTheDocument();
  });
});

describe('export dialog formats', () => {
  it('exports DOCX when chosen and labels the download', async () => {
    const { calls } = mockApi({
      'GET /api/v1/exports': [200, { items: [], total: 0 }],
      'POST /api/v1/resumes/r1/export': [
        201,
        {
          export: {
            id: 'x1',
            format: 'docx',
            pageCount: null,
            byteSize: 9000,
            pageSize: 'A4',
            downloadAvailable: true,
            validation: {
              status: 'passed',
              checks: [],
              method:
                "mammoth. Word reflows text, so page count and overflow aren't measured for DOCX",
            },
          },
        },
      ],
    });
    renderWithProviders(
      <ExportDialog
        open
        onClose={() => {}}
        resume={{ id: 'r1' }}
        meta={{ title: 'R', templateId: 'clarity', pageSize: 'A4' }}
        flush={vi.fn(async () => true)}
        saveStatus="saved"
      />,
    );
    fireEvent.change(screen.getByLabelText('Format'), { target: { value: 'docx' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate DOCX' }));
    expect(await screen.findByRole('link', { name: 'Download DOCX' })).toHaveAttribute(
      'href',
      '/api/v1/exports/x1/download',
    );
    expect(calls.find((c) => c.method === 'POST').body).toEqual({ format: 'docx', pageSize: 'A4' });
    expect(screen.queryByText(/pages?,/)).not.toBeInTheDocument();
  });
});
