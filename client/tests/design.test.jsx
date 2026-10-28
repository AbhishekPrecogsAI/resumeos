import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from './render.jsx';
import { mockApi } from './fetchMock.js';
import { DesignDialog } from '../src/features/resumes/editor/DesignDialog.jsx';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';
import { documentHeight, pagesFor } from '../src/lib/measurePages.js';

/** Holds the draft like the editor does, and exposes the latest layout to the test. */
function Harness({ templateId = 'meridian', layout = {}, flush, onLayout }) {
  const [draft, setDraft] = useState({
    content: sampleResume,
    layout: { ...defaultLayout(sampleResume), ...layout },
  });
  onLayout(draft.layout);
  return (
    <DesignDialog
      open
      onClose={() => {}}
      resumeId="r1"
      draft={draft}
      setDraft={setDraft}
      meta={{ templateId, pageSize: 'A4', accentColor: null, backgroundPattern: 'none' }}
      flush={flush}
    />
  );
}

function setup(props = {}) {
  let layout;
  renderWithProviders(<Harness {...props} onLayout={(l) => (layout = l)} />);
  return () => layout;
}

describe('DesignDialog', () => {
  it('sets font, size and spacing, storing nothing for defaults', () => {
    const layout = setup();
    fireEvent.change(screen.getByLabelText('Font'), { target: { value: 'Lora' } });
    expect(layout().font).toBe('Lora');
    fireEvent.change(screen.getByLabelText('Font'), { target: { value: '' } });
    expect(layout()).not.toHaveProperty('font');

    fireEvent.change(screen.getByLabelText('Text size'), { target: { value: '0.9' } });
    expect(layout().fontScale).toBe(0.9);
    expect(screen.getByText('90%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset to 100%' }));
    expect(layout()).not.toHaveProperty('fontScale');

    const spacing = screen.getByRole('radiogroup', { name: 'Spacing' });
    fireEvent.click(within(spacing).getByRole('radio', { name: 'Compact' }));
    expect(layout().spacing).toBe('compact');
    fireEvent.click(within(spacing).getByRole('radio', { name: 'Normal' }));
    expect(layout()).not.toHaveProperty('spacing');
  });

  it("moves sections between columns from the template's defaults, and resets", () => {
    const layout = setup();
    const projects = screen.getByRole('radiogroup', { name: 'Column for Projects' });
    expect(within(projects).getByRole('radio', { name: 'Main' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    fireEvent.click(within(projects).getByRole('radio', { name: 'Side' }));
    expect(layout().placement).toEqual({ projects: 'side' });
    const languages = screen.getByRole('radiogroup', { name: 'Column for Languages' });
    expect(within(languages).getByRole('radio', { name: 'Side' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Choosing a section's default removes the override instead of storing it.
    fireEvent.click(within(projects).getByRole('radio', { name: 'Main' }));
    expect(layout()).not.toHaveProperty('placement');

    fireEvent.click(within(projects).getByRole('radio', { name: 'Side' }));
    fireEvent.click(screen.getByRole('button', { name: /Reset to Meridian/ }));
    expect(layout()).not.toHaveProperty('placement');
  });

  it('offers full width where the template spans a section across both columns', () => {
    setup({ templateId: 'orbit' });
    const summary = screen.getByRole('radiogroup', { name: 'Column for Summary' });
    expect(within(summary).getByRole('radio', { name: 'Full width' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('explains that single-column templates have no columns', () => {
    setup({ templateId: 'clarity' });
    expect(screen.getByText(/Clarity is a single-column template/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Section columns' })).toBeNull();
  });

  it('fit to one page saves first, asks the server, and applies the result as an edit', async () => {
    const flush = vi.fn(async () => true);
    const { calls } = mockApi({
      'POST /api/v1/resumes/r1/fit-one-page': [
        200,
        { alreadyFits: false, pages: 1, settings: { spacing: 'compact', fontScale: 0.9 } },
      ],
    });
    const layout = setup({ flush });
    fireEvent.click(screen.getByRole('button', { name: /Fit to one page/ }));
    expect(
      await screen.findByText(/Fits on one page with compact spacing and 90% text/),
    ).toBeInTheDocument();
    expect(flush).toHaveBeenCalled();
    expect(calls.find((c) => c.method === 'POST').body).toEqual({});
    expect(layout()).toMatchObject({ spacing: 'compact', fontScale: 0.9 });
  });

  it("says when nothing fits, and doesn't measure unsaved edits", async () => {
    mockApi({
      'POST /api/v1/resumes/r1/fit-one-page': [
        200,
        { alreadyFits: false, pages: 2, settings: null },
      ],
    });
    const layout = setup({ flush: vi.fn(async () => true) });
    fireEvent.click(screen.getByRole('button', { name: /Fit to one page/ }));
    expect(await screen.findByText(/Still 2 pages at the smallest setting/)).toBeInTheDocument();
    expect(layout()).not.toHaveProperty('spacing');

    const { calls } = mockApi({});
    setup({ flush: vi.fn(async () => false) });
    fireEvent.click(screen.getAllByRole('button', { name: /Fit to one page/ }).at(-1));
    expect(await screen.findByText(/couldn't be saved/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});

describe('page measurement', () => {
  it('accounts for zoom, which the root scroll height ignores', () => {
    const doc = {
      documentElement: { scrollHeight: 2000 },
      defaultView: { getComputedStyle: () => ({ zoom: '0.8' }) },
    };
    expect(documentHeight(doc)).toBe(1600);
    expect(pagesFor(1123, 'A4')).toBe(1);
    expect(pagesFor(1600, 'A4')).toBe(2);
  });
});
