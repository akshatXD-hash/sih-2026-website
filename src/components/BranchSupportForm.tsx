"use client";
import { useActionState } from "react";
import { saveBranchSupport } from "@/app/(admin)/admin/branch-support/actions";

export function BranchSupportForm({ branchId, branchType, schemes }: {
  branchId: string; branchType: string; schemes: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(saveBranchSupport, {});
  return <form action={action} className="panel space-y-4">
    <input type="hidden" name="branchId" value={branchId} />
    <input type="hidden" name="branchType" value={branchType} />
    <label className="block text-sm font-semibold">Scheme<select className="field mt-1" name="schemeId" required>{schemes.map(scheme => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}</select></label>
    <label className="block text-sm font-semibold">Branch confirmation<select className="field mt-1" name="status" defaultValue="UNKNOWN"><option value="UNKNOWN">Unconfirmed / withdraw earlier confirmation</option><option value="SUPPORTED">Confirmed: this specific branch handles the scheme</option><option value="NOT_SUPPORTED">Confirmed: this specific branch does not handle the scheme</option></select></label>
    <label className="block text-sm font-semibold">Public evidence link<input className="field mt-1" type="url" name="evidenceUrl" placeholder="https://..." required maxLength={1000} /></label>
    <p className="text-xs text-slate-600">Use an official branch-specific listing or a publishable record of branch confirmation. A bank-wide scheme advertisement or map listing alone is insufficient. Do not include private applicant information.</p>
    <label className="block text-sm font-semibold">What was checked?<textarea className="field mt-1 min-h-24" name="notes" minLength={15} maxLength={1000} required placeholder="Identify the exact branch, scheme and evidence supporting this status. Visible to applicants." /></label>
    <label className="block text-sm font-semibold">Date checked<input className="field mt-1" type="date" name="verifiedDate" max={new Date().toISOString().slice(0, 10)} required /></label>
    <p className="text-xs text-slate-600">Confirmation expires 90 days after the check date. Saving keeps earlier reviews in the history.</p>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    {state.saved && <p role="status" className="text-sm text-emerald-800">Verification saved. Applicant searches now use the latest review.</p>}
    <button className="button-primary" disabled={pending}>{pending ? "Saving…" : "Save verification"}</button>
  </form>;
}
