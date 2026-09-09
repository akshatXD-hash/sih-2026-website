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
  const [intakeMode, setIntakeMode] = useState<"voice" | "text">("voice");

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
    <div className="space-y-8">
      {/* AI INTAKE CONTAINER WITH TABS */}
      <div className="rounded-2xl border border-[#1E3A2B]/15 bg-white/95 p-6 shadow-sm backdrop-blur-xs">
        <div className="flex flex-col gap-4 border-b border-[#1E3A2B]/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#1E3A2B]">
                AI Assisted Intake
              </span>
            </div>
            <h2 className="mt-1 text-lg font-black text-[#191917]">
              Choose how you want to describe your loan requirement
            </h2>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex shrink-0 rounded-xl bg-[#FAF6EE] p-1 border border-[#1E3A2B]/15">
            <button
              type="button"
              onClick={() => setIntakeMode("voice")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                intakeMode === "voice"
                  ? "bg-[#1E3A2B] text-[#F7F3E9] shadow-xs"
                  : "text-[#1E3A2B]/75 hover:text-[#1E3A2B]"
              }`}
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Voice Auto-Fill</span>
            </button>
            <button
              type="button"
              onClick={() => setIntakeMode("text")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                intakeMode === "text"
                  ? "bg-[#1E3A2B] text-[#F7F3E9] shadow-xs"
                  : "text-[#1E3A2B]/75 hover:text-[#1E3A2B]"
              }`}
            >
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Type Text</span>
            </button>
          </div>
        </div>

        <div className="mt-5">
          {intakeMode === "voice" ? (
            <VoiceAutoFill onApply={handleVoiceApply} />
          ) : (
            <form action={intentAction} className="space-y-4">
              <input type="hidden" name="language" value="auto" />
              <div>
                <p className="text-xs font-bold text-[#1E3A2B]">Describe in any language</p>
                <p className="text-xs text-[#191917]/70 mt-0.5">
                  English, हिंदी, मराठी, Hinglish, or your native language. AI will extract form values automatically.
                </p>
              </div>
              <textarea
                className="w-full rounded-xl border border-[#1E3A2B]/20 bg-[#FAF6EE]/50 p-4 text-sm font-medium text-[#191917] outline-none placeholder:text-[#191917]/40 focus:border-[#1E3A2B] focus:ring-2 focus:ring-[#1E3A2B]/15"
                rows={3}
                name="transcript"
                minLength={10}
                maxLength={5_000}
                required
                aria-label="Describe your loan requirement in your own words"
                placeholder="Example: I run a tailoring service and need ₹1,20,000. My annual household income is ₹2,40,000. (या हिंदी में: मेरी सिलाई की दुकान है और मुझे ₹1,20,000 की जरूरत है...)"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SubmitButton pendingLabel="Analysing with AI...">Prefill Form with AI</SubmitButton>
                <span className="text-xs text-[#191917]/50">AI suggestions prefill values for your verification.</span>
              </div>
              {intentState.error && (
                <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                  {intentState.error}
                </p>
              )}
              {intentState.intent && !isVoiceFilled && (
                <div className="rounded-xl border border-[#1E3A2B]/20 bg-emerald-50/80 p-4 text-sm">
                  <p className="font-bold text-emerald-950">
                    ✓ Suggestions applied · {Math.round(intentState.intent.confidence * 100)}% confidence
                  </p>
                  {intentState.intent.warnings.map((warning) => (
                    <p className="mt-1 text-xs text-amber-800" key={warning}>⚠️ {warning}</p>
                  ))}
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* VOICE FILLED CONFIRMATION BANNER */}
      {isVoiceFilled && voiceAppliedIntent && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-extrabold text-emerald-950">
                Voice Auto-Fill Applied ({Math.round(voiceAppliedIntent.confidence * 100)}% Accuracy)
              </p>
              <p className="text-[11px] font-medium text-emerald-800">
                Transcribed from audio in <strong className="uppercase">{voiceAppliedIntent.language}</strong>. Review and confirm the prefilled details below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndoVoiceFill}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-900 shadow-xs hover:bg-emerald-100 cursor-pointer"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo Auto-Fill
          </button>
        </div>
      )}

      {/* FORM STEP 1 VERIFICATION */}
      <form action={profileAction} className="rounded-2xl border border-[#1E3A2B]/15 bg-white/95 p-6 sm:p-8 shadow-sm backdrop-blur-xs space-y-6" key={formVersion}>
        <div className="border-b border-[#1E3A2B]/10 pb-4">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#B85228]">Step 1 Verification</span>
          <h2 className="mt-1 text-xl font-black text-[#191917]">Verify basic applicant details</h2>
          <p className="text-xs font-medium text-[#1E3A2B]/75 mt-0.5">
            Review the values prefilled by AI or enter manually to proceed to deterministic scheme matching.
          </p>
        </div>

        {profileState.error && (
          <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {profileState.error}
          </p>
        )}

        {/* SECTION 1: ACTIVITY & DEMOGRAPHICS */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#1E3A2B]">1. Activity & Demographics</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191917]">Project Category *</span>
                {isVoiceFilled && activeIntent?.projectCategory && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#1E3A2B]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#1E3A2B]">
                    ✓ Auto-filled by Voice
                  </span>
                )}
              </div>
              <select
                className={`w-full rounded-xl border border-[#1E3A2B]/20 bg-[#FAF6EE]/50 px-3.5 py-2.5 text-sm font-medium text-[#191917] outline-none focus:border-[#1E3A2B] focus:ring-2 focus:ring-[#1E3A2B]/15 ${
                  isVoiceFilled && activeIntent?.projectCategory ? "border-[#1E3A2B] bg-[#1E3A2B]/5 font-bold" : ""
                }`}
                name="projectCategory"
                required
                defaultValue={activeIntent?.projectCategory ?? ""}
              >
                <option value="" disabled>Select project category...</option>
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

            <label className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191917]">Trade or Occupation</span>
                {isVoiceFilled && activeIntent?.trade && (
                  <span className="text-[10px] font-bold text-[#1E3A2B]">✓ Auto-filled</span>
                )}
              </div>
              <input
                className={`w-full rounded-xl border border-[#1E3A2B]/20 bg-[#FAF6EE]/50 px-3.5 py-2.5 text-sm font-medium text-[#191917] outline-none focus:border-[#1E3A2B] focus:ring-2 focus:ring-[#1E3A2B]/15 ${
                  isVoiceFilled && activeIntent?.trade ? "border-[#1E3A2B] bg-[#1E3A2B]/5 font-bold" : ""
                }`}
                name="trade"
                defaultValue={activeIntent?.trade ?? ""}
                placeholder="e.g. Tailoring, Carpentry, Pottery"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-[#191917]">Age *</span>
              <input
                className="w-full rounded-xl border border-[#1E3A2B]/20 bg-[#FAF6EE]/50 px-3.5 py-2.5 text-sm font-medium text-[#191917] outline-none focus:border-[#1E3A2B] focus:ring-2 focus:ring-[#1E3A2B]/15"
                type="number"
                name="age"
                min="18"
                max="100"
                required
                placeholder="e.g. 28"
              />
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191917]">Gender *</span>
                {isVoiceFilled && activeIntent?.suggestedGender && (
                  <span className="text-[10px] font-bold text-[#1E3A2B]">✓ Suggested by Voice</span>
                )}
              </div>
              <select
                className={`w-full rounded-xl border border-[#1E3A2B]/20 bg-[#FAF6EE]/50 px-3.5 py-2.5 text-sm font-medium text-[#191917] outline-none focus:border-[#1E3A2B] focus:ring-2 focus:ring-[#1E3A2B]/15 ${
                  isVoiceFilled && activeIntent?.suggestedGender ? "border-[#1E3A2B] bg-[#1E3A2B]/5 font-bold" : ""
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
          </div>
        </div>

        {/* SECTION 2: FINANCIAL PARAMETERS */}
        <div className="space-y-4 pt-2 border-t border-[#1E3A2B]/10">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#1E3A2B]">2. Financial Parameters</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191917]">Requested Loan Amount (₹)</span>
                {isVoiceFilled && activeIntent?.requestedAmount && (
                  <span className="text-[10px] font-bold text-[#B85228]">⚡ Extracted</span>
                )}
              </div>
              <input
                className="w-full rounded-xl border border-[#1E3A2B]/20 bg-[#FAF6EE]/50 px-3.5 py-2.5 text-sm font-bold text-[#191917] outline-none focus:border-[#1E3A2B] focus:ring-2 focus:ring-[#1E3A2B]/15"
                type="number"
                name="suggestedRequestedAmount"
                min="1"
                max="50000000"
                defaultValue={activeIntent?.requestedAmount ?? ""}
                placeholder="e.g. 150000"
              />
            </label>

            <label className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#191917]">Annual Household Income (₹)</span>
                {isVoiceFilled && activeIntent?.annualIncome && (
                  <span className="text-[10px] font-bold text-[#B85228]">⚡ Extracted</span>
                )}
              </div>
              <input
                className="w-full rounded-xl border border-[#1E3A2B]/20 bg-[#FAF6EE]/50 px-3.5 py-2.5 text-sm font-bold text-[#191917] outline-none focus:border-[#1E3A2B] focus:ring-2 focus:ring-[#1E3A2B]/15"
                type="number"
                name="suggestedAnnualIncome"
                min="0"
                max="100000000"
                defaultValue={activeIntent?.annualIncome ?? ""}
                placeholder="e.g. 240000"
              />
            </label>
          </div>

          {activeIntent?.suggestedGender && (
            <label className="flex items-start gap-3 rounded-xl border border-[#1E3A2B]/15 bg-[#FAF6EE] p-3.5">
              <input className="mt-0.5 size-4 rounded border-[#1E3A2B]/30 text-[#1E3A2B] focus:ring-[#1E3A2B]" type="checkbox" required />
              <span className="text-xs font-bold text-[#191917]">
                I reviewed the AI-suggested gender parameter and confirm the selected value is accurate.
              </span>
            </label>
          )}
        </div>

        {/* SECTION 3: APPLICANT GROUPS */}
        <div className="space-y-3 pt-2 border-t border-[#1E3A2B]/10">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#1E3A2B]">3. Applicant Category Tags</h3>
            <p className="text-xs text-[#191917]/70 mt-0.5">Select every group that applies to your household for target scheme subsidies.</p>
          </div>
          <div className="grid gap-2.5 rounded-xl border border-[#1E3A2B]/15 bg-[#FAF6EE]/40 p-4 sm:grid-cols-2 lg:grid-cols-3 max-h-60 overflow-y-auto">
            {applicantGroups.map(([value, label]) => (
              <label className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-[#1E3A2B]/5 cursor-pointer text-xs font-bold text-[#191917]" key={value}>
                <input className="size-4 rounded border-[#1E3A2B]/30 text-[#1E3A2B] focus:ring-[#1E3A2B]" type="checkbox" name="applicantTags" value={value} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-4 border-t border-[#1E3A2B]/10 flex items-center justify-end">
          <button className="button-primary bg-[#1E3A2B] hover:bg-[#162E21] text-[#F7F3E9] border-none px-8 py-3.5 text-sm font-extrabold rounded-xl shadow-md shadow-[#1E3A2B]/20 cursor-pointer transition-all" type="submit">
            Continue to Financial Details →
          </button>
        </div>
      </form>
    </div>
  );
}