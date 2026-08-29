import { apiClient } from './client.js';
import { AuthUser } from '../types/auth.types.js';

export const authApi = {
  /**
   * Fetches currently authenticated user identity from backend session cookie
   */
  getMe: async (): Promise<AuthUser> => {
    return apiClient.get<AuthUser>('/auth/me');
  },

  /**
   * Clears session cookie on backend
   */
  logout: async (): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>('/auth/logout');
  },

  /**
   * Returns backend Google OAuth redirect URL
   */
  getGoogleLoginUrl: (): string => {
    const backendUrl = import.meta.env['VITE_API_URL'] || 'http://localhost:5000/api';
    return `${backendUrl}/auth/google`;
  }
};
