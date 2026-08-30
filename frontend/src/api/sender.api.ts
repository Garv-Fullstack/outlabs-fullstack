import { apiClient } from './client.js';
import { SenderOption } from '../types/campaign.types.js';
import { CreateSenderPayload } from '../types/settings.types.js';

export const senderApi = {
  /**
   * Fetches all sender accounts configured for the authenticated user
   */
  getSenders: async (): Promise<SenderOption[]> => {
    return apiClient.get<SenderOption[]>('/senders');
  },

  /**
   * Creates a custom SMTP sender or auto-provisions an Ethereal test mailbox
   */
  createSender: async (payload: CreateSenderPayload): Promise<SenderOption> => {
    return apiClient.post<SenderOption>('/senders', payload);
  },

  /**
   * Updates an existing sender account
   */
  updateSender: async (id: string, payload: Partial<CreateSenderPayload>): Promise<SenderOption> => {
    return apiClient.put<SenderOption>(`/senders/${id}`, payload);
  },

  /**
   * Toggles active / inactive status of a sender
   */
  toggleSenderStatus: async (id: string): Promise<SenderOption> => {
    return apiClient.patch<SenderOption>(`/senders/${id}/status`, {});
  },

  /**
   * Deletes a sender account after queue safety check
   */
  deleteSender: async (id: string): Promise<{ id: string; message: string }> => {
    return apiClient.delete<{ id: string; message: string }>(`/senders/${id}`);
  }
};
