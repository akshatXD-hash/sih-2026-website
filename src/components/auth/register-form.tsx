"use client";

import Link from "next/link";
import { useActionState } from "react";

import { registerAction } from "@/app/actions/auth";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Full name</span>
        <input className="field" name="name" autoComplete="name" required />
        {state?.errors?.name && (
          <span className="field-error">{state.errors.name[0]}</span>
        )}
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Email address</span>
        <input className="field" type="email" name="email" autoComplete="email" required />
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
          autoComplete="new-password"
          minLength={8}
          required
        />
        <span className="text-xs text-slate-500">At least 8 characters, with a letter and number.</span>
        {state?.errors?.password && (
          <span className="field-error">{state.errors.password[0]}</span>
        )}
      </label>
      {state?.message && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" aria-live="polite">
          {state.message}
        </p>
      )}
      <button className="button-primary w-full cursor-pointer" disabled={pending} type="submit">
        {pending ? "Creating account…" : "Create applicant account"}
      </button>
      <p className="text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
