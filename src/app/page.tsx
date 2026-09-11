import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

const journey = [
  ["01", "Describe", "Tell us what you are building, studying, or growing."],
  ["02", "Match", "See which schemes fit your circumstances and why."],
  ["03", "Locate", "Find nearby branches and compare their lending support."],
  ["04", "Apply", "Upload evidence, review every detail, and track the decision."],
] as const;

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#f1f0eb]">
      <section className="relative min-h-screen overflow-hidden bg-black text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/kaarva-hero.webp')" }} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/35" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25" />
        <header className="relative z-20 flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <BrandMark inverse />
          <div className="hidden items-center gap-8 text-xs font-bold uppercase tracking-[0.12em] md:flex">
            <a className="text-white/60 hover:text-white" href="#process">Process</a>
            <a className="text-white/60 hover:text-white" href="#trust">Why it works</a>
          </div>
          <div className="flex items-center gap-2">
            <Link className="whitespace-nowrap rounded-md px-2 py-2 text-sm font-bold text-white hover:bg-white/10 sm:px-4" href="/login">Sign in</Link>
            <Link className="whitespace-nowrap rounded-md bg-white px-4 py-2.5 text-sm font-black text-black hover:bg-[#e6c99a] sm:px-5" href="/register"><span>Get started</span></Link>
          </div>
        </header>

        <div className="page-shell relative z-10 flex min-h-[calc(100vh-73px)] items-center py-20 sm:py-24">
          <div className="max-w-4xl">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#e6c99a]">Loan schemes for your next step</p>
            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-7xl lg:text-8xl">A little help<br />with your <span className="editorial-serif text-[#e6c99a]">next step.</span></h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">For a small business, an education, or something you want to grow. Find loan schemes that fit your needs and understand what you need to apply.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link className="group inline-flex items-center gap-5 rounded-md bg-[#e6c99a] px-6 py-4 font-black text-black hover:bg-white" href="/register">Check eligibility <span className="text-xl transition-transform">→</span></Link>
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/55">Understand your options before you apply</span>
            </div>
          </div>
        </div>
      </section>

      <section className="paper-grid page-shell py-24 sm:py-32" id="process">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div><span className="eyebrow">How it works</span><h2 className="mt-8 text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">From your first question<br /><span className="editorial-serif">to an application.</span></h2></div>
          <div className="border-t border-black">
            {journey.map(([number, title, copy]) => <article className="group grid gap-4 border-b border-black/25 py-7 sm:grid-cols-[64px_180px_1fr] sm:items-center" key={number}><span className="font-mono text-xs text-black/45">{number}</span><h3 className="text-2xl font-black tracking-[-0.04em] group-hover:translate-x-1">{title}</h3><p className="max-w-lg text-sm leading-6 text-black/55">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bg-[#e8e5db] text-black" id="trust">
        <div className="page-shell grid lg:grid-cols-[1fr_1fr]">
          <div className="border-b border-black/25 py-20 lg:border-b-0 lg:border-r lg:py-28 lg:pr-14"><p className="text-xs font-black uppercase tracking-[0.18em]">Know where you stand</p><h2 className="mt-8 text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">Understand the terms.<br /><span className="editorial-serif">Then decide.</span></h2></div>
          <div className="flex flex-col justify-between gap-12 py-20 lg:py-28 lg:pl-14"><p className="max-w-xl text-xl leading-8">See why a scheme matches your details and check its requirements before applying. AI can help explain the language and paperwork. The bank reviews your application and makes the lending decision.</p><div><Link className="button-primary" href="/register">Start my application</Link><p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-black/50">Free to explore · Review before saving</p></div></div>
        </div>
      </section>

      <footer className="flex flex-col gap-6 bg-black px-5 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><BrandMark inverse /><p className="text-xs uppercase tracking-[0.15em] text-white/40">Help with finding and applying for loan schemes.</p></footer>
    </main>
  );
}
