import { apiClient } from './client.js';
import { SearchResponse } from '../types/campaign.types.js';

export const searchApi = {
  /**
   * Performs full-text email search against Elasticsearch cluster with PostgreSQL fallback
   */
  searchEmails: async (queryText: string, page = 1, limit = 20): Promise<SearchResponse> => {
    const params = new URLSearchParams({
      q: queryText,
      page: String(page),
      limit: String(limit)
    });
    return apiClient.get<SearchResponse>(`/emails/search?${params.toString()}`);
  }
};
