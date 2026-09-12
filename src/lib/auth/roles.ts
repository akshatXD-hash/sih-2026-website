import { UserRole, type UserRole as UserRoleValue } from "@/generated/prisma/enums";

export const ADMIN_ROLES: readonly UserRoleValue[] = [
  UserRole.ADMIN,
  UserRole.CHANNEL_PARTNER,
  UserRole.REVIEWER,
];

export function hasAdminAccess(role: string | null | undefined): boolean {
  return ADMIN_ROLES.some((adminRole) => adminRole === role);
}

export function hasApplicantAccess(role: string | null | undefined): boolean {
  return role === UserRole.APPLICANT;
}

export function workspacePath(role: string | null | undefined): string {
  if (role === "ASHA_WORKER") return "/asha-worker";
  return hasAdminAccess(role) ? "/admin" : hasApplicantAccess(role) ? "/eligibility" : "/unauthorized";
}

export function loginDestination(role: string | null | undefined, next: unknown): string {
  const fallback = workspacePath(role);
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  try {
    const url = new URL(next, "https://local.invalid");
    if (url.origin !== "https://local.invalid") return fallback;
    const routes = role === "ASHA_WORKER" ? ["/asha-worker"] : hasAdminAccess(role) ? ["/admin"] : hasApplicantAccess(role) ? ["/eligibility", "/schemes", "/branches", "/applications", "/assistant"] : [];
    if (!routes.some(route => url.pathname === route || url.pathname.startsWith(route + "/"))) return fallback;
    if (role === UserRole.CHANNEL_PARTNER && (url.pathname === "/admin/branch-support" || url.pathname.startsWith("/admin/branch-support/"))) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
