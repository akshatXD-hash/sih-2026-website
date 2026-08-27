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
