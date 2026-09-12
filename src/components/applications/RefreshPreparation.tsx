"use client";
import { T } from "@/components/language/LanguageProvider";


import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RefreshPreparation() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const refresh = () => { startTransition(() => router.refresh()); };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [router]);
  return <div className="flex items-center gap-3 text-xs">
    <button type="button" disabled={pending} className="font-semibold text-teal-700 underline" onClick={() => { setChecked(true); startTransition(() => router.refresh()); }}><T>Refresh status</T></button>
    <span role="status">{pending ? "Checking saved progress…" : checked ? "Status refreshed" : "Progress follows your saved changes"}</span>
  </div>;
}
