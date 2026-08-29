"use client";

import { useActionState } from "react";

import {
  type DocumentActionState,
  uploadDocumentAction,
} from "@/app/(applicant)/documents/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";

const initialState: DocumentActionState = {};

const documentTypes = [
  ["INCOME_PROOF", "Income certificate / proof"],
  ["CASTE_CERTIFICATE", "Caste certificate"],
  ["AADHAAR", "Aadhaar"],
  ["PAN", "PAN"],
  ["ADDRESS_PROOF", "Address proof"],
  ["BANK_STATEMENT", "Bank statement"],
  ["PROJECT_REPORT", "Project report"],
  ["EDUCATION_CERTIFICATE", "Education certificate"],
  ["ADMISSION_LETTER", "Admission letter"],
  ["FEE_STRUCTURE", "Fee structure"],
  ["OTHER", "Other document"],
] as const;

export function DocumentUploadForm({ applicationId }: { applicationId: string }) {
  const action = uploadDocumentAction.bind(null, applicationId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="panel space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Upload supporting documents</h2>
        <p className="mt-1 text-sm text-slate-600">
          PDF, JPEG, PNG, or WebP up to 5 MB. Files are stored as authenticated assets.
        </p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-700">Document type</span>
        <select className="field" name="type" required defaultValue="INCOME_PROOF">
          {documentTypes.map(([value, label]) => (
            <option value={value} key={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-700">File</span>
        <input
          className="field py-3"
          type="file"
          name="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
        />
      </label>
      {state.message && (
        <p
          aria-live="polite"
          className={`rounded-xl p-3 text-sm font-semibold ${
            state.success ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      )}
      <SubmitButton pendingLabel="Uploading...">Upload document</SubmitButton>
    </form>
  );
}
