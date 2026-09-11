"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { loginDestination } from "@/lib/auth/roles";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Name must have at least 2 characters"),
  password: z
    .string()
    .min(8, "Password must have at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export async function loginAction(
  _previousState: unknown,
  formData: FormData,
) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  let account;
  try {
    account = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { role: true } });
  } catch {
    return { message: "Sign-in is temporarily unavailable. Please try again shortly." };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: loginDestination(account?.role, formData.get("next")),
    });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      return { message: "Email or password is incorrect." };
    }
    if (error instanceof AuthError) {
      return { message: "Sign-in is temporarily unavailable. Please try again shortly." };
    }
    throw error;
  }
}

export async function registerAction(
  _previousState: unknown,
  formData: FormData,
) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (existing) {
      return { message: "An account already exists for this email." };
    }

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: await hash(parsed.data.password, 12),
        role: UserRole.APPLICANT,
      },
    });
  } catch {
    return { message: "The account could not be created. Please try again." };
  }

  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/eligibility",
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
