import { AppShell } from "@/components/app-shell";
import { requireApplicant } from "@/lib/auth/guards";

export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireApplicant();
  return <AppShell mode="applicant" user={user}>{children}</AppShell>;
}
