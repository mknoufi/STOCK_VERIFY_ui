import { create } from 'zustand';
import { storage } from '../services/asyncStorageService';
import apiClient from '../services/httpClient';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'staff' | 'supervisor' | 'admin';
  email?: string;
  is_active: boolean;
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  setUser: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  loadStoredAuth: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'auth_user';
const TOKEN_STORAGE_KEY = 'auth_token';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (username: string, password: string, _rememberMe?: boolean): Promise<boolean> => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/api/auth/login', {
        username,
        password,
      });

      if (response.data.success && response.data.data) {
        const { access_token, user } = response.data.data;
        
        // Store token for subsequent requests
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        await storage.setItem(TOKEN_STORAGE_KEY, access_token);
        await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        
        set({
          user,
          isAuthenticated: true,
          isLoading: false
        });
        return true;
      }
      
      set({ isLoading: false });
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      set({ isLoading: false });
      return false;
    }
  },

  setUser: (user: User) => {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    set({
      user,
      isAuthenticated: true,
      isLoading: false
    });
  },

  logout: () => {
    storage.removeItem(AUTH_STORAGE_KEY);
    storage.removeItem(TOKEN_STORAGE_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const storedUser = await storage.getItem(AUTH_STORAGE_KEY);
      const storedToken = await storage.getItem(TOKEN_STORAGE_KEY);
      
      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser) as User;
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        set({
          user,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
      set({ isLoading: false });
    }
  },
}));
