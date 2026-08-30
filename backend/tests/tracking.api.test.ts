import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/repositories/prisma.js';
import { campaignService } from '../src/services/campaign.service.js';
import { EmailStatus } from '@reachinbox/shared';
import crypto from 'crypto';

const app = createApp();

describe('Public Tracking Endpoints & Engagement Analytics Tests (Phase 4)', () => {
  let testUserId: string;
  let testSenderId: string;
  let testCampaignId: string;
  let testDeliveryId: string;
  let testTrackingToken: string;

  beforeEach(async () => {
    // Generate unique IDs for clean test isolation
    testUserId = crypto.randomUUID();
    testSenderId = crypto.randomUUID();
    testCampaignId = crypto.randomUUID();
    testDeliveryId = crypto.randomUUID();
    testTrackingToken = crypto.randomUUID();

    // Create user, sender, campaign, and delivery
    await prisma.user.create({
      data: {
        id: testUserId,
        googleId: `google-${testUserId}`,
        email: `tester-${testUserId}@reachinbox.test`,
        name: 'Test Tracking User'
      }
    });

    await prisma.senderAccount.create({
      data: {
        id: testSenderId,
        userId: testUserId,
        email: `sender-${testUserId}@reachinbox.test`,
        name: 'Test Sender',
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: 'test@ethereal.email',
        smtpPassEncrypted: 'encrypted_pass'
      }
    });

    await prisma.emailCampaign.create({
      data: {
        id: testCampaignId,
        userId: testUserId,
        senderId: testSenderId,
        subject: 'Phase 4 Tracking Verification',
        bodyText: 'Test text',
        bodyHtml: '<p>Test html <a href="https://example.com/demo">Demo</a></p>',
        totalRecipients: 1,
        scheduledStartTime: new Date(),
        idempotencyKey: `camp-test-${testUserId}`
      }
    });

    await prisma.emailDelivery.create({
      data: {
        id: testDeliveryId,
        campaignId: testCampaignId,
        userId: testUserId,
        senderId: testSenderId,
        recipientEmail: 'prospect@reachinbox.test',
        idempotencyKey: `deliv-test-${testUserId}`,
        trackingToken: testTrackingToken,
        status: EmailStatus.SENT,
        scheduledFor: new Date(),
        sentAt: new Date()
      }
    });
  });

  describe('GET /api/track/open/:trackingToken', () => {
    it('should return 1x1 transparent GIF with anti-cache headers and persist OPENED event', async () => {
      const res = await request(app)
        .get(`/api/track/open/${testTrackingToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/gif');
      expect(res.headers['cache-control']).toContain('no-store');
      expect(res.headers['pragma']).toBe('no-cache');
      expect(res.headers['expires']).toBe('0');
      expect(res.body).toBeInstanceOf(Buffer);

      // Verify event recorded in PostgreSQL
      const event = await prisma.emailEngagementEvent.findFirst({
        where: { deliveryId: testDeliveryId, eventType: 'OPENED' }
      });
      expect(event).toBeDefined();
      expect(event?.campaignId).toBe(testCampaignId);
      expect(event?.userId).toBe(testUserId);
      expect(event?.destinationUrl).toBeNull();
    });

    it('should record multiple OPENED events for multiple open requests', async () => {
      await request(app).get(`/api/track/open/${testTrackingToken}`);
      await request(app).get(`/api/track/open/${testTrackingToken}`);

      const events = await prisma.emailEngagementEvent.findMany({
        where: { deliveryId: testDeliveryId, eventType: 'OPENED' }
      });
      expect(events.length).toBe(2);
    });

    it('should safely return 1x1 GIF without error when unknown token is supplied', async () => {
      const unknownToken = crypto.randomUUID();
      const res = await request(app).get(`/api/track/open/${unknownToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/gif');

      const count = await prisma.emailEngagementEvent.count({
        where: { deliveryId: testDeliveryId }
      });
      expect(count).toBe(0);
    });
  });

  describe('GET /api/track/click/:trackingToken', () => {
    it('should redirect 302 to destination URL and persist CLICKED event', async () => {
      const targetUrl = 'https://reachinbox.ai/pricing?plan=pro#annual';
      const res = await request(app)
        .get(`/api/track/click/${testTrackingToken}?url=${encodeURIComponent(targetUrl)}`);

      expect(res.status).toBe(302);
      expect(res.headers['location']).toBe(targetUrl);

      // Verify CLICKED event in PostgreSQL
      const event = await prisma.emailEngagementEvent.findFirst({
        where: { deliveryId: testDeliveryId, eventType: 'CLICKED' }
      });
      expect(event).toBeDefined();
      expect(event?.destinationUrl).toBe(targetUrl);
      expect(event?.campaignId).toBe(testCampaignId);
      expect(event?.userId).toBe(testUserId);
    });

    it('should record multiple CLICKED events for multiple clicks', async () => {
      const url1 = 'https://example.com/page1';
      const url2 = 'https://example.com/page2';

      await request(app).get(`/api/track/click/${testTrackingToken}?url=${encodeURIComponent(url1)}`);
      await request(app).get(`/api/track/click/${testTrackingToken}?url=${encodeURIComponent(url2)}`);

      const events = await prisma.emailEngagementEvent.findMany({
        where: { deliveryId: testDeliveryId, eventType: 'CLICKED' }
      });
      expect(events.length).toBe(2);
      expect(events[0].destinationUrl).toBe(url1);
      expect(events[1].destinationUrl).toBe(url2);
    });

    it('should reject unsafe URL schemes with 400 Bad Request', async () => {
      const maliciousUrls = [
        'javascript:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'mailto:sales@reachinbox.ai',
        'tel:+18005550199',
        '/relative/path',
        '#fragment-only'
      ];

      for (const badUrl of maliciousUrls) {
        const res = await request(app)
          .get(`/api/track/click/${testTrackingToken}?url=${encodeURIComponent(badUrl)}`);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      }

      // Verify no events were created
      const count = await prisma.emailEngagementEvent.count({
        where: { deliveryId: testDeliveryId }
      });
      expect(count).toBe(0);
    });

    it('should reject missing or empty url parameter with 400', async () => {
      const res = await request(app).get(`/api/track/click/${testTrackingToken}`);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when tracking delivery is not found', async () => {
      const unknownToken = crypto.randomUUID();
      const res = await request(app)
        .get(`/api/track/click/${unknownToken}?url=${encodeURIComponent('https://example.com')}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Engagement Analytics Aggregation', () => {
    it('should correctly calculate sentCount, trackedOpens, uniqueOpenedCount, openRate, totalClicks, uniqueClickedCount, clickRate', async () => {
      // Create a second delivery for the same user
      const delivery2Id = crypto.randomUUID();
      const token2 = crypto.randomUUID();
      await prisma.emailDelivery.create({
        data: {
          id: delivery2Id,
          campaignId: testCampaignId,
          userId: testUserId,
          senderId: testSenderId,
          recipientEmail: 'prospect2@reachinbox.test',
          idempotencyKey: `deliv2-test-${testUserId}`,
          trackingToken: token2,
          status: EmailStatus.SENT,
          scheduledFor: new Date(),
          sentAt: new Date()
        }
      });

      // Delivery 1: 2 opens, 1 click
      await request(app).get(`/api/track/open/${testTrackingToken}`);
      await request(app).get(`/api/track/open/${testTrackingToken}`);
      await request(app).get(`/api/track/click/${testTrackingToken}?url=${encodeURIComponent('https://example.com/1')}`);

      // Delivery 2: 0 opens, 2 clicks
      await request(app).get(`/api/track/click/${token2}?url=${encodeURIComponent('https://example.com/2a')}`);
      await request(app).get(`/api/track/click/${token2}?url=${encodeURIComponent('https://example.com/2b')}`);

      const stats = await campaignService.getEmailStats(testUserId);

      expect(stats.sentCount).toBe(2);
      expect(stats.trackedOpens).toBe(2);
      expect(stats.uniqueOpenedCount).toBe(1); // 1 out of 2 deliveries opened
      expect(stats.openRate).toBe(50.0); // (1 / 2) * 100

      expect(stats.totalClicks).toBe(3); // 1 + 2
      expect(stats.uniqueClickedCount).toBe(2); // Both deliveries clicked
      expect(stats.clickRate).toBe(100.0); // (2 / 2) * 100
    });

    it('should return null for openRate and clickRate when sentCount is 0 to prevent division by zero', async () => {
      // User with 0 sent emails
      const emptyUserId = crypto.randomUUID();
      await prisma.user.create({
        data: {
          id: emptyUserId,
          googleId: `google-${emptyUserId}`,
          email: `empty-${emptyUserId}@test.com`,
          name: 'Empty User'
        }
      });

      const stats = await campaignService.getEmailStats(emptyUserId);
      expect(stats.sentCount).toBe(0);
      expect(stats.openRate).toBeNull();
      expect(stats.clickRate).toBeNull();
      expect(stats.trackedOpens).toBe(0);
      expect(stats.totalClicks).toBe(0);
    });

    it('should strictly isolate statistics by tenant user ID', async () => {
      // User B
      const userBId = crypto.randomUUID();
      await prisma.user.create({
        data: {
          id: userBId,
          googleId: `google-${userBId}`,
          email: `userB-${userBId}@test.com`,
          name: 'User B'
        }
      });

      // User A has 1 open
      await request(app).get(`/api/track/open/${testTrackingToken}`);

      const statsA = await campaignService.getEmailStats(testUserId);
      const statsB = await campaignService.getEmailStats(userBId);

      expect(statsA.trackedOpens).toBe(1);
      expect(statsB.trackedOpens).toBe(0);
      expect(statsB.uniqueOpenedCount).toBe(0);
      expect(statsB.openRate).toBeNull();
    });
  });
});
