import { z } from "zod";
import { Gender } from "@/generated/prisma/enums";

export const projectCategories = ["micro-enterprise", "agriculture-allied", "manufacturing", "services", "trading", "higher-education-india", "higher-education-abroad", "vocational-education"] as const;
export const applicantTags = ["SC", "ST", "OBC", "MINORITY", "STREET_VENDOR", "ARTISAN", "SHG_MEMBER", "FARMER", "AGRI_ENTREPRENEUR", "AGRICULTURE_GRADUATE", "AGRICULTURE_GRADUATE_GROUP", "URBAN_POOR", "URBAN_POOR_GROUP", "SAFAI_KARAMCHARI", "PERSON_WITH_DISABILITY"] as const;
const optionalNumber = (schema: z.ZodType<number>) => z.preprocess(value => value === "" || value == null ? null : value, schema.nullable());
export const caseFormSchema = z.object({
  name: z.string().trim().min(2).max(100), village: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).transform(value => value.replace(/[\s()-]/g, "")).refine(value => !value || /^(?:\+91)?[6-9]\d{9}$/.test(value), "Enter a 10-digit mobile number, optionally with +91."),
  contactKind: z.enum(["SELF", "FAMILY", "NONE"]), contactName: z.string().trim().max(100),
  projectCategory: z.enum(projectCategories), trade: z.string().trim().max(80),
  age: optionalNumber(z.coerce.number().int().min(18).max(100)),
  gender: z.preprocess(value => value === "" ? null : value, z.enum(Gender).nullable()),
  annualIncome: optionalNumber(z.coerce.number().min(0).max(100000000)),
  requestedAmount: optionalNumber(z.coerce.number().positive().max(50000000)),
  applicantTags: z.array(z.enum(applicantTags)).max(15),
}).superRefine((data, ctx) => {
  if (data.contactKind !== "NONE" && !data.phone) ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a contact number or choose No phone." });
  if (data.contactKind === "NONE" && data.phone) ctx.addIssue({ code: "custom", path: ["contactKind"], message: "Choose whose phone number this is." });
  if (data.contactKind === "FAMILY" && !data.contactName) ctx.addIssue({ code: "custom", path: ["contactName"], message: "Enter the family contact's name and relationship." });
});
export function parseCaseForm(form: FormData) {
  return caseFormSchema.safeParse({ ...Object.fromEntries(form), applicantTags: form.getAll("applicantTags") });
}
export function nextAshaAction(status: string, hasScheme: boolean, rejected: number) {
  if (rejected) return "Review rejected documents";
  if (status === "DRAFT") return hasScheme ? "Review and submit" : "Complete details and choose scheme";
  if (status === "SUBMITTED" || status === "UNDER_REVIEW") return "Await officer review";
  if (status === "REJECTED") return "Read the decision and contact the officer";
  if (status === "APPROVED") return "Help arrange the next branch visit";
  return "View application status";
}
