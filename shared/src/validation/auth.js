// Account rules shared by client (form hints) and server (enforcement).
// Password policy follows NIST SP 800-63B: length over composition rules.
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
export const DISPLAY_NAME_MAX = 80;
export const EMAIL_MAX = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

export function emailError(email) {
  const value = normalizeEmail(email);
  if (!value) return 'Enter your email address.';
  if (value.length > EMAIL_MAX || !EMAIL_RE.test(value))
    return 'Enter a valid email address, like name@example.com.';
  return null;
}

export function passwordError(password) {
  const value = String(password ?? '');
  if (!value) return 'Enter a password.';
  if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (value.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  if (!value.trim()) return 'The password cannot be only spaces.';
  return null;
}

export function displayNameError(name) {
  const value = String(name ?? '').trim();
  if (!value) return 'Enter the name to show in the app.';
  if (value.length > DISPLAY_NAME_MAX) return `Use at most ${DISPLAY_NAME_MAX} characters.`;
  return null;
}
