import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import { DistributedRateLimiter, LUA_RATE_LIMIT_SCRIPT } from '../src/rate-limit/rate-limiter.js';
import { RateLimitAction } from '@reachinbox/shared';

describe('Concurrency & Race Condition Safety Tests', () => {
  let redisMock: any;
  let limiter: DistributedRateLimiter;
  const senderId = 'concurrency-test-sender-001';

  beforeEach(() => {
    redisMock = new (RedisMock as any)();
    limiter = new DistributedRateLimiter(redisMock);
  });

  afterEach(async () => {
    if (redisMock) {
      await redisMock.flushall();
    }
  });

  it('should guarantee atomic rate limit enforcement under 20 concurrent requests (limit = 10)', async () => {
    const hourlyLimit = 10;
    const now = new Date('2026-08-29T16:00:00.000Z');
    const totalRequests = 20;

    // Fire 20 parallel requests against the same sender slot
    const promises = Array.from({ length: totalRequests }).map(() =>
      limiter.checkAndReserveSlot(senderId, hourlyLimit, 0, now)
    );

    const results = await Promise.all(promises);

    const allowedCount = results.filter((r) => r.allowed).length;
    const rejectedCount = results.filter((r) => !r.allowed && r.action === RateLimitAction.HOURLY_LIMIT_EXCEEDED).length;

    // Exactly 10 must be ALLOWED and 10 must be HOURLY_LIMIT_EXCEEDED
    expect(allowedCount).toBe(10);
    expect(rejectedCount).toBe(10);
    expect(allowedCount + rejectedCount).toBe(totalRequests);
  });

  it('should isolate rate limits across different concurrent senders', async () => {
    const senderA = 'sender-A';
    const senderB = 'sender-B';
    const hourlyLimit = 5;
    const now = new Date('2026-08-29T16:00:00.000Z');

    // 5 requests for Sender A and 5 requests for Sender B concurrently
    const promises = [
      ...Array.from({ length: 5 }).map(() => limiter.checkAndReserveSlot(senderA, hourlyLimit, 0, now)),
      ...Array.from({ length: 5 }).map(() => limiter.checkAndReserveSlot(senderB, hourlyLimit, 0, now))
    ];

    const results = await Promise.all(promises);

    // All 10 requests should succeed because each sender has an independent quota of 5
    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(10);
  });
});
