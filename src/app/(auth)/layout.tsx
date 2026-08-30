import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-[#f1f0eb] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="editorial-grid relative hidden overflow-hidden bg-black p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandMark inverse />
        <div className="absolute left-1/2 top-1/2 aspect-square w-[58%] -translate-x-1/2 -translate-y-1/2 border border-white/35"><div className="absolute -inset-[25%] rounded-full border border-white/10" /><div className="absolute inset-[18%] rotate-45 border border-[#dfff45]/40" /></div>
        <div className="relative z-10 max-w-2xl"><p className="text-xs font-black uppercase tracking-[.2em] text-[#dfff45]">Your application starts here</p><h2 className="mt-7 text-7xl font-black leading-[.86] tracking-[-.065em]">One account.<br /><span className="editorial-serif">A clearer path.</span></h2></div>
        <p className="relative z-10 max-w-md text-sm leading-6 text-white/55">Your information stays tied to your private application. AI suggestions are always reviewed before they are saved.</p>
      </section>
      <section className="flex min-h-screen flex-col px-5 py-7 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between lg:justify-end"><div className="lg:hidden"><BrandMark /></div><Link className="text-xs font-black uppercase tracking-[.14em] text-black/50 hover:text-black" href="/">← Back home</Link></div>
        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-12"><div className="w-full border-t border-black pt-8">{children}</div></div>
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-black/35">Secure applicant and officer access</p>
      </section>
    </main>
  );
}
