/**
 * Admin Panel API Service
 * Communicates with the FastAPI backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Types
export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'staff' | 'supervisor' | 'admin';
  email?: string;
  is_active: boolean;
  permissions: string[];
  created_at?: string;
  last_login?: string;
}

export interface Session {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'completed' | 'cancelled';
  created_by: string;
  created_at: string;
  completed_at?: string;
  count_lines_count: number;
}

export interface CountLine {
  id: string;
  session_id: string;
  item_code: string;
  item_name: string;
  barcode?: string;
  counted_qty: number;
  system_qty?: number;
  variance?: number;
  counted_by: string;
  scanned_at: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

export interface SystemStats {
  total_users: number;
  active_sessions: number;
  total_count_lines: number;
  total_variances: number;
  avg_variance_percentage: number;
}

export interface VarianceTrendResponse {
  dates: string[];
  variances: number[];
  counts: number[];
}

export interface StaffPerformanceResponse {
  staff: {
    username: string;
    verifications: number;
    accuracy: number;
    avgTime: number;
  }[];
}

export interface HealthStatus {
  status: string;
  database: string;
  sql_server?: string;
  uptime: number;
  version: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API Client
class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from storage
    this.token = localStorage.getItem('admin_token');
    if (this.token) {
      this.setAuthHeader(this.token);
    }

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private setAuthHeader(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Auth
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.client.post('/auth/login', { username, password });
    const { access_token, user } = response.data.data;

    this.token = access_token;
    localStorage.setItem('admin_token', access_token);
    this.setAuthHeader(access_token);

    return { user, token: access_token };
  }

  logout() {
    this.token = null;
    localStorage.removeItem('admin_token');
    delete this.client.defaults.headers.common['Authorization'];
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/auth/me');
    return response.data.data || response.data;
  }

  // Users
  async getUsers(): Promise<User[]> {
    const response = await this.client.get('/auth/users');
    return response.data.data || response.data || [];
  }

  async updateUser(username: string, data: Partial<User>): Promise<User> {
    const response = await this.client.put(`/permissions/users/${username}`, data);
    return response.data.data || response.data;
  }

  async disableUser(username: string): Promise<void> {
    await this.client.post(`/permissions/users/${username}/disable`);
  }

  async enableUser(username: string): Promise<void> {
    await this.client.post(`/permissions/users/${username}/enable`);
  }

  // Sessions
  async getSessions(params?: { status?: string; limit?: number }): Promise<Session[]> {
    const response = await this.client.get('/sessions', { params });
    return response.data.data || response.data || [];
  }

  async getSession(id: string): Promise<Session> {
    const response = await this.client.get(`/sessions/${id}`);
    return response.data.data || response.data;
  }

  // Count Lines
  async getCountLines(sessionId: string): Promise<CountLine[]> {
    const response = await this.client.get(`/sessions/${sessionId}/count-lines`);
    return response.data.data || response.data || [];
  }

  // Analytics
  async getVarianceTrends(params: { days: number }): Promise<VarianceTrendResponse> {
    const response = await this.client.get('/variance/trend', { params });
    return response.data.data || response.data;
  }

  async getStaffPerformance(): Promise<StaffPerformanceResponse> {
    const response = await this.client.get('/metrics/staff-performance');
    return response.data.data || response.data;
  }

  // System
  async getSystemStats(): Promise<SystemStats> {
    const response = await this.client.get('/admin/control/system/stats');
    return response.data.data || response.data;
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const response = await this.client.get('/health/detailed');
    return response.data;
  }

  // Sync
  async triggerSync(): Promise<{ synced_count: number }> {
    const response = await this.client.post('/sync/trigger');
    return response.data.data || response.data;
  }

  async getSyncStatus(): Promise<{ last_sync: string; status: string; items_synced: number }> {
    const response = await this.client.get('/sync/status');
    return response.data.data || response.data;
  }

  // Exports
  async exportData(format: 'csv' | 'json', type: 'sessions' | 'count_lines' | 'variances'): Promise<Blob> {
    const response = await this.client.get(`/exports/${type}`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  }
}

export const api = new ApiClient();
export default api;
