import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/brand-mark";

interface AppShellProps { children: React.ReactNode; user: { name: string; role: string }; mode: "applicant" | "admin"; }

const applicantNav = [
  ["01", "Eligibility", "/eligibility"], ["02", "Schemes", "/schemes"],
  ["03", "Branches", "/branches"], ["04", "AI Assistant", "/assistant"],
  ["05", "Application", "/applications/new"],
] as const;

export function AppShell({ children, user, mode }: AppShellProps) {
  const navigation = mode === "admin" ? ([ ["01", "Lead dashboard", "/admin"], ...(user.role === "ADMIN" || user.role === "REVIEWER" ? [["02", "Branch scheme support", "/admin/branch-support"]] : []) ] as const) : applicantNav;
  const home = mode === "admin" ? "/admin" : "/eligibility";
  return (
    <div className="min-h-screen bg-[#f1f0eb] lg:grid lg:grid-cols-[270px_1fr]">
      <aside className="hidden min-h-screen border-r border-black/20 bg-[#faf9f4] p-7 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <BrandMark href={home} />
        <div className="mt-16"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/35">{mode === "admin" ? "Officer workspace" : "Applicant journey"}</p><nav className="mt-5 border-t border-black/20">
          {navigation.map(([number, label, href]) => <Link className="group flex items-center gap-4 border-b border-black/15 py-4 text-sm font-bold hover:pl-1" href={href} key={href}><span className="font-mono text-[10px] text-black/35">{number}</span><span>{label}</span><span className="ml-auto opacity-0 group-hover:opacity-100">→</span></Link>)}
        </nav></div>
        <div className="mt-auto border-t border-black/20 pt-5"><div className="mb-5 flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-black text-xs font-black text-white">{user.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-black">{user.name}</p><p className="text-[10px] uppercase tracking-[.14em] text-black/45">{user.role.replaceAll("_", " ")}</p></div></div><SignOutButton /></div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-40 border-b border-black/20 bg-[#f1f0eb]/95 backdrop-blur lg:hidden"><div className="flex items-center justify-between px-5 py-4"><BrandMark href={home} /><SignOutButton /></div><nav className="flex overflow-x-auto border-t border-black/15 px-5">{navigation.map(([, label, href]) => <Link className="shrink-0 border-r border-black/15 px-4 py-3 text-xs font-black first:border-l" href={href} key={href}>{label}</Link>)}</nav></header>
        <main className="paper-grid min-h-screen px-5 py-9 sm:px-8 lg:px-12 lg:py-12 xl:px-16">{children}</main>
      </div>
    </div>
  );
}
