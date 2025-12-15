const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RequestConfig extends RequestInit {
  requiresAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { requiresAuth = false, ...fetchConfig } = config;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (requiresAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchConfig,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth });
  }

  async post<T>(endpoint: string, data?: unknown, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth,
    });
  }

  async put<T>(endpoint: string, data?: unknown, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      requiresAuth,
    });
  }

  async delete<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', requiresAuth });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
