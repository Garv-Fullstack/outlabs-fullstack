import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CampaignService } from '../src/services/campaign.service.js';
import { prisma } from '../repositories/prisma.js';

describe('Transactional Campaign Creation Tests', () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const senderId = '00000000-0000-0000-0000-000000000002';
  const validStartTime = new Date(Date.now() + 60000).toISOString();

  it('should validate that recipients array cannot be empty', async () => {
    const campaignService = new CampaignService();

    await expect(
      campaignService.createCampaign({
        userId,
        senderId,
        subject: 'Test Subject',
        bodyText: 'Test Body',
        recipients: [],
        scheduledStartTime: validStartTime,
        idempotencyKey: 'idemp-1'
      })
    ).rejects.toThrow('At least one recipient is required');
  });

  it('should reject invalid scheduledStartTime format', async () => {
    const campaignService = new CampaignService();

    await expect(
      campaignService.createCampaign({
        userId,
        senderId,
        subject: 'Test Subject',
        bodyText: 'Test Body',
        recipients: [{ email: 'test@example.com' }],
        scheduledStartTime: 'not-a-valid-date',
        idempotencyKey: 'idemp-2'
      })
    ).rejects.toThrow('Invalid scheduled start time');
  });

  it('should generate deterministic delivery idempotency keys consistently', () => {
    const key1 = CampaignService.generateDeliveryIdempotencyKey('camp-1', 'sender-1', 'lead@acme.com', 1756480000000);
    const key2 = CampaignService.generateDeliveryIdempotencyKey('camp-1', 'sender-1', 'LEAD@acme.com ', 1756480000000);
    expect(key1).toBe(key2);
    expect(key1.length).toBe(64); // SHA-256 hex
  });
});
