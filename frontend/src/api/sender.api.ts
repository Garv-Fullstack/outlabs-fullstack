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
  }
};
