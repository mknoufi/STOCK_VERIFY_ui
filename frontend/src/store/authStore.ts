import { create } from 'zustand';
import { storage } from './asyncStorageService';

interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'staff' | 'supervisor' | 'admin';
  email?: string;
  is_active: boolean;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: (user: User) => set({
    user,
    isAuthenticated: true,
    isLoading: false
  }),

  logout: () => set({
    user: null,
    isAuthenticated: false,
    isLoading: false
  }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
