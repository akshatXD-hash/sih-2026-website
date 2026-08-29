import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "vitest";

import { createPreSanctionPdf } from "../src/lib/pre-sanction-pdf";

test("writes the visual QA sample", async () => {
  const outputDirectory = resolve("output/pdf");
  const outputPath = resolve(outputDirectory, "pre-sanction-sample.pdf");
  await mkdir(outputDirectory, { recursive: true });
  const bytes = await createPreSanctionPdf({
    referenceNumber: "SIH-SAMPLE-2026",
    status: "SUBMITTED",
    generatedAt: new Date("2026-08-29T07:30:00.000Z"),
    applicantName: "Aarohi Sharma",
    applicantEmail: "aarohi@example.com",
    projectCategory: "services",
    trade: "tailoring",
    requestedAmount: 140000,
    annualIncome: 300000,
    gender: "FEMALE",
    schemeName: "Women Enterprise Micro Finance",
    schemeProvider: "National Development Bank",
    interestRateMin: 6.5,
    interestRateMax: 7.5,
    branchName: "Pune Central Partner Branch",
    branchAddress: "Shivajinagar, Pune, Maharashtra, 411005",
    documentCount: 3,
  });
  await writeFile(outputPath, bytes);
  expect(bytes.byteLength).toBeGreaterThan(1_000);
});
