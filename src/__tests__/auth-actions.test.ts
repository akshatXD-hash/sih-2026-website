import { beforeEach, expect, it, vi } from "vitest";
import { AuthError } from "next-auth";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn(), signIn: vi.fn() }));
vi.mock("next-auth", async () => ({ AuthError: (await import("@auth/core/errors")).AuthError }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique, create: mocks.create } } }));
vi.mock("@/auth", () => ({ signIn: mocks.signIn, signOut: vi.fn() }));

import { loginAction, registerAction } from "@/app/actions/auth";

beforeEach(() => vi.resetAllMocks());

function credentials() {
  const data = new FormData();
  data.set("email", "test@example.invalid");
  data.set("password", "test-password123");
  data.set("name", "Test Applicant");
  return data;
}

it("returns a safe form error when the account query fails", async () => {
  mocks.findUnique.mockRejectedValue(new Error("private database details"));
  const result = await loginAction(undefined, credentials());
  expect(result).toEqual({ message: "Sign-in is temporarily unavailable. Please try again shortly." });
  expect(mocks.signIn).not.toHaveBeenCalled();
});

it("handles a service failure during credential verification", async () => {
  mocks.findUnique.mockResolvedValue({ role: "APPLICANT" });
  mocks.signIn.mockRejectedValue(new AuthError());
  expect(await loginAction(undefined, credentials())).toEqual({ message: "Sign-in is temporarily unavailable. Please try again shortly." });
});

it("preserves invalid-credential feedback", async () => {
  mocks.findUnique.mockResolvedValue(null);
  const error = new AuthError();
  error.type = "CredentialsSignin";
  mocks.signIn.mockRejectedValue(error);
  expect(await loginAction(undefined, credentials())).toEqual({ message: "Email or password is incorrect." });
});

it("lets successful Next.js redirects propagate and keeps officer routing", async () => {
  mocks.findUnique.mockResolvedValue({ role: "ADMIN" });
  const redirect = new Error("NEXT_REDIRECT");
  mocks.signIn.mockRejectedValue(redirect);
  await expect(loginAction(undefined, credentials())).rejects.toBe(redirect);
  expect(mocks.signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ redirectTo: "/admin" }));
});

it("keeps registration query failures inside the form", async () => {
  mocks.findUnique.mockRejectedValue(new Error("database unavailable"));
  expect(await registerAction(undefined, credentials())).toEqual({ message: "The account could not be created. Please try again." });
  expect(mocks.create).not.toHaveBeenCalled();
});
