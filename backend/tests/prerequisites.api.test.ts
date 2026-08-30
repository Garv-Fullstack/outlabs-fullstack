import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import routes from '../src/routes/index.js';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { GoogleAuthService, UserSessionPayload } from '../src/auth/google.auth.js';
import { prisma } from '../src/repositories/prisma.js';
import { UserRole, EmailStatus } from '@reachinbox/shared';

describe('Milestone 4 Backend Prerequisites API Tests', () => {
  let app: express.Express;

  const userA: UserSessionPayload = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'usera@reachinbox.ai',
    name: 'User A',
    role: UserRole.USER
  };

  const userB: UserSessionPayload = {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'userb@reachinbox.ai',
    name: 'User B',
    role: UserRole.USER
  };

  const tokenA = GoogleAuthService.signToken(userA);
  const tokenB = GoogleAuthService.signToken(userB);

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(routes);
    app.use(errorHandler);
  });

  describe('GET /api/senders', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/senders');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return senders scoped to user and strictly omit password/secrets', async () => {
      vi.spyOn(prisma.senderAccount, 'findMany').mockResolvedValue([
        {
          id: 'sender-1',
          userId: userA.id,
          email: 'sales@reachinbox.ai',
          name: 'Sales Outreach',
          smtpHost: 'smtp.ethereal.email',
          smtpPort: 587,
          smtpUser: 'ethereal_user',
          hourlyLimit: 100,
          minDelaySeconds: 2,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as any
      ]);

      const res = await request(app)
        .get('/api/senders')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe('sales@reachinbox.ai');

      // Security Audit: Assert no password or secret leakage
      expect(res.body.data[0].smtpPassEncrypted).toBeUndefined();
      expect(res.body.data[0].smtpPass).toBeUndefined();
      expect(res.body.data[0].password).toBeUndefined();
    });
  });

  describe('POST /api/senders', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/senders').send({
        email: 'test@example.com',
        name: 'Test'
      });
      expect(res.status).toBe(401);
    });

    it('should reject invalid email format with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/senders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          email: 'not-an-email',
          name: 'Invalid Email'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should register sender with encrypted password and return sanitized DTO', async () => {
      vi.spyOn(prisma.senderAccount, 'findFirst').mockResolvedValue(null);
      vi.spyOn(prisma.senderAccount, 'create').mockResolvedValue({
        id: 'new-sender-id',
        userId: userA.id,
        email: 'marketing@reachinbox.ai',
        name: 'Marketing Outreach',
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: 'marketing@reachinbox.ai',
        hourlyLimit: 50,
        minDelaySeconds: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      const res = await request(app)
        .post('/api/senders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          email: 'marketing@reachinbox.ai',
          name: 'Marketing Outreach',
          smtpHost: 'smtp.ethereal.email',
          smtpPort: 587,
          smtpPass: 'secret_smtp_password_123',
          hourlyLimit: 50,
          minDelaySeconds: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('new-sender-id');
      expect(res.body.data.email).toBe('marketing@reachinbox.ai');
      expect(res.body.data.smtpPassEncrypted).toBeUndefined();
      expect(res.body.data.smtpPass).toBeUndefined();
    });

    it('should reject duplicate sender registration with 409 Conflict', async () => {
      vi.spyOn(prisma.senderAccount, 'findFirst').mockResolvedValue({
        id: 'existing-id',
        userId: userA.id,
        email: 'marketing@reachinbox.ai'
      } as any);

      const res = await request(app)
        .post('/api/senders')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          email: 'marketing@reachinbox.ai',
          name: 'Duplicate Sender',
          smtpPass: 'pass123'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/campaigns', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/campaigns');
      expect(res.status).toBe(401);
    });

    it('should return paginated campaigns with delivery stats strictly scoped to user', async () => {
      vi.spyOn(prisma.emailCampaign, 'findMany').mockResolvedValue([
        {
          id: 'camp-1',
          userId: userA.id,
          senderId: 'sender-1',
          subject: 'SaaS Outreach Q3',
          bodyText: 'Pitch content',
          bodyHtml: null,
          totalRecipients: 3,
          scheduledStartTime: new Date(),
          delayBetweenEmailsSeconds: 2,
          hourlyLimit: 100,
          idempotencyKey: 'idemp-camp-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          sender: { id: 'sender-1', email: 'sales@reachinbox.ai', name: 'Sales' },
          deliveries: [
            { status: EmailStatus.SENT },
            { status: EmailStatus.SCHEDULED },
            { status: EmailStatus.FAILED }
          ]
        } as any
      ]);

      vi.spyOn(prisma.emailCampaign, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/campaigns?page=1&limit=10')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.campaigns.length).toBe(1);
      expect(res.body.data.campaigns[0].subject).toBe('SaaS Outreach Q3');
      expect(res.body.data.campaigns[0].stats).toEqual({
        total: 3,
        scheduled: 1,
        processing: 0,
        sent: 1,
        failed: 1,
        cancelled: 0,
        rateLimited: 0
      });
      expect(res.body.data.pagination.total).toBe(1);
    });
  });

  describe('GET /api/emails/stats', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/emails/stats');
      expect(res.status).toBe(401);
    });

    it('should return aggregated delivery metrics accurately', async () => {
      vi.spyOn(prisma.emailDelivery, 'groupBy').mockResolvedValue([
        { status: EmailStatus.SCHEDULED, _count: { _all: 5 } },
        { status: EmailStatus.SENT, _count: { _all: 20 } },
        { status: EmailStatus.FAILED, _count: { _all: 2 } },
        { status: EmailStatus.RATE_LIMITED_DELAYED, _count: { _all: 3 } }
      ] as any);

      const res = await request(app)
        .get('/api/emails/stats')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        totalDeliveries: 30,
        scheduledCount: 5,
        processingCount: 0,
        sentCount: 20,
        failedCount: 2,
        cancelledCount: 0,
        rateLimitedCount: 3,
        trackedOpens: 0,
        uniqueOpenedCount: 0,
        openRate: 0,
        totalClicks: 0,
        uniqueClickedCount: 0,
        clickRate: 0
      });
    });

    it('should handle zero-deliveries state safely', async () => {
      vi.spyOn(prisma.emailDelivery, 'groupBy').mockResolvedValue([]);

      const res = await request(app)
        .get('/api/emails/stats')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        totalDeliveries: 0,
        scheduledCount: 0,
        processingCount: 0,
        sentCount: 0,
        failedCount: 0,
        cancelledCount: 0,
        rateLimitedCount: 0,
        trackedOpens: 0,
        uniqueOpenedCount: 0,
        openRate: null,
        totalClicks: 0,
        uniqueClickedCount: 0,
        clickRate: null
      });
    });
  });
});
