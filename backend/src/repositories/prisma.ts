import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma || new PrismaClient({
  log: process.env['NODE_ENV'] === 'development'
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ]
    : [{ emit: 'event', level: 'error' }]
});

if (process.env['NODE_ENV'] !== 'production') {
  global.__prisma = prisma;
}

/**
 * Checks database connectivity by executing a lightweight query
 */
export async function checkDatabaseHealth(timeoutMs = 1500): Promise<{ status: 'up' | 'down'; latencyMs: number | null; error?: string }> {
  const start = Date.now();
  try {
    const queryPromise = prisma.$queryRawUnsafe('SELECT 1');
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database health check timed out')), timeoutMs));
    await Promise.race([queryPromise, timeoutPromise]);
    return {
      status: 'up',
      latencyMs: Date.now() - start
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Database connection error';
    return {
      status: 'down',
      latencyMs: null,
      error: errMessage
    };
  }
}

/**
 * Gracefully disconnects Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected successfully');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting Prisma');
  }
}
