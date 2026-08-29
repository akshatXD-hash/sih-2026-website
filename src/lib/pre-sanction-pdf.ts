import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface PreSanctionPdfData {
  referenceNumber: string;
  status: string;
  generatedAt: Date;
  applicantName: string;
  applicantEmail: string;
  projectCategory: string | null;
  trade: string | null;
  requestedAmount: number | null;
  annualIncome: number | null;
  gender: string | null;
  schemeName: string;
  schemeProvider: string;
  interestRateMin: number | null;
  interestRateMax: number | null;
  branchName: string;
  branchAddress: string;
  documentCount: number;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const TEAL = rgb(0.05, 0.46, 0.43);
const SLATE = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.39, 0.45, 0.55);
const LIGHT = rgb(0.94, 0.96, 0.97);

function money(value: number | null) {
  return value == null ? "Not provided" : `INR ${Math.round(value).toLocaleString("en-IN")}`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function createPreSanctionPdf(data: PreSanctionPdfData) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (height: number) => {
    if (y - height >= MARGIN) return;
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const text = (value: string, options: { size?: number; color?: ReturnType<typeof rgb>; font?: PDFFont; maxWidth?: number; gap?: number } = {}) => {
    const size = options.size ?? 10;
    const selectedFont = options.font ?? regular;
    const lines = wrapText(value, selectedFont, size, options.maxWidth ?? PAGE_WIDTH - MARGIN * 2);
    ensureSpace(lines.length * (size + 3));
    for (const line of lines) {
      page.drawText(line, { x: MARGIN, y, size, font: selectedFont, color: options.color ?? SLATE });
      y -= size + 3;
    }
    y -= options.gap ?? 3;
  };

  const section = (title: string) => {
    ensureSpace(34);
    y -= 6;
    page.drawRectangle({ x: MARGIN, y: y - 5, width: PAGE_WIDTH - MARGIN * 2, height: 24, color: LIGHT });
    page.drawText(title, { x: MARGIN + 10, y: y + 2, size: 11, font: bold, color: TEAL });
    y -= 32;
  };

  const field = (label: string, value: string) => {
    const valueLines = wrapText(value, regular, 10, PAGE_WIDTH - MARGIN - 210);
    const height = Math.max(20, valueLines.length * 13 + 7);
    ensureSpace(height);
    page.drawText(label, { x: MARGIN, y, size: 9, font: bold, color: MUTED });
    valueLines.forEach((line, index) => {
      page.drawText(line, { x: 210, y: y - index * 13, size: 10, font: regular, color: SLATE });
    });
    y -= height;
  };

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 112, width: PAGE_WIDTH, height: 112, color: TEAL });
  page.drawText("SIH Scheme Matching Platform", { x: MARGIN, y: PAGE_HEIGHT - 58, size: 19, font: bold, color: rgb(1, 1, 1) });
  page.drawText("Pre-Sanction Application Summary", { x: MARGIN, y: PAGE_HEIGHT - 82, size: 13, font: regular, color: rgb(0.88, 1, 0.98) });
  y = PAGE_HEIGHT - 145;

  text("PROVISIONAL - NOT A LOAN APPROVAL OR SANCTION LETTER", { size: 11, font: bold, color: rgb(0.72, 0.18, 0.13), gap: 8 });
  text("This summary records applicant-provided information and a selected scheme. Final eligibility, verification, terms, and approval remain with the lender.", { color: MUTED, gap: 10 });

  section("Application");
  field("Reference", data.referenceNumber);
  field("Current status", data.status.replaceAll("_", " "));
  field("Generated", data.generatedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }));

  section("Applicant details");
  field("Applicant", data.applicantName);
  field("Email", data.applicantEmail);
  field("Project category", data.projectCategory ?? "Not provided");
  field("Trade", data.trade ?? "Not provided");
  field("Requested amount", money(data.requestedAmount));
  field("Annual income", money(data.annualIncome));
  field("Gender", data.gender?.replaceAll("_", " ") ?? "Not provided");

  section("Selected scheme");
  field("Scheme", data.schemeName);
  field("Provider", data.schemeProvider);
  field(
    "Indicative rate",
    data.interestRateMin == null && data.interestRateMax == null
      ? "Not published"
      : `${data.interestRateMin ?? data.interestRateMax}% - ${data.interestRateMax ?? data.interestRateMin}% p.a.`,
  );

  section("Selected branch and documents");
  field("Branch", data.branchName);
  text(`Address: ${data.branchAddress || "Not provided"}`, { maxWidth: PAGE_WIDTH - MARGIN * 2, gap: 6 });
  field("Documents uploaded", String(data.documentCount));

  ensureSpace(55);
  y -= 12;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: LIGHT });
  y -= 18;
  text("Generated electronically by the SIH Scheme Matching Platform. No signature is required for this provisional summary.", { size: 8, color: MUTED });

  const pages = document.getPages();
  pages.forEach((pdfPage: PDFPage, index: number) => {
    pdfPage.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - 58,
      y: 24,
      size: 8,
      font: regular,
      color: MUTED,
    });
  });

  document.setTitle(`Pre-Sanction Summary ${data.referenceNumber}`);
  document.setAuthor("SIH Scheme Matching Platform");
  document.setSubject("Provisional application summary - not a sanction letter");
  document.setCreationDate(data.generatedAt);
  return document.save();
}
