import { describe, expect, it } from "vitest";

import { MockAiService } from "@/lib/ai-service/mock";
import { transcribeAudio } from "@/lib/voice/assemblyai";

describe("Voice Speech-to-Text with AssemblyAI", () => {
  it("transcribes audio in English using mock fallback when offline", async () => {
    const fakeAudio = Buffer.from("fake-audio-bytes");
    const result = await transcribeAudio({
      audio: fakeAudio,
      language: "en",
    });

    expect(result.transcript).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.language).toBe("en");
  });

  it("transcribes audio in Hindi with high fidelity", async () => {
    const fakeAudio = Buffer.from("fake-hindi-audio-bytes");
    const result = await transcribeAudio({
      audio: fakeAudio,
      language: "hi",
    });

    expect(result.transcript).toContain("दर्जी");
    expect(result.language).toBe("hi");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("transcribes audio in Marathi with high fidelity", async () => {
    const fakeAudio = Buffer.from("fake-marathi-audio-bytes");
    const result = await transcribeAudio({
      audio: fakeAudio,
      language: "mr",
    });

    expect(result.transcript).toContain("शिंपी");
    expect(result.language).toBe("mr");
  });

  it("throws a clear error when audio buffer is empty", async () => {
    const emptyBuffer = Buffer.from([]);
    await expect(
      transcribeAudio({
        audio: emptyBuffer,
        apiKey: "test-key",
      })
    ).rejects.toThrow("Recorded audio is empty");
  });
});

describe("Multilingual Voice-to-Form Intent Extraction", () => {
  const service = new MockAiService();

  it("extracts parameters accurately for Hindi female tailoring applicant", async () => {
    const transcript = "मैं एक महिला दर्जी हूँ, मुझे नई सिलाई मशीन के लिए ₹50,000 का लोन चाहिए।";
    const result = await service.extractApplicantIntent({
      transcript,
      language: "hi",
    });

    expect(result.project_category).toBe("services");
    expect(result.trade).toBe("tailoring");
    expect(result.requested_amount).toBe(50000);
    expect(result.suggested_gender).toBe("FEMALE");
    expect(result.requires_gender_confirmation).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("extracts parameters accurately for English carpentry workshop applicant with lakh amount", async () => {
    const transcript = "I run a small carpentry workshop and need a loan of 1.5 lakhs to purchase equipment.";
    const result = await service.extractApplicantIntent({
      transcript,
      language: "en",
    });

    expect(result.project_category).toBe("manufacturing");
    expect(result.trade).toBe("carpentry");
    expect(result.requested_amount).toBe(150000);
    expect(result.requires_gender_confirmation).toBe(true);
  });

  it("extracts parameters for retail trade with annual income", async () => {
    const transcript = "I have a kirana grocery shop. My annual family income is 2.4 lakhs and I need 1 lakh loan.";
    const result = await service.extractApplicantIntent({
      transcript,
      language: "en",
    });

    expect(result.project_category).toBe("trading");
    expect(result.trade).toBe("retail shop");
    expect(result.requested_amount).toBe(100000);
    expect(result.annual_income).toBe(240000);
  });

  it("extracts parameters for welding and fabrication", async () => {
    const transcript = "I operate a welding workshop and need ₹80,000 for purchasing a new welding unit.";
    const result = await service.extractApplicantIntent({
      transcript,
      language: "en",
    });

    expect(result.project_category).toBe("manufacturing");
    expect(result.trade).toBe("welding & fabrication");
    expect(result.requested_amount).toBe(80000);
  });
});
