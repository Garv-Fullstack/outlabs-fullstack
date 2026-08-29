import { Job } from 'bullmq';
import { prisma } from '../repositories/prisma.js';
import { rateLimiter, DistributedRateLimiter } from '../rate-limit/rate-limiter.js';
import { emailQueueManager, EmailDeliveryQueueManager } from '../queues/email.queue.js';
import { EmailJobPayload } from '../queues/queue.types.js';
import { IDeliveryTransport, MockDeliveryTransport } from './transports/delivery.transport.js';
import { nodemailerTransport } from './transports/smtp.transport.js';
import { classifySmtpError, NonRetryableDeliveryError } from '../email/smtp.errors.js';
import { slackService } from '../integrations/slack.service.js';
import { emailIndexer } from '../search/email.indexer.js';
import { EmailStatus, RateLimitAction } from '@reachinbox/shared';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export interface ProcessJobResult {
  deliveryId: string;
  status: 'SENT' | 'SKIPPED' | 'RATE_LIMITED_DELAYED' | 'FAILED';
  messageId?: string;
  reason?: string;
}

/**
 * Resolves the appropriate default delivery transport according to runtime environment
 */
export function resolveDefaultTransport(env = config.NODE_ENV): IDeliveryTransport {
  if (env === 'production') {
    return nodemailerTransport;
  }
  if (env === 'test') {
    return new MockDeliveryTransport();
  }
  // development / staging defaults to nodemailerTransport (live Ethereal SMTP pool)
  return nodemailerTransport;
}

export class DeliveryProcessor {
  private limiter: DistributedRateLimiter;
  private queueManager: EmailDeliveryQueueManager;
  private transport: IDeliveryTransport;

  constructor(
    customLimiter?: DistributedRateLimiter,
    customQueueManager?: EmailDeliveryQueueManager,
    customTransport?: IDeliveryTransport
  ) {
    this.limiter = customLimiter || rateLimiter;
    this.queueManager = customQueueManager || emailQueueManager;

    if (customTransport) {
      if (config.NODE_ENV === 'production' && customTransport instanceof MockDeliveryTransport) {
        throw new Error('SECURITY VIOLATION: MockDeliveryTransport cannot be used in production environment');
      }
      this.transport = customTransport;
    } else {
      this.transport = resolveDefaultTransport();
    }
  }

  public getTransport(): IDeliveryTransport {
    return this.transport;
  }

  public setTransport(transport: IDeliveryTransport): void {
    if (config.NODE_ENV === 'production' && transport instanceof MockDeliveryTransport) {
      throw new Error('SECURITY VIOLATION: MockDeliveryTransport cannot be used in production environment');
    }
    this.transport = transport;
  }

  /**
   * Processes a single delivery job from BullMQ with full state machine transitions and rate limiting
   */
  public async processDeliveryJob(job: Job<EmailJobPayload>): Promise<ProcessJobResult> {
    const payload = job.data;
    const { deliveryId, senderId, campaignId } = payload;

    logger.info({
      jobId: job.id,
      deliveryId,
      campaignId,
      attempt: job.attemptsMade + 1
    }, 'Worker picked up email delivery job');

    // 1. Fetch delivery record with sender and campaign details
    const delivery = await prisma.emailDelivery.findUnique({
      where: { id: deliveryId },
      include: {
        sender: true,
        campaign: true
      }
    });

    if (!delivery || !delivery.sender || !delivery.campaign) {
      logger.error({ deliveryId }, 'Delivery record or required relation (sender/campaign) not found in database');
      return { deliveryId, status: 'SKIPPED', reason: 'Record or relation not found' };
    }

    // 2. State Guard: Check if job is in a valid runnable state
    if (delivery.status === EmailStatus.SENT) {
      logger.warn({ deliveryId }, 'Delivery already marked SENT, skipping duplicate delivery attempt');
      return { deliveryId, status: 'SKIPPED', reason: 'Already SENT' };
    }

    if (delivery.status === EmailStatus.CANCELLED) {
      logger.info({ deliveryId }, 'Delivery cancelled by user, skipping execution');
      return { deliveryId, status: 'SKIPPED', reason: 'CANCELLED' };
    }

    // 3. Atomically transition state to PROCESSING
    await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status: EmailStatus.PROCESSING,
        retryCount: job.attemptsMade
      }
    });

    // 4. Evaluate Distributed Rate Limiter
    const rateLimitCheck = await this.limiter.checkAndReserveSlot(
      senderId,
      delivery.sender.hourlyLimit,
      delivery.sender.minDelaySeconds
    );

    if (!rateLimitCheck.allowed) {
      const retryAfterMs = rateLimitCheck.retryAfterMs || 5000;
      logger.warn({
        deliveryId,
        senderId,
        action: rateLimitCheck.action,
        retryAfterMs
      }, 'Rate limit breached. Re-delaying job in BullMQ');

      // Update DB status to RATE_LIMITED_DELAYED
      await prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: { status: EmailStatus.RATE_LIMITED_DELAYED }
      });

      // Record rate limit audit event and dispatch Slack alert if hourly limit was breached
      if (rateLimitCheck.action === RateLimitAction.HOURLY_LIMIT_EXCEEDED) {
        try {
          await prisma.rateLimitEvent.create({
            data: {
              senderId,
              userId: delivery.userId,
              hourBucket: rateLimitCheck.hourBucket,
              emailsDispatched: rateLimitCheck.currentCount || delivery.sender.hourlyLimit,
              limitThreshold: delivery.sender.hourlyLimit,
              slackNotified: false
            }
          });

          // Dispatch real Slack Block-Kit alert in background (non-blocking)
          slackService.sendRateLimitAlert(
            delivery.userId,
            delivery.sender.email,
            delivery.sender.hourlyLimit,
            rateLimitCheck.hourBucket
          ).catch((slackErr) => {
            logger.warn({ slackErr }, 'Slack alert dispatch error (non-blocking)');
          });
        } catch (auditError) {
          logger.error({ auditError }, 'Failed to record rate limit audit event');
        }
      }

      // Re-schedule in BullMQ with explicit delay
      await this.queueManager.enqueueEmail(payload, retryAfterMs);

      return {
        deliveryId,
        status: 'RATE_LIMITED_DELAYED',
        reason: `Rate limit ${rateLimitCheck.action}, rescheduled in ${retryAfterMs}ms`
      };
    }

    // 5. Rate limit passed: Dispatch email through transport abstraction
    try {
      const sendResult = await this.transport.send(
        {
          deliveryId: delivery.id,
          senderId: delivery.sender.id,
          senderEmail: delivery.sender.email,
          senderName: delivery.sender.name,
          recipientEmail: delivery.recipientEmail,
          recipientName: delivery.recipientName,
          subject: delivery.campaign.subject,
          bodyText: delivery.campaign.bodyText,
          bodyHtml: delivery.campaign.bodyHtml
        },
        delivery.sender as any
      );

      // 6. On Success: Update database to SENT
      await prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
          etherealMessageId: sendResult.messageId,
          etherealPreviewUrl: sendResult.previewUrl || null,
          errorMessage: null
        }
      });

      logger.info({
        deliveryId,
        messageId: sendResult.messageId,
        previewUrl: sendResult.previewUrl
      }, 'Email successfully delivered and updated to SENT');

      // 7. Trigger Asynchronous Elasticsearch Indexing (Non-blocking)
      emailIndexer.indexDelivery({
        id: delivery.id,
        campaignId: delivery.campaignId,
        userId: delivery.userId,
        senderId: delivery.senderId,
        senderEmail: delivery.sender.email,
        recipientEmail: delivery.recipientEmail,
        recipientName: delivery.recipientName,
        subject: delivery.campaign.subject,
        bodyText: delivery.campaign.bodyText,
        status: EmailStatus.SENT,
        scheduledFor: delivery.scheduledFor.toISOString(),
        sentAt: new Date().toISOString(),
        etherealPreviewUrl: sendResult.previewUrl || null,
        createdAt: delivery.createdAt.toISOString()
      }).catch((esErr) => {
        logger.warn({ esErr, deliveryId }, 'Async ES indexing error (non-blocking)');
      });

      return {
        deliveryId,
        status: 'SENT',
        messageId: sendResult.messageId
      };
    } catch (error) {
      const classified = classifySmtpError(error);
      const errorMessage = classified.message;
      logger.error({
        deliveryId,
        isRetryable: classified.isRetryable,
        code: classified.code,
        errorMessage,
        attempt: job.attemptsMade + 1
      }, 'Email transport error');

      const isPermanent = !classified.isRetryable || classified instanceof NonRetryableDeliveryError;
      const isFinalAttempt = isPermanent || (job.opts?.attempts || 5) <= job.attemptsMade + 1;

      await prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status: isFinalAttempt ? EmailStatus.FAILED : EmailStatus.PROCESSING,
          failedAt: isFinalAttempt ? new Date() : null,
          errorMessage
        }
      });

      // If permanent error, do not retry
      if (isPermanent) {
        return {
          deliveryId,
          status: 'FAILED',
          reason: `Permanent error: ${errorMessage}`
        };
      }

      // Throw error to BullMQ so its exponential backoff handles retry
      throw error;
    }
  }
}

export const deliveryProcessor = new DeliveryProcessor();
