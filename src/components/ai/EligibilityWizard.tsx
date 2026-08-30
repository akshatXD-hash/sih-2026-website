"use client";

import { useActionState } from "react";

import { startEligibilityAction } from "@/app/(applicant)/actions";
import {
  extractApplicantIntentAction,
  type IntentActionState,
} from "@/app/(applicant)/ai/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";

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
  const formVersion = intentState.intent
    ? [
        intentState.intent.projectCategory,
        intentState.intent.confidence,
        intentState.intent.requestedAmount ?? "",
        intentState.intent.annualIncome ?? "",
        intentState.intent.trade ?? "",
        intentState.intent.suggestedGender ?? "",
      ].join(":")
    : "manual";

  return (
    <div className="space-y-6">
      <form action={intentAction} className="panel border-violet-200 bg-violet-50/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">AI-assisted intake</span>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Describe your need in your own words</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              The assistant can prefill the form. You review every value before anything is saved.
            </p>
          </div>
          <select className="field w-auto min-w-36" name="language" aria-label="Assistant language" defaultValue="en">
            <option value="en">English</option>
            <option value="hi">Hindi</option>
          </select>
        </div>
        <textarea
          className="field mt-4 min-h-32 py-3"
          name="transcript"
          minLength={10}
          maxLength={5_000}
          required
          placeholder="Example: I run a tailoring service and need ₹1,20,000. My annual household income is ₹2,40,000."
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
        {intentState.intent && (
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
          <span className="text-sm font-bold text-slate-700">Project category</span>
          <select
            className="field"
            name="projectCategory"
            required
            defaultValue={intentState.intent?.projectCategory ?? ""}
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
          <span className="text-sm font-bold text-slate-700">Trade or occupation</span>
          <input
            className="field"
            name="trade"
            defaultValue={intentState.intent?.trade ?? ""}
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
          <span className="text-sm font-bold text-slate-700">Gender</span>
          <select className="field" name="gender" required defaultValue={intentState.intent?.suggestedGender ?? "PREFER_NOT_TO_SAY"}>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="TRANSGENDER">Transgender</option>
            <option value="NON_BINARY">Non-binary</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
        </label>

        {intentState.intent && (
          <div className="grid gap-4 rounded-xl border border-teal-200 bg-teal-50/50 p-4 sm:col-span-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="font-bold text-teal-950">Review the AI-filled financial values</p>
              <p className="mt-1 text-xs text-teal-800">These will prefill step 2 and can still be changed there.</p>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Requested amount</span>
              <input className="field" type="number" name="suggestedRequestedAmount" min="1" max="50000000" defaultValue={intentState.intent.requestedAmount ?? ""} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Annual household income</span>
              <input className="field" type="number" name="suggestedAnnualIncome" min="0" max="100000000" defaultValue={intentState.intent.annualIncome ?? ""} />
            </label>
            {intentState.intent.suggestedGender && (
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
