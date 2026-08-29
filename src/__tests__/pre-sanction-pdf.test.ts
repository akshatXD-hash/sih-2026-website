import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { createPreSanctionPdf } from "@/lib/pre-sanction-pdf";

describe("pre-sanction PDF", () => {
  it("creates a readable provisional summary with metadata", async () => {
    const bytes = await createPreSanctionPdf({
      referenceNumber: "SIH-TEST-001",
      status: "SUBMITTED",
      generatedAt: new Date("2026-08-29T07:30:00.000Z"),
      applicantName: "Sample Applicant",
      applicantEmail: "applicant@example.com",
      projectCategory: "services",
      trade: "tailoring",
      requestedAmount: 140000,
      annualIncome: 300000,
      gender: "FEMALE",
      schemeName: "Women Enterprise Micro Finance",
      schemeProvider: "Sample Development Bank",
      interestRateMin: 6.5,
      interestRateMax: 7.5,
      branchName: "Pune Central Branch",
      branchAddress: "Pune, Maharashtra, 411001",
      documentCount: 2,
    });
    const document = await PDFDocument.load(bytes);

    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(document.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(document.getTitle()).toBe("Pre-Sanction Summary SIH-TEST-001");
  });
});
