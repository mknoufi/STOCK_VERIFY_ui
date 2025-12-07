/**
 * API Service Layer
 * Centralized HTTP client for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

interface SystemStats {
  total_services: number;
  running_services: number;
  total_users: number;
  total_sessions: number;
  active_sessions: number;
  timestamp: string;
}

interface VerificationRecord {
  _id: string;
  item_code: string;
  item_name: string;
  system_qty: number;
  verified_qty: number;
  damaged_qty?: number;
  variance: number;
  verified_by: string;
  verified_at: string;
  category: string;
  subcategory: string;
  warehouse: string;
  session_id?: string;
  // Purchase-related fields
  last_purchase_price?: number;
  gst_percentage?: number;
  hsn_code?: string;
  last_purchase_type?: string;
  supplier_name?: string;
  last_purchase_qty?: number;
  last_purchase_date?: string;
  voucher_number?: string;
}

interface InventoryItem {
  _id?: string;
  item_code: string;
  item_name: string;
  barcode: string;
  stock_qty: number;
  mrp: number;
  category?: string;
  subcategory?: string;
  warehouse?: string;
  floor?: string;
  rack?: string;
  uom_code?: string;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  // Purchase fields
  last_purchase_price?: number;
  gst_percentage?: number;
  hsn_code?: string;
  last_purchase_type?: string;
  supplier_name?: string;
  last_purchase_qty?: number;
  last_purchase_date?: string;
  voucher_number?: string;
  last_synced?: string;
}

interface User {
  _id: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface Category {
  name: string;
  subcategories: string[];
  item_count: number;
}

interface CategoriesResponse {
  categories: Category[];
  total_categories: number;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      if (response.status === 401) {
        // Token expired, clear auth state
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // ==================== Auth ====================

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      localStorage.setItem('auth_token', response.data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(response.data.user));
    }

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<User>('/api/auth/me');
    return response.data;
  }

  // ==================== Dashboard / Stats ====================

  async getSystemStats(): Promise<SystemStats> {
    const response = await this.request<SystemStats>('/api/admin/control/system/stats');
    return response.data;
  }

  async getServicesStatus(): Promise<Record<string, { running: boolean; port?: number; url?: string }>> {
    const response = await this.request<Record<string, unknown>>('/api/admin/control/services/status');
    return response.data as Record<string, { running: boolean; port?: number; url?: string }>;
  }

  // ==================== Verifications ====================

  async getVerifications(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ items: VerificationRecord[]; total: number; page: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.status) queryParams.set('status_filter', params.status);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.startDate) queryParams.set('start_date', params.startDate);
    if (params?.endDate) queryParams.set('end_date', params.endDate);

    const endpoint = `/api/admin/control/verifications?${queryParams.toString()}`;
    const response = await this.request<{ items: VerificationRecord[]; total: number; page: number; limit: number }>(endpoint);
    return response.data;
  }

  async getVariances(params?: {
    page?: number;
    limit?: number;
  }): Promise<{ items: VerificationRecord[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));

    const endpoint = `/api/admin/control/variances?${queryParams.toString()}`;
    const response = await this.request<{ items: VerificationRecord[]; total: number }>(endpoint);
    return response.data;
  }

  // ==================== Inventory Items ====================

  async getInventoryItems(params?: {
    page?: number;
    limit?: number;
    category?: string;
    warehouse?: string;
    search?: string;
    verified?: boolean;
  }): Promise<{ items: InventoryItem[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.category) queryParams.set('category', params.category);
    if (params?.warehouse) queryParams.set('warehouse', params.warehouse);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.verified !== undefined) queryParams.set('verified', String(params.verified));

    const endpoint = `/api/v2/erp/items?${queryParams.toString()}`;
    const response = await this.request<{ items: InventoryItem[]; total: number }>(endpoint);
    return response.data;
  }

  async getItemByCode(itemCode: string): Promise<InventoryItem> {
    const response = await this.request<InventoryItem>(`/api/v2/erp/items/${encodeURIComponent(itemCode)}`);
    return response.data;
  }

  async exportInventory(format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const endpoint = `/api/admin/control/reports/generate?report_id=items_inventory&format=${format}`;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return response.blob();
  }

  // ==================== Categories ====================

  async getCategories(): Promise<CategoriesResponse> {
    const response = await this.request<CategoriesResponse>('/api/erp/categories');
    return response.data;
  }

  async getSubcategories(category: string): Promise<{ category: string; subcategories: string[]; count: number }> {
    const response = await this.request<{ category: string; subcategories: string[]; count: number }>(
      `/api/erp/subcategories/${encodeURIComponent(category)}`
    );
    return response.data;
  }

  // ==================== Users ====================

  async getUsers(params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }): Promise<{ users: User[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.role) queryParams.set('role', params.role);
    if (params?.search) queryParams.set('search', params.search);

    const endpoint = `/api/admin/control/users?${queryParams.toString()}`;
    const response = await this.request<{ users: User[]; total: number }>(endpoint);
    return response.data;
  }

  async createUser(userData: {
    username: string;
    password: string;
    role: string;
  }): Promise<User> {
    const response = await this.request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.data;
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const response = await this.request<User>(`/api/auth/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(`/api/auth/users/${userId}`, { method: 'DELETE' });
  }

  // ==================== Reports ====================

  async getAvailableReports(): Promise<{
    reports: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
    }>;
  }> {
    const response = await this.request<{
      reports: Array<{
        id: string;
        name: string;
        description: string;
        category: string;
      }>;
    }>('/api/admin/control/reports/available');
    return response.data;
  }

  async generateReport(params: {
    reportId: string;
    format?: 'json' | 'csv' | 'excel';
    startDate?: string;
    endDate?: string;
  }): Promise<Blob | Record<string, unknown>> {
    const queryParams = new URLSearchParams();
    queryParams.set('report_id', params.reportId);
    queryParams.set('format', params.format || 'json');
    if (params.startDate) queryParams.set('start_date', params.startDate);
    if (params.endDate) queryParams.set('end_date', params.endDate);

    const endpoint = `/api/admin/control/reports/generate?${queryParams.toString()}`;

    if (params.format === 'csv' || params.format === 'excel') {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      return response.blob();
    }

    const response = await this.request<Record<string, unknown>>(endpoint, { method: 'POST' });
    return response.data;
  }

  async getScheduledReports(): Promise<Array<{ id: string; name: string; schedule: string; lastRun?: string }>> {
    const response = await this.request<Array<{ id: string; name: string; schedule: string; lastRun?: string }>>('/api/reports/scheduled');
    return response.data;
  }

  // ==================== Analytics ====================

  async getVarianceTrends(params?: {
    days?: number;
    warehouse?: string;
  }): Promise<{ dates: string[]; variances: number[]; counts: number[] }> {
    const queryParams = new URLSearchParams();
    if (params?.days) queryParams.set('days', String(params.days));
    if (params?.warehouse) queryParams.set('warehouse', params.warehouse);

    const endpoint = `/api/analytics/variance-trends?${queryParams.toString()}`;
    const response = await this.request<{ dates: string[]; variances: number[]; counts: number[] }>(endpoint);
    return response.data;
  }

  async getStaffPerformance(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{ username: string; verifications: number; accuracy: number; avgTime: number }>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('start_date', params.startDate);
    if (params?.endDate) queryParams.set('end_date', params.endDate);

    const endpoint = `/api/analytics/staff-performance?${queryParams.toString()}`;
    const response = await this.request<Array<{ username: string; verifications: number; accuracy: number; avgTime: number }>>(endpoint);
    return response.data;
  }

  // ==================== Settings ====================

  async getSettings(): Promise<Record<string, unknown>> {
    const response = await this.request<Record<string, unknown>>('/api/admin/control/sql-server/config');
    return response.data;
  }

  async updateSettings(settings: Record<string, unknown>): Promise<void> {
    await this.request('/api/admin/control/sql-server/config', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }
}

// Singleton instance
export const api = new ApiService();

// Export types
export type {
  ApiResponse,
  LoginCredentials,
  LoginResponse,
  SystemStats,
  VerificationRecord,
  InventoryItem,
  User,
  Category,
  CategoriesResponse,
};
