import { create } from 'zustand';
import { storage } from '../services/asyncStorageService';

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
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  loadStoredAuth: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'auth_user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: (user: User) => {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    set({
      user,
      isAuthenticated: true,
      isLoading: false
    });
  },

  logout: () => {
    storage.removeItem(AUTH_STORAGE_KEY);
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
      if (storedUser) {
        const user = JSON.parse(storedUser) as User;
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
