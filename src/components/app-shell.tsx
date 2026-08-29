import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";

interface AppShellProps {
  children: React.ReactNode;
  user: { name: string; role: string };
  mode: "applicant" | "admin";
}

const applicantNav = [
  ["Eligibility", "/eligibility"],
  ["Schemes", "/schemes"],
  ["Branches", "/branches"],
  ["AI Assistant", "/assistant"],
  ["Application & Documents", "/applications/new"],
] as const;

export function AppShell({ children, user, mode }: AppShellProps) {
  const navigation = mode === "admin" ? ([ ["Lead dashboard", "/admin"] ] as const) : applicantNav;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="page-shell flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-8">
            <Link className="text-xl font-black tracking-tight text-slate-950" href={mode === "admin" ? "/admin" : "/eligibility"}>SchemeSetu</Link>
            <nav className="hidden gap-5 text-sm font-semibold text-slate-600 md:flex">
              {navigation.map(([label, href]) => <Link className="hover:text-teal-700" href={href} key={href}>{label}</Link>)}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right"><p className="text-sm font-bold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.role.replaceAll("_", " ")}</p></div>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="page-shell py-9">{children}</main>
    </div>
  );
}
