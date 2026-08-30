"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  schemeChatAction,
  type ChatActionState,
} from "@/app/(applicant)/ai/actions";
import { FormattedMessage } from "@/components/ai/FormattedMessage";

const initialState: ChatActionState = { messages: [] };

const QUICK_STARTERS = [
  {
    title: "MUDRA Schemes",
    prompt: "Explain Pradhan Mantri MUDRA Yojana (Shishu, Kishore, Tarun) and their loan limits.",
    icon: "💼",
  },
  {
    title: "Female Interest Rebate",
    prompt: "How does the female interest rate concession work across different loan schemes?",
    icon: "👩‍💼",
  },
  {
    title: "Required Documents",
    prompt: "What documents are required to apply for a micro-finance or term loan?",
    icon: "📋",
  },
  {
    title: "Loan Moratorium",
    prompt: "What is a moratorium period and how does it affect monthly EMI calculations?",
    icon: "⏳",
  },
];

export function SchemeChat() {
  const [state, formAction, isPending] = useActionState(schemeChatAction, initialState);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, isPending]);

  function handleSendPrompt(promptText: string) {
    const trimmed = promptText.trim();
    if (!trimmed || isPending) return;

    const formData = new FormData();
    formData.set("message", trimmed);
    formData.set("language", "auto");

    setInputValue("");
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSendPrompt(inputValue);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="panel flex min-h-[640px] flex-col p-0 border-black/15 bg-[#faf9f4] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white/60 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white font-bold text-lg">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-950">
                  Kaarva Scheme Assistant
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulse" />
                  Auto Multi-lingual
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ask about eligibility rules, schemes, subsidies, and terminology
              </p>
            </div>
          </div>

          {state.messages.length > 0 && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-black hover:text-black"
            >
              Clear conversation
            </button>
          )}
        </div>
        <div
          className="flex-1 space-y-6 overflow-y-auto p-6 max-h-[580px]"
          aria-live="polite"
        >
          {state.messages.length === 0 && (
            <div className="py-6 space-y-6">
              <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xs">
                <span className="eyebrow">Smart AI Q&amp;A</span>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  How can I help you today?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Type your questions in any language (English, हिंदी, Hinglish,
                  etc.). I can clarify scheme terms, loan ceilings, interest
                  concessions, and required paperwork.
                </p>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                  Suggested topics to explore:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {QUICK_STARTERS.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSendPrompt(item.prompt)}
                      className="group flex flex-col items-start rounded-xl border border-black/10 bg-white p-4 text-left transition-colors duration-150 hover:-translate-y-0.5 hover:border-black hover:shadow-sm disabled:opacity-50"
                    >
                      <span className="text-xl mb-2">{item.icon}</span>
                      <span className="text-sm font-bold text-slate-950 group-hover:text-teal-800">
                        {item.title}
                      </span>
                      <span className="mt-1 text-xs leading-5 text-slate-500 line-clamp-2">
                        {item.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {state.messages.map((message) => {
            const isUser = message.role === "user";
            const messageKey = message.id || `${message.role}-${message.createdAt ?? message.content.slice(0, 15)}`;
            return (
              <div
                key={messageKey}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-xs font-bold text-white shadow-xs">
                    AI
                  </div>
                )}

                <div
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[88%] sm:max-w-[80%]`}
                >
                  <div
                    className={`rounded-2xl px-5 py-4 text-sm leading-relaxed ${isUser
                        ? "rounded-tr-xs bg-slate-900 text-white font-medium shadow-xs"
                        : "rounded-tl-xs border border-black/10 bg-slate-50/80 text-slate-900 shadow-xs"
                      }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <FormattedMessage content={message.content} />
                    )}
                  </div>
                  {message.createdAt && (
                    <span className="mt-1 text-[10px] font-bold text-slate-400 px-1">
                      {message.createdAt}
                    </span>
                  )}
                </div>
                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-xs font-bold text-white shadow-xs">
                    You
                  </div>
                )}
              </div>
            );
          })}
          {isPending && (
            <div className="flex gap-3 items-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-xs font-bold text-white">
                AI
              </div>
              <div className="rounded-2xl rounded-tl-xs border border-black/10 bg-slate-50 px-5 py-4 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-teal-700 [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-teal-700 [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-teal-700" />
                  <span className="ml-2 text-xs font-bold text-slate-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          {state.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800">
              {state.error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="border-t border-black/10 bg-white p-4"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              name="message"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isPending}
              maxLength={2_000}
              required
              aria-label="Ask a question about schemes"
              placeholder="Ask a question in any language (English, हिंदी, मराठी, etc.)..."
              autoComplete="off"
              className="flex-1 rounded-xl border border-black/20 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-black focus:bg-white focus:outline-none"
            />

            <button
              type="submit"
              disabled={isPending || !inputValue.trim()}
              className="inline-flex h-11 min-w-[90px] items-center justify-center rounded-xl bg-black px-5 text-xs font-black text-white transition-colors duration-150 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? "..." : "Send →"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Press <kbd className="font-mono font-bold">Enter</kbd> to send.
            Never share private credentials or passwords.
          </p>
        </form>
      </section>
      <aside className="panel h-fit space-y-6 border-black/15 bg-white">
        <div>
          <span className="eyebrow">Information Boundary</span>
          <h2 className="mt-3 text-lg font-black text-slate-950">
            Important boundaries
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            How the AI assistant interacts with the loan application process
          </p>
        </div>

        <ul className="space-y-3.5 text-xs leading-5 text-slate-600">
          <li className="flex gap-2.5">
            <span className="font-bold text-teal-800">✓</span>
            <span>
              <strong>Multi-lingual answers</strong>: You can ask in English,
              Hindi, or regional languages.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-bold text-teal-800">✓</span>
            <span>
              <strong>Structured explanations</strong>: Get clean, detailed breakdowns of complex scheme terms.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-bold text-red-700">✕</span>
            <span>
              <strong>No automated approvals</strong>: Eligibility is calculated
              by published rules, not by the chat model.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="font-bold text-red-700">✕</span>
            <span>
              <strong>Protect personal data</strong>: Do not type Aadhaar, PAN,
              bank account numbers, or passwords.
            </span>
          </li>
        </ul>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
          <p className="font-bold text-slate-900">Need personal eligibility?</p>
          <p className="mt-1 text-slate-600">
            Complete the 2-step profile wizard to get deterministic scheme
            matches.
          </p>
          <Link
            href="/eligibility"
            className="mt-3 inline-block font-black text-teal-800 hover:underline"
          >
            Go to Eligibility Wizard →
          </Link>
        </div>
      </aside>
    </div>
  );
}
