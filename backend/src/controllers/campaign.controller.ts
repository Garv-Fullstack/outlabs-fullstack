import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { campaignService } from '../services/campaign.service.js';
import { ApiResponse } from '@reachinbox/shared';
import { UnauthorizedError } from '../utils/errors.js';

const scheduleCampaignSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().min(1).max(500),
  bodyText: z.string().min(1),
  bodyHtml: z.string().optional().nullable(),
  recipients: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional().nullable()
    })
  ).min(1),
  scheduledStartTime: z.string().datetime(),
  delayBetweenEmailsSeconds: z.coerce.number().int().nonnegative().default(2),
  hourlyLimit: z.coerce.number().int().positive().default(100),
  idempotencyKey: z.string().min(1).max(255)
});

export class CampaignController {
  /**
   * POST /api/emails/schedule -> Schedules campaign and creates deliveries
   */
  public async scheduleCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = scheduleCampaignSchema.parse(req.body);
      const effectiveUserId = req.user?.id;

      if (!effectiveUserId) {
        throw new UnauthorizedError('User authentication required');
      }

      const result = await campaignService.createCampaign({
        ...validated,
        userId: effectiveUserId
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        requestId: req.id
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/campaigns -> Lists campaigns belonging to the authenticated user with status metrics
   */
  public async getCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = Math.max(1, parseInt(req.query['page'] as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string || '20', 10)));

      const result = await campaignService.getCampaigns(userId, page, limit);

      const response: ApiResponse = {
        success: true,
        data: result,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/campaigns/:id -> Retrieves full single campaign details with real deliveries
   */
  public async getCampaignById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const campaignId = req.params['id'] as string;

      const result = await campaignService.getCampaignById(userId, campaignId);

      const response: ApiResponse = {
        success: true,
        data: result,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/stats -> Aggregates high-level delivery statistics for the user
   */
  public async getEmailStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await campaignService.getEmailStats(userId);

      const response: ApiResponse = {
        success: true,
        data: stats,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/scheduled -> Lists upcoming scheduled deliveries
   */
  public async getScheduledDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = Math.max(1, parseInt(req.query['page'] as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string || '20', 10)));

      const result = await campaignService.getScheduledDeliveries(userId, page, limit);

      const response: ApiResponse = {
        success: true,
        data: result,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/sent -> Lists sent deliveries with tracking metadata
   */
  public async getSentDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const page = Math.max(1, parseInt(req.query['page'] as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string || '20', 10)));

      const result = await campaignService.getSentDeliveries(userId, page, limit);

      const response: ApiResponse = {
        success: true,
        data: result,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/emails/:id/cancel -> Cancels a scheduled delivery
   */
  public async cancelDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const deliveryId = req.params['id'] as string;

      const result = await campaignService.cancelDelivery(userId, deliveryId);

      const response: ApiResponse = {
        success: true,
        data: result,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/timeline -> Time-series email metrics
   */
  public async getEmailTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const range = (req.query['range'] as string) || '7d';
      const rangeKey = range === '90d' ? '90d' : range === '30d' ? '30d' : '7d';

      const timeline = await campaignService.getEmailTimeline(userId, rangeKey);

      const response: ApiResponse = {
        success: true,
        data: timeline,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/activities -> Chronological activities
   */
  public async getRecentActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const activities = await campaignService.getRecentActivities(userId);

      const response: ApiResponse = {
        success: true,
        data: activities,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/campaigns/:id -> Update campaign
   */
  public async updateCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const campaignId = req.params.id;
      const result = await campaignService.updateCampaign(userId, campaignId, req.body);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/campaigns/:id/pause -> Pause campaign
   */
  public async pauseCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const campaignId = req.params.id;
      const result = await campaignService.pauseCampaign(userId, campaignId);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/campaigns/:id/resume -> Resume campaign
   */
  public async resumeCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const campaignId = req.params.id;
      const result = await campaignService.resumeCampaign(userId, campaignId);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/campaigns/:id/cancel -> Cancel campaign
   */
  public async cancelCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const campaignId = req.params.id;
      const result = await campaignService.cancelCampaign(userId, campaignId);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/campaigns/:id -> Delete campaign
   */
  public async deleteCampaign(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const campaignId = req.params.id;
      const result = await campaignService.deleteCampaign(userId, campaignId);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/emails/:id/retry -> Retry failed delivery
   */
  public async retryDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const deliveryId = req.params.id;
      const result = await campaignService.retryDelivery(userId, deliveryId);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/emails/:id -> Delete delivery record
   */
  public async deleteDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const deliveryId = req.params.id;
      const result = await campaignService.deleteDelivery(userId, deliveryId);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id
      });
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
