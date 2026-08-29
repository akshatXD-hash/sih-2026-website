import { ApplicationStatus } from "@/generated/prisma/enums";

const allowedTransitions: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  [ApplicationStatus.SUBMITTED]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED],
  [ApplicationStatus.UNDER_REVIEW]: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
  [ApplicationStatus.APPROVED]: [ApplicationStatus.DISBURSED],
  [ApplicationStatus.REJECTED]: [ApplicationStatus.UNDER_REVIEW],
};

export function getAllowedStatusTransitions(status: ApplicationStatus) {
  return allowedTransitions[status] ?? [];
}

export function canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus) {
  return getAllowedStatusTransitions(from).includes(to);
}
