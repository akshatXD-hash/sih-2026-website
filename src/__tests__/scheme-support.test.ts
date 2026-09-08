import { describe, expect, it } from "vitest";
import { effectiveSupport, supportInputSchema } from "@/lib/scheme-support";

const now = new Date("2026-09-07T12:00:00Z");
const record = { status: "SUPPORTED", evidence_url: "https://bank.example/branch", notes: "Specific branch confirmed",
  verified_at: new Date("2026-09-01"), expires_at: new Date("2026-11-30") };
describe("branch scheme evidence", () => {
  it("never assumes support for an unreviewed bank", () => expect(effectiveSupport(undefined, now).status).toBe("UNKNOWN"));
  it("recognizes current confirmation", () => expect(effectiveSupport(record, now).status).toBe("SUPPORTED"));
  it("retains a current negative confirmation", () => expect(effectiveSupport({ ...record, status: "NOT_SUPPORTED" }, now).status).toBe("NOT_SUPPORTED"));
  it("expires exactly at the review deadline", () => expect(effectiveSupport({ ...record, expires_at: now }, now).status).toBe("EXPIRED"));
  it("does not treat future evidence as confirmed", () => expect(effectiveSupport({ ...record, verified_at: new Date("2026-09-08") }, now).status).toBe("EXPIRED"));
  it("keeps old evidence visible when expired", () => expect(effectiveSupport(record, new Date("2027-01-01")).evidenceUrl).toBe(record.evidence_url));
  const input = { branchId: "osm-node-1", branchType: "BANK", schemeId: "scheme-1", status: "SUPPORTED",
    evidenceUrl: "https://bank.example/branch", notes: "Checked exact branch and scheme listing", verifiedDate: new Date().toISOString().slice(0, 10) };
  it("accepts a complete current evidence record", () => expect(supportInputSchema.safeParse(input).success).toBe(true));
  it.each(["javascript:alert(1)", "http://bank.example", "https://user:password@bank.example"])("rejects unsafe evidence links: %s", url => expect(supportInputSchema.safeParse({ ...input, evidenceUrl: url }).success).toBe(false));
  it.each(["2000-01-01", "2999-01-01"])("rejects stale or future verification: %s", verifiedDate => expect(supportInputSchema.safeParse({ ...input, verifiedDate }).success).toBe(false));
});
