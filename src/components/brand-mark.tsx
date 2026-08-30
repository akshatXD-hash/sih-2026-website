import Link from "next/link";

export function BrandMark({ href = "/", inverse = false }: { href?: string; inverse?: boolean }) {
  return (
    <Link className={`inline-flex items-center gap-3 font-black tracking-[-0.04em] ${inverse ? "text-white" : "text-black"}`} href={href}>
      <span aria-hidden="true" className={`relative block size-8 overflow-hidden rounded-full ${inverse ? "bg-white" : "bg-black"}`}>
        <span className={`absolute left-[7px] top-[7px] h-[18px] w-[7px] rounded-full ${inverse ? "bg-black" : "bg-white"}`} />
        <span className="absolute left-[15px] top-[7px] h-[7px] w-[11px] rounded-full bg-[#dfff45]" />
        <span className="absolute left-[15px] top-[17px] h-[8px] w-[11px] rounded-full bg-[#dfff45]" />
      </span>
      <span className="text-lg">SchemeSetu</span>
    </Link>
  );
}
