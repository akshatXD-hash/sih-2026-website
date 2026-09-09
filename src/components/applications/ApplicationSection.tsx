"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ApplicationSection({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const reveal = () => {
      if (window.location.hash === `#${id}` && ref.current) {
        ref.current.open = true;
        ref.current.scrollIntoView({ block: "start" });
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, [id]);
  return <details ref={ref} id={id} className="panel scroll-mt-6">
    <summary className="cursor-pointer font-semibold text-slate-900">{title}{hint && <span className="ml-3 text-sm font-normal text-slate-500">{hint}</span>}</summary>
    <div className="mt-5">{children}</div>
  </details>;
}
