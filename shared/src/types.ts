import { EmailStatus, OutboxStatus, SlackStatus, UserRole } from './enums.js';

export interface UserDTO {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface SenderAccountDTO {
  id: string;
  userId: string;
  email: string;
  name: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  hourlyLimit: number;
  minDelaySeconds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaignDTO {
  id: string;
  userId: string;
  senderId: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  totalRecipients: number;
  scheduledStartTime: string;
  delayBetweenEmailsSeconds: number;
  hourlyLimit: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailDeliveryDTO {
  id: string;
  campaignId: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  recipientName: string | null;
  idempotencyKey: string;
  bullmqJobId: string | null;
  status: EmailStatus;
  scheduledFor: string;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  etherealMessageId: string | null;
  etherealPreviewUrl: string | null;
  indexedInEs: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxEventDTO {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  errorMessage: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlackIntegrationDTO {
  id: string;
  userId: string;
  slackTeamId: string;
  slackTeamName: string | null;
  slackChannelId: string;
  slackChannelName: string | null;
  incomingWebhookUrl: string | null;
  status: SlackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptimeSeconds: number;
  services: {
    database: {
      status: 'up' | 'down';
      latencyMs: number | null;
      error?: string;
    };
    redis: {
      status: 'up' | 'down';
      latencyMs: number | null;
      error?: string;
    };
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}
