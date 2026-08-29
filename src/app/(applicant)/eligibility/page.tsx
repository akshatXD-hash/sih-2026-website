import { EligibilityWizard } from "@/components/ai/EligibilityWizard";
import { requireApplicant } from "@/lib/auth/guards";

export default async function EligibilityPage() {
  await requireApplicant();
  return (
    <div className="mx-auto max-w-3xl">
      <span className="eyebrow">Eligibility wizard · Step 1 of 2</span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">Tell us what you need funding for</h1>
      <p className="mt-3 text-slate-600">This creates a private draft tied to your account. Matching stays deterministic and explainable.</p>
      <div className="mt-8"><EligibilityWizard /></div>
    </div>
  );
}
