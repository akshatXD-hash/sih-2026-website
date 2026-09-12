import Link from "next/link";
import { requireAshaWorker } from "@/lib/asha/access";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { T } from "@/components/language/LanguageProvider";

export default async function AshaLayout({ children }: { children: React.ReactNode }) {
  const worker = await requireAshaWorker();
  return <div className="min-h-screen bg-[#F7F3E9]">
    <header className="border-b border-[#1E3A2B]/20 bg-[#FAF6EE] px-5 py-4"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
      <Link className="text-xl font-bold text-[#1E3A2B]" href="/asha-worker">Kaarva · <T>ASHA workspace</T></Link>
      <div className="flex items-center gap-4"><span className="text-sm">{worker.name}</span><SignOutButton /></div>
    </div><nav className="mx-auto mt-4 flex max-w-6xl flex-wrap gap-5 text-sm font-semibold text-[#1E3A2B]">
      <Link href="/asha-worker"><T>My applications</T></Link><Link href="/asha-worker/new"><T>Help a villager</T></Link><Link href="/asha-worker?filter=attention"><T>Needs attention</T></Link><Link href="/asha-worker?filter=followups"><T>Follow-ups</T></Link><Link href="/language"><T>Language</T></Link>
    </nav></header>
    <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
  </div>;
}
