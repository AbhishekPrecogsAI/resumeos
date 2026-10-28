import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderRoute } from './render.jsx';
import { mockApi, SIGNED_OUT } from './fetchMock.js';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';

beforeEach(() => mockApi(SIGNED_OUT));

describe('template gallery', () => {
  it('lists every template as a card and filters them', async () => {
    renderRoute('/templates');
    expect(await screen.findByText(`${TEMPLATES.length} templates`)).toBeInTheDocument();
    for (const t of TEMPLATES)
      expect(screen.getByRole('heading', { name: t.name, level: 3 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'With photo' }));
    const withPhoto = TEMPLATES.filter((t) => t.photo);
    expect(screen.getByText(`${withPhoto.length} templates`)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Clarity', level: 3 })).not.toBeInTheDocument();
  });

  it('opens a detail view with trade-offs and a link to use it', async () => {
    renderRoute('/templates');
    fireEvent.click(await screen.findByRole('button', { name: 'Preview Orbit' }));
    const dialog = screen.getByRole('dialog', { name: 'Orbit' });
    expect(within(dialog).getByText('Trade-offs')).toBeInTheDocument();
    expect(within(dialog).getByRole('radiogroup', { name: 'Accent colour' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Use Orbit' })).toHaveAttribute(
      'href',
      '/app/resumes/new?template=orbit',
    );
  });
});
