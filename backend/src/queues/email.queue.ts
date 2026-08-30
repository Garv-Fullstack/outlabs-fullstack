import { Queue, JobsOptions } from 'bullmq';
import { getRedisOptions } from '../repositories/redis.js';
import { EMAIL_DELIVERY_QUEUE_NAME, QUEUE_DEFAULT_JOB_OPTIONS, SEND_EMAIL_JOB_NAME } from './queue.constants.js';
import { EmailJobPayload, EnqueueResult } from './queue.types.js';
import { logger } from '../utils/logger.js';
import { Redis } from 'ioredis';

export class EmailDeliveryQueueManager {
  private queue: Queue<EmailJobPayload> | null = null;
  private customRedisClient: Redis | null = null;

  constructor(customRedisClient?: Redis) {
    if (customRedisClient) {
      this.customRedisClient = customRedisClient;
    }
  }

  public getQueue(): Queue<EmailJobPayload> {
    if (!this.queue) {
      const connection = this.customRedisClient || getRedisOptions();
      this.queue = new Queue<EmailJobPayload>(EMAIL_DELIVERY_QUEUE_NAME, {
        connection,
        defaultJobOptions: QUEUE_DEFAULT_JOB_OPTIONS
      });

      this.queue.on('error', (err) => {
        logger.error({ err: err.message }, 'BullMQ email queue error');
      });
    }

    return this.queue;
  }

  /**
   * Generates a deterministic BullMQ job ID based on delivery idempotency key
   */
  public static generateJobId(idempotencyKey: string): string {
    const sanitized = idempotencyKey.replace(/:/g, '_');
    return `email_${sanitized}`;
  }

  /**
   * Computes millisecond delay until target scheduled time
   */
  public static calculateDelay(scheduledForIso: string, referenceTimeMs: number = Date.now()): number {
    const targetMs = new Date(scheduledForIso).getTime();
    if (isNaN(targetMs)) {
      throw new Error(`Invalid scheduled date ISO string: ${scheduledForIso}`);
    }
    return Math.max(0, targetMs - referenceTimeMs);
  }

  /**
   * Enqueues an individual email delivery job idempotently
   */
  public async enqueueEmail(payload: EmailJobPayload, customDelayMs?: number): Promise<EnqueueResult> {
    const queue = this.getQueue();
    const jobId = EmailDeliveryQueueManager.generateJobId(payload.idempotencyKey);
    const delayMs = customDelayMs !== undefined 
      ? customDelayMs 
      : EmailDeliveryQueueManager.calculateDelay(payload.scheduledFor);

    const jobOptions: JobsOptions = {
      jobId,
      delay: delayMs
    };

    await queue.add(SEND_EMAIL_JOB_NAME, payload, jobOptions);

    logger.info({
      jobId,
      deliveryId: payload.deliveryId,
      campaignId: payload.campaignId,
      recipientEmail: payload.recipientEmail,
      delayMs
    }, 'Email delivery job enqueued in BullMQ');

    return {
      jobId,
      deliveryId: payload.deliveryId,
      delayMs,
      enqueuedAt: new Date().toISOString()
    };
  }

  /**
   * Enqueues a batch of email delivery jobs using non-blocking addBulk
   */
  public async enqueueEmailBatch(payloads: EmailJobPayload[]): Promise<EnqueueResult[]> {
    if (payloads.length === 0) return [];

    const queue = this.getQueue();
    const now = Date.now();

    const jobs = payloads.map((payload) => {
      const jobId = EmailDeliveryQueueManager.generateJobId(payload.idempotencyKey);
      const delayMs = EmailDeliveryQueueManager.calculateDelay(payload.scheduledFor, now);
      return {
        name: SEND_EMAIL_JOB_NAME,
        data: payload,
        opts: {
          jobId,
          delay: delayMs
        }
      };
    });

    await queue.addBulk(jobs);

    return jobs.map((j) => ({
      jobId: j.opts.jobId,
      deliveryId: j.data.deliveryId,
      delayMs: j.opts.delay,
      enqueuedAt: new Date(now).toISOString()
    }));
  }

  /**
   * Removes a scheduled job from the queue (Cancellation)
   */
  public async removeJob(idempotencyKey: string): Promise<boolean> {
    const queue = this.getQueue();
    const jobId = EmailDeliveryQueueManager.generateJobId(idempotencyKey);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info({ jobId, idempotencyKey }, 'BullMQ job removed');
      return true;
    }
    return false;
  }

  /**
   * Closes the queue connection gracefully
   */
  public async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}

export const emailQueueManager = new EmailDeliveryQueueManager();
