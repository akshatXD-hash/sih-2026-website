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
  return (
    <section className="panel mt-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1E3A2B]">Assistant availability</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Check the assistant connection</h2>
        <p role="status" className="mt-1 text-sm text-slate-600">
          {state.checked
            ? state.error ?? "The assistant is available."
            : "Check the connection if you are having trouble getting a response."}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <form action={formAction}><SubmitButton className="button-secondary" pendingLabel="Checking...">Check connection</SubmitButton></form>
      </div>
    </section>
  );
}
