import { useAuthStore } from "../store/authStore";
import { Permission, Role } from "../constants/permissions";

/**
 * Custom hook for permission-based access control
 * Provides methods to check if current user has specific permissions
 */
export const usePermission = () => {
  const user = useAuthStore((state) => state.user);

  /**
   * Check if user has a specific permission
   * @param permission - Permission string or enum to check
   * @returns true if user has the permission
   */
  const hasPermission = (permission: Permission | string): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission as string);
  };

  /**
   * Check if user has any of the specified permissions
   * @param permissions - Array of permission strings or enums
   * @returns true if user has at least one permission
   */
  const hasAnyPermission = (permissions: (Permission | string)[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.some((p) => user.permissions?.includes(p as string));
  };

  /**
   * Check if user has all of the specified permissions
   * @param permissions - Array of permission strings or enums
   * @returns true if user has all permissions
   */
  const hasAllPermissions = (permissions: (Permission | string)[]): boolean => {
    if (!user || !user.permissions) return false;
    return permissions.every((p) => user.permissions?.includes(p as string));
  };

  /**
   * Check if user has a specific role
   * @param role - Role to check
   * @returns true if user has the role
   */
  const hasRole = (role: Role | string): boolean => {
    if (!user) return false;
    return user.role === (role as string);
  };

  /**
   * Check if user has any of the specified roles
   * @param roles - Array of role strings or enums
   * @returns true if user has at least one role
   */
  const hasAnyRole = (roles: (Role | string)[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role as Role);
  };

  return {
    permissions: user?.permissions || [],
    role: user?.role || "",
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin: user?.role === Role.ADMIN,
  };
};
