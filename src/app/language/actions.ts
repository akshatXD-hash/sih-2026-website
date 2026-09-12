"use server";

import { cookies } from "next/headers";
import { isLocale, LANGUAGE_COOKIE } from "@/lib/i18n";

export interface LanguageState { saved?: boolean; error?: string }
export async function saveLanguageAction(_state: LanguageState, form: FormData): Promise<LanguageState> {
  const locale = form.get("locale");
  if (!isLocale(locale)) return { error: "Choose one of the listed languages." };
  (await cookies()).set(LANGUAGE_COOKIE, locale, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { saved: true };
}
