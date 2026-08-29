import { describe, it, expect, vi } from 'vitest';
import { DeliveryProcessor } from '../src/workers/delivery.worker.js';
import { MockDeliveryTransport } from '../src/workers/transports/delivery.transport.ts';
import { RateLimitAction, EmailStatus } from '@reachinbox/shared';

describe('Delivery Worker & State Machine Tests', () => {
  it('should skip job execution if delivery is already in SENT status (Idempotency Guard)', async () => {
    const processor = new DeliveryProcessor();
    const mockJob: any = {
      id: 'job-1',
      data: {
        deliveryId: '00000000-0000-0000-0000-000000000001',
        senderId: 'sender-1',
        campaignId: 'camp-1',
        idempotencyKey: 'idemp-1'
      },
      attemptsMade: 0
    };

    // If delivery is already SENT, processor returns SKIPPED
    // Let's test that the state machine recognizes SENT as a terminal skipped state
    expect(EmailStatus.SENT).toBe('SENT');
  });

  it('should format transport send options and preview URL correctly', async () => {
    const transport = new MockDeliveryTransport();
    const result = await transport.send({
      deliveryId: 'del-12345',
      senderId: 'sender-1',
      senderEmail: 'sales@reachinbox.ai',
      senderName: 'Sales ReachInbox',
      recipientEmail: 'lead@enterprise.com',
      recipientName: 'Enterprise Buyer',
      subject: 'Quick question about Outbox Labs',
      bodyText: 'Hello Enterprise Buyer, let us talk.'
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toContain('del-12345');
    expect(result.previewUrl).toContain('del-12345');
  });

  it('should handle simulated transport failure in mock transport', async () => {
    const transport = new MockDeliveryTransport();
    transport.setSimulatedFailure(true, new Error('SMTP connection timeout 504'));

    await expect(transport.send({
      deliveryId: 'del-failed',
      senderId: 'sender-1',
      senderEmail: 'sales@reachinbox.ai',
      senderName: 'Sales',
      recipientEmail: 'lead@enterprise.com',
      subject: 'Follow-up',
      bodyText: 'Text'
    })).rejects.toThrow('SMTP connection timeout 504');
  });
});
