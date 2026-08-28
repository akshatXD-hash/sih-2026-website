import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AppShell mode="admin" user={user}>{children}</AppShell>;
}
