import { useAuthStore } from '../store/authStore';

/**
 * Custom hook for permission-based access control
 * Provides methods to check if current user has specific permissions
 */
export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);

  /**
   * Check if user has a specific permission
   * @param permission - Permission string to check (e.g., 'export.schedule')
   * @returns true if user has the permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  /**
   * Check if user has any of the specified permissions
   * @param permissions - Array of permission strings
   * @returns true if user has at least one permission
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.some(p => user.permissions.includes(p));
  };

  /**
   * Check if user has all of the specified permissions
   * @param permissions - Array of permission strings
   * @returns true if user has all permissions
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.every(p => user.permissions.includes(p));
  };

  /**
   * Check if user has a specific role
   * @param role - Role to check ('admin', 'supervisor', 'staff')
   * @returns true if user has the role
   */
  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.role === role;
  };

  /**
   * Check if user has any of the specified roles
   * @param roles - Array of role strings
   * @returns true if user has at least one role
   */
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return {
    permissions: user?.permissions || [],
    role: user?.role || '',
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  };
};
