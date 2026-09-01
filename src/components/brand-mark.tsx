import Link from "next/link";
import Image from "next/image";

export function BrandMark({ href = "/", inverse = false }: { href?: string; inverse?: boolean }) {
  return (
    <Link className={`inline-flex items-center gap-3.5 font-bold tracking-tight ${inverse ? "text-white" : "text-black"}`} href={href}>
      <Image
        src="/images/kaarva-logo.png"
        alt="Kaarva Logo"
        width={48}
        height={48}
        className="size-12 rounded-full object-contain bg-white p-0.5 shadow-md"
      />
      <span className="text-xl font-serif">Kaarva</span>
    </Link>
  );
}

