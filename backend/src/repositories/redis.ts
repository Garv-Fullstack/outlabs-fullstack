import { Redis, RedisOptions } from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export function getRedisOptions(): RedisOptions {
  return {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    tls: config.REDIS_TLS ? {} : undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  };
}

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(getRedisOptions());

    redisClient.on('connect', () => {
      logger.info({ host: config.REDIS_HOST, port: config.REDIS_PORT }, 'Redis connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error({ err: err.message }, 'Redis client error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redisClient;
}

/**
 * Checks Redis connectivity using PING probe
 */
export async function checkRedisHealth(): Promise<{ status: 'up' | 'down'; latencyMs: number | null; error?: string }> {
  const start = Date.now();
  try {
    const client = getRedisClient();
    if (client.status !== 'ready' && client.status !== 'connecting' && client.status !== 'connect') {
      await client.connect();
    }
    const pong = await client.ping();
    if (pong === 'PONG') {
      return {
        status: 'up',
        latencyMs: Date.now() - start
      };
    }
    return {
      status: 'down',
      latencyMs: null,
      error: `Unexpected PING response: ${pong}`
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Redis connection error';
    return {
      status: 'down',
      latencyMs: null,
      error: errMessage
    };
  }
}

/**
 * Gracefully disconnects Redis client
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis disconnected gracefully');
    } catch (error) {
      logger.warn({ error }, 'Forcing Redis disconnect');
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
}
