import { requireAshaWorker } from "@/lib/asha/access";
import { VillagerForm } from "@/components/asha/VillagerForm";
import { T } from "@/components/language/LanguageProvider";
export default async function NewAssistedCase() {
  await requireAshaWorker();
  return <section className="panel mx-auto max-w-3xl"><h1 className="text-3xl font-bold"><T>Help a villager</T></h1><p className="mb-6 mt-3 text-sm text-slate-600">Explain each question in the villager&apos;s language. No email or personal login is needed. Check your dashboard first to avoid duplicate applications.</p><VillagerForm /></section>;
}
