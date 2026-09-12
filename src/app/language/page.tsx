import Link from "next/link";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, localeOrDefault } from "@/lib/i18n";
import { LanguageSettings } from "@/components/language/LanguageSettings";
import { T } from "@/components/language/LanguageProvider";
import { getCurrentUser } from "@/lib/auth/guards";
import { workspacePath } from "@/lib/auth/roles";

export default async function LanguagePage() {
  const locale = localeOrDefault((await cookies()).get(LANGUAGE_COOKIE)?.value);
  const user = await getCurrentUser();
  return <main className="min-h-screen bg-[#F7F3E9] px-5 py-10">
    <section className="panel mx-auto max-w-xl">
      <h1 className="text-3xl font-bold"><T>Choose your language</T></h1>
      <p className="mt-3 text-slate-600"><T>Choose the language used for menus, buttons and form labels.</T></p>
      <LanguageSettings locale={locale} />
      <p className="mt-5 text-sm text-slate-600"><T>Your choice is remembered on this device. You can change it anytime.</T></p>
      <p className="mt-3 text-sm text-slate-600"><T>Official scheme descriptions, uploaded documents and personal details stay in their original language.</T></p>
      <Link className="mt-6 inline-block font-semibold text-teal-800 underline" href={user?.isActive ? workspacePath(user.role) : "/"}><T>Back to website</T></Link>
    </section>
  </main>;
}
