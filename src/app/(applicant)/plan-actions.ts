"use server";

import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApplicant } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { buildActionPlan, relevantSkills, skillLevels } from "@/lib/action-plan";

export async function saveCompetenciesAction(applicationId: string, formData: FormData) {
  const user = await requireApplicant();
  const application = await prisma.application.findFirst({ where: { id: applicationId, userId: user.id }, include: { loanScheme: true } });
  if (!application) notFound();
  const skills = relevantSkills(application.loanScheme?.category ?? application.projectCategory);
  const entries = skills.map(skill => ({ skillKey: skill.key, level: z.enum(skillLevels).parse(formData.get(skill.key)) }));
  await prisma.$transaction(entries.map(entry => prisma.applicantCompetency.upsert({
    where: { applicationId_skillKey: { applicationId, skillKey: entry.skillKey } },
    create: { applicationId, ...entry }, update: { level: entry.level },
  })));
  revalidatePath("/applications/new");
}

export async function setPlanTaskAction(applicationId: string, taskKey: string, completed: boolean) {
  const user = await requireApplicant();
  z.string().max(100).parse(taskKey);
  z.boolean().parse(completed);
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
    include: { loanScheme: true, documents: true, planTasks: true, competencies: true },
  });
  if (!application) notFound();
  // Never accept client-controlled completion of eligibility or document tasks.
  if (!buildActionPlan(application).recommended.some(task => task.key === taskKey && task.manual)) throw new Error("This task cannot be manually updated");
  await prisma.applicationTask.upsert({
    where: { applicationId_taskKey: { applicationId, taskKey } },
    create: { applicationId, taskKey, completedAt: completed ? new Date() : null },
    update: { completedAt: completed ? new Date() : null },
  });
  revalidatePath("/applications/new");
}
