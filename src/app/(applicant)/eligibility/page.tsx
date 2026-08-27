import { startEligibilityAction } from "@/app/(applicant)/actions";
import { requireApplicant } from "@/lib/auth/guards";

export default async function EligibilityPage() {
  await requireApplicant();
  return (
    <div className="mx-auto max-w-3xl">
      <span className="eyebrow">Eligibility wizard · Step 1 of 2</span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">Tell us what you need funding for</h1>
      <p className="mt-3 text-slate-600">This creates a private draft tied to your account. Matching stays deterministic and explainable.</p>
      <form action={startEligibilityAction} className="panel mt-8 grid gap-6 sm:grid-cols-2">
        <label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold text-slate-700">Project category</span><select className="field" name="projectCategory" required defaultValue=""><option value="" disabled>Select a category</option><option value="micro-enterprise">Micro enterprise</option><option value="agriculture-allied">Agriculture allied</option><option value="manufacturing">Manufacturing</option><option value="services">Services</option><option value="trading">Trading</option><option value="higher-education-india">Higher education in India</option><option value="higher-education-abroad">Higher education abroad</option><option value="vocational-education">Vocational education</option></select></label>
        <label className="space-y-2"><span className="text-sm font-bold text-slate-700">Trade or occupation</span><input className="field" name="trade" placeholder="e.g. tailoring" /></label>
        <label className="space-y-2"><span className="text-sm font-bold text-slate-700">Gender</span><select className="field" name="gender" required defaultValue="PREFER_NOT_TO_SAY"><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="TRANSGENDER">Transgender</option><option value="NON_BINARY">Non-binary</option><option value="OTHER">Other</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></label>
        <div className="sm:col-span-2"><button className="button-primary" type="submit">Continue to financial details</button></div>
      </form>
    </div>
  );
}
