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
  // Chrome/Chromium used for PDF rendering. Auto-detected from common paths when unset.
  CHROME_PATH: z.string().optional(),
  EXPORT_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .default(60),
  EXPORT_TIMEOUT_MS: z.coerce.number().int().min(2000).max(120_000).default(20_000),
  // Directory of the built client (client/dist). When set, the server also serves the web app.
  CLIENT_DIST_DIR: z.string().optional(),
  // Only for automated tests; refused in production below.
  RATE_LIMIT_DISABLED: booleanString,
  // Serverless hosts (Vercel) have no shared disk or memory between requests. Unset, these follow
  // VERCEL: export files and rate-limit counters go to MongoDB, and PDFs use the serverless
  // Chromium build. A long-running server keeps disk, memory and the system Chrome.
  EXPORT_STORAGE: z.enum(['disk', 'mongo']).optional(),
  RATE_LIMIT_STORE: z.enum(['memory', 'mongo']).optional(),
  SERVERLESS_CHROMIUM: z.enum(['true', 'false']).optional(),
  VERCEL: z.string().optional(),
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
  const serverless = Boolean(env.VERCEL);
  env.EXPORT_STORAGE ??= serverless ? 'mongo' : 'disk';
  env.RATE_LIMIT_STORE ??= serverless ? 'mongo' : 'memory';
  env.SERVERLESS_CHROMIUM = (env.SERVERLESS_CHROMIUM ?? String(serverless)) === 'true';
  const problems = [];
  if (env.NODE_ENV === 'production' && env.SESSION_SECRET === PLACEHOLDER_SECRET) {
    problems.push('  - SESSION_SECRET: placeholder value is not allowed in production');
  }
  if (env.NODE_ENV === 'production' && !env.APP_BASE_URL.startsWith('https://')) {
    problems.push('  - APP_BASE_URL: must use https:// in production');
  }
  if (env.NODE_ENV === 'production' && env.CLIENT_ORIGIN.some((o) => !o.startsWith('https://'))) {
    problems.push('  - CLIENT_ORIGIN: every origin must use https:// in production');
  }
  if (env.NODE_ENV === 'production' && env.RATE_LIMIT_DISABLED) {
    problems.push('  - RATE_LIMIT_DISABLED: cannot be enabled in production');
  }
  if (problems.length)
    throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
  return Object.freeze(env);
}
