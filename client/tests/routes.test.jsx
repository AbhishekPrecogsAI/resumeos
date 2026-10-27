import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { beforeEach } from 'vitest';
import { renderRoute } from './render.jsx';
import { mockApi, SIGNED_OUT } from './fetchMock.js';

beforeEach(() => mockApi(SIGNED_OUT));

describe('public routes', () => {
  it.each([
    ['/', /One career record/],
    ['/features', /What ResumeOS does/],
    ['/templates', /^Templates$/],
    ['/pricing', /^Pricing$/],
    ['/security', /Security and privacy/],
    ['/privacy', /Privacy policy/],
    ['/terms', /Terms of use/],
  ])('%s renders its heading', async (path, heading) => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('unknown paths render the not-found page', async () => {
    renderRoute('/definitely-not-here');
    expect(
      await screen.findByRole('heading', { name: /no page at this address/i }),
    ).toBeInTheDocument();
  });

  it('labels sample data on the landing page', async () => {
    renderRoute('/');
    expect((await screen.findAllByText(/Sample data/i)).length).toBeGreaterThan(0);
  });

  it('has no ATS guarantee language', async () => {
    const { container } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    expect(container.textContent).not.toMatch(/ATS[- ]proof|guaranteed|100x/i);
  });
});
