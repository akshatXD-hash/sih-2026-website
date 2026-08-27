import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="hero-grid grid min-h-screen place-items-center px-5">
      <section className="max-w-lg rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/50">
        <span className="eyebrow">Access restricted</span>
        <h1 className="mt-4 text-3xl font-bold text-slate-950">This area is not available for your role.</h1>
        <p className="mt-3 text-slate-600">Applicant and officer workspaces are intentionally separated.</p>
        <Link className="button-primary mt-7 inline-flex" href="/">Return home</Link>
      </section>
    </main>
  );
}
