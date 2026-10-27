import { z } from 'zod';

const PLACEHOLDER_SECRET = 'replace-with-a-long-random-secret';

const booleanString = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// URI'),
  CLIENT_ORIGIN: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().url()).min(1)),
  SESSION_SECRET: z.string().min(32, 'must be at least 32 characters'),
  COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/, 'letters, digits, _ and - only')
    .default('resumeos_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  APP_BASE_URL: z.string().url(),
  EXPORT_TEMP_DIR: z.string().min(1).default('./tmp/exports'),
  // Only for automated tests; refused in production below.
  RATE_LIMIT_DISABLED: booleanString,
});

export function loadEnv(source = process.env) {
  const result = schema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  const env = result.data;
  const problems = [];
  if (env.NODE_ENV === 'production' && env.SESSION_SECRET === PLACEHOLDER_SECRET) {
    problems.push('  - SESSION_SECRET: placeholder value is not allowed in production');
  }
  if (env.NODE_ENV === 'production' && env.RATE_LIMIT_DISABLED) {
    problems.push('  - RATE_LIMIT_DISABLED: cannot be enabled in production');
  }
  if (problems.length)
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  return Object.freeze(env);
}
