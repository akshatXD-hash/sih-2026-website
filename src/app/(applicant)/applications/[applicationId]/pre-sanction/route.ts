import { createPreSanctionPdf } from "@/lib/pre-sanction-pdf";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasAdminAccess } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: RouteContext<"/applications/[applicationId]/pre-sanction">,
) {
  const user = await getCurrentUser();
  if (!user?.isActive) return new Response("Unauthorized", { status: 401 });
  const { applicationId } = await context.params;
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: { select: { name: true, email: true } },
      loanScheme: true,
      channelPartner: true,
      _count: { select: { documents: true } },
    },
  });
  if (!application) return new Response("Not found", { status: 404 });
  if (application.userId !== user.id && !hasAdminAccess(user.role)) {
    return new Response("Not found", { status: 404 });
  }
  if (!application.loanScheme || !application.channelPartner) {
    return new Response("Select a scheme and branch before generating this summary", { status: 409 });
  }

  const bytes = await createPreSanctionPdf({
    referenceNumber: application.referenceNumber,
    status: application.status,
    generatedAt: new Date(),
    applicantName: application.user.name,
    applicantEmail: application.user.email,
    projectCategory: application.projectCategory,
    trade: application.trade,
    requestedAmount: application.requestedAmount == null ? null : Number(application.requestedAmount),
    annualIncome: application.annualIncome == null ? null : Number(application.annualIncome),
    gender: application.gender,
    schemeName: application.loanScheme.name,
    schemeProvider: application.loanScheme.provider,
    interestRateMin: application.loanScheme.interestRateMin == null ? null : Number(application.loanScheme.interestRateMin),
    interestRateMax: application.loanScheme.interestRateMax == null ? null : Number(application.loanScheme.interestRateMax),
    branchName: application.channelPartner.name,
    branchAddress: [
      application.channelPartner.addressLine,
      application.channelPartner.district,
      application.channelPartner.state,
      application.channelPartner.pincode,
    ].filter(Boolean).join(", "),
    documentCount: application._count.documents,
  });
  const safeReference = application.referenceNumber.replaceAll(/[^A-Za-z0-9_-]/g, "_");

  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="pre-sanction-${safeReference}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
