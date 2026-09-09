import Link from "next/link";
import type { EligibilityAssessment } from "@/lib/matching";

export const eligibilityLabels = {
  ELIGIBLE: "Meets checked requirements",
  INELIGIBLE: "Requirements not met",
  INFORMATION_MISSING: "Information missing",
};

export function EligibilityExplanation({ assessment, applicationId }: { assessment: EligibilityAssessment; applicationId: string }) {
  return <details className="mt-5 rounded-xl border border-slate-200 p-4">
    <summary className="cursor-pointer font-bold text-slate-900">{eligibilityLabels[assessment.status]} · Why?</summary>
    <p className="mt-3 text-xs text-slate-600">Based on your answers and structured catalogue rules. The lender checks documents and any additional conditions before approval. Skill readiness does not affect these checks.</p>
    <ul className="mt-4 space-y-3 text-sm">
      {assessment.checks.map(check => <li key={check.key}>
        <p className="font-semibold"><span className={check.status === "PASS" ? "text-teal-700" : check.status === "FAIL" ? "text-rose-700" : "text-amber-700"}>{check.status === "PASS" ? "Met" : check.status === "FAIL" ? "Not met" : "Missing"}</span> · {check.requirement}</p>
        <p className="text-slate-600">Your answer: {check.provided}</p>
        {check.sourceUrl && check.key !== "active" && <a className="text-teal-700 underline" href={check.sourceUrl} target="_blank" rel="noreferrer">Official scheme page</a>}
      </li>)}
    </ul>
    <p className="mt-3 text-xs text-slate-500">Links open the catalogue’s official scheme source; rule-specific sections are not recorded.</p>
    <Link className="mt-4 inline-block text-sm font-bold text-teal-700 underline" href={`/applications/${encodeURIComponent(applicationId)}/profile`}>Review or complete my answers</Link>
  </details>;
}
