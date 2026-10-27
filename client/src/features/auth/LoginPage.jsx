import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { emailError } from '@resumeos/shared/validation/auth.js';
import { authApi } from '../../api/auth.api.js';
import { fieldErrors } from '../../api/client.js';
import { useSignedIn, safeNextPath } from '../../hooks/useAuth.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { TextField } from '../../components/ui/Field.jsx';
import { PasswordField } from '../../components/ui/PasswordField.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormAlert } from '../../components/ui/FormAlert.jsx';
import { AuthShell } from './AuthShell.jsx';

export function LoginPage() {
  useDocumentTitle('Sign in');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const signedIn = useSignedIn();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user }) => {
      signedIn(user);
      navigate(safeNextPath(params.get('next')), { replace: true });
    },
    onError: (err) => setErrors(fieldErrors(err)),
  });

  const onSubmit = (event) => {
    event.preventDefault();
    const next = {};
    const e = emailError(values.email);
    if (e) next.email = e;
    if (!values.password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length) return;
    login.mutate(values);
  };

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));
  const formError =
    login.error && !Object.keys(fieldErrors(login.error)).length ? login.error : null;

  return (
    <AuthShell
      title="Sign in"
      lead="Welcome back. Your profile and resumes are where you left them."
      footer={
        <>
          New to ResumeOS?{' '}
          <Link
            to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`}
            className="font-medium text-accent hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <FormAlert error={formError} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          required
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          required
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="submit" loading={login.isPending} loadingLabel="Signing in">
            Sign in
          </Button>
          <Link to="/forgot-password" className="text-sm text-muted hover:text-ink hover:underline">
            Forgot your password?
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
