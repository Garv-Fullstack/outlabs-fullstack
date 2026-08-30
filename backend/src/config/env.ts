import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  BACKEND_URL: z.string().url().default('http://localhost:5000'),
  
  // Security & Cryptography
  JWT_SECRET: z.string().min(32, { message: 'JWT_SECRET must be at least 32 characters long' }),
  ENCRYPTION_KEY: z.string().length(64, { message: 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)' }),
  
  // PostgreSQL Database
  DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_TLS: z.union([z.boolean(), z.string()]).transform(v => v === true || v === 'true').default(false),
  
  // Worker & Defaults
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(10),
  DEFAULT_HOURLY_LIMIT: z.coerce.number().int().positive().default(100),
  DEFAULT_MIN_DELAY_SECONDS: z.coerce.number().int().nonnegative().default(2),

  // Google OAuth 2.0 (Optional in dev/test, validated on initiation)
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().url().optional().default('http://localhost:5000/api/auth/google/callback'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadAndValidateEnv(overrideEnv?: Record<string, string | undefined>): EnvConfig {
  const source = overrideEnv ?? process.env;
  const parseResult = envSchema.safeParse(source);
  
  if (!parseResult.success) {
    const errorDetails = parseResult.error.format();
    const formattedErrors = Object.entries(errorDetails)
      .filter(([key]) => key !== '_errors')
      .map(([key, value]) => `  - ${key}: ${(value as { _errors: string[] })._errors.join(', ')}`)
      .join('\n');
      
    const errorMessage = `FATAL CONFIGURATION ERROR: Invalid environment variables:\n${formattedErrors}`;
    throw new Error(errorMessage);
  }
  
  return parseResult.data;
}

// Singleton validated config (only evaluated if not in custom test runner)
export const config: EnvConfig = (() => {
  if (process.env['NODE_ENV'] === 'test') {
    // In test mode, provide safe test defaults if not loaded
    const testSource = {
      NODE_ENV: 'test',
      PORT: '5001',
      FRONTEND_URL: 'http://localhost:5173',
      BACKEND_URL: process.env['BACKEND_URL'] || 'http://localhost:5000',
      JWT_SECRET: 'test_jwt_secret_reachinbox_testing_purposes_min_32_chars',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      DATABASE_URL: process.env['DATABASE_URL'] || 'postgresql://postgres:postgres@localhost:5432/reachinbox_test_db',
      REDIS_HOST: process.env['REDIS_HOST'] || 'localhost',
      REDIS_PORT: process.env['REDIS_PORT'] || '6379',
      REDIS_PASSWORD: process.env['REDIS_PASSWORD'] || '',
      GOOGLE_CLIENT_ID: process.env['GOOGLE_CLIENT_ID'] || '',
      GOOGLE_CLIENT_SECRET: process.env['GOOGLE_CLIENT_SECRET'] || '',
      GOOGLE_CALLBACK_URL: process.env['GOOGLE_CALLBACK_URL'] || 'http://localhost:5000/api/auth/google/callback',
      ...process.env
    };
    return loadAndValidateEnv(testSource);
  }
  return loadAndValidateEnv();
})();

/**
 * Returns a redacted representation of config safe for diagnostic logging
 */
export function getRedactedConfig(cfg: EnvConfig): Record<string, unknown> {
  return {
    NODE_ENV: cfg.NODE_ENV,
    PORT: cfg.PORT,
    FRONTEND_URL: cfg.FRONTEND_URL,
    BACKEND_URL: cfg.BACKEND_URL,
    DATABASE_URL: cfg.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'),
    REDIS_HOST: cfg.REDIS_HOST,
    REDIS_PORT: cfg.REDIS_PORT,
    REDIS_TLS: cfg.REDIS_TLS,
    REDIS_PASSWORD: cfg.REDIS_PASSWORD ? '***REDACTED***' : '(none)',
    JWT_SECRET: '***REDACTED***',
    ENCRYPTION_KEY: '***REDACTED***',
    WORKER_CONCURRENCY: cfg.WORKER_CONCURRENCY,
    DEFAULT_HOURLY_LIMIT: cfg.DEFAULT_HOURLY_LIMIT,
    DEFAULT_MIN_DELAY_SECONDS: cfg.DEFAULT_MIN_DELAY_SECONDS,
    GOOGLE_CLIENT_ID: cfg.GOOGLE_CLIENT_ID ? `${cfg.GOOGLE_CLIENT_ID.substring(0, 12)}...` : '(not configured)',
    GOOGLE_CLIENT_SECRET: cfg.GOOGLE_CLIENT_SECRET ? '***REDACTED***' : '(not configured)',
    GOOGLE_CALLBACK_URL: cfg.GOOGLE_CALLBACK_URL
  };
}
