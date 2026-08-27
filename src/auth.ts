import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost:
    process.env.AUTH_TRUST_HOST === "true" ||
    process.env.NODE_ENV === "development",
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            isActive: true,
          },
        });

        if (!user?.passwordHash || !user.isActive) return null;

        const passwordMatches = await compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!passwordMatches) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      return session;
    },
  },
});
