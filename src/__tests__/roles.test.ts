import { describe, expect, it } from "vitest";

import { UserRole } from "@/generated/prisma/enums";
import { hasAdminAccess, hasApplicantAccess } from "@/lib/auth/roles";

describe("role access", () => {
  it.each([
    UserRole.ADMIN,
    UserRole.CHANNEL_PARTNER,
    UserRole.REVIEWER,
  ])("allows %s into the officer workspace", (role) => {
    expect(hasAdminAccess(role)).toBe(true);
  });

  it("does not allow applicants into the officer workspace", () => {
    expect(hasAdminAccess(UserRole.APPLICANT)).toBe(false);
  });

  it("keeps applicant routes applicant-only", () => {
    expect(hasApplicantAccess(UserRole.APPLICANT)).toBe(true);
    expect(hasApplicantAccess(UserRole.ADMIN)).toBe(false);
  });
});
