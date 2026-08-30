import { describe, it, expect } from 'vitest';
import { EmailDeliveryQueueManager } from '../src/queues/email.queue.js';
import { CampaignService } from '../src/services/campaign.service.js';

describe('Scheduling Mathematics & Job Idempotency Tests', () => {
  it('should compute delay offset from target scheduled timestamp', () => {
    const now = 1756480000000;
    const target = new Date(now + 15000).toISOString(); // 15 seconds in future
    const delay = EmailDeliveryQueueManager.calculateDelay(target, now);
    expect(delay).toBe(15000);
  });

  it('should return 0 delay if scheduled timestamp is already in the past', () => {
    const now = 1756480000000;
    const past = new Date(now - 5000).toISOString(); // 5 seconds in past
    const delay = EmailDeliveryQueueManager.calculateDelay(past, now);
    expect(delay).toBe(0);
  });

  it('should generate deterministic BullMQ job IDs matching email_hash', () => {
    const idempotencyKey = 'a6b9c8d7e6f512345678';
    const jobId = EmailDeliveryQueueManager.generateJobId(idempotencyKey);
    expect(jobId).toBe(`email_${idempotencyKey}`);
  });

  it('should compute staggered schedules for sequential recipients', () => {
    const startTimeMs = 1756480000000;
    const delayBetweenEmailsSeconds = 3;
    const recipientCount = 5;

    const scheduledTimes: number[] = [];
    for (let i = 0; i < recipientCount; i++) {
      scheduledTimes.push(startTimeMs + i * delayBetweenEmailsSeconds * 1000);
    }

    expect(scheduledTimes[0]).toBe(startTimeMs);
    expect(scheduledTimes[1]).toBe(startTimeMs + 3000);
    expect(scheduledTimes[2]).toBe(startTimeMs + 6000);
    expect(scheduledTimes[3]).toBe(startTimeMs + 9000);
    expect(scheduledTimes[4]).toBe(startTimeMs + 12000);
  });

  it('should generate distinct deterministic SHA256 hashes per recipient and timestamp', () => {
    const campaignId = '11111111-1111-1111-1111-111111111111';
    const senderId = '22222222-2222-2222-2222-222222222222';
    const timeMs = 1756480000000;

    const hash1 = CampaignService.generateDeliveryIdempotencyKey(campaignId, senderId, 'alice@example.com', timeMs);
    const hash2 = CampaignService.generateDeliveryIdempotencyKey(campaignId, senderId, 'bob@example.com', timeMs + 3000);
    const hash1Duplicate = CampaignService.generateDeliveryIdempotencyKey(campaignId, senderId, 'ALICE@example.com ', timeMs);

    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    expect(hash2).toMatch(/^[0-9a-f]{64}$/);
    expect(hash1).not.toBe(hash2);
    // Normalized casing check
    expect(hash1).toBe(hash1Duplicate);
  });
});
