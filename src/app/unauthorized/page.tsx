import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/guards";
import { workspacePath } from "@/lib/auth/roles";

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();
  const destination = user?.isActive ? workspacePath(user.role) : "/login";
  return (
    <main className="hero-grid grid min-h-screen place-items-center px-5">
      <section className="max-w-lg rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/50">
        <span className="eyebrow">Access restricted</span>
        <h1 className="mt-4 text-3xl font-bold text-slate-950">This area is not available for your role.</h1>
        <p className="mt-3 text-slate-600">Applicant and officer workspaces are intentionally separated.</p>
        <Link className="button-primary mt-7 inline-flex" href={destination === "/unauthorized" ? "/" : destination}>Go to my workspace</Link>
      </section>
    </main>
  );
}
