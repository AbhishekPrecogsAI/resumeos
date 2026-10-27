import { Link } from 'react-router';
import { MailX } from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { AuthShell } from './AuthShell.jsx';

// Honest placeholder: the server returns 501 until an email delivery service is configured.
function Unavailable() {
  return (
    <div className="flex gap-3 rounded-lg border border-rule bg-surface p-4">
      <MailX className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden="true" />
      <div className="text-sm">
        <p className="font-medium text-ink">Password reset by email isn't available yet</p>
        <p className="mt-1 text-muted">
          This pre-release has no email service configured, so we can't send a reset link. If you're
          signed in on another device, you can change your password from Settings, Security.
        </p>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  useDocumentTitle('Reset password');
  return (
    <AuthShell
      title="Reset your password"
      footer={
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Unavailable />
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  useDocumentTitle('Reset password');
  return (
    <AuthShell
      title="Choose a new password"
      footer={
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Unavailable />
    </AuthShell>
  );
}
