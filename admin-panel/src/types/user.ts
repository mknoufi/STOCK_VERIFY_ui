// User type definitions for the Admin Panel

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'staff';
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
}
