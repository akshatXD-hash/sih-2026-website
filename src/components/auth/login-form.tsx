"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction } from "@/app/actions/auth";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={nextPath ?? "/eligibility"} />
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Email address</span>
        <input
          className="field"
          type="email"
          name="email"
          autoComplete="email"
          required
        />
        {state?.errors?.email && (
          <span className="field-error">{state.errors.email[0]}</span>
        )}
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Password</span>
        <input
          className="field"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
        {state?.errors?.password && (
          <span className="field-error">{state.errors.password[0]}</span>
        )}
      </label>
      {state?.message && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" aria-live="polite">
          {state.message}
        </p>
      )}
      <button className="button-primary w-full" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-slate-600">
        New applicant?{" "}
        <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/register">
          Create an account
        </Link>
      </p>
    </form>
  );
}
