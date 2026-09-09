"use client";

import { useActionState } from "react";

import {
  simplifyTermAction,
  type SimplifyActionState,
} from "@/app/(applicant)/ai/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";

const initialState: SimplifyActionState = {};

export function TermSimplifier({ text }: { text: string }) {
  const [state, formAction] = useActionState(simplifyTermAction, initialState);
  return (
    <div className="mt-4 rounded-xl border border-[#1E3A2B]/15 bg-[#FAF6EE]/90 p-3 backdrop-blur-xs">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="term" value={text} />
        <select className="rounded-lg border border-[#1E3A2B]/20 bg-white px-2 py-2 text-xs font-bold text-[#191917]" name="language" defaultValue="en" aria-label="Explanation language">
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
        <SubmitButton className="button-secondary min-h-9 px-3 py-1.5 text-xs" pendingLabel="Explaining...">
          Explain simply with AI
        </SubmitButton>
      </form>
      {state.explanation && <p aria-live="polite" className="mt-3 text-sm leading-6 text-[#191917] font-medium">{state.explanation}</p>}
      {state.error && <p aria-live="polite" className="mt-3 text-sm font-semibold text-red-700">{state.error}</p>}
    </div>
  );
}
