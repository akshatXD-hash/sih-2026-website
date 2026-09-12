"use client";

import { useActionState, type ReactNode } from "react";
import type { AshaActionState } from "@/app/(asha)/asha-worker/actions";
import { T } from "@/components/language/LanguageProvider";

export function AshaForm({ action, children, label }: { action: (state: AshaActionState, form: FormData) => Promise<AshaActionState>; children: ReactNode; label: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} onReset={event => event.preventDefault()} className="space-y-4">
    <fieldset disabled={pending} className="space-y-4">{children}</fieldset>
    {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
    {state.success && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{state.success}</p>}
    <button type="submit" disabled={pending} className="button-primary"><T>{pending ? "Saving…" : label}</T></button>
  </form>;
}
