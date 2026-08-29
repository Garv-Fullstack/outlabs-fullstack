import { ApiResponse } from '@reachinbox/shared';

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:5000/api';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode: number, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers: HeadersInit = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Send HTTP-only session cookie automatically
    });

    const json = (await response.json().catch(() => null)) as ApiResponse<T> | null;

    if (!response.ok) {
      const errorMessage = json?.error?.message || `Request failed with status ${response.status}`;
      const errorCode = json?.error?.code || 'HTTP_ERROR';
      throw new ApiError(errorMessage, response.status, errorCode, json?.error?.details);
    }

    if (json && json.success && json.data !== undefined) {
      return json.data;
    }

    return (json as unknown) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Network error';
    throw new ApiError(`Network or server connection failed: ${message}`, 0, 'NETWORK_FAILURE');
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { ...options, method: 'DELETE' })
};
