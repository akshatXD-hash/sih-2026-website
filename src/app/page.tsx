import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

const journey = [
  ["01", "Describe", "Tell us what you are building, studying, or growing."],
  ["02", "Match", "Rules—not guesswork—shortlist schemes you can actually use."],
  ["03", "Locate", "PostGIS ranks nearby branches by distance and lending health."],
  ["04", "Apply", "Upload evidence, review every detail, and track the decision."],
] as const;

const signals = [
  ["55", "active schemes"], ["10", "ranked branches"],
  ["100%", "explainable matching"], ["0", "AI approval decisions"],
] as const;

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#f1f0eb]">
      <section className="relative min-h-screen overflow-hidden bg-black text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/scheme-setu-hero.webp')" }} />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/35" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25" />
        <header className="relative z-20 flex items-center justify-between bg-black/20 px-5 py-4 backdrop-blur-[2px] sm:px-8 lg:px-10">
          <BrandMark inverse />
          <div className="hidden items-center gap-8 text-xs font-bold uppercase tracking-[0.12em] md:flex">
            <a className="text-white/60 hover:text-white" href="#process">Process</a>
            <a className="text-white/60 hover:text-white" href="#trust">Why it works</a>
          </div>
          <div className="flex items-center gap-2">
            <Link className="whitespace-nowrap rounded-full px-2 py-2 text-sm font-bold text-white hover:bg-white/10 sm:px-4" href="/login">Sign in</Link>
            <Link className="whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-black text-black hover:bg-[#dfff45] sm:px-5" href="/register"><span className="sm:hidden">Start ↗</span><span className="hidden sm:inline">Start now ↗</span></Link>
          </div>
        </header>

        <div className="relative z-10 grid min-h-[calc(100vh-73px)] lg:grid-cols-[260px_1fr]">
          <aside className="hidden border-r border-white/20 p-8 lg:flex lg:flex-col lg:justify-between">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#dfff45]">Public credit, decoded</p><p className="mt-5 text-sm leading-6 text-white/55">A single, auditable path from “I need funding” to a review-ready application.</p></div>
            <div className="space-y-2 text-xs text-white/50"><p>Built for applicants</p><p>Built for officers</p><p>Built for trust</p></div>
          </aside>

          <div className="relative flex min-h-[760px] flex-col justify-between px-5 py-12 sm:px-8 lg:px-14 lg:py-14">
            <div className="absolute left-1/2 top-1/2 -z-0 aspect-square w-[min(56vw,590px)] -translate-x-1/2 -translate-y-1/2 border border-white/40">
              <div className="absolute inset-[12%] rounded-full border border-white/10" />
              <div className="absolute -inset-[14%] rotate-45 rounded-full border border-white/[0.07]" />
            </div>
            <div className="relative z-10 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-white/50"><span>Scheme Matching Platform</span><span>India · 2026</span></div>
            <div className="relative z-10 max-w-6xl py-20">
              <p className="mb-6 max-w-md text-sm leading-6 text-white/60 sm:ml-[38%]">Government-backed opportunity should feel discoverable—not buried inside policy documents.</p>
              <h1 className="display-title">Find your<br /><span className="editorial-serif text-[#dfff45]">way in.</span></h1>
            </div>
            <div className="relative z-10 flex flex-col items-start justify-between gap-7 border-t border-white/30 pt-6 sm:flex-row sm:items-end">
              <p className="max-w-xl text-lg leading-7 text-white/75">Discover the right loan scheme, understand the terms, choose a strong branch, and submit one clean application.</p>
              <Link className="group inline-flex shrink-0 items-center gap-5 rounded-full bg-[#dfff45] px-6 py-4 font-black text-black hover:bg-white" href="/register">Check eligibility <span className="text-xl transition-transform group-hover:translate-x-1">→</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid border-b border-black/20 sm:grid-cols-2 lg:grid-cols-4">
        {signals.map(([value, label]) => <div className="border-b border-black/20 p-6 last:border-b-0 sm:border-r lg:border-b-0" key={label}><p className="text-4xl font-black tracking-[-0.06em]">{value}</p><p className="mt-2 text-xs font-bold uppercase tracking-[0.15em] text-black/45">{label}</p></div>)}
      </section>

      <section className="paper-grid page-shell py-24 sm:py-32" id="process">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div><span className="eyebrow">One continuous journey</span><h2 className="mt-8 text-5xl font-black leading-[0.92] tracking-[-0.055em] sm:text-6xl">Less hunting.<br /><span className="editorial-serif">More doing.</span></h2></div>
          <div className="border-t border-black">
            {journey.map(([number, title, copy]) => <article className="group grid gap-4 border-b border-black/25 py-7 sm:grid-cols-[64px_180px_1fr] sm:items-center" key={number}><span className="font-mono text-xs text-black/45">{number}</span><h3 className="text-2xl font-black tracking-[-0.04em] group-hover:translate-x-1">{title}</h3><p className="max-w-lg text-sm leading-6 text-black/55">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bg-[#dfff45] text-black" id="trust">
        <div className="page-shell grid lg:grid-cols-[1fr_1fr]">
          <div className="border-b border-black/25 py-20 lg:border-b-0 lg:border-r lg:py-28 lg:pr-14"><p className="text-xs font-black uppercase tracking-[0.18em]">The important distinction</p><h2 className="mt-8 text-5xl font-black leading-[.94] tracking-[-0.055em] sm:text-7xl">AI assists.<br /><span className="editorial-serif">Rules decide.</span></h2></div>
          <div className="flex flex-col justify-between gap-12 py-20 lg:py-28 lg:pl-14"><p className="max-w-xl text-xl leading-8">AI helps understand language and documents. Eligibility remains deterministic, sources stay visible, and a human officer makes the lending decision.</p><div><Link className="button-primary" href="/register">Build my application →</Link><p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-black/50">Free to explore · Review before saving</p></div></div>
        </div>
      </section>

      <footer className="flex flex-col gap-6 bg-black px-5 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><BrandMark inverse /><p className="text-xs uppercase tracking-[0.15em] text-white/40">Clarity between people and public credit.</p></footer>
    </main>
  );
}
