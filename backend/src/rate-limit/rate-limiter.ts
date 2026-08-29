import { Redis } from 'ioredis';
import { getRedisClient } from '../repositories/redis.js';
import { logger } from '../utils/logger.js';
import { RateLimitAction } from '@reachinbox/shared';

export interface RateLimitCheckResult {
  allowed: boolean;
  action: RateLimitAction;
  currentCount?: number;
  retryAfterMs?: number;
  hourBucket: string;
}

export const LUA_RATE_LIMIT_SCRIPT = `
local keyLastSent = KEYS[1]
local keyHourBucket = KEYS[2]

local minDelayMs = tonumber(ARGV[1]) or 0
local hourlyLimit = tonumber(ARGV[2]) or 100
local nowMs = tonumber(ARGV[3]) or 0

-- 1. Check Minimum Delay
local lastSentVal = redis.call('GET', keyLastSent)
if lastSentVal and lastSentVal ~= false then
    local lastSent = tonumber(lastSentVal)
    if lastSent then
        local elapsed = nowMs - lastSent
        if elapsed < minDelayMs then
            local waitRemaining = minDelayMs - elapsed
            return { 0, "MIN_DELAY_BREACH", tostring(waitRemaining) }
        end
    end
end

-- 2. Check Hourly Quota
local currentCount = 0
local currentVal = redis.call('GET', keyHourBucket)
if currentVal and currentVal ~= false then
    currentCount = tonumber(currentVal) or 0
end

if currentCount >= hourlyLimit then
    return { 0, "HOURLY_LIMIT_EXCEEDED", tostring(currentCount) }
end

-- 3. Atomic Token Reservation
redis.call('SET', keyLastSent, tostring(nowMs))
local newCount = redis.call('INCR', keyHourBucket)
redis.call('EXPIRE', keyHourBucket, 7200)

return { 1, "ALLOWED", tostring(newCount) }
`;

export class DistributedRateLimiter {
  private redis: Redis | null = null;

  constructor(customRedisClient?: Redis) {
    if (customRedisClient) {
      this.redis = customRedisClient;
    }
  }

  private getClient(): Redis {
    if (!this.redis) {
      this.redis = getRedisClient();
    }
    return this.redis;
  }

  /**
   * Generates calendar hourly window string (e.g. '2026082915')
   */
  public static getHourBucket(date: Date = new Date()): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}`;
  }

  /**
   * Calculates milliseconds remaining until the top of the next hour
   */
  public static getMsUntilNextHour(now: Date = new Date()): number {
    const nextHour = new Date(now);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
    return Math.max(1000, nextHour.getTime() - now.getTime());
  }

  /**
   * Atomically checks and reserves a sending slot for a given sender
   */
  public async checkAndReserveSlot(
    senderId: string,
    hourlyLimit: number,
    minDelaySeconds: number,
    now: Date = new Date()
  ): Promise<RateLimitCheckResult> {
    const client = this.getClient();
    const nowMs = now.getTime();
    const minDelayMs = minDelaySeconds * 1000;
    const hourBucket = DistributedRateLimiter.getHourBucket(now);

    const keyLastSent = `ratelimit:sender:${senderId}:last_sent`;
    const keyHourBucket = `ratelimit:sender:${senderId}:hour:${hourBucket}`;

    try {
      // Execute atomic Lua evaluation
      const result = (await client.eval(
        LUA_RATE_LIMIT_SCRIPT,
        2,
        keyLastSent,
        keyHourBucket,
        minDelayMs,
        hourlyLimit,
        nowMs
      )) as [number, string, string];

      const [statusNum, actionStr, valStr] = result;

      if (statusNum === 1) {
        return {
          allowed: true,
          action: RateLimitAction.ALLOWED,
          currentCount: parseInt(valStr, 10),
          hourBucket
        };
      }

      if (actionStr === 'MIN_DELAY_BREACH') {
        const waitMs = parseInt(valStr, 10);
        logger.warn({ senderId, waitMs }, 'Minimum inter-email delay breached');
        return {
          allowed: false,
          action: RateLimitAction.MIN_DELAY_BREACH,
          retryAfterMs: waitMs,
          hourBucket
        };
      }

      if (actionStr === 'HOURLY_LIMIT_EXCEEDED') {
        const msUntilNextHour = DistributedRateLimiter.getMsUntilNextHour(now);
        // Add subtle jitter (0-2000ms) to avoid thundering herd at top of hour
        const jitter = Math.floor(Math.random() * 2000);
        const retryAfterMs = msUntilNextHour + jitter;

        logger.warn({ senderId, hourlyLimit, currentCount: valStr, retryAfterMs }, 'Hourly sender limit exceeded');
        return {
          allowed: false,
          action: RateLimitAction.HOURLY_LIMIT_EXCEEDED,
          currentCount: parseInt(valStr, 10),
          retryAfterMs,
          hourBucket
        };
      }

      throw new Error(`Unexpected rate limiter Lua response: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.error({ error, senderId }, 'Redis rate limiter execution failure');
      throw error;
    }
  }

  /**
   * Resets rate limits for testing or administrative overrides
   */
  public async resetSenderLimit(senderId: string, hourBucket?: string): Promise<void> {
    const client = this.getClient();
    const bucket = hourBucket || DistributedRateLimiter.getHourBucket();
    const keyLastSent = `ratelimit:sender:${senderId}:last_sent`;
    const keyHourBucket = `ratelimit:sender:${senderId}:hour:${bucket}`;
    await client.del(keyLastSent, keyHourBucket);
  }
}

export const rateLimiter = new DistributedRateLimiter();
