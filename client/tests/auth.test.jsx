import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderRoute } from './render.jsx';
import { mockApi, SIGNED_IN, SIGNED_OUT, TEST_USER } from './fetchMock.js';
import { safeNextPath } from '../src/hooks/useAuth.jsx';

describe('safeNextPath', () => {
  it('allows in-app paths only', () => {
    expect(safeNextPath('/app/settings')).toBe('/app/settings');
    expect(safeNextPath('//evil.example')).toBe('/app');
    expect(safeNextPath('https://evil.example')).toBe('/app');
    expect(safeNextPath('/\\evil.example')).toBe('/app');
    expect(safeNextPath(null)).toBe('/app');
  });
});

describe('route guards', () => {
  it('redirects signed-out visitors from /app to /login with next', async () => {
    mockApi(SIGNED_OUT);
    const { router } = renderRoute('/app/settings/security');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe('?next=%2Fapp%2Fsettings%2Fsecurity');
  });

  it('sends signed-in visitors from /login to the app', async () => {
    mockApi(SIGNED_IN);
    const { router } = renderRoute('/login');
    expect(await screen.findByRole('heading', { name: /Welcome, Mira/ })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/app');
  });

  it('shows an error with retry when the session check fails', async () => {
    mockApi({
      'GET /api/v1/auth/me': [
        500,
        { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' } },
      ],
    });
    renderRoute('/app');
    expect(
      await screen.findByText("Couldn't check your session", {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('login form', () => {
  it('validates before sending', async () => {
    const { calls } = mockApi(SIGNED_OUT);
    renderRoute('/login');
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });

  it('shows the generic credential error from the server', async () => {
    mockApi({
      ...SIGNED_OUT,
      'POST /api/v1/auth/login': [
        401,
        { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } },
      ],
    });
    renderRoute('/login');
    fireEvent.change(await screen.findByLabelText(/Email/), {
      target: { value: 'mira@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'wrong password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const message = await screen.findByText('Email or password is incorrect.');
    expect(message.closest('[role="alert"]')).not.toBeNull();
  });

  it('signs in and follows a safe next path', async () => {
    const { calls } = mockApi({
      ...SIGNED_OUT,
      'POST /api/v1/auth/login': [200, { user: TEST_USER }],
    });
    const { router } = renderRoute('/login?next=%2Fapp%2Fsettings%2Fprofile');
    fireEvent.change(await screen.findByLabelText(/Email/), {
      target: { value: 'Mira@Example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: 'correct horse battery' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/app/settings/profile'));
    expect(calls.find((c) => c.method === 'POST').body).toEqual({
      email: 'Mira@Example.com',
      password: 'correct horse battery',
    });
  });

  it('toggles password visibility', async () => {
    mockApi(SIGNED_OUT);
    renderRoute('/login');
    const input = await screen.findByLabelText(/^Password/);
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});

describe('register form', () => {
  it('maps a taken email to the email field', async () => {
    mockApi({
      ...SIGNED_OUT,
      'POST /api/v1/auth/register': [
        409,
        {
          error: {
            code: 'EMAIL_TAKEN',
            message: 'An account with this email already exists. Sign in instead.',
          },
        },
      ],
    });
    renderRoute('/register');
    fireEvent.change(await screen.findByLabelText(/Your name/), { target: { value: 'Mira' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'mira@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: 'long enough password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByLabelText(/Email/)).toHaveAccessibleDescription(/already exists/);
  });

  it('enforces the minimum password length client-side', async () => {
    mockApi(SIGNED_OUT);
    renderRoute('/register');
    fireEvent.change(await screen.findByLabelText(/^Password/), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Use at least 10 characters.')).toBeInTheDocument();
  });
});

describe('session expiry', () => {
  it('returns to sign-in when an API call reports the session ended', async () => {
    let meStatus = 200;
    mockApi({
      'GET /api/v1/auth/me': () =>
        meStatus === 200 ? [200, { user: TEST_USER }] : SIGNED_OUT['GET /api/v1/auth/me'],
      'GET /api/v1/auth/sessions': () => {
        meStatus = 401;
        return [401, { error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } }];
      },
    });
    const { router } = renderRoute('/app/settings/security');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'), { timeout: 4000 });
  });
});
