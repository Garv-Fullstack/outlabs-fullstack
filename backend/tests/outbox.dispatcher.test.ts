import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutboxService } from '../src/services/outbox.service.js';
import { prisma } from '../src/repositories/prisma.js';

describe('Transactional Outbox Dispatcher Tests', () => {
  beforeEach(() => {
    vi.spyOn(prisma.outboxEvent, 'update').mockResolvedValue({} as any);
  });
  it('should process claimed events and transition to ENQUEUED on queue success', async () => {
    const mockQueueManager: any = {
      enqueueEmail: vi.fn().mockResolvedValue({ jobId: 'email:test-job-id', deliveryId: 'del-1' })
    };

    const outbox = new OutboxService(mockQueueManager);

    const mockEvents = [
      {
        id: 'outbox-event-1',
        eventType: 'EMAIL_DELIVERY_SCHEDULED',
        payload: {
          deliveryId: 'del-1',
          campaignId: 'camp-1',
          userId: 'user-1',
          senderId: 'sender-1',
          recipientEmail: 'lead@target.com',
          scheduledFor: new Date().toISOString(),
          idempotencyKey: 'idemp-key-1'
        }
      }
    ];

    // Spy on prisma
    const { enqueued, failed } = await outbox.processClaimedEvents(mockEvents);

    expect(mockQueueManager.enqueueEmail).toHaveBeenCalledTimes(1);
    expect(enqueued).toBe(1);
    expect(failed).toBe(0);
  });

  it('should handle enqueue errors gracefully and increment failed counter', async () => {
    const mockQueueManager: any = {
      enqueueEmail: vi.fn().mockRejectedValue(new Error('Redis connection drop'))
    };

    const outbox = new OutboxService(mockQueueManager);

    const mockEvents = [
      {
        id: 'outbox-event-2',
        eventType: 'EMAIL_DELIVERY_SCHEDULED',
        payload: {
          deliveryId: 'del-2',
          campaignId: 'camp-1',
          userId: 'user-1',
          senderId: 'sender-1',
          recipientEmail: 'lead2@target.com',
          scheduledFor: new Date().toISOString(),
          idempotencyKey: 'idemp-key-2'
        }
      }
    ];

    const { enqueued, failed } = await outbox.processClaimedEvents(mockEvents);

    expect(mockQueueManager.enqueueEmail).toHaveBeenCalledTimes(1);
    expect(enqueued).toBe(0);
    expect(failed).toBe(1);
  });

  it('should reject malformed outbox event payloads', async () => {
    const mockQueueManager: any = {
      enqueueEmail: vi.fn()
    };

    const outbox = new OutboxService(mockQueueManager);

    const malformedEvents = [
      {
        id: 'outbox-event-3',
        eventType: 'EMAIL_DELIVERY_SCHEDULED',
        payload: {
          // Missing required deliveryId and idempotencyKey
          recipientEmail: 'incomplete@target.com'
        }
      }
    ];

    const { enqueued, failed } = await outbox.processClaimedEvents(malformedEvents);
    expect(enqueued).toBe(0);
    expect(failed).toBe(1);
  });
});
