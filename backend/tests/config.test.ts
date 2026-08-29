import { describe, it, expect } from 'vitest';
import { loadAndValidateEnv } from '../src/config/env.js';

describe('Configuration Architecture & Validation Tests', () => {
  const validBaseEnv = {
    NODE_ENV: 'test',
    PORT: '5000',
    FRONTEND_URL: 'http://localhost:5173',
    JWT_SECRET: 'super_secret_jwt_signing_key_reachinbox_testing_32chars',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/reachinbox_db',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: '',
    REDIS_TLS: 'false',
    WORKER_CONCURRENCY: '10',
    DEFAULT_HOURLY_LIMIT: '100',
    DEFAULT_MIN_DELAY_SECONDS: '2'
  };

  it('should successfully parse and validate complete valid configuration', () => {
    const config = loadAndValidateEnv(validBaseEnv);
    expect(config.NODE_ENV).toBe('test');
    expect(config.PORT).toBe(5000);
    expect(config.JWT_SECRET).toBe('super_secret_jwt_signing_key_reachinbox_testing_32chars');
    expect(config.WORKER_CONCURRENCY).toBe(10);
  });

  it('should fail fast if JWT_SECRET is shorter than 32 characters', () => {
    const invalidEnv = { ...validBaseEnv, JWT_SECRET: 'too_short' };
    expect(() => loadAndValidateEnv(invalidEnv)).toThrowError(/JWT_SECRET must be at least 32 characters/);
  });

  it('should fail fast if ENCRYPTION_KEY is not a 64-char hex string (32 bytes)', () => {
    const invalidEnv = { ...validBaseEnv, ENCRYPTION_KEY: 'not_64_hex_chars' };
    expect(() => loadAndValidateEnv(invalidEnv)).toThrowError(/ENCRYPTION_KEY must be a 64-character hex string/);
  });

  it('should fail fast if DATABASE_URL is missing', () => {
    const invalidEnv = { ...validBaseEnv, DATABASE_URL: '' };
    expect(() => loadAndValidateEnv(invalidEnv)).toThrowError(/DATABASE_URL is required/);
  });

  it('should fail fast if PORT is not a positive integer', () => {
    const invalidEnv = { ...validBaseEnv, PORT: '-50' };
    expect(() => loadAndValidateEnv(invalidEnv)).toThrowError();
  });

  it('should fail fast if FRONTEND_URL is not a valid URL', () => {
    const invalidEnv = { ...validBaseEnv, FRONTEND_URL: 'not-a-valid-url' };
    expect(() => loadAndValidateEnv(invalidEnv)).toThrowError();
  });
});
