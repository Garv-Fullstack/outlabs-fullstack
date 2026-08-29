import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { campaignService } from '../services/campaign.service.js';
import { emailQueueManager } from '../queues/email.queue.js';
import { prisma } from '../repositories/prisma.js';
import { EmailStatus, ApiResponse } from '@reachinbox/shared';
import { NotFoundError, ConflictError, UnauthorizedError } from '../utils/errors.js';

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

      const [campaigns, total] = await Promise.all([
        prisma.emailCampaign.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            sender: {
              select: { id: true, email: true, name: true }
            },
            deliveries: {
              select: { status: true }
            }
          }
        }),
        prisma.emailCampaign.count({ where: { userId } })
      ]);

      const formattedCampaigns = campaigns.map((camp) => {
        const stats = {
          total: camp.deliveries.length,
          scheduled: 0,
          processing: 0,
          sent: 0,
          failed: 0,
          cancelled: 0,
          rateLimited: 0
        };

        for (const del of camp.deliveries) {
          switch (del.status) {
            case EmailStatus.SCHEDULED:
              stats.scheduled++;
              break;
            case EmailStatus.PROCESSING:
              stats.processing++;
              break;
            case EmailStatus.SENT:
              stats.sent++;
              break;
            case EmailStatus.FAILED:
              stats.failed++;
              break;
            case EmailStatus.CANCELLED:
              stats.cancelled++;
              break;
            case EmailStatus.RATE_LIMITED_DELAYED:
              stats.rateLimited++;
              break;
          }
        }

        return {
          id: camp.id,
          userId: camp.userId,
          senderId: camp.senderId,
          senderEmail: camp.sender.email,
          senderName: camp.sender.name,
          subject: camp.subject,
          bodyText: camp.bodyText,
          bodyHtml: camp.bodyHtml,
          totalRecipients: camp.totalRecipients,
          scheduledStartTime: camp.scheduledStartTime.toISOString(),
          delayBetweenEmailsSeconds: camp.delayBetweenEmailsSeconds,
          hourlyLimit: camp.hourlyLimit,
          idempotencyKey: camp.idempotencyKey,
          createdAt: camp.createdAt.toISOString(),
          updatedAt: camp.updatedAt.toISOString(),
          stats
        };
      });

      const response: ApiResponse = {
        success: true,
        data: {
          campaigns: formattedCampaigns,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
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

      const grouped = await prisma.emailDelivery.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true }
      });

      const counts = {
        totalDeliveries: 0,
        scheduledCount: 0,
        processingCount: 0,
        sentCount: 0,
        failedCount: 0,
        cancelledCount: 0,
        rateLimitedCount: 0
      };

      for (const row of grouped) {
        const count = row._count._all;
        counts.totalDeliveries += count;
        switch (row.status) {
          case EmailStatus.SCHEDULED:
            counts.scheduledCount += count;
            break;
          case EmailStatus.PROCESSING:
            counts.processingCount += count;
            break;
          case EmailStatus.SENT:
            counts.sentCount += count;
            break;
          case EmailStatus.FAILED:
            counts.failedCount += count;
            break;
          case EmailStatus.CANCELLED:
            counts.cancelledCount += count;
            break;
          case EmailStatus.RATE_LIMITED_DELAYED:
            counts.rateLimitedCount += count;
            break;
        }
      }

      const response: ApiResponse = {
        success: true,
        data: counts,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/scheduled -> Lists pending, queued, and rate-limited deliveries
   */
  public async getScheduledDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query['page'] as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string || '20', 10)));
      const senderId = req.query['senderId'] as string | undefined;
      const userId = req.user!.id;

      const whereClause: Record<string, unknown> = {
        userId,
        status: { in: [EmailStatus.SCHEDULED, EmailStatus.RATE_LIMITED_DELAYED, EmailStatus.PROCESSING] }
      };

      if (senderId) whereClause['senderId'] = senderId;

      const [deliveries, total] = await Promise.all([
        prisma.emailDelivery.findMany({
          where: whereClause,
          orderBy: { scheduledFor: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            sender: { select: { id: true, email: true, name: true } },
            campaign: { select: { id: true, subject: true } }
          }
        }),
        prisma.emailDelivery.count({ where: whereClause })
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          deliveries: deliveries.map((d) => ({
            ...d,
            scheduledFor: d.scheduledFor.toISOString(),
            sentAt: d.sentAt?.toISOString() || null,
            failedAt: d.failedAt?.toISOString() || null,
            createdAt: d.createdAt.toISOString(),
            updatedAt: d.updatedAt.toISOString()
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/emails/sent -> Lists sent email deliveries with preview URLs
   */
  public async getSentDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query['page'] as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string || '20', 10)));
      const senderId = req.query['senderId'] as string | undefined;
      const userId = req.user!.id;

      const whereClause: Record<string, unknown> = {
        userId,
        status: EmailStatus.SENT
      };

      if (senderId) whereClause['senderId'] = senderId;

      const [deliveries, total] = await Promise.all([
        prisma.emailDelivery.findMany({
          where: whereClause,
          orderBy: { sentAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            sender: { select: { id: true, email: true, name: true } },
            campaign: { select: { id: true, subject: true } }
          }
        }),
        prisma.emailDelivery.count({ where: whereClause })
      ]);

      const response: ApiResponse = {
        success: true,
        data: {
          deliveries: deliveries.map((d) => ({
            ...d,
            scheduledFor: d.scheduledFor.toISOString(),
            sentAt: d.sentAt?.toISOString() || null,
            failedAt: d.failedAt?.toISOString() || null,
            createdAt: d.createdAt.toISOString(),
            updatedAt: d.updatedAt.toISOString()
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
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
      const { id } = req.params;
      const userId = req.user!.id;

      const delivery = await prisma.emailDelivery.findUnique({
        where: { id }
      });

      if (!delivery || delivery.userId !== userId) {
        throw new NotFoundError(`Delivery ${id} not found`);
      }

      if (delivery.status === EmailStatus.SENT) {
        throw new ConflictError(`Cannot cancel delivery ${id} because it is already SENT`);
      }

      // Remove from BullMQ queue
      await emailQueueManager.removeJob(delivery.idempotencyKey);

      // Update DB status to CANCELLED
      const updated = await prisma.emailDelivery.update({
        where: { id },
        data: { status: EmailStatus.CANCELLED }
      });

      const response: ApiResponse = {
        success: true,
        data: {
          id: updated.id,
          status: updated.status
        },
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
