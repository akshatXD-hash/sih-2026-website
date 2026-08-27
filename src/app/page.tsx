import Link from "next/link";

const journeys = [
  ["1", "Tell us about your goal", "A short eligibility wizard captures the facts used by the matcher."],
  ["2", "Compare eligible schemes", "Transparent rules rank relevant micro, term, and education loans."],
  ["3", "Continue your application", "Choose a branch and submit one traceable application."],
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="hero-grid min-h-[72vh] border-b border-slate-200">
        <div className="page-shell grid gap-12 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
          <div>
            <span className="eyebrow">Government-backed credit, made understandable</span>
            <h1 className="mt-6 max-w-4xl text-5xl font-bold tracking-[-0.04em] text-slate-950 sm:text-6xl">Find the right loan scheme without guessing.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">SchemeSetu turns applicant details into an auditable shortlist, then guides the applicant from eligibility to submission.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="button-primary" href="/register">Check eligibility</Link>
              <Link className="button-secondary" href="/login">Sign in</Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-teal-100 bg-white p-7 shadow-[0_28px_80px_-30px_rgba(15,118,110,0.35)]">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700">How it works</p>
            <div className="mt-6 space-y-5">
              {journeys.map(([number, title, copy]) => (
                <div className="flex gap-4" key={number}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-700 font-bold text-white">{number}</span>
                  <div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{copy}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="page-shell py-12 text-sm text-slate-600">Phase 2 foundation · Deterministic matching · External AI extraction boundary</section>
    </main>
  );
}
