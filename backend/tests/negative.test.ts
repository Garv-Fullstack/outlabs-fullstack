import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Negative & Failure Resilience Tests', () => {
  const app = createApp();

  it('should return 404 with standardized error response for non-existent routes', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.requestId).toBeDefined();
  });

  it('should return 400 with controlled error response for malformed JSON payload', async () => {
    const res = await request(app)
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{"malformed": json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should scrub and replace invalid or dangerous X-Request-ID headers', async () => {
    const maliciousHeader = '<script>alert("xss")</script>../../etc/passwd';
    const res = await request(app)
      .get('/health')
      .set('X-Request-ID', maliciousHeader);

    // Should not accept the malicious characters; should generate a new UUID
    expect(res.headers['x-request-id']).not.toBe(maliciousHeader);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
