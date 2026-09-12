import { T } from "@/components/language/LanguageProvider";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/brand-mark";

interface AppShellProps {
  children: React.ReactNode;
  user: { name: string; role: string };
  mode: "applicant" | "admin";
}

const applicantNav = [
  ["01", "Eligibility", "/eligibility"],
  ["02", "Schemes", "/schemes"],
  ["03", "Branches", "/branches"],
  ["04", "Scheme help", "/assistant"],
  ["05", "Application", "/applications/new"],
  ["06", "Language", "/language"],
] as const;

export function AppShell({ children, user, mode }: AppShellProps) {
  const navigation =
    mode === "admin"
      ? ([
          ["01", "Lead dashboard", "/admin"],
          ["03", "Language", "/language"],
          ...(user.role === "ADMIN" || user.role === "REVIEWER"
            ? [["02", "Branch scheme support", "/admin/branch-support"]]
            : []),
        ] as const)
      : applicantNav;
  const home = mode === "admin" ? "/admin" : "/eligibility";

  return (
    <div className="relative min-h-screen bg-[#F7F3E9] text-[#191917] selection:bg-[#B85228] selection:text-white lg:grid lg:grid-cols-[270px_1fr]">
      {/* Background Image Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60 mix-blend-multiply"
        style={{ backgroundImage: "url('/images/artisan-bg.jpg')" }}
      />

      {/* Decorative Organic Corner Shapes & Mandala Accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-24 -right-24 z-0 h-96 w-96 rounded-full bg-[#1E3A2B]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-24 -left-24 z-0 h-96 w-96 rounded-full bg-[#B85228]/10 blur-3xl"
      />

      {/* Sidebar Navigation */}
      <aside className="relative z-20 hidden min-h-screen border-r border-[#1E3A2B]/15 bg-[#FAF6EE]/90 p-7 backdrop-blur-md lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <BrandMark href={home} />
        <div className="mt-14">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1E3A2B]/50">
            <T>{mode === "admin" ? "Officer workspace" : "Your application"}</T>
          </p>
          <nav className="mt-5 border-t border-[#1E3A2B]/15">
            {navigation.map(([, label, href]) => (
              <Link
                className="group flex items-center gap-4 border-b border-[#1E3A2B]/10 py-4 text-sm font-bold text-[#1E3A2B] hover:bg-[#1E3A2B]/5"
                href={href}
                key={href}
              >
                <span><T>{label}</T></span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-[#1E3A2B]/15 pt-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#1E3A2B] text-xs font-black text-[#F7F3E9] shadow-sm">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-[#1E3A2B]">{user.name}</p>
              <p className="text-[10px] uppercase tracking-[.14em] text-[#B85228]">
                <T>{user.role.replaceAll("_", " ")}</T>
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content & Mobile Header Wrapper */}
      <div className="relative z-10 min-w-0">
        <header className="sticky top-0 z-40 border-b border-[#1E3A2B]/15 bg-[#FAF6EE]/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <BrandMark href={home} />
            <SignOutButton />
          </div>
          <nav className="flex overflow-x-auto border-t border-[#1E3A2B]/15 px-5">
            {navigation.map(([, label, href]) => (
              <Link
                className="shrink-0 border-r border-[#1E3A2B]/15 px-4 py-3 text-xs font-black text-[#1E3A2B] first:border-l hover:bg-[#1E3A2B]/5"
                href={href}
                key={href}
              >
                <T>{label}</T>
              </Link>
            ))}
          </nav>
        </header>

        <main className="artisan-paper-grid relative z-10 min-h-screen px-5 py-9 sm:px-8 lg:px-12 lg:py-12 xl:px-16">
          {children}
        </main>
      </div>
    </div>
  );
}

