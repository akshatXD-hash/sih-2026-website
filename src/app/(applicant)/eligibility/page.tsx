import { EligibilityWizard } from "@/components/ai/EligibilityWizard";
import { requireApplicant } from "@/lib/auth/guards";

export default async function EligibilityPage() {
  await requireApplicant();
  return (
    <div className="mx-auto max-w-3xl">
      <span className="eyebrow">Your details · Step 1 of 2</span>
      <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191917] leading-tight">Tell us what you need funding for</h1>
      <p className="mt-2.5 text-sm sm:text-base text-[#1E3A2B]/75 leading-relaxed">Your answers help us find schemes you may qualify for. You can review everything before applying.</p>
      <div className="mt-8"><EligibilityWizard /></div>
    </div>
  );
}
