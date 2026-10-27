import { describe, it, expect } from 'vitest';
import {
  emailError,
  passwordError,
  displayNameError,
  normalizeEmail,
} from '../src/validation/auth.js';

describe('auth validation', () => {
  it('normalizes email', () => {
    expect(normalizeEmail('  Ana@Example.COM ')).toBe('ana@example.com');
  });
  it('validates email', () => {
    expect(emailError('ana@example.com')).toBeNull();
    expect(emailError('')).toMatch(/Enter your email/);
    expect(emailError('ana@')).toMatch(/valid email/);
  });
  it('validates password length only', () => {
    expect(passwordError('short')).toMatch(/at least 10/);
    expect(passwordError('long enough pass')).toBeNull();
    expect(passwordError(' '.repeat(12))).toMatch(/only spaces/);
    expect(passwordError('x'.repeat(129))).toMatch(/at most 128/);
  });
  it('validates display name', () => {
    expect(displayNameError('  ')).toMatch(/Enter the name/);
    expect(displayNameError('Zoë')).toBeNull();
  });
});
