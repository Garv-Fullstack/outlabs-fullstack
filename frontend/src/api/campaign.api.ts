import { apiClient } from './client.js';
import {
  SenderOption,
  ScheduleCampaignPayload,
  CampaignSummary,
  DeliveryItem,
  Pagination,
  DeliveryStats
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
  }
};
