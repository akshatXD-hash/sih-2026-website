"use client";

import { useActionState } from "react";

import {
  explainRecommendationAction,
  type RecommendationActionState,
} from "@/app/(applicant)/ai/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";

const initialState: RecommendationActionState = {};

export function RecommendationExplainer({ applicationId }: { applicationId: string }) {
  const action = explainRecommendationAction.bind(null, applicationId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <section className="panel mt-6 border-violet-200 bg-violet-50/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">AI explanation</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">Why are these schemes ranked this way?</h2>
          <p className="mt-1 text-sm text-slate-600">AI explains only the deterministic eligible shortlist shown below.</p>
        </div>
        <form action={formAction} className="flex items-center gap-2">
          <select className="field w-auto min-w-28" name="language" defaultValue="en" aria-label="Explanation language">
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
          <SubmitButton pendingLabel="Explaining...">Explain matches</SubmitButton>
        </form>
      </div>
      {state.recommendation && (
        <div aria-live="polite" className="mt-5 grid gap-3 md:grid-cols-[1fr_280px]">
          <div className="rounded-xl border border-violet-200 bg-white p-4">
            <p className="text-sm font-bold text-violet-700">Top deterministic match</p>
            <p className="mt-1 text-lg font-black text-slate-950">{state.recommendation.topScheme}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{state.recommendation.explanation}</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-white p-4">
            <p className="text-sm font-bold text-violet-700">Runner-up context</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{state.recommendation.runnerUpNote}</p>
          </div>
        </div>
      )}
      {state.error && <p aria-live="polite" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{state.error}</p>}
    </section>
  );
}
