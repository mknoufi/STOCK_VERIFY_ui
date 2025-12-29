import { Platform } from "react-native";

export type UserRole = "staff" | "supervisor" | "admin";

export const getRouteForRole = (role: UserRole): string => {
  switch (role) {
    case "supervisor":
      return "/supervisor/dashboard";
    case "admin":
      // Prefer the web dashboard on web; keep metrics as the default elsewhere
      return Platform.OS === "web" ? "/admin/dashboard-web" : "/admin/metrics";
    case "staff":
      return "/staff/home";
    default:
      return "/welcome";
  }
};

export const isRouteAllowedForRole = (
  route: string,
  role: UserRole,
): boolean => {
  if (route.startsWith("/admin") || route.startsWith("/supervisor")) {
    return role === "admin" || role === "supervisor";
  }
  if (route.startsWith("/staff")) {
    return true; // Supervisors/Admins can technically access staff routes if needed, or restrict if strict
  }
  return true;
};
