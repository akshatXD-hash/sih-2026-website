import "server-only";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function requireAshaWorker() {
  const user = await getCurrentUser();
  if (!user?.isActive) redirect("/login");
  if (user.role !== "ASHA_WORKER") redirect("/unauthorized");
  return user;
}

export async function ownedAshaCase(caseId: string) {
  const worker = await requireAshaWorker();
  const record = await prisma.ashaCase.findFirst({
    where: { id: caseId, workerId: worker.id },
    include: { applicant: { select: { name: true } }, application: { include: { loanScheme: true, documents: { orderBy: { createdAt: "desc" } } } } },
  });
  if (!record) notFound();
  return { worker, record };
}
