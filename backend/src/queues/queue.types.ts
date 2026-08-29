export interface EmailJobPayload {
  deliveryId: string;
  campaignId: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  recipientName?: string | null;
  scheduledFor: string; // ISO string
  idempotencyKey: string;
}

export interface EnqueueResult {
  jobId: string;
  deliveryId: string;
  delayMs: number;
  enqueuedAt: string;
}
