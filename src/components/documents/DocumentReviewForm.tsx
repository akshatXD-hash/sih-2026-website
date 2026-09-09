"use client";

import { useActionState, useId, useState } from "react";
import { reviewDocumentAction } from "@/app/(admin)/admin/actions";

export function DocumentReviewForm({ applicationId, documentId }: { applicationId: string; documentId: string }) {
  const [state, action, pending] = useActionState(reviewDocumentAction.bind(null, applicationId, documentId), {});
  const [reason, setReason] = useState("");
  const id = useId();
  return <form action={action} className="mt-4 space-y-3">
    <label className="block text-sm font-semibold" htmlFor={id}>Reason for rejection <span className="font-normal text-slate-500">(required only for Reject)</span></label>
    <textarea id={id} name="reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={500} disabled={pending} className="field min-h-20 py-3" placeholder="For example: The image is blurry. Please upload a clearer copy." aria-describedby={state.error ? `${id}-error` : undefined} />
    {state.error && <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="text-sm font-semibold text-teal-700">{state.success}</p>}
    <div className="flex flex-wrap gap-3">
      <button className="button-primary" name="decision" value="verify" type="submit" disabled={pending || Boolean(state.success)}>Verify document</button>
      <button className="button-secondary" name="decision" value="reject" type="submit" disabled={pending || Boolean(state.success)}>Reject document</button>
      {pending && <span role="status" className="text-sm text-slate-500">Saving review…</span>}
    </div>
  </form>;
}
