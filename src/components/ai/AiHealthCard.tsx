"use client";

import { useActionState } from "react";

import {
  checkAiHealthAction,
  type AiHealthActionState,
} from "@/app/(applicant)/ai/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";

const initialState: AiHealthActionState = {};

export function AiHealthCard() {
  const [state, formAction] = useActionState(checkAiHealthAction, initialState);
  const healthy = state.checked && !state.error;
  return (
    <section className="panel mt-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1E3A2B]">AI service diagnostics</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">External FastAPI service</h2>
        <p className="mt-1 text-sm text-slate-600">
          {state.checked
            ? state.error ?? `Status: ${state.status} · ${state.mode} mode`
            : "Run an authenticated health check without exposing the service URL."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {state.checked && <span className={`h-3 w-3 rounded-full ${healthy ? "bg-emerald-500" : "bg-red-500"}`} aria-label={healthy ? "Healthy" : "Unavailable"} />}
        <form action={formAction}><SubmitButton className="button-secondary" pendingLabel="Checking...">Check AI service</SubmitButton></form>
      </div>
    </section>
  );
}
