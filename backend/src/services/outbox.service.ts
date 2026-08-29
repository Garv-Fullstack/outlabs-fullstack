import { prisma } from '../repositories/prisma.js';
import { emailQueueManager, EmailDeliveryQueueManager } from '../queues/email.queue.js';
import { EmailJobPayload } from '../queues/queue.types.js';
import { OutboxStatus } from '@reachinbox/shared';
import { logger } from '../utils/logger.js';

export interface DispatchOutboxResult {
  claimedCount: number;
  enqueuedCount: number;
  failedCount: number;
  recoveredCount: number;
}

export class OutboxService {
  private queueManager: EmailDeliveryQueueManager;

  constructor(customQueueManager?: EmailDeliveryQueueManager) {
    this.queueManager = customQueueManager || emailQueueManager;
  }

  /**
   * Recovers stale PROCESSING events whose lock expired (e.g. process crashed during previous dispatch)
   */
  public async recoverStaleProcessingEvents(lockTimeoutSeconds = 60): Promise<number> {
    const staleThreshold = new Date(Date.now() - lockTimeoutSeconds * 1000);

    const result = await prisma.outboxEvent.updateMany({
      where: {
        status: OutboxStatus.PROCESSING,
        lockedAt: { lt: staleThreshold }
      },
      data: {
        status: OutboxStatus.PENDING,
        lockedAt: null
      }
    });

    if (result.count > 0) {
      logger.warn({ count: result.count }, 'Recovered stale PROCESSING outbox events to PENDING');
    }

    return result.count;
  }

  /**
   * Claims a batch of PENDING outbox events atomically to prevent race conditions across multiple dispatchers
   */
  public async claimPendingEvents(batchSize = 100): Promise<Array<{ id: string; eventType: string; payload: unknown }>> {
    const now = new Date();

    // Use interactive transaction or atomic update with subquery/ID selection
    return await prisma.$transaction(async (tx) => {
      // Find eligible PENDING events
      const pendingEvents = await tx.outboxEvent.findMany({
        where: {
          status: OutboxStatus.PENDING
        },
        orderBy: { createdAt: 'asc' },
        take: batchSize,
        select: { id: true }
      });

      if (pendingEvents.length === 0) {
        return [];
      }

      const eventIds = pendingEvents.map((e) => e.id);

      // Atomically transition them to PROCESSING and set lockedAt
      await tx.outboxEvent.updateMany({
        where: {
          id: { in: eventIds },
          status: OutboxStatus.PENDING
        },
        data: {
          status: OutboxStatus.PROCESSING,
          lockedAt: now
        }
      });

      // Retrieve the claimed events with full payload
      const claimedEvents = await tx.outboxEvent.findMany({
        where: {
          id: { in: eventIds },
          status: OutboxStatus.PROCESSING,
          lockedAt: now
        }
      });

      return claimedEvents.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        payload: e.payload
      }));
    });
  }

  /**
   * Dispatches claimed events into BullMQ and updates outbox status
   */
  public async processClaimedEvents(
    events: Array<{ id: string; eventType: string; payload: unknown }>
  ): Promise<{ enqueued: number; failed: number }> {
    let enqueued = 0;
    let failed = 0;

    for (const event of events) {
      try {
        if (event.eventType === 'EMAIL_DELIVERY_SCHEDULED') {
          const payload = event.payload as EmailJobPayload;

          if (!payload.deliveryId || !payload.idempotencyKey || !payload.scheduledFor) {
            throw new Error(`Malformed outbox event payload: missing required delivery fields`);
          }

          // Enqueue to BullMQ
          await this.queueManager.enqueueEmail(payload);

          // Update outbox event to ENQUEUED
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: OutboxStatus.ENQUEUED,
              errorMessage: null
            }
          });

          enqueued++;
        } else {
          logger.warn({ eventType: event.eventType, eventId: event.id }, 'Ignored unknown outbox event type');
        }
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown enqueue error';
        logger.error({ eventId: event.id, error: errorMessage }, 'Failed to enqueue outbox event into BullMQ');

        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.FAILED,
            retryCount: { increment: 1 },
            errorMessage
          }
        });
      }
    }

    return { enqueued, failed };
  }

  /**
   * Complete dispatch cycle: Recover stale -> Claim pending -> Enqueue BullMQ
   */
  public async dispatchOutboxBatch(batchSize = 100): Promise<DispatchOutboxResult> {
    const recoveredCount = await this.recoverStaleProcessingEvents();
    const claimed = await this.claimPendingEvents(batchSize);

    if (claimed.length === 0) {
      return {
        claimedCount: 0,
        enqueuedCount: 0,
        failedCount: 0,
        recoveredCount
      };
    }

    const { enqueued, failed } = await this.processClaimedEvents(claimed);

    return {
      claimedCount: claimed.length,
      enqueuedCount: enqueued,
      failedCount: failed,
      recoveredCount
    };
  }
}

export const outboxService = new OutboxService();
