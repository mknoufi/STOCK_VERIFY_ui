import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { Permission, Role } from '../../constants/permissions';

interface PermissionGateProps {
    /**
     * Required permission to show children
     */
    permission?: Permission | string;

    /**
     * Required role to show children
     */
    role?: Role | string;

    /**
     * Show children if user has any of these permissions
     */
    anyOfPermissions?: (Permission | string)[];

    /**
     * Show children if user has any of these roles
     */
    anyOfRoles?: (Role | string)[];

    /**
     * Children to show if requirements are met
     */
    children: React.ReactNode;

    /**
     * Optional fallback to show if requirements are NOT met
     */
    fallback?: React.ReactNode;
}

/**
 * A wrapper component that conditionally renders its children based on
 * the current user's permissions and role.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
    permission,
    role,
    anyOfPermissions,
    anyOfRoles,
    children,
    fallback = null,
}) => {
    const { hasPermission, hasRole, hasAnyPermission, hasAnyRole } = usePermission();

    let hasAccess = true;

    if (permission && !hasPermission(permission)) {
        hasAccess = false;
    }

    if (role && !hasRole(role)) {
        hasAccess = false;
    }

    if (anyOfPermissions && !hasAnyPermission(anyOfPermissions)) {
        hasAccess = false;
    }

    if (anyOfRoles && !hasAnyRole(anyOfRoles)) {
        hasAccess = false;
    }

    return hasAccess ? <>{children}</> : <>{fallback}</>;
};
