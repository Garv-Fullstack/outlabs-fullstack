import { Worker } from 'bullmq';
import { getRedisOptions } from '../repositories/redis.js';
import { EMAIL_DELIVERY_QUEUE_NAME } from '../queues/queue.constants.js';
import { EmailJobPayload } from '../queues/queue.types.js';
import { deliveryProcessor, DeliveryProcessor } from './delivery.worker.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Redis } from 'ioredis';

export class WorkerLifecycleManager {
  private worker: Worker<EmailJobPayload> | null = null;
  private processor: DeliveryProcessor;
  private customRedisClient: Redis | null = null;

  constructor(customProcessor?: DeliveryProcessor, customRedisClient?: Redis) {
    this.processor = customProcessor || deliveryProcessor;
    this.customRedisClient = customRedisClient || null;
  }

  public getProcessor(): DeliveryProcessor {
    return this.processor;
  }

  public startWorker(concurrency = config.WORKER_CONCURRENCY): Worker<EmailJobPayload> {
    if (this.worker) {
      return this.worker;
    }

    const connection = this.customRedisClient || getRedisOptions();

    this.worker = new Worker<EmailJobPayload>(
      EMAIL_DELIVERY_QUEUE_NAME,
      async (job) => {
        return await this.processor.processDeliveryJob(job);
      },
      {
        connection,
        concurrency,
        lockDuration: 30000,
        stalledInterval: 30000
      }
    );

    this.worker.on('ready', () => {
      logger.info({ concurrency }, 'BullMQ Delivery Worker is ready and accepting jobs');
    });

    this.worker.on('completed', (job, result) => {
      logger.info({ jobId: job.id, result }, 'BullMQ Job completed successfully');
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'BullMQ Job failed execution');
    });

    this.worker.on('error', (err) => {
      logger.error({ err: err.message }, 'BullMQ Worker internal error');
    });

    this.worker.on('stalled', (jobId) => {
      logger.warn({ jobId }, 'BullMQ Job detected as stalled, re-locking');
    });

    return this.worker;
  }

  public async stopWorker(): Promise<void> {
    if (this.worker) {
      logger.info('Stopping BullMQ Delivery Worker gracefully...');
      await this.worker.close(false); // Wait for current active jobs to finish
      this.worker = null;
      logger.info('BullMQ Delivery Worker stopped');
    }
  }
}

export const workerLifecycle = new WorkerLifecycleManager();
