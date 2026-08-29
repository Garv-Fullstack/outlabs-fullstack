import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('API Foundation & Health Check Tests', () => {
  const app = createApp();

  it('GET /health should respond with health structure and correlation ID', async () => {
    const res = await request(app).get('/health');
    
    // Status can be 200 (healthy/degraded) or 503 (unhealthy when local db/redis is down)
    expect([200, 503]).toContain(res.status);
    
    // Check Response Body Structure
    expect(res.body).toHaveProperty('requestId');
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('services');
    expect(res.body.data.services).toHaveProperty('database');
    expect(res.body.data.services).toHaveProperty('redis');
    expect(res.body.data).toHaveProperty('memory');
    expect(res.body.data.memory).toHaveProperty('heapUsedMb');

    // Check Headers
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('should preserve valid custom X-Request-ID header', async () => {
    const customId = 'req-trace-custom-9988';
    const res = await request(app)
      .get('/health')
      .set('X-Request-ID', customId);

    expect(res.headers['x-request-id']).toBe(customId);
    expect(res.body.requestId).toBe(customId);
  });
});
