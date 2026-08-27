import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess, hasApplicantAccess } from "@/lib/auth/roles";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });
});

export async function requireApplicant() {
  const user = await getCurrentUser();
  if (!user?.isActive) redirect("/login");
  if (!hasApplicantAccess(user.role)) redirect("/unauthorized");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isActive) redirect("/login");
  if (!hasAdminAccess(user.role)) redirect("/unauthorized");
  return user;
}
