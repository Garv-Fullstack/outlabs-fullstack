import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import { DistributedRateLimiter, LUA_RATE_LIMIT_SCRIPT } from '../src/rate-limit/rate-limiter.js';
import { RateLimitAction } from '@reachinbox/shared';

describe('Distributed Rate Limiter Tests (Atomic Redis Lua)', () => {
  let redisMock: any;
  let limiter: DistributedRateLimiter;
  const senderId = '00000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    redisMock = new (RedisMock as any)();
    limiter = new DistributedRateLimiter(redisMock);
  });

  afterEach(async () => {
    if (redisMock) {
      await redisMock.flushall();
    }
  });

  it('should format calendar hour bucket correctly (YYYYMMDDHH)', () => {
    const fixedDate = new Date('2026-08-29T15:30:00.000Z');
    const bucket = DistributedRateLimiter.getHourBucket(fixedDate);
    expect(bucket).toBe('2026082915');
  });

  it('should calculate milliseconds remaining until the next hour accurately', () => {
    const fixedDate = new Date('2026-08-29T15:30:00.000Z');
    const msRemaining = DistributedRateLimiter.getMsUntilNextHour(fixedDate);
    expect(msRemaining).toBe(30 * 60 * 1000); // 30 minutes in ms = 1800000
  });

  it('should allow email when within hourly limit and spacing constraints', async () => {
    const result = await limiter.checkAndReserveSlot(senderId, 10, 0, new Date('2026-08-29T15:00:00.000Z'));
    expect(result.allowed).toBe(true);
    expect(result.action).toBe(RateLimitAction.ALLOWED);
    expect(result.currentCount).toBe(1);
  });

  it('should enforce hourly limit ceiling (limit=3, attempts=5)', async () => {
    const now = new Date('2026-08-29T15:00:00.000Z');

    // 1st attempt: ALLOWED
    const r1 = await limiter.checkAndReserveSlot(senderId, 3, 0, now);
    expect(r1.allowed).toBe(true);
    expect(r1.currentCount).toBe(1);

    // 2nd attempt: ALLOWED
    const r2 = await limiter.checkAndReserveSlot(senderId, 3, 0, now);
    expect(r2.allowed).toBe(true);
    expect(r2.currentCount).toBe(2);

    // 3rd attempt: ALLOWED (Boundary: limit)
    const r3 = await limiter.checkAndReserveSlot(senderId, 3, 0, now);
    expect(r3.allowed).toBe(true);
    expect(r3.currentCount).toBe(3);

    // 4th attempt: HOURLY_LIMIT_EXCEEDED (Boundary: limit + 1)
    const r4 = await limiter.checkAndReserveSlot(senderId, 3, 0, now);
    expect(r4.allowed).toBe(false);
    expect(r4.action).toBe(RateLimitAction.HOURLY_LIMIT_EXCEEDED);
    expect(r4.retryAfterMs).toBeGreaterThan(0);

    // 5th attempt: HOURLY_LIMIT_EXCEEDED
    const r5 = await limiter.checkAndReserveSlot(senderId, 3, 0, now);
    expect(r5.allowed).toBe(false);
    expect(r5.action).toBe(RateLimitAction.HOURLY_LIMIT_EXCEEDED);
  });

  it('should enforce minimum inter-email delay spacing between sends', async () => {
    const t0 = new Date('2026-08-29T15:00:00.000Z');
    // 1st email sent at t0 with min delay 2 seconds
    const r1 = await limiter.checkAndReserveSlot(senderId, 100, 2, t0);
    expect(r1.allowed).toBe(true);

    // 2nd email attempted 1000ms later (1s < 2s min delay)
    const t1 = new Date('2026-08-29T15:00:01.000Z');
    const r2 = await limiter.checkAndReserveSlot(senderId, 100, 2, t1);
    expect(r2.allowed).toBe(false);
    expect(r2.action).toBe(RateLimitAction.MIN_DELAY_BREACH);
    expect(r2.retryAfterMs).toBe(1000); // 2000 - 1000 = 1000ms remaining

    // 3rd email attempted 2500ms after t0 (2.5s > 2s min delay)
    const t2 = new Date('2026-08-29T15:00:02.500Z');
    const r3 = await limiter.checkAndReserveSlot(senderId, 100, 2, t2);
    expect(r3.allowed).toBe(true);
  });

  it('should reset limit in next calendar hour bucket', async () => {
    const hour1 = new Date('2026-08-29T15:59:00.000Z');
    const hour2 = new Date('2026-08-29T16:00:01.000Z');

    // Fill up quota in hour 1
    await limiter.checkAndReserveSlot(senderId, 1, 0, hour1);
    const blockedHour1 = await limiter.checkAndReserveSlot(senderId, 1, 0, hour1);
    expect(blockedHour1.allowed).toBe(false);

    // New hour bucket: fresh quota
    const allowedHour2 = await limiter.checkAndReserveSlot(senderId, 1, 0, hour2);
    expect(allowedHour2.allowed).toBe(true);
    expect(allowedHour2.currentCount).toBe(1);
  });
});
