import { describe, expect, it } from "vitest";

import { detectDocumentType, safeOriginalFilename } from "@/lib/document-files";

describe("document file validation", () => {
  it("detects supported file signatures instead of trusting extensions", () => {
    expect(detectDocumentType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("application/pdf");
    expect(detectDocumentType(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectDocumentType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });

  it("removes paths and unsafe characters from displayed filenames", () => {
    expect(safeOriginalFilename("../../income<script>.pdf")).toBe("income_script_.pdf");
    expect(safeOriginalFilename("C:\\fake\\report.pdf")).toBe("report.pdf");
  });
});
