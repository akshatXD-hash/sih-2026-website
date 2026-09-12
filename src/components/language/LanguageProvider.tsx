"use client";

import { createContext, useContext, type ReactNode } from "react";
import { translate, type Locale } from "@/lib/i18n";

const LanguageContext = createContext<Locale>("en");
export function LanguageProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LanguageContext.Provider value={locale}>{children}</LanguageContext.Provider>;
}
export function useTranslate() {
  const locale = useContext(LanguageContext);
  return (text: string) => translate(locale, text);
}
export function T({ children }: { children: string }) {
  const t = useTranslate();
  return <>{t(children)}</>;
}
