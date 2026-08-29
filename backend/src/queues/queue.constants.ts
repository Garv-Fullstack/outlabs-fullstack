export const EMAIL_DELIVERY_QUEUE_NAME = 'email-delivery-queue';
export const EMAIL_DELIVERY_DLQ_NAME = 'email-delivery-dlq';
export const SEND_EMAIL_JOB_NAME = 'send-email';

export const QUEUE_DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 5000 // 5s, 10s, 20s, 40s...
  },
  removeOnComplete: {
    age: 86400, // keep completed jobs for 24 hours for audit/Bull Board
    count: 10000
  },
  removeOnFail: {
    age: 604800, // keep failed jobs for 7 days
    count: 5000
  }
};
