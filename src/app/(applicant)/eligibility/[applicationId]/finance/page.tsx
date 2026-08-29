import { notFound } from "next/navigation";

import { completeEligibilityAction } from "@/app/(applicant)/actions";
import { requireApplicant } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function FinancialDetailsPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const user = await requireApplicant();
  const { applicationId } = await params;
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
    select: { id: true, projectCategory: true, requestedAmount: true, annualIncome: true },
  });
  if (!application) notFound();
  const action = completeEligibilityAction.bind(null, application.id);

  return (
    <div className="mx-auto max-w-3xl">
      <span className="eyebrow">Eligibility wizard · Step 2 of 2</span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">Add the financial details</h1>
      <p className="mt-3 text-slate-600">Category: <strong>{application.projectCategory}</strong>. Amounts are entered in Indian rupees.</p>
      <form action={action} className="panel mt-8 grid gap-6 sm:grid-cols-2">
        <label className="space-y-2"><span className="text-sm font-bold text-slate-700">Requested amount</span><input className="field" type="number" name="requestedAmount" min="1" step="0.01" required defaultValue={application.requestedAmount?.toString()} /></label>
        <label className="space-y-2"><span className="text-sm font-bold text-slate-700">Annual household income</span><input className="field" type="number" name="annualIncome" min="0" step="0.01" required defaultValue={application.annualIncome?.toString()} /></label>
        <div className="sm:col-span-2"><button className="button-primary" type="submit">Find matching schemes</button></div>
      </form>
    </div>
  );
}
