import { describe, expect, it } from "vitest";

import { ApplicationStatus } from "@/generated/prisma/enums";
import { canTransitionApplication, getAllowedStatusTransitions } from "@/lib/application-status";

describe("application status workflow", () => {
  it("allows the normal officer review path", () => {
    expect(canTransitionApplication(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW)).toBe(true);
    expect(canTransitionApplication(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.APPROVED)).toBe(true);
    expect(canTransitionApplication(ApplicationStatus.APPROVED, ApplicationStatus.DISBURSED)).toBe(true);
  });

  it("blocks skipped and backward transitions", () => {
    expect(canTransitionApplication(ApplicationStatus.SUBMITTED, ApplicationStatus.DISBURSED)).toBe(false);
    expect(getAllowedStatusTransitions(ApplicationStatus.DISBURSED)).toEqual([]);
  });
});
