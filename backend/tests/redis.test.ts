import { describe, it, expect, afterAll } from 'vitest';
import { getRedisOptions, checkRedisHealth, disconnectRedis } from '../src/repositories/redis.js';

describe('Redis Foundation Tests', () => {
  afterAll(async () => {
    await disconnectRedis();
  });

  it('should generate valid Redis configuration options with BullMQ requirements', () => {
    const options = getRedisOptions();
    expect(options.maxRetriesPerRequest).toBeNull(); // Mandatory for BullMQ
    expect(options.enableReadyCheck).toBe(true);
    expect(options.lazyConnect).toBe(true);
  });

  it('should handle Redis connectivity health probe cleanly without crashing', async () => {
    const health = await checkRedisHealth();
    expect(['up', 'down']).toContain(health.status);
    if (health.status === 'down') {
      expect(health.error).toBeDefined();
    } else {
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('should gracefully execute disconnectRedis without errors', async () => {
    await expect(disconnectRedis()).resolves.not.toThrow();
  });
});
