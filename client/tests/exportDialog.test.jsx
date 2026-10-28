import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from './render.jsx';
import { mockApi } from './fetchMock.js';
import { ExportDialog } from '../src/features/resumes/editor/ExportDialog.jsx';

const record = (status, checks) => ({
  id: 'x1',
  resumeId: 'r1',
  pageCount: 1,
  byteSize: 40960,
  pageSize: 'A4',
  draftRevision: 3,
  createdAt: new Date().toISOString(),
  downloadAvailable: status !== 'failed',
  validation: { status, checks, method: 'pdfjs text extraction' },
});

const props = (flush = vi.fn(async () => true)) => ({
  open: true,
  onClose: () => {},
  resume: { id: 'r1' },
  meta: { title: 'Platform roles', templateId: 'clarity', pageSize: 'Letter' },
  flush,
  saveStatus: 'saved',
});

describe('ExportDialog', () => {
  it('saves first, exports with an idempotency key, and shows every check', async () => {
    const flush = vi.fn(async () => true);
    const { calls } = mockApi({
      'GET /api/v1/exports': [200, { items: [], total: 0 }],
      'POST /api/v1/resumes/r1/export': [
        201,
        {
          export: record('warnings', [
            { id: 'PARSES', label: 'Opens in a PDF parser', result: 'pass', detail: '1 page' },
            {
              id: 'LINKS_PRESERVED',
              label: 'Links are clickable',
              result: 'warn',
              detail: '1 of 2 links lost',
            },
          ]),
        },
      ],
    });
    renderWithProviders(<ExportDialog {...props(flush)} />);
    expect(screen.getByLabelText('Page size')).toHaveValue('Letter');
    fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }));
    expect(await screen.findByText('Passed with warnings')).toBeInTheDocument();
    expect(flush).toHaveBeenCalled();
    const post = calls.find((c) => c.method === 'POST');
    expect(post.body).toEqual({ format: 'pdf', pageSize: 'Letter' });
    expect(post.headers['idempotency-key']).toMatch(/^[a-f0-9]{32}$/);
    expect(screen.getByText('1 of 2 links lost')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download PDF' })).toHaveAttribute(
      'href',
      '/api/v1/exports/x1/download',
    );
  });

  it('does not export when the latest edits could not be saved', async () => {
    const { calls } = mockApi({ 'GET /api/v1/exports': [200, { items: [], total: 0 }] });
    renderWithProviders(<ExportDialog {...props(vi.fn(async () => false))} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }));
    expect(await screen.findByText(/couldn't be saved/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('withholds the download when checks failed', async () => {
    mockApi({
      'GET /api/v1/exports': [200, { items: [], total: 0 }],
      'POST /api/v1/resumes/r1/export': [
        201,
        {
          export: record('failed', [
            {
              id: 'EXPECTED_TEXT',
              label: 'Contains your resume text',
              result: 'fail',
              detail: 'Missing name',
            },
          ]),
        },
      ],
    });
    renderWithProviders(<ExportDialog {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }));
    expect(await screen.findByText('Checks failed')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Download PDF' })).not.toBeInTheDocument();
  });
});
