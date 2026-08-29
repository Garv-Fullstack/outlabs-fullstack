import { HealthCheckResponse } from '@reachinbox/shared';
import { checkDatabaseHealth } from '../repositories/prisma.js';
import { checkRedisHealth } from '../repositories/redis.js';

export class HealthService {
  public async getHealthStatus(): Promise<HealthCheckResponse> {
    const memoryUsage = process.memoryUsage();
    
    // Execute independent health checks in parallel
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth()
    ]);

    // Determine overall system health
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (dbHealth.status === 'down' && redisHealth.status === 'down') {
      overallStatus = 'unhealthy';
    } else if (dbHealth.status === 'down' || redisHealth.status === 'down') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      services: {
        database: dbHealth,
        redis: redisHealth
      },
      memory: {
        rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100
      }
    };
  }
}

export const healthService = new HealthService();
