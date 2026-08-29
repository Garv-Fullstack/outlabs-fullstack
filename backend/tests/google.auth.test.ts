import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { GoogleAuthService, UserSessionPayload } from '../src/auth/google.auth.js';
import { authenticateJwt, requireAdmin } from '../src/middleware/auth.middleware.js';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { UserRole } from '@reachinbox/shared';

describe('Google OAuth & JWT Authentication Tests', () => {
  const sampleUser: UserSessionPayload = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'testuser@reachinbox.ai',
    name: 'Test User',
    role: UserRole.USER
  };

  it('should sign and verify valid JWT session token', () => {
    const token = GoogleAuthService.signToken(sampleUser, '1h');
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = GoogleAuthService.verifyToken(token);
    expect(decoded.id).toBe(sampleUser.id);
    expect(decoded.email).toBe(sampleUser.email);
    expect(decoded.role).toBe(UserRole.USER);
  });

  it('should reject invalid or tampered JWT tokens', () => {
    const token = GoogleAuthService.signToken(sampleUser, '1h');
    const tampered = `${token}tampered`;
    expect(() => GoogleAuthService.verifyToken(tampered)).toThrow();
  });

  it('should protect routes using authenticateJwt middleware via Authorization header', async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.get('/protected', authenticateJwt, (req, res) => {
      res.json({ success: true, user: req.user });
    });
    app.use(errorHandler);

    // 1. Missing Token
    const resNoToken = await request(app).get('/protected');
    expect(resNoToken.status).toBe(401);

    // 2. Valid Token in Bearer Header
    const validToken = GoogleAuthService.signToken(sampleUser, '1h');
    const resValid = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`);

    expect(resValid.status).toBe(200);
    expect(resValid.body.user.email).toBe(sampleUser.email);
  });

  it('should protect routes using authenticateJwt middleware via HTTP-only cookie', async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.get('/protected-cookie', authenticateJwt, (req, res) => {
      res.json({ success: true, user: req.user });
    });
    app.use(errorHandler);

    const validToken = GoogleAuthService.signToken(sampleUser, '1h');
    const resCookie = await request(app)
      .get('/protected-cookie')
      .set('Cookie', `reachinbox_session=${validToken}`);

    expect(resCookie.status).toBe(200);
    expect(resCookie.body.user.id).toBe(sampleUser.id);
  });

  it('should reject non-admin users with requireAdmin guard', async () => {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.get('/admin-only', authenticateJwt, requireAdmin, (_req, res) => {
      res.json({ success: true, admin: true });
    });
    app.use(errorHandler);

    // Standard user token
    const userToken = GoogleAuthService.signToken(sampleUser, '1h');
    const resForbidden = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${userToken}`);

    expect(resForbidden.status).toBe(403);

    // Admin token
    const adminUser: UserSessionPayload = { ...sampleUser, role: UserRole.ADMIN };
    const adminToken = GoogleAuthService.signToken(adminUser, '1h');
    const resAdmin = await request(app)
      .get('/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resAdmin.status).toBe(200);
  });
});
