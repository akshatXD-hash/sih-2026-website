import { evaluateEligibility, type EligibilityProfile, type Scheme } from "@/lib/matching";

export const skillLevels = ["NOT_SURE", "LEARNING", "CONFIDENT"] as const;
export const skillLevelLabels = { NOT_SURE: "Not sure yet", LEARNING: "I need practice", CONFIDENT: "I can do this independently" };
export const businessSkills = [
  { key: "costing", title: "Business costing", exercise: "Make a costing sheet for one product: materials + labour + packaging + delivery + a share of monthly overheads. Subtract this total from your selling price to find profit per item. For services, use one job instead of one product." },
  { key: "records", title: "Keeping business records", exercise: "Create a cashbook with date, description, money received, money spent and balance. Enter seven days of transactions. Compare the closing balance with your cash and bank records." },
  { key: "marketing", title: "Finding customers", exercise: "Describe your product or service, its price and who needs it. Create a sample listing with a clear photo, dimensions or service scope, delivery time and contact details. Ask three potential customers for feedback." },
];
export const educationSkills = [
  { key: "study-budget", title: "Planning study costs", exercise: "List tuition, accommodation, books and travel for each year. Subtract scholarships and family contributions. Compare the remaining cost with your requested loan amount." },
  { key: "document-organisation", title: "Organising application evidence", exercise: "Make a folder for admission, fee structure, academic records and co-borrower documents. Check names and dates against the application, and list anything that needs correction." },
];
export function relevantSkills(category?: string | null) {
  return category?.toLowerCase().includes("education") ? educationSkills : businessSkills;
}

export interface PlanTask {
  key: string;
  title: string;
  detail: string;
  done: boolean;
  manual: boolean;
  href?: string;
}
export interface PlanInput extends EligibilityProfile {
  id: string;
  channelPartnerId?: string | null;
  preferredBankId?: string | null;
  loanScheme?: (Scheme & { requiredDocuments: string[] }) | null;
  documents: { type: string; status: string }[];
  planTasks: { taskKey: string; completedAt: Date | null }[];
  competencies: { skillKey: string; level: string }[];
}

// Only unambiguous labels map to upload types. OTHER cannot prove a specific
// certificate or the subject of a co-borrower document.
const documentTypes: Record<string, string> = {
  "aadhaar card": "AADHAAR", "pan card": "PAN", "bank statements": "BANK_STATEMENT",
  "business plan or project report": "PROJECT_REPORT", "academic records": "EDUCATION_CERTIFICATE",
  "admission letter": "ADMISSION_LETTER", "fee structure": "FEE_STRUCTURE",
  "income certificate": "INCOME_PROOF", "address proof": "ADDRESS_PROOF",
};

export function buildActionPlan(application: PlanInput) {
  const base = `/applications/new?applicationId=${encodeURIComponent(application.id)}`;
  const profileHref = `/applications/${encodeURIComponent(application.id)}/profile`;
  const required: PlanTask[] = [];
  const scheme = application.loanScheme;
  if (scheme) {
    for (const check of evaluateEligibility(application, scheme).checks.filter(c => c.status !== "PASS")) {
      required.push({ key: `eligibility:${scheme.slug}:${check.key}`, title: check.requirement,
        detail: check.status === "UNKNOWN" ? "Add the missing answer so this rule can be checked." : `Current answer: ${check.provided}. Review your answer or choose another scheme; changing an answer must reflect your actual circumstances.`,
        done: false, manual: false, href: profileHref });
    }
  } else {
    const complete = application.annualIncome != null && application.requestedAmount != null && Boolean(application.projectCategory);
    required.push({ key: "profile", title: "Complete your eligibility profile", detail: "Provide your project category, requested amount and annual income.", done: complete, manual: false, href: profileHref });
  }
  required.push({ key: "scheme", title: "Choose a suitable scheme", detail: "Read the rule-by-rule explanation before selecting.", done: Boolean(scheme), manual: false, href: `/schemes?applicationId=${encodeURIComponent(application.id)}` });
  required.push({ key: "branch", title: "Choose a participating branch", detail: "Select a branch with confirmed support for your selected scheme.", done: Boolean(application.channelPartnerId), manual: false, href: `/branches?applicationId=${encodeURIComponent(application.id)}` });
  for (const label of [...new Set(scheme?.requiredDocuments ?? [])]) {
    const type = documentTypes[label.trim().toLowerCase()];
    const docs = type ? application.documents.filter(doc => doc.type === type) : [];
    const verified = docs.some(doc => doc.status === "VERIFIED");
    const uploaded = docs.some(doc => ["UPLOADED", "PROCESSING", "PROCESSED"].includes(doc.status));
    required.push({ key: `document:${scheme!.slug}:${label}`, title: `Prepare ${label}`, manual: false,
      done: verified || uploaded,
      detail: verified ? "Verified by a reviewer." : uploaded ? "Uploaded. Content and suitability still need reviewer verification." : !type ? "Upload under Other with a descriptive filename and ask the branch to confirm it. This checklist cannot automatically verify this document." : docs.length ? "Previous upload failed or was rejected. Upload a corrected document." : "Upload this document. Uploading is separate from lender verification.", href: `${base}#documents` });
  }
  const skills = relevantSkills(scheme?.category ?? application.projectCategory);
  const recommended = skills.map(skill => {
    const level = application.competencies.find(c => c.skillKey === skill.key)?.level;
    const taskKey = `practice:v1:${skill.key}`;
    return { key: taskKey, title: skill.title, detail: skill.exercise,
      done: application.planTasks.some(t => t.taskKey === taskKey && t.completedAt != null), manual: true,
      level: level ?? "NOT_ASSESSED", priority: level === "LEARNING" ? "Suggested next step" : level === "CONFIDENT" ? "Optional refresher" : "Assess your confidence first" };
  });
  return { required, recommended, skills };
}

/** Three stable preparation milestones; individual documents stay in Documents. */
export function compactPreparation(application: PlanInput) {
  const plan = buildActionPlan(application);
  const documents = plan.required.filter(task => task.key.startsWith("document:"));
  const uploaded = documents.filter(task => task.done).length;
  const profileNeedsReview = plan.required.some(task => (task.key === "profile" || task.key.startsWith("eligibility:")) && !task.done);
  const schemeDone = Boolean(application.loanScheme) && !profileNeedsReview;
  const branchDone = Boolean(application.channelPartnerId || application.preferredBankId);
  const query = `applicationId=${encodeURIComponent(application.id)}`;
  return [
    { key: "scheme", title: "Scheme", done: schemeDone, status: schemeDone ? "✓ Selected" : profileNeedsReview ? "Review answers" : "Not selected", detail: schemeDone ? application.loanScheme!.name : "Complete your answers and select a matching scheme.", href: profileNeedsReview ? `/applications/${encodeURIComponent(application.id)}/profile` : `/schemes?${query}`, action: schemeDone ? "Change" : "Choose scheme" },
    { key: "branch", title: "Branch", done: branchDone, status: application.channelPartnerId ? "✓ Selected" : application.preferredBankId ? "✓ Preference saved" : "Not selected", detail: application.preferredBankId && !application.channelPartnerId ? "Support confirmation needed before online submission." : branchDone ? "Your branch selection is saved." : "Find nearby branches and save your choice.", href: `/branches?${query}`, action: branchDone ? "Change" : "Choose branch", disabled: !application.loanScheme },
    { key: "documents", title: "Documents", done: Boolean(application.loanScheme) && documents.length > 0 && uploaded === documents.length, status: !application.loanScheme ? "Choose a scheme first" : documents.length ? `${uploaded === documents.length ? "✓ " : ""}${uploaded} of ${documents.length} required documents matched` : "Check requirements with branch", detail: uploaded === 0 ? "Upload the documents listed below. Existing files count only when their type matches a requirement; some need manual review." : "Matched uploads are ready for review, not yet approved. Add any missing documents below.", href: `/applications/new?${query}#documents`, action: "Manage documents" },
  ];
}
