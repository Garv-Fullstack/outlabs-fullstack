import { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service.js';
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
}

export const healthController = new HealthController();
