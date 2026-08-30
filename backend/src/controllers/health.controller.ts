import { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service.js';
import { emailQueueManager } from '../queues/email.queue.js';
import { ApiResponse, HealthCheckResponse } from '@reachinbox/shared';

export class HealthController {
  public async checkHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const healthData = await healthService.getHealthStatus();
      
      const response: ApiResponse<HealthCheckResponse> = {
        success: healthData.status !== 'unhealthy',
        data: healthData,
        requestId: req.id
      };

      // Return 200 for healthy or degraded (app is running), 503 for completely unhealthy
      const httpStatus = healthData.status === 'unhealthy' ? 503 : 200;
      res.status(httpStatus).json(response);
    } catch (error) {
      next(error);
    }
  }

  public async getQueueMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await emailQueueManager.getQueueMetrics();
      const response: ApiResponse = {
        success: true,
        data: metrics,
        requestId: req.id
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const healthController = new HealthController();

