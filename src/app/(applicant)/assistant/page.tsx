import { SchemeChat } from "@/components/ai/SchemeChat";
import { requireApplicant } from "@/lib/auth/guards";

export default async function SchemeAssistantPage() {
  await requireApplicant();
  return <SchemeChat />;
}
