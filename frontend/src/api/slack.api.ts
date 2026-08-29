import { apiClient } from './client.js';
import { SlackStatusResponse } from '../types/settings.types.js';

export const slackApi = {
  /**
   * Fetches current Slack connection status for the authenticated user
   */
  getStatus: async (): Promise<SlackStatusResponse> => {
    return apiClient.get<SlackStatusResponse>('/slack/status');
  },

  /**
   * Disconnects and revokes user Slack integration
   */
  disconnect: async (): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>('/slack/disconnect');
  },

  /**
   * Returns OAuth authorization redirection URL for connecting Slack
   */
  getConnectUrl: (): string => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return `${apiUrl}/slack/connect`;
  }
};
