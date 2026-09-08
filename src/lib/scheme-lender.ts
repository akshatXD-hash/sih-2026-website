// A lender match is a contact suggestion, never branch-level confirmation.
export function schemeLender(slug: string | undefined) {
  if (!slug?.startsWith("sbi-")) return null;
  return {
    name: "SBI",
    namePattern: "(^|[^a-z])(sbi|state bank of india)([^a-z]|$)",
    sourceUrl: "https://sbi.bank.in/web/personal-banking/loans/education-loans",
    locatorUrl: "https://sbi.bank.in/web/home/locator/branch",
  };
}

export function isAtmListing(name: string) {
  return /\batm\b|cash\s+(deposit|withdrawal)\s+machine/i.test(name);
}
