import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApplicant } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { ProfileEditor } from "@/components/applications/ProfileEditor";

export default async function EditProfilePage({ params }: { params: Promise<{ applicationId: string }> }) {
  const user = await requireApplicant();
  const { applicationId } = await params;
  const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id } });
  if (!application) notFound();
  return <section className="panel mx-auto max-w-3xl"><h1 className="text-3xl font-bold">Review your eligibility answers</h1>
    {application.status === "DRAFT" ? <ProfileEditor application={{ id: application.id, projectCategory: application.projectCategory, trade: application.trade, age: application.age, gender: application.gender, applicantTags: application.applicantTags, requestedAmount: application.requestedAmount?.toString() ?? "", annualIncome: application.annualIncome?.toString() ?? "" }} /> : <p className="mt-4 text-slate-600">This application has already left draft status. Contact your branch to correct submitted information.</p>}
    <Link className="mt-6 inline-block text-teal-700 underline" href={`/applications/new?applicationId=${encodeURIComponent(applicationId)}`}>Back to my application</Link>
  </section>;
}
