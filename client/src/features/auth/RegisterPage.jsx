import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import {
  emailError,
  passwordError,
  displayNameError,
  PASSWORD_MIN,
} from '@resumeos/shared/validation/auth.js';
import { authApi } from '../../api/auth.api.js';
import { fieldErrors } from '../../api/client.js';
import { useSignedIn, safeNextPath } from '../../hooks/useAuth.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { TextField } from '../../components/ui/Field.jsx';
import { PasswordField } from '../../components/ui/PasswordField.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormAlert } from '../../components/ui/FormAlert.jsx';
import { AuthShell } from './AuthShell.jsx';

export function RegisterPage() {
  useDocumentTitle('Create account');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const signedIn = useSignedIn();
  const [values, setValues] = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ user }) => {
      signedIn(user);
      navigate(safeNextPath(params.get('next')), { replace: true });
    },
    onError: (err) => {
      const fields = fieldErrors(err);
      if (err.code === 'EMAIL_TAKEN') fields.email = err.message;
      setErrors(fields);
    },
  });

  const onSubmit = (event) => {
    event.preventDefault();
    const next = {};
    const checks = {
      displayName: displayNameError(values.displayName),
      email: emailError(values.email),
      password: passwordError(values.password),
    };
    for (const [k, v] of Object.entries(checks)) if (v) next[k] = v;
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`reg-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    register.mutate(values);
  };

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));
  const showFormError =
    register.error &&
    register.error.code !== 'EMAIL_TAKEN' &&
    !Object.keys(fieldErrors(register.error)).length;

  return (
    <AuthShell
      title="Create your account"
      lead="Free, with no card. You can export or delete everything at any time."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <FormAlert error={showFormError ? register.error : null} />
        <TextField
          id="reg-displayName"
          label="Your name"
          autoComplete="name"
          value={values.displayName}
          onChange={set('displayName')}
          error={errors.displayName}
          hint="Shown in the app. Your resume name is set separately."
          required
        />
        <TextField
          id="reg-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          error={errors.email}
          required
        />
        <PasswordField
          id="reg-password"
          label="Password"
          autoComplete="new-password"
          value={values.password}
          onChange={set('password')}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN} characters. A short phrase works well.`}
          required
        />
        <Button
          type="submit"
          loading={register.isPending}
          loadingLabel="Creating account"
          className="justify-self-start"
        >
          Create account
        </Button>
        <p className="text-sm text-muted">
          By creating an account you agree to the{' '}
          <Link to="/terms" className="text-accent underline underline-offset-2">
            terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-accent underline underline-offset-2">
            privacy policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
