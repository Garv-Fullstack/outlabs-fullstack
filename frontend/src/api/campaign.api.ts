import { apiClient } from './client.js';
import {
  SenderOption,
  ScheduleCampaignPayload,
  CampaignSummary,
  CampaignDetail,
  DeliveryItem,
  Pagination,
  DeliveryStats,
  TimelineDataPoint,
  RecentActivityItem
} from '../types/campaign.types.js';

export const campaignApi = {
  /**
   * Fetches sender accounts configured for the authenticated user
   */
  getSenders: async (): Promise<SenderOption[]> => {
    return apiClient.get<SenderOption[]>('/senders');
  },

  /**
   * Schedules a new campaign with staggered deliveries in PostgreSQL and BullMQ
   */
  scheduleCampaign: async (payload: ScheduleCampaignPayload): Promise<CampaignSummary> => {
    return apiClient.post<CampaignSummary>('/emails/schedule', payload);
  },

  /**
   * Fetches paginated campaigns with aggregate delivery metrics
   */
  getCampaigns: async (page = 1, limit = 20): Promise<{ campaigns: CampaignSummary[]; pagination: Pagination }> => {
    return apiClient.get<{ campaigns: CampaignSummary[]; pagination: Pagination }>(`/campaigns?page=${page}&limit=${limit}`);
  },

  /**
   * Fetches full single campaign details with real deliveries
   */
  getCampaignById: async (id: string): Promise<CampaignDetail> => {
    return apiClient.get<CampaignDetail>(`/campaigns/${id}`);
  },

  /**
   * Fetches scheduled, processing, and delayed deliveries
   */
  getScheduledDeliveries: async (
    page = 1,
    limit = 20,
    senderId?: string
  ): Promise<{ deliveries: DeliveryItem[]; pagination: Pagination }> => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (senderId) query.append('senderId', senderId);
    return apiClient.get<{ deliveries: DeliveryItem[]; pagination: Pagination }>(`/emails/scheduled?${query.toString()}`);
  },

  /**
   * Fetches sent deliveries with Ethereal preview links
   */
  getSentDeliveries: async (
    page = 1,
    limit = 20,
    senderId?: string
  ): Promise<{ deliveries: DeliveryItem[]; pagination: Pagination }> => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (senderId) query.append('senderId', senderId);
    return apiClient.get<{ deliveries: DeliveryItem[]; pagination: Pagination }>(`/emails/sent?${query.toString()}`);
  },

  /**
   * Cancels a scheduled delivery before worker execution
   */
  cancelDelivery: async (deliveryId: string): Promise<{ id: string; status: string }> => {
    return apiClient.post<{ id: string; status: string }>(`/emails/${deliveryId}/cancel`);
  },

  /**
   * Fetches aggregate delivery statistics for dashboard cards
   */
  getStats: async (): Promise<DeliveryStats> => {
    return apiClient.get<DeliveryStats>('/emails/stats');
  },

  /**
   * Fetches real time-series delivery data over selected range (7d, 30d, 90d)
   */
  getTimeline: async (range = '7d'): Promise<TimelineDataPoint[]> => {
    return apiClient.get<TimelineDataPoint[]>(`/emails/timeline?range=${range}`);
  },

  /**
   * Updates an existing campaign
   */
  updateCampaign: async (id: string, payload: {
    subject?: string;
    bodyText?: string;
    bodyHtml?: string | null;
    hourlyLimit?: number;
    delayBetweenEmailsSeconds?: number;
  }): Promise<{ id: string; subject: string; bodyText: string; hourlyLimit: number; delayBetweenEmailsSeconds: number }> => {
    return apiClient.put<{ id: string; subject: string; bodyText: string; hourlyLimit: number; delayBetweenEmailsSeconds: number }>(`/campaigns/${id}`, payload);
  },

  /**
   * Pauses all scheduled deliveries for a campaign
   */
  pauseCampaign: async (id: string): Promise<{ id: string; status: string; pausedCount: number }> => {
    return apiClient.post<{ id: string; status: string; pausedCount: number }>(`/campaigns/${id}/pause`);
  },

  /**
   * Resumes a paused campaign
   */
  resumeCampaign: async (id: string): Promise<{ id: string; status: string; resumedCount: number }> => {
    return apiClient.post<{ id: string; status: string; resumedCount: number }>(`/campaigns/${id}/resume`);
  },

  /**
   * Cancels all pending deliveries for a campaign
   */
  cancelCampaign: async (id: string): Promise<{ id: string; status: string; cancelledCount: number }> => {
    return apiClient.post<{ id: string; status: string; cancelledCount: number }>(`/campaigns/${id}/cancel`);
  },

  /**
   * Deletes a campaign and cleans up queued jobs
   */
  deleteCampaign: async (id: string): Promise<{ id: string; message: string }> => {
    return apiClient.delete<{ id: string; message: string }>(`/campaigns/${id}`);
  },

  /**
   * Retries a failed or cancelled delivery
   */
  retryDelivery: async (deliveryId: string): Promise<{ id: string; status: string; scheduledFor: string }> => {
    return apiClient.post<{ id: string; status: string; scheduledFor: string }>(`/emails/${deliveryId}/retry`);
  },

  /**
   * Deletes an individual delivery record
   */
  deleteDelivery: async (deliveryId: string): Promise<{ id: string; message: string }> => {
    return apiClient.delete<{ id: string; message: string }>(`/emails/${deliveryId}`);
  },

  /**
   * Fetches real recent activity events
   */
  getRecentActivities: async (): Promise<RecentActivityItem[]> => {
    return apiClient.get<RecentActivityItem[]>('/emails/activities');
  },

  /**
   * Fetches live BullMQ queue metrics
   */
  getQueueMetrics: async (): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> => {
    return apiClient.get<{
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: number;
    }>('/queues/metrics');
  }
};
