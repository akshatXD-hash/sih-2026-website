"use client";

import { useActionState } from "react";
import { saveLanguageAction } from "@/app/language/actions";
import { languages, type Locale } from "@/lib/i18n";
import { T } from "./LanguageProvider";

export function LanguageSettings({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(saveLanguageAction, {});
  return <form action={action} className="mt-6 space-y-5">
    <fieldset disabled={pending} className="space-y-3">
      <legend className="mb-3 font-semibold"><T>Choose your language</T></legend>
      {Object.entries(languages).map(([code, name]) => <label key={code} className="flex cursor-pointer items-center gap-4 rounded-xl border border-[#1E3A2B]/20 bg-white p-4">
        <input type="radio" name="locale" value={code} defaultChecked={locale === code} required className="size-5 accent-[#1E3A2B]" />
        <span lang={code} className="text-lg font-semibold">{name}</span>
        <span className="ml-auto text-sm text-slate-500">{code === "kn" ? "Kannada" : code === "hi" ? "Hindi" : "English"}</span>
      </label>)}
    </fieldset>
    <button disabled={pending} type="submit" className="button-primary w-full"><T>{pending ? "Saving…" : "Save language"}</T></button>
    {state.saved && <p role="status" className="font-semibold text-teal-800"><T>Language saved</T></p>}
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
  </form>;
}
