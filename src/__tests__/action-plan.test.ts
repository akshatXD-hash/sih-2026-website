import { describe, expect, it } from "vitest";
import { buildActionPlan, compactPreparation, type PlanInput } from "@/lib/action-plan";
import { evaluateEligibility, matchSchemes, type Scheme } from "@/lib/matching";

const scheme: Scheme & { requiredDocuments: string[] } = {
  id: "scheme", slug: "test", name: "Test", provider: "Bank", description: "", category: "MICRO_FINANCE",
  minAmount: 100, maxAmount: 10000, maxAnnualIncome: 300000, minAge: 18,
  projectCategories: ["micro-enterprise"], eligibleTrades: [], eligibleGenders: [], eligibleApplicantTags: [],
  isActive: true, sourceUrl: "https://example.gov.in/scheme", requiredDocuments: ["Aadhaar card", "Co-borrower income proof"],
};
const input: PlanInput = { id: "app", annualIncome: 0, requestedAmount: 1000, projectCategory: "micro-enterprise", age: 30,
  loanScheme: scheme, documents: [], planTasks: [], competencies: [] };

describe("explainable eligibility", () => {
  it("distinguishes missing income from actual zero income", () => {
    expect(evaluateEligibility({ ...input, annualIncome: null }, scheme).status).toBe("INFORMATION_MISSING");
    expect(evaluateEligibility({ ...input, annualIncome: " " }, scheme).status).toBe("INFORMATION_MISSING");
    expect(evaluateEligibility(input, scheme).status).toBe("ELIGIBLE");
  });
  it("retains both failed and missing checks and their source", () => {
    const result = evaluateEligibility({ ...input, age: null, requestedAmount: 20000 }, scheme);
    expect(result.status).toBe("INELIGIBLE");
    expect(result.checks.find(c => c.key === "age")?.status).toBe("UNKNOWN");
    expect(result.checks.find(c => c.key === "requestedAmount")).toMatchObject({ status: "FAIL", sourceUrl: scheme.sourceUrl });
  });
  it("distinguishes no selected category from an unanswered category", () => {
    const tagged = { ...scheme, eligibleApplicantTags: ["ARTISAN"] };
    expect(evaluateEligibility({ ...input, applicantTags: undefined }, tagged).status).toBe("INFORMATION_MISSING");
    expect(evaluateEligibility({ ...input, applicantTags: [] }, tagged).status).toBe("INELIGIBLE");
  });
  it("matches only profiles whose explanations pass every check", () => {
    for (const amount of [99, 100, 10000, 10001]) {
      const profile = { annualIncome: 0, requestedAmount: amount, projectCategory: "micro-enterprise", age: 30 };
      expect(matchSchemes(profile, [scheme]).length === 1).toBe(evaluateEligibility(profile, scheme).status === "ELIGIBLE");
    }
  });
});

describe("personalized plan", () => {
  it("keeps three milestones even when a scheme needs many documents", () => {
    expect(compactPreparation(input).map(step => step.key)).toEqual(["scheme", "branch", "documents"]);
  });
  it("shows persisted branch preference separately from participation", () => {
    const step = compactPreparation({ ...input, preferredBankId: "bank" })[1];
    expect(step.done).toBe(true);
    expect(step.status).toBe("✓ Preference saved");
    expect(step.detail).toContain("confirmation needed");
  });
  it("updates grouped document counts after upload and rejection", () => {
    expect(compactPreparation(input)[2].status).toBe("0 of 2 required documents matched");
    expect(compactPreparation({ ...input, documents: [{ type: "AADHAAR", status: "UPLOADED" }] })[2].status).toBe("1 of 2 required documents matched");
    expect(compactPreparation({ ...input, documents: [{ type: "AADHAAR", status: "REJECTED" }] })[2].status).toBe("0 of 2 required documents matched");
  });
  it("marks uploaded documents ready for review without calling them verified", () => {
    const plan = buildActionPlan({ ...input, documents: [{ type: "AADHAAR", status: "PROCESSED" }] });
    expect(plan.required.find(t => t.title === "Prepare Aadhaar card")).toMatchObject({ done: true, detail: "Uploaded. Content and suitability still need reviewer verification." });
  });
  it("reopens rejected/failed documents and cannot treat OTHER as proof of any certificate", () => {
    for (const status of ["FAILED", "REJECTED"]) {
      const plan = buildActionPlan({ ...input, documents: [{ type: "AADHAAR", status }, { type: "OTHER", status: "VERIFIED" }, { type: "INCOME_PROOF", status: "VERIFIED" }] });
      expect(plan.required.filter(t => t.key.startsWith("document:")).every(t => !t.done && !t.manual)).toBe(true);
    }
  });
  it("adapts learning to education and retains stable business practice progress", () => {
    const completed = [{ taskKey: "practice:v1:costing", completedAt: new Date() }];
    const education = buildActionPlan({ ...input, loanScheme: { ...scheme, category: "EDUCATION_LOAN" }, planTasks: completed });
    expect(education.recommended.some(t => t.key.includes("costing"))).toBe(false);
    expect(buildActionPlan({ ...input, planTasks: completed }).recommended[0].done).toBe(true);
  });
  it("does not infer inability from missing assessment or gate eligibility on practice", () => {
    expect(buildActionPlan(input).recommended[0].level).toBe("NOT_ASSESSED");
    const changed = { ...input, competencies: [{ skillKey: "costing", level: "LEARNING" }] };
    expect(buildActionPlan(changed).recommended[0].priority).toBe("Suggested next step");
    expect(buildActionPlan(changed).required).toEqual(buildActionPlan(input).required);
    expect(evaluateEligibility(changed, scheme).status).toBe("ELIGIBLE");
  });
});
