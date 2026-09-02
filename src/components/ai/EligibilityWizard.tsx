"use client";

import { useActionState, useState } from "react";

import { startEligibilityAction } from "@/app/(applicant)/actions";
import {
  extractApplicantIntentAction,
  type IntentActionState,
} from "@/app/(applicant)/ai/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ExtractedVoiceIntent, VoiceAutoFill } from "@/components/ai/VoiceAutoFill";

const initialIntentState: IntentActionState = {};

const applicantGroups = [
  ["SC", "Scheduled Caste"], ["ST", "Scheduled Tribe"], ["OBC", "Other Backward Class"],
  ["MINORITY", "Notified minority community"], ["STREET_VENDOR", "Street vendor"],
  ["ARTISAN", "Artisan / handloom weaver"], ["SHG_MEMBER", "Self-help group member"],
  ["FARMER", "Farmer / allied activity worker"], ["AGRI_ENTREPRENEUR", "Agri entrepreneur"],
  ["AGRICULTURE_GRADUATE", "Agriculture graduate"], ["AGRICULTURE_GRADUATE_GROUP", "Agriculture-graduate group"],
  ["URBAN_POOR", "Urban-poor household"], ["URBAN_POOR_GROUP", "Urban-poor enterprise group"],
  ["SAFAI_KARAMCHARI", "Sanitation worker / dependant"], ["PERSON_WITH_DISABILITY", "Person with disability"],
] as const;

export function EligibilityWizard() {
  const [intentState, intentAction] = useActionState(
    extractApplicantIntentAction,
    initialIntentState,
  );
  const [profileState, profileAction] = useActionState(
    startEligibilityAction,
    {},
  );

  const [voiceAppliedIntent, setVoiceAppliedIntent] = useState<ExtractedVoiceIntent | null>(null);
  const [isVoiceFilled, setIsVoiceFilled] = useState(false);

  const activeIntent = voiceAppliedIntent
    ? {
      projectCategory: voiceAppliedIntent.projectCategory ?? undefined,
      trade: voiceAppliedIntent.trade ?? undefined,
      requestedAmount: voiceAppliedIntent.requestedAmount,
      annualIncome: voiceAppliedIntent.annualIncome,
      suggestedGender: voiceAppliedIntent.suggestedGender ?? undefined,
      confidence: voiceAppliedIntent.confidence,
      warnings: voiceAppliedIntent.warnings,
    }
    : intentState.intent;

  const formVersion = activeIntent
    ? [
      activeIntent.projectCategory ?? "",
      activeIntent.confidence,
      activeIntent.requestedAmount ?? "",
      activeIntent.annualIncome ?? "",
      activeIntent.trade ?? "",
      activeIntent.suggestedGender ?? "",
      isVoiceFilled ? "voice" : "text",
    ].join(":")
    : "manual";

  function handleVoiceApply(intent: ExtractedVoiceIntent) {
    setVoiceAppliedIntent(intent);
    setIsVoiceFilled(true);
  }

  function handleUndoVoiceFill() {
    setVoiceAppliedIntent(null);
    setIsVoiceFilled(false);
  }

  return (
    <div className="space-y-6">
      <VoiceAutoFill onApply={handleVoiceApply} />

      {isVoiceFilled && voiceAppliedIntent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Voice Auto-Fill Applied ({Math.round(voiceAppliedIntent.confidence * 100)}% accuracy)
              </p>
              <p className="text-[11px] text-emerald-800">
                Transcribed from audio in <strong>{voiceAppliedIntent.language.toUpperCase()}</strong>. Review the highlighted fields below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndoVoiceFill}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo Voice Fill
          </button>
        </div>
      )}

      <form action={intentAction} className="panel border-violet-200 bg-violet-50/40">
        <input type="hidden" name="language" value="auto" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Text intake</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-800">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-pulse" />
                Auto Multi-lingual
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Or type your need in your own words</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Enter your details in any language (English, हिंदी, मराठी, Hinglish, etc.). The AI automatically identifies the language and prefills the form for your review.
            </p>
          </div>
        </div>
        <textarea
          className="field mt-4 min-h-32 py-3"
          name="transcript"
          minLength={10}
          maxLength={5_000}
          required
          aria-label="Describe your loan and project requirement in your own words"
          placeholder="Example: I run a tailoring service and need ₹1,20,000. My annual household income is ₹2,40,000. (या हिंदी में: मेरी सिलाई की दुकान है और मुझे ₹1,20,000 की जरूरत है...)"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Analysing...">Prefill with AI</SubmitButton>
          <p className="text-xs text-slate-500">Suggestions do not determine loan eligibility.</p>
        </div>
        {intentState.error && (
          <p aria-live="polite" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">
            {intentState.error}
          </p>
        )}
        {intentState.intent && !isVoiceFilled && (
          <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4 text-sm">
            <p className="font-bold text-violet-900">
              Suggestions applied · {Math.round(intentState.intent.confidence * 100)}% model confidence
            </p>
            {intentState.intent.warnings.map((warning) => (
              <p className="mt-1 text-amber-800" key={warning}>{warning}</p>
            ))}
          </div>
        )}
      </form>

      <form action={profileAction} className="panel grid gap-6 sm:grid-cols-2" key={formVersion}>
        {profileState.error && (
          <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 sm:col-span-2">
            {profileState.error}
          </p>
        )}

        <label className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Project category</span>
            {isVoiceFilled && activeIntent?.projectCategory && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                ⚡ Auto-filled by Voice
              </span>
            )}
          </div>
          <select
            className={`field transition-colors ${isVoiceFilled && activeIntent?.projectCategory ? "border-violet-400 bg-violet-50/20 ring-2 ring-violet-100" : ""
              }`}
            name="projectCategory"
            required
            defaultValue={activeIntent?.projectCategory ?? ""}
          >
            <option value="" disabled>Select a category</option>
            <option value="micro-enterprise">Micro enterprise</option>
            <option value="agriculture-allied">Agriculture allied</option>
            <option value="manufacturing">Manufacturing</option>
            <option value="services">Services</option>
            <option value="trading">Trading</option>
            <option value="higher-education-india">Higher education in India</option>
            <option value="higher-education-abroad">Higher education abroad</option>
            <option value="vocational-education">Vocational education</option>
          </select>
        </label>
        <label className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Trade or occupation</span>
            {isVoiceFilled && activeIntent?.trade && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                Auto-filled by Voice
              </span>
            )}
          </div>
          <input
            className={`field transition-colors ${isVoiceFilled && activeIntent?.trade ? "border-violet-400 bg-violet-50/20 ring-2 ring-violet-100" : ""
              }`}
            name="trade"
            defaultValue={activeIntent?.trade ?? ""}
            placeholder="e.g. tailoring"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">Age</span>
          <input className="field" type="number" name="age" min="18" max="100" required placeholder="e.g. 28" />
        </label>
        <fieldset className="space-y-3 sm:col-span-2">
          <legend className="text-sm font-bold text-slate-700">Applicant groups (select every group that applies)</legend>
          <p className="text-xs text-slate-500">This is used only for deterministic eligibility checks. Leave all unchecked if none apply.</p>
          <div className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {applicantGroups.map(([value, label]) => (
              <label className="flex items-start gap-2 text-sm text-slate-700" key={value}>
                <input className="mt-1 h-4 w-4 accent-teal-700" type="checkbox" name="applicantTags" value={value} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Gender</span>
            {isVoiceFilled && activeIntent?.suggestedGender && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                Suggested by Voice
              </span>
            )}
          </div>
          <select
            className={`field transition-colors ${isVoiceFilled && activeIntent?.suggestedGender ? "border-violet-400 bg-violet-50/20 ring-2 ring-violet-100" : ""
              }`}
            name="gender"
            required
            defaultValue={activeIntent?.suggestedGender ?? "PREFER_NOT_TO_SAY"}
          >
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="TRANSGENDER">Transgender</option>
            <option value="NON_BINARY">Non-binary</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
        </label>
        {activeIntent && (
          <div className="grid gap-4 rounded-xl border border-teal-200 bg-teal-50/50 p-4 sm:col-span-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="font-bold text-teal-950">Review the AI-filled financial values</p>
              <p className="mt-1 text-xs text-teal-800">These will prefill step 2 and can still be changed there.</p>
            </div>
            <label className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Requested amount</span>
                {isVoiceFilled && activeIntent.requestedAmount && (
                  <span className="text-[10px] font-bold text-teal-800">⚡ Extracted ₹{activeIntent.requestedAmount.toLocaleString("en-IN")}</span>
                )}
              </div>
              <input
                className="field"
                type="number"
                name="suggestedRequestedAmount"
                min="1"
                max="50000000"
                defaultValue={activeIntent.requestedAmount ?? ""}
              />
            </label>
            <label className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Annual household income</span>
                {isVoiceFilled && activeIntent.annualIncome ? (
                  <span className="text-[10px] font-bold text-teal-800">⚡ Extracted ₹{activeIntent.annualIncome.toLocaleString("en-IN")}</span>
                ) : null}
              </div>
              <input
                className="field"
                type="number"
                name="suggestedAnnualIncome"
                min="0"
                max="100000000"
                defaultValue={activeIntent.annualIncome ?? ""}
              />
            </label>
            {activeIntent.suggestedGender && (
              <label className="flex items-start gap-3 sm:col-span-2">
                <input className="mt-1 h-4 w-4 accent-teal-700" type="checkbox" required />
                <span className="text-sm text-slate-700">I reviewed the AI-suggested gender and confirm the selected value is correct.</span>
              </label>
            )}
          </div>
        )}
        <div className="sm:col-span-2">
          <button className="button-primary" type="submit">Continue to financial details</button>
        </div>
      </form>
    </div>
  );
}