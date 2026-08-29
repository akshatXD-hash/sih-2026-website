"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  schemeChatAction,
  type ChatActionState,
} from "@/app/(applicant)/ai/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";

const initialState: ChatActionState = { messages: [] };

export function SchemeChat() {
  const [state, formAction] = useActionState(schemeChatAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.messages.at(-1)?.role === "assistant") formRef.current?.reset();
  }, [state.messages]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <section className="panel flex min-h-[560px] flex-col p-0">
        <div className="border-b border-slate-200 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">AI scheme assistant</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Ask about loan schemes and terminology</h1>
        </div>
        <div className="flex-1 space-y-4 p-5" aria-live="polite">
          {state.messages.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              Try “What is a moratorium?”, “How does a female interest rebate work?”, or “What documents are normally needed?”
            </div>
          )}
          {state.messages.map((message, index) => (
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-teal-700 text-white" : "bg-violet-50 text-violet-950"}`}
              key={`${message.role}-${index}`}
            >
              {message.content}
            </div>
          ))}
          {state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{state.error}</p>}
        </div>
        <form action={formAction} ref={formRef} className="border-t border-slate-200 p-5">
          <div className="flex gap-3">
            <input className="field" name="message" maxLength={2_000} required placeholder="Ask a question about schemes..." autoComplete="off" />
            <select className="field w-auto min-w-28" name="language" defaultValue="en" aria-label="Chat language">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
            <SubmitButton pendingLabel="Thinking...">Send</SubmitButton>
          </div>
        </form>
      </section>
      <aside className="panel h-fit">
        <h2 className="font-bold text-slate-950">Important limits</h2>
        <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
          <li>AI answers are informational and may need verification.</li>
          <li>Eligibility is calculated by published scheme rules, not chat.</li>
          <li>Do not enter Aadhaar, PAN, bank numbers, or passwords here.</li>
          <li>An officer makes the final sanction decision.</li>
        </ul>
      </aside>
    </div>
  );
}
