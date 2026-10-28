import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderRoute } from './render.jsx';
import { mockApi, SIGNED_IN } from './fetchMock.js';
import { normalise } from '../src/features/resumes/editor/canvas/CanvasEditor.jsx';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';
import { buildBaselines } from '@resumeos/shared/sync.js';

// Give the canvas a width so it renders (jsdom has no layout).
beforeEach(() => {
  globalThis.ResizeObserver = class {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {
      this.cb([{ contentRect: { width: 900 } }]);
    }
    disconnect() {}
  };
  localStorage.removeItem('resumeos:editorView');
});

const resume = (extra = {}) => {
  const content = structuredClone(sampleResume);
  return {
    id: 'r1',
    title: 'R',
    targetRole: '',
    templateId: 'orbit',
    pageSize: 'A4',
    accentColor: null,
    draftRevision: 1,
    qualityDismissals: [],
    draft: { content, layout: defaultLayout(content), baselines: buildBaselines(content) },
    ...extra,
  };
};
const api = (extra = {}) => ({
  ...SIGNED_IN,
  'GET /api/v1/profile': [
    200,
    { profile: { revision: 1, content: { ...sampleResume, evidenceItems: [] } } },
  ],
  'GET /api/v1/profile/photo': [200, { photo: null }],
  'GET /api/v1/resumes/r1': [200, { resume: resume() }],
  'GET /api/v1/resumes': [200, { items: [], total: 0 }],
  'PUT /api/v1/resumes/r1/draft': (init) => [
    200,
    { resume: { ...resume(), draftRevision: 2, draft: JSON.parse(init.body) } },
  ],
  'PATCH /api/v1/resumes/r1': (init) => [
    200,
    { resume: { ...resume(), ...JSON.parse(init.body) } },
  ],
  ...extra,
});

describe('normalise while typing', () => {
  it('adds https:// to links, trims emails and keeps other text exactly', () => {
    expect(normalise('contact:linkedin', 'linkedin.com/in/x')).toBe('https://linkedin.com/in/x');
    expect(normalise('contact:github', 'https://github.com/x')).toBe('https://github.com/x');
    expect(normalise('projects:prj_1:repositoryUrl', '')).toBe('');
    expect(normalise('contact:email', ' a@b.co ')).toBe('a@b.co');
    expect(normalise('experience:exp_1:title', '  Senior  engineer ')).toBe('  Senior  engineer ');
  });
});

describe('page view editor', () => {
  it('opens on the page by default with the editable resume', async () => {
    mockApi(api());
    renderRoute('/app/resumes/r1/edit');
    const frame = await screen.findByTitle(/Resume page\. Click any text to edit it/);
    const html = frame.getAttribute('srcdoc');
    expect(html).toContain('data-edit="contact:name"');
    expect(html).toContain('data-edit="experience:exp_1:bullets:b_s1:text"');
    expect(screen.getByRole('radio', { name: 'Page' })).toHaveAttribute('aria-checked', 'true');
  });

  it('remembers the chosen view', async () => {
    mockApi(api());
    renderRoute('/app/resumes/r1/edit');
    fireEvent.click(await screen.findByRole('radio', { name: 'Form' }));
    expect(localStorage.getItem('resumeos:editorView')).toBe('form');
    expect(await screen.findByRole('navigation', { name: 'Resume sections' })).toBeInTheDocument();
  });

  it('changes template from the picker', async () => {
    const { calls } = mockApi(api());
    renderRoute('/app/resumes/r1/edit');
    fireEvent.click(await screen.findByRole('button', { name: 'Templates' }));
    const dialog = screen.getByRole('dialog', { name: 'Change template' });
    expect(within(dialog).getByText('Current template')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Use Vertex' }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ templateId: 'vertex' }),
    );
  });

  it('hides a section from the Layout dialog and saves it', async () => {
    const { calls } = mockApi(api());
    renderRoute('/app/resumes/r1/edit');
    fireEvent.click(await screen.findByRole('button', { name: 'Layout' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Layout' })).getByRole('button', {
        name: 'Hide Projects',
      }),
    );
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true), {
      timeout: 3000,
    });
    expect(calls.find((c) => c.method === 'PUT').body.layout.hiddenSections).toEqual(['projects']);
    await waitFor(() =>
      expect(screen.getByTitle(/Resume page/).getAttribute('srcdoc')).not.toContain(
        'data-section="projects"',
      ),
    );
  });

  it("older resumes don't show empty new sections on the page until added from Layout", async () => {
    const old = resume();
    old.draft.content.languages = [];
    old.draft.content.interests = [];
    old.draft.layout.sectionOrder = old.draft.layout.sectionOrder.filter(
      (k) => k !== 'languages' && k !== 'interests',
    );
    const { calls } = mockApi(api({ 'GET /api/v1/resumes/r1': [200, { resume: old }] }));
    renderRoute('/app/resumes/r1/edit');
    const page = await screen.findByTitle(/Resume page/);
    expect(page.getAttribute('srcdoc')).not.toContain('data-section="languages"');
    expect(page.getAttribute('srcdoc')).not.toContain('data-section="interests"');

    fireEvent.click(screen.getByRole('button', { name: 'Layout' }));
    const dialog = screen.getByRole('dialog', { name: 'Layout' });
    const row = within(dialog).getByText('Languages').closest('li');
    fireEvent.click(within(row).getByRole('button', { name: /Add to page/ }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true), {
      timeout: 3000,
    });
    const saved = calls.find((c) => c.method === 'PUT').body;
    expect(saved.layout.sectionOrder).toContain('languages');
    expect(saved.content.languages).toHaveLength(1);
    await waitFor(() =>
      expect(screen.getByTitle(/Resume page/).getAttribute('srcdoc')).toContain(
        'data-section="languages"',
      ),
    );
  });

  it('adds a custom section with a first entry', async () => {
    const { calls } = mockApi(api());
    renderRoute('/app/resumes/r1/edit');
    fireEvent.click(await screen.findByRole('button', { name: 'Layout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a custom section' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true), {
      timeout: 3000,
    });
    const body = calls.find((c) => c.method === 'PUT').body;
    expect(body.content.customSections).toHaveLength(1);
    expect(body.layout.sectionOrder.at(-1)).toBe(`custom:${body.content.customSections[0].id}`);
  });

  it('shows checks in a dialog', async () => {
    mockApi(api());
    renderRoute('/app/resumes/r1/edit');
    fireEvent.click(await screen.findByRole('button', { name: /^Checks \(\d+\)$/ }));
    expect(screen.getByRole('dialog', { name: 'Checks' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe('template-first new resume', () => {
  it('shows the template grid first, then the details step', async () => {
    mockApi(api({ 'POST /api/v1/resumes': [201, { resume: resume() }] }));
    const { router } = renderRoute('/app/resumes/new');
    expect(
      await screen.findByRole('heading', { name: 'Choose a template', level: 1 }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose Lumen' }));
    expect(
      await screen.findByRole('heading', { name: 'New resume with Lumen' }),
    ).toBeInTheDocument();
    expect(router.state.location.search).toBe('?template=lumen');
  });
});
