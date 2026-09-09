import { expect, it } from "vitest";
import { loginDestination } from "@/lib/auth/roles";

it.each(["CHANNEL_PARTNER", "REVIEWER", "ADMIN"])("routes %s to the officer dashboard even with an applicant callback", role => {
  expect(loginDestination(role, null)).toBe("/admin");
  expect(loginDestination(role, "/eligibility")).toBe("/admin");
});
it("keeps permitted deep links and applicant routing", () => {
  expect(loginDestination("APPLICANT", null)).toBe("/eligibility");
  expect(loginDestination("APPLICANT", "/schemes?applicationId=123")).toBe("/schemes?applicationId=123");
  expect(loginDestination("REVIEWER", "/admin/applications/123")).toBe("/admin/applications/123");
  expect(loginDestination("APPLICANT", "/admin")).toBe("/eligibility");
  expect(loginDestination("CHANNEL_PARTNER", "/admin/branch-support")).toBe("/admin");
});
it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/login", "/administrator"])("rejects unsuitable redirect %s", next => {
  expect(loginDestination("ADMIN", next)).toBe("/admin");
});
