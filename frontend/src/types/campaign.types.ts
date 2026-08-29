import { EmailStatus } from '@reachinbox/shared';

export interface SenderOption {
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

export interface RecipientInput {
  email: string;
  name?: string | null;
}

export type RecipientStatus = 'VALID' | 'INVALID_EMAIL' | 'DUPLICATE' | 'MISSING_EMAIL';

export interface RecipientRow {
  rowNumber: number;
  email: string;
  name: string;
  status: RecipientStatus;
  errorReason?: string;
}

export interface CsvParseSummary {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  rows: RecipientRow[];
  validRecipients: RecipientInput[];
}

export interface ScheduleCampaignPayload {
  senderId: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  recipients: RecipientInput[];
  scheduledStartTime: string;
  delayBetweenEmailsSeconds: number;
  hourlyLimit: number;
  idempotencyKey: string;
}

export interface CampaignStats {
  total: number;
  scheduled: number;
  processing: number;
  sent: number;
  failed: number;
  cancelled: number;
  rateLimited: number;
}

export interface CampaignSummary {
  id: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  totalRecipients: number;
  scheduledStartTime: string;
  delayBetweenEmailsSeconds: number;
  hourlyLimit: number;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  stats: CampaignStats;
}

export interface DeliveryItem {
  id: string;
  campaignId: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  recipientName?: string | null;
  idempotencyKey: string;
  bullmqJobId?: string | null;
  status: EmailStatus;
  scheduledFor: string;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  etherealMessageId?: string | null;
  etherealPreviewUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: { id: string; email: string; name: string };
  campaign?: { id: string; subject: string };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DeliveryStats {
  totalDeliveries: number;
  scheduledCount: number;
  processingCount: number;
  sentCount: number;
  failedCount: number;
  cancelledCount: number;
  rateLimitedCount: number;
}

export interface SearchResultItem {
  id: string;
  campaignId: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  status: string;
  sentAt?: string | null;
  etherealPreviewUrl?: string | null;
  score?: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  source: 'elasticsearch' | 'postgres';
}
