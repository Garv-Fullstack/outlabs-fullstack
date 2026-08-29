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

    // Deduplicate recipients by lowercase email
    const uniqueRecipients = new Map<string, CreateCampaignRecipient>();
    for (const r of recipients) {
      const emailNormalized = r.email.toLowerCase().trim();
      if (!uniqueRecipients.has(emailNormalized)) {
        uniqueRecipients.set(emailNormalized, { email: emailNormalized, name: r.name });
      }
    }

    const recipientList = Array.from(uniqueRecipients.values());
    const totalRecipients = recipientList.length;

    logger.info({
      userId,
      senderId,
      totalRecipients,
      idempotencyKey,
      scheduledStartTime
    }, 'Initiating transactional campaign creation');

    // Execute atomic PostgreSQL transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify Sender Account ownership and status
      const sender = await tx.senderAccount.findFirst({
        where: {
          id: senderId,
          userId,
          isActive: true
        }
      });

      if (!sender) {
        throw new NotFoundError(`Active sender account ${senderId} not found for this user`);
      }

      // 2. Check for duplicate campaign idempotency key
      const existingCampaign = await tx.emailCampaign.findUnique({
        where: { idempotencyKey }
      });

      if (existingCampaign) {
        throw new ConflictError(`Campaign with idempotency key ${idempotencyKey} already exists`);
      }

      // 3. Create Campaign record
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
          idempotencyKey
        }
      });

      const campaignId = campaign.id;
      const startMs = startTime.getTime();

      let firstScheduledFor = '';
      let lastScheduledFor = '';

      // 4. Build Delivery and Outbox rows
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
}

export const campaignService = new CampaignService();
