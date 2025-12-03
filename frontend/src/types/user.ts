export interface User {
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
}
