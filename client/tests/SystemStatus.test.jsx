import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Providers } from '../src/app/providers.jsx';
import { SystemStatus } from '../src/app/SystemStatus.jsx';

function mockFetch(status, body) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );
}

function renderStatus() {
  return render(
    <Providers>
      <SystemStatus />
    </Providers>,
  );
}

describe('SystemStatus', () => {
  it('reports healthy API and database', async () => {
    mockFetch(200, { status: 'ok', checks: { database: 'up' } });
    renderStatus();
    expect(await screen.findByText('API and database reachable')).toBeInTheDocument();
  });

  it('reports a degraded state when the database is down', async () => {
    mockFetch(503, { status: 'unavailable', checks: { database: 'down' } });
    renderStatus();
    expect(await screen.findByText('API reachable, database unavailable')).toBeInTheDocument();
  });

  it('reports a network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    renderStatus();
    expect(
      await screen.findByText("Couldn't reach the API", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('has an accessible recheck button', async () => {
    mockFetch(200, { status: 'ok', checks: { database: 'up' } });
    renderStatus();
    expect(screen.getByRole('button', { name: 'Recheck' })).toBeInTheDocument();
  });
});
