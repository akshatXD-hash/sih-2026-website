"use client";

import { useActionState } from "react";
import { updateEligibilityProfileAction } from "@/app/(applicant)/actions";
import { Gender } from "@/generated/prisma/enums";

const tags = ["SC", "ST", "OBC", "MINORITY", "STREET_VENDOR", "ARTISAN", "SHG_MEMBER", "FARMER", "AGRI_ENTREPRENEUR", "AGRICULTURE_GRADUATE", "AGRICULTURE_GRADUATE_GROUP", "URBAN_POOR", "URBAN_POOR_GROUP", "SAFAI_KARAMCHARI", "PERSON_WITH_DISABILITY"];
export function ProfileEditor({ application }: { application: { id: string; projectCategory: string | null; trade: string | null; age: number | null; gender: string | null; applicantTags: string[]; requestedAmount: string; annualIncome: string } }) {
  const [state, action, pending] = useActionState(updateEligibilityProfileAction.bind(null, application.id), {});
  const inputClass = "mt-2 block w-full rounded-lg border border-slate-300 p-3";
  return <form action={action} className="mt-6 space-y-5">
    <p className="text-sm text-slate-600">Saving recalculates your matches and clears the current scheme and branch selection. Your documents and practice progress remain saved. Leave an unknown financial amount blank; enter 0 only for actual zero annual income.</p>
    <div className="grid gap-5 sm:grid-cols-2">
      <label>Project category<input required minLength={2} maxLength={80} list="project-categories" name="projectCategory" defaultValue={application.projectCategory ?? ""} className={inputClass} /><datalist id="project-categories">{["micro-enterprise", "manufacturing", "services", "trading", "agriculture-allied", "higher-education-india", "higher-education-abroad", "vocational-education"].map(value => <option key={value} value={value} />)}</datalist></label>
      <label>Trade<input name="trade" maxLength={80} defaultValue={application.trade ?? ""} className={inputClass} /></label>
      <label>Age<input required type="number" min={18} max={100} name="age" defaultValue={application.age ?? ""} className={inputClass} /></label>
      <label>Gender<select required name="gender" defaultValue={application.gender ?? ""} className={inputClass}><option value="" disabled>Select</option>{Object.values(Gender).map(value => <option value={value} key={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <label>Requested amount (₹)<input type="number" min="0.01" max={50000000} step="0.01" name="requestedAmount" defaultValue={application.requestedAmount} className={inputClass} /></label>
      <label>Annual income (₹)<input type="number" min={0} max={100000000} step="0.01" name="annualIncome" defaultValue={application.annualIncome} className={inputClass} /></label>
    </div>
    <fieldset><legend className="font-semibold">Applicant categories that apply to you</legend><p className="mt-1 text-sm text-slate-500">Leaving all unchecked means none apply.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{tags.map(tag => <label key={tag} className="flex gap-2 text-sm"><input type="checkbox" name="applicantTags" value={tag} defaultChecked={application.applicantTags.includes(tag)} />{tag.replaceAll("_", " ")}</label>)}</div></fieldset>
    {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
    <button className="button-primary" disabled={pending} type="submit">{pending ? "Saving…" : "Save and recalculate matches"}</button>
  </form>;
}
