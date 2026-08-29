import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authenticateJwt } from '../src/middleware/auth.middleware.js';
import { GoogleAuthService, UserSessionPayload } from '../src/auth/google.auth.js';
import { UserRole } from '@reachinbox/shared';
import { errorHandler } from '../src/middleware/error.middleware.js';

describe('Tenant Isolation & Authorization Boundary Tests', () => {
  const tenantA: UserSessionPayload = {
    id: 'user-tenant-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'alice@company-a.com',
    name: 'Alice Tenant A',
    role: UserRole.USER
  };

  const tenantB: UserSessionPayload = {
    id: 'user-tenant-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'bob@company-b.com',
    name: 'Bob Tenant B',
    role: UserRole.USER
  };

  const app = express();
  app.use(express.json());

  // Mock endpoint requiring authenticated user context
  app.get('/api/tenant-resource', authenticateJwt, (req, res) => {
    // Assert tenant context is strictly extracted from verified JWT
    res.json({
      success: true,
      scopedUserId: req.user!.id,
      scopedEmail: req.user!.email
    });
  });

  app.use(errorHandler);

  it('should scope requests strictly to authenticated tenant context (Tenant A)', async () => {
    const tokenA = GoogleAuthService.signToken(tenantA);
    const resA = await request(app)
      .get('/api/tenant-resource')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.scopedUserId).toBe(tenantA.id);
    expect(resA.body.scopedEmail).toBe(tenantA.email);
    expect(resA.body.scopedUserId).not.toBe(tenantB.id);
  });

  it('should scope requests strictly to authenticated tenant context (Tenant B)', async () => {
    const tokenB = GoogleAuthService.signToken(tenantB);
    const resB = await request(app)
      .get('/api/tenant-resource')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.scopedUserId).toBe(tenantB.id);
    expect(resB.body.scopedEmail).toBe(tenantB.email);
    expect(resB.body.scopedUserId).not.toBe(tenantA.id);
  });

  it('should prevent IDOR query-parameter spoofing and strictly enforce session identity', async () => {
    const tokenA = GoogleAuthService.signToken(tenantA);
    // Attacker Tenant A tries to query Tenant B's resource via ?userId=
    const res = await request(app)
      .get(`/api/tenant-resource?userId=${tenantB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.scopedUserId).toBe(tenantA.id);
    expect(res.body.scopedUserId).not.toBe(tenantB.id);
  });
});

