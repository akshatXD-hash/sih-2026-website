import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="hero-grid min-h-screen px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link className="text-lg font-black tracking-tight text-slate-950" href="/">SchemeSetu</Link>
        <div className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">{children}</div>
      </div>
    </main>
  );
}
