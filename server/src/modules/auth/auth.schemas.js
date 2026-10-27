import { z } from 'zod';
import {
  PASSWORD_MIN,
  PASSWORD_MAX,
  DISPLAY_NAME_MAX,
  EMAIL_MAX,
  normalizeEmail,
} from '@resumeos/shared/validation/auth.js';

export const email = z
  .string({ error: 'Enter your email address.' })
  .max(EMAIL_MAX)
  .transform(normalizeEmail)
  .pipe(z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'));

export const newPassword = z
  .string({ error: 'Enter a password.' })
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(PASSWORD_MAX, `Use at most ${PASSWORD_MAX} characters.`)
  .refine((v) => v.trim().length > 0, 'The password cannot be only spaces.');

// Existing passwords are only length-capped, so a later policy change can't lock anyone out.
const anyPassword = z
  .string({ error: 'Enter your password.' })
  .min(1, 'Enter your password.')
  .max(PASSWORD_MAX);

export const displayName = z
  .string({ error: 'Enter the name to show in the app.' })
  .trim()
  .min(1, 'Enter the name to show in the app.')
  .max(DISPLAY_NAME_MAX);

export const registerBody = z.strictObject({ email, password: newPassword, displayName });
export const loginBody = z.strictObject({ email, password: anyPassword });
export const changePasswordBody = z.strictObject({ currentPassword: anyPassword, newPassword });
export const objectIdParam = (name) =>
  z.strictObject({ [name]: z.string().regex(/^[a-f0-9]{24}$/, 'Invalid id.') });

export const updateAccountBody = z
  .strictObject({
    displayName: displayName.optional(),
    preferences: z
      .strictObject({
        theme: z.enum(['system', 'light', 'dark']).optional(),
        pageSize: z.enum(['A4', 'Letter']).optional(),
      })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update.');

export const deleteAccountBody = z.strictObject({
  password: anyPassword,
  confirmation: z.literal('DELETE', { error: 'Type DELETE to confirm.' }),
});
