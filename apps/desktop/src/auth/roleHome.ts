import type { UserRole } from "../types/auth";

export function getRoleHome(role: UserRole): string {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  return "/cashier/dashboard";
}
