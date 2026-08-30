import crypto from 'crypto';
import { prisma } from '../repositories/prisma.js';
import { outboxService, OutboxService } from './outbox.service.js';
import { EmailJobPayload } from '../queues/queue.types.js';
import { EmailStatus, OutboxStatus } from '@reachinbox/shared';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface CreateCampaignRecipient {
  email: string;
  name?: string | null;
}

export interface CreateCampaignDTO {
  userId: string;
  senderId: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  recipients: CreateCampaignRecipient[];
  scheduledStartTime: string; // ISO String
  delayBetweenEmailsSeconds?: number;
  hourlyLimit?: number;
  idempotencyKey: string;
}

export interface CreateCampaignResult {
  campaignId: string;
  totalRecipients: number;
  scheduledStartTime: string;
  firstScheduledFor: string;
  lastScheduledFor: string;
  deliveriesCreated: number;
  outboxEventsCreated: number;
}

export interface CampaignStatsResult {
  totalDeliveries: number;
  scheduledCount: number;
  processingCount: number;
  sentCount: number;
  failedCount: number;
  cancelledCount: number;
  rateLimitedCount: number;
  trackedOpens: number;
  uniqueOpenedCount: number;
  openRate: number | null;
  totalClicks: number;
  uniqueClickedCount: number;
  clickRate: number | null;
}

export interface TimelineBucket {
  date: string;
  sent: number;
  scheduled: number;
  rateLimited: number;
  failed: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'delivery' | 'campaign' | 'ratelimit';
  title: string;
  timestamp: string;
  badgeColor: 'green' | 'purple' | 'orange' | 'blue';
}

export class CampaignService {
  private outbox: OutboxService;

  constructor(customOutbox?: OutboxService) {
    this.outbox = customOutbox || outboxService;
  }

  /**
   * Generates a deterministic SHA256 hash for individual delivery idempotency
   */
  public static generateDeliveryIdempotencyKey(
    campaignId: string,
    senderId: string,
    recipientEmail: string,
    scheduledForEpochMs: number
  ): string {
    const raw = `${campaignId}:${senderId}:${recipientEmail.toLowerCase().trim()}:${scheduledForEpochMs}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Creates a campaign, all delivery records, and corresponding outbox events inside a single ACID PostgreSQL transaction.
   */
  public async createCampaign(dto: CreateCampaignDTO): Promise<CreateCampaignResult> {
    const {
      userId,
      senderId,
      subject,
      bodyText,
      bodyHtml,
      recipients,
      scheduledStartTime,
      delayBetweenEmailsSeconds = 2,
      hourlyLimit = 100,
      idempotencyKey
    } = dto;

    if (!recipients || recipients.length === 0) {
      throw new ValidationError('At least one recipient is required');
    }

    const startTime = new Date(scheduledStartTime);
    if (isNaN(startTime.getTime())) {
      throw new ValidationError(`Invalid scheduled start time: ${scheduledStartTime}`);
    }

    // Step 1: Verify sender account ownership
    const sender = await prisma.senderAccount.findFirst({
      where: { id: senderId, userId }
    });

    if (!sender) {
      throw new NotFoundError(`Sender account ${senderId} not found or unauthorized`);
    }

    // Step 2: Check Campaign-level idempotency
    if (idempotencyKey) {
      const existingCampaign = await prisma.emailCampaign.findUnique({
        where: { idempotencyKey }
      });

      if (existingCampaign) {
        throw new ConflictError(`Campaign with idempotency key '${idempotencyKey}' already exists`);
      }
    }

    // Normalize recipient list
    const recipientList = recipients.map((r) => ({
      email: r.email.toLowerCase().trim(),
      name: r.name ? r.name.trim() : null
    }));

    const totalRecipients = recipientList.length;
    const startMs = startTime.getTime();

    const effectiveIdempotencyKey = idempotencyKey || `camp_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Execute atomic PostgreSQL transaction
    const result = await prisma.$transaction(async (tx) => {
      const campaign = await tx.emailCampaign.create({
        data: {
          userId,
          senderId,
          subject,
          bodyText,
          bodyHtml: bodyHtml || null,
          totalRecipients,
          scheduledStartTime: startTime,
          delayBetweenEmailsSeconds,
          hourlyLimit,
          idempotencyKey: effectiveIdempotencyKey
        }
      });

      const campaignId = campaign.id;
      let firstScheduledFor = '';
      let lastScheduledFor = '';

      for (let i = 0; i < recipientList.length; i++) {
        const recipient = recipientList[i]!;
        const deliveryScheduledForMs = startMs + i * delayBetweenEmailsSeconds * 1000;
        const deliveryScheduledDate = new Date(deliveryScheduledForMs);
        const deliveryScheduledIso = deliveryScheduledDate.toISOString();

        if (i === 0) firstScheduledFor = deliveryScheduledIso;
        if (i === recipientList.length - 1) lastScheduledFor = deliveryScheduledIso;

        const deliveryIdempotencyKey = CampaignService.generateDeliveryIdempotencyKey(
          campaignId,
          senderId,
          recipient.email,
          deliveryScheduledForMs
        );

        // Create delivery row
        const delivery = await tx.emailDelivery.create({
          data: {
            campaignId,
            userId,
            senderId,
            recipientEmail: recipient.email,
            recipientName: recipient.name || null,
            idempotencyKey: deliveryIdempotencyKey,
            status: EmailStatus.SCHEDULED,
            scheduledFor: deliveryScheduledDate
          }
        });

        // Create Outbox payload
        const jobPayload: EmailJobPayload = {
          deliveryId: delivery.id,
          campaignId,
          userId,
          senderId,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          scheduledFor: deliveryScheduledIso,
          idempotencyKey: deliveryIdempotencyKey
        };

        // Create Outbox Event
        await tx.outboxEvent.create({
          data: {
            eventType: 'EMAIL_DELIVERY_SCHEDULED',
            payload: jobPayload as unknown as object,
            status: OutboxStatus.PENDING
          }
        });
      }

      return {
        campaignId,
        totalRecipients,
        scheduledStartTime: startTime.toISOString(),
        firstScheduledFor,
        lastScheduledFor,
        deliveriesCreated: totalRecipients,
        outboxEventsCreated: totalRecipients
      };
    });

    logger.info({
      campaignId: result.campaignId,
      deliveriesCreated: result.deliveriesCreated
    }, 'Campaign and outbox events successfully committed to database');

    // Trigger immediate outbox dispatch cycle in background (non-blocking)
    this.outbox.dispatchOutboxBatch().catch((err) => {
      logger.error({ err: err.message }, 'Background outbox dispatch error after campaign creation');
    });

    return result;
  }

  /**
   * Retrieves paginated campaigns for the user
   */
  public async getCampaigns(userId: string, page = 1, limit = 20) {
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

    const formatted = campaigns.map((camp) => {
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

    return {
      campaigns: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Aggregates email delivery stats for the authenticated user
   */
  public async getEmailStats(userId: string): Promise<CampaignStatsResult> {
    const statusCounts = await prisma.emailDelivery.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        _all: true
      }
    });

    const result: CampaignStatsResult = {
      totalDeliveries: 0,
      scheduledCount: 0,
      processingCount: 0,
      sentCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      rateLimitedCount: 0,
      trackedOpens: 0,
      uniqueOpenedCount: 0,
      openRate: null,
      totalClicks: 0,
      uniqueClickedCount: 0,
      clickRate: null
    };

    for (const group of statusCounts) {
      const count = group._count._all;
      result.totalDeliveries += count;

      switch (group.status) {
        case EmailStatus.SCHEDULED:
          result.scheduledCount = count;
          break;
        case EmailStatus.PROCESSING:
          result.processingCount = count;
          break;
        case EmailStatus.SENT:
          result.sentCount = count;
          break;
        case EmailStatus.FAILED:
          result.failedCount = count;
          break;
        case EmailStatus.CANCELLED:
          result.cancelledCount = count;
          break;
        case EmailStatus.RATE_LIMITED_DELAYED:
          result.rateLimitedCount = count;
          break;
      }
    }

    // Aggregate Engagement Metrics (Phase 4)
    const [openedEvents, uniqueOpenedDeliveries, clickedEvents, uniqueClickedDeliveries] = await Promise.all([
      // Total OPENED events
      prisma.emailEngagementEvent.count({
        where: { userId, eventType: 'OPENED' }
      }),
      // Unique deliveries with at least one OPENED event
      prisma.emailEngagementEvent.groupBy({
        by: ['deliveryId'],
        where: { userId, eventType: 'OPENED' }
      }),
      // Total CLICKED events
      prisma.emailEngagementEvent.count({
        where: { userId, eventType: 'CLICKED' }
      }),
      // Unique deliveries with at least one CLICKED event
      prisma.emailEngagementEvent.groupBy({
        by: ['deliveryId'],
        where: { userId, eventType: 'CLICKED' }
      })
    ]);

    result.trackedOpens = openedEvents;
    result.uniqueOpenedCount = uniqueOpenedDeliveries.length;
    result.openRate = result.sentCount > 0
      ? Number(((result.uniqueOpenedCount / result.sentCount) * 100).toFixed(2))
      : null;

    result.totalClicks = clickedEvents;
    result.uniqueClickedCount = uniqueClickedDeliveries.length;
    result.clickRate = result.sentCount > 0
      ? Number(((result.uniqueClickedCount / result.sentCount) * 100).toFixed(2))
      : null;

    return result;
  }

  /**
   * Retrieves timeline data buckets for the user
   */
  public async getEmailTimeline(userId: string, rangeKey: '7d' | '30d' | '90d'): Promise<TimelineBucket[]> {
    const days = rangeKey === '90d' ? 90 : rangeKey === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const deliveries = await prisma.emailDelivery.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      select: {
        status: true,
        createdAt: true,
        sentAt: true
      }
    });

    const dateMap = new Map<string, TimelineBucket>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      dateMap.set(key, {
        date: key,
        sent: 0,
        scheduled: 0,
        rateLimited: 0,
        failed: 0
      });
    }

    for (const del of deliveries) {
      const targetDate = del.sentAt || del.createdAt;
      const key = `${targetDate.getDate()} ${monthNames[targetDate.getMonth()]}`;
      const bucket = dateMap.get(key);
      if (bucket) {
        if (del.status === EmailStatus.SENT) {
          bucket.sent++;
        } else if (del.status === EmailStatus.SCHEDULED) {
          bucket.scheduled++;
        } else if (del.status === EmailStatus.RATE_LIMITED_DELAYED) {
          bucket.rateLimited++;
        } else if (del.status === EmailStatus.FAILED) {
          bucket.failed++;
        }
      }
    }

    return Array.from(dateMap.values());
  }

  /**
   * Retrieves chronological recent activities for the user
   */
  public async getRecentActivities(userId: string): Promise<ActivityFeedItem[]> {
    const [recentDeliveries, recentCampaigns, rateLimitEvents] = await Promise.all([
      prisma.emailDelivery.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          campaign: { select: { subject: true } }
        }
      }),
      prisma.emailCampaign.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.rateLimitEvent.findMany({
        where: { userId },
        orderBy: { triggeredAt: 'desc' },
        take: 5,
        include: {
          sender: { select: { email: true } }
        }
      })
    ]);

    const activities: Array<{
      id: string;
      type: 'delivery' | 'campaign' | 'ratelimit';
      title: string;
      timestamp: Date;
      badgeColor: 'green' | 'purple' | 'orange' | 'blue';
    }> = [];

    for (const del of recentDeliveries) {
      if (del.status === EmailStatus.SENT) {
        activities.push({
          id: `del-sent-${del.id}`,
          type: 'delivery',
          title: `Delivered to ${del.recipientEmail} (${del.campaign?.subject || 'Campaign'})`,
          timestamp: del.sentAt || del.updatedAt,
          badgeColor: 'green'
        });
      } else if (del.status === EmailStatus.FAILED) {
        activities.push({
          id: `del-fail-${del.id}`,
          type: 'delivery',
          title: `Delivery failed to ${del.recipientEmail}: ${del.errorMessage || 'SMTP Error'}`,
          timestamp: del.failedAt || del.updatedAt,
          badgeColor: 'orange'
        });
      } else if (del.status === EmailStatus.RATE_LIMITED_DELAYED) {
        activities.push({
          id: `del-rl-${del.id}`,
          type: 'delivery',
          title: `Rate limit throttled delivery to ${del.recipientEmail}`,
          timestamp: del.updatedAt,
          badgeColor: 'orange'
        });
      }
    }

    for (const camp of recentCampaigns) {
      activities.push({
        id: `camp-${camp.id}`,
        type: 'campaign',
        title: `Campaign "${camp.subject}" created with ${camp.totalRecipients} recipients`,
        timestamp: camp.createdAt,
        badgeColor: 'purple'
      });
    }

    for (const rl of rateLimitEvents) {
      activities.push({
        id: `rl-${rl.id}`,
        type: 'ratelimit',
        title: `Sender ${rl.sender.email} reached hourly limit (${rl.emailsDispatched}/${rl.limitThreshold})`,
        timestamp: rl.triggeredAt,
        badgeColor: 'blue'
      });
    }

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, 10).map((act) => ({
      id: act.id,
      type: act.type,
      title: act.title,
      timestamp: act.timestamp.toISOString(),
      badgeColor: act.badgeColor
    }));
  }

  /**
   * Retrieves scheduled deliveries for the user
   */
  public async getScheduledDeliveries(userId: string, page: number, limit: number) {
    const [deliveries, total] = await Promise.all([
      prisma.emailDelivery.findMany({
        where: {
          userId,
          status: {
            in: [EmailStatus.SCHEDULED, EmailStatus.RATE_LIMITED_DELAYED]
          }
        },
        orderBy: { scheduledFor: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          campaign: { select: { subject: true } },
          sender: { select: { email: true, name: true } }
        }
      }),
      prisma.emailDelivery.count({
        where: {
          userId,
          status: {
            in: [EmailStatus.SCHEDULED, EmailStatus.RATE_LIMITED_DELAYED]
          }
        }
      })
    ]);

    return {
      deliveries: deliveries.map((d) => ({
        id: d.id,
        campaignId: d.campaignId,
        campaignSubject: d.campaign.subject,
        senderId: d.senderId,
        senderEmail: d.sender.email,
        senderName: d.sender.name,
        recipientEmail: d.recipientEmail,
        recipientName: d.recipientName,
        status: d.status,
        scheduledFor: d.scheduledFor.toISOString(),
        retryCount: d.retryCount,
        createdAt: d.createdAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Retrieves sent deliveries for the user
   */
  public async getSentDeliveries(userId: string, page: number, limit: number) {
    const [deliveries, total] = await Promise.all([
      prisma.emailDelivery.findMany({
        where: {
          userId,
          status: EmailStatus.SENT
        },
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          campaign: { select: { subject: true } },
          sender: { select: { email: true, name: true } }
        }
      }),
      prisma.emailDelivery.count({
        where: {
          userId,
          status: EmailStatus.SENT
        }
      })
    ]);

    return {
      deliveries: deliveries.map((d) => ({
        id: d.id,
        campaignId: d.campaignId,
        campaignSubject: d.campaign.subject,
        senderId: d.senderId,
        senderEmail: d.sender.email,
        senderName: d.sender.name,
        recipientEmail: d.recipientEmail,
        recipientName: d.recipientName,
        status: d.status,
        scheduledFor: d.scheduledFor.toISOString(),
        sentAt: d.sentAt ? d.sentAt.toISOString() : null,
        etherealPreviewUrl: d.etherealPreviewUrl,
        etherealMessageId: d.etherealMessageId,
        createdAt: d.createdAt.toISOString()
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Cancels a pending delivery
   */
  public async cancelDelivery(userId: string, deliveryId: string) {
    const delivery = await prisma.emailDelivery.findFirst({
      where: { id: deliveryId, userId }
    });

    if (!delivery) {
      throw new NotFoundError(`Delivery ${deliveryId} not found or unauthorized`);
    }

    if (delivery.status !== EmailStatus.SCHEDULED && delivery.status !== EmailStatus.RATE_LIMITED_DELAYED) {
      throw new ConflictError(`Cannot cancel delivery with status '${delivery.status}'`);
    }

    const updated = await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: EmailStatus.CANCELLED,
        errorMessage: 'Cancelled by user'
      }
    });

    return {
      id: updated.id,
      status: updated.status,
      cancelledAt: updated.updatedAt.toISOString()
    };
  }
}

export const campaignService = new CampaignService();
