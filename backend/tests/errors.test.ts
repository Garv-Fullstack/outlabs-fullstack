import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError
} from '../src/utils/errors.js';

describe('Error Architecture Tests', () => {
  it('should instantiate ValidationError with 400 status code and details', () => {
    const details = [{ field: 'email', message: 'Invalid email' }];
    const err = new ValidationError('Bad request', details);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual(details);
    expect(err.isOperational).toBe(true);
  });

  it('should instantiate UnauthorizedError with 401 status code', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('should instantiate ForbiddenError with 403 status code', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('should instantiate NotFoundError with 404 status code', () => {
    const err = new NotFoundError('User not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('should instantiate ConflictError with 409 status code', () => {
    const err = new ConflictError('Email already exists');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('should instantiate RateLimitError with 429 status code', () => {
    const err = new RateLimitError('Limit hit', { retryAfterSeconds: 3600 });
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.details).toEqual({ retryAfterSeconds: 3600 });
  });
});
