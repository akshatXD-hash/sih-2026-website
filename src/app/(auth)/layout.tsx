import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-[#f7f4ed] lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left Hero Section */}
      <section className="relative hidden overflow-hidden bg-[#062e23] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Artwork Image Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
          style={{ backgroundImage: "url('/images/auth-hero-bg.jpg')" }}
        />
        
        {/* Dark Emerald Tint Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#042119]/92 via-[#062e23]/85 to-[#031812]/96 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#042119]/95 via-transparent to-[#042119]/70" />

        {/* Top Header inside Left Hero */}
        <div className="relative z-10 flex items-center gap-3.5">
          <Image
            src="/images/kaarva-logo.png"
            alt="Kaarva Logo"
            width={52}
            height={52}
            className="size-13 rounded-full object-contain bg-white p-0.5 shadow-lg"
          />
          <span className="font-serif text-3xl font-normal text-white tracking-tight">Kaarva</span>
        </div>

        {/* Middle Main Headings */}
        <div className="relative z-10 max-w-xl my-auto py-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="h-px w-6 bg-[#d4a340]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4a340]">
              YOUR APPLICATION STARTS HERE
            </p>
          </div>
          <h2 className="font-serif text-5xl xl:text-6xl font-normal leading-[1.15] text-white">
            One account.<br />
            <span className="text-[#d4a340]">A clearer path.</span>
          </h2>
        </div>

        {/* Bottom Security Note */}
        <div className="relative z-10 border-t border-white/15 pt-6">
          <div className="flex items-start gap-3 text-xs leading-relaxed text-emerald-100/90">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[#d4a340]/40 bg-[#042119]/80">
              <svg className="size-3.5 text-[#d4a340]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="pt-0.5">Your information stays tied to your private application and is handled securely.</p>
          </div>
        </div>
      </section>

      {/* Right Form Section */}
      <section className="flex min-h-screen flex-col justify-between px-5 py-7 sm:px-10 lg:px-14 xl:px-20 bg-[#f1f0eb]">
        <div className="flex justify-end">
          <Link className="text-xs font-black uppercase tracking-[.14em] text-black/50 hover:text-black transition-colors" href="/">
            ← BACK HOME
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-12">
          <div className="w-full border-t border-black/20 pt-8">
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

