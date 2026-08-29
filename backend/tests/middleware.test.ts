import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { correlationMiddleware } from '../src/middleware/correlation.middleware.js';

describe('Middleware Integration Tests', () => {
  const app = express();
  app.use(express.json());
  app.use(correlationMiddleware);

  // Endpoint throwing ZodError for testing validation error middleware
  app.post('/test-zod', (req: Request, _res: Response, next: NextFunction) => {
    const testSchema = z.object({
      email: z.string().email(),
      hourlyLimit: z.number().positive()
    });

    const result = testSchema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    _res.json({ success: true, data: result.data });
  });

  app.use(errorHandler);

  it('should format Zod validation errors with HTTP 400 and structured issues', async () => {
    const res = await request(app)
      .post('/test-zod')
      .send({ email: 'invalid-email', hourlyLimit: -5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.requestId).toBeDefined();
  });

  it('should accept valid payload through Zod validation endpoint', async () => {
    const res = await request(app)
      .post('/test-zod')
      .send({ email: 'valid@example.com', hourlyLimit: 100 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
