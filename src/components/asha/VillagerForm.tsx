import { saveAshaCaseAction } from "@/app/(asha)/asha-worker/actions";
import { applicantTags, projectCategories } from "@/lib/asha/forms";
import { Gender } from "@/generated/prisma/enums";
import { AshaForm } from "./AshaForm";
import { T } from "@/components/language/LanguageProvider";

export interface VillagerValues {
  name?: string; village?: string; phone?: string | null; contactName?: string | null; contactKind?: string;
  projectCategory?: string | null; trade?: string | null; gender?: string | null; age?: number | null;
  annualIncome?: string; requestedAmount?: string; applicantTags?: string[];
}
export function VillagerForm({ caseId = null, values = {} }: { caseId?: string | null; values?: VillagerValues }) {
  return <AshaForm action={saveAshaCaseAction.bind(null, caseId)} label={caseId ? "Save draft changes" : "Create assisted draft"}>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold"><T>Villager name</T><input name="name" className="field mt-2" defaultValue={values.name} required minLength={2} maxLength={100} autoComplete="off" /></label>
      <label className="block text-sm font-semibold"><T>Village</T><input name="village" className="field mt-2" defaultValue={values.village} required minLength={2} maxLength={100} /></label>
      <label className="block text-sm font-semibold"><T>Phone number</T><input name="phone" type="tel" inputMode="tel" className="field mt-2" defaultValue={values.phone ?? ""} maxLength={20} placeholder="10-digit mobile or +91" /></label>
      <label className="block text-sm font-semibold"><T>Whose number?</T><select name="contactKind" className="field mt-2" defaultValue={values.contactKind ?? "NONE"}><option value="NONE">No phone available</option><option value="SELF">Villager&apos;s own phone</option><option value="FAMILY">Family contact</option></select></label>
      <label className="block text-sm font-semibold sm:col-span-2"><T>Family contact name and relationship</T><input name="contactName" className="field mt-2" defaultValue={values.contactName ?? ""} maxLength={100} placeholder="Only needed for a family contact" /></label>
      <label className="block text-sm font-semibold"><T>Project category</T><select name="projectCategory" className="field mt-2" defaultValue={values.projectCategory ?? ""} required><option value="" disabled>Select project category</option>{projectCategories.map(category => <option key={category} value={category}>{category.replaceAll("-", " ")}</option>)}</select></label>
      <label className="block text-sm font-semibold"><T>Trade or Occupation</T><input name="trade" className="field mt-2" defaultValue={values.trade ?? ""} maxLength={80} placeholder="e.g. tailoring" /></label>
      <label className="block text-sm font-semibold"><T>Age</T><input name="age" className="field mt-2" type="number" min={18} max={100} defaultValue={values.age ?? ""} /></label>
      <label className="block text-sm font-semibold"><T>Gender</T><select name="gender" className="field mt-2" defaultValue={values.gender ?? ""}><option value="">Not provided</option>{Object.values(Gender).map(gender => <option key={gender} value={gender}>{gender.replaceAll("_", " ")}</option>)}</select></label>
      <label className="block text-sm font-semibold"><T>Annual income</T> (₹)<input name="annualIncome" className="field mt-2" type="number" min={0} max={100000000} step="0.01" defaultValue={values.annualIncome ?? ""} /></label>
      <label className="block text-sm font-semibold"><T>Requested amount</T> (₹)<input name="requestedAmount" className="field mt-2" type="number" min="0.01" max={50000000} step="0.01" defaultValue={values.requestedAmount ?? ""} /></label>
    </div>
    <p className="text-xs text-slate-500">Leave unknown age or amounts blank. Enter zero income only if the villager confirms it.</p>
    <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-semibold">Applicant categories</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{applicantTags.map(tag => <label key={tag} className="flex gap-2 text-sm"><input type="checkbox" name="applicantTags" value={tag} defaultChecked={values.applicantTags?.includes(tag)} />{tag.replaceAll("_", " ")}</label>)}</div></details>
    {!caseId ? <label className="flex items-start gap-3 rounded-xl bg-teal-50 p-4 text-sm"><input className="mt-1" type="checkbox" name="consent" value="yes" required /><span>I explained in a language the villager understands that I will record their details, contact number and documents to help with a scheme application. The villager agreed to this assistance and to the chosen contact being used for follow-ups.</span></label> : <p className="text-sm text-amber-800">Changing answers clears the selected scheme and branch so eligibility can be checked again.</p>}
  </AshaForm>;
}
