/**
 * Permission constants for Role-Based Access Control (RBAC)
 */
export enum Permission {
  // Inventory
  INVENTORY_VIEW = "inventory.view",
  INVENTORY_EDIT = "inventory.edit",
  INVENTORY_DELETE = "inventory.delete",
  INVENTORY_SYNC = "inventory.sync",

  // Reports
  REPORTS_VIEW = "reports.view",
  REPORTS_EXPORT = "reports.export",
  REPORTS_SCHEDULE = "reports.schedule",

  // Auth/Admin
  USER_VIEW = "user.view",
  USER_MANAGE = "user.manage",
  SYSTEM_CONFIG = "system.config",
  AUDIT_VIEW = "audit.view",
}

/**
 * Role constants
 */
export enum Role {
  ADMIN = "admin",
  SUPERVISOR = "supervisor",
  STAFF = "staff",
}

/**
 * Default permission sets for roles (as a reference)
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.SUPERVISOR]: [
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_EDIT,
    Permission.INVENTORY_SYNC,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.AUDIT_VIEW,
  ],
  [Role.STAFF]: [
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_SYNC,
    Permission.REPORTS_VIEW,
  ],
};
