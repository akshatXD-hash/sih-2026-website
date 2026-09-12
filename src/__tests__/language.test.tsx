import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LanguageProvider, T } from "@/components/language/LanguageProvider";
import { languages, localeOrDefault, messages, translate } from "@/lib/i18n";

describe("UI languages", () => {
  it("defaults safely when a language cookie is missing or invalid", () => {
    expect(localeOrDefault(undefined)).toBe("en");
    expect(localeOrDefault("__proto__")).toBe("en");
    expect(localeOrDefault("kn")).toBe("kn");
  });
  it("has nonempty translations for each supported language", () => {
    expect(Object.keys(languages)).toEqual(["en", "kn", "hi"]);
    for (const [source, translations] of Object.entries(messages)) {
      expect(translations).toHaveLength(2);
      translations.forEach(value => { expect(value.trim()).not.toBe(""); expect(value).not.toBe(source); });
    }
  });
  it("keeps original content and English intact", () => {
    expect(translate("en", "Email address")).toBe("Email address");
    expect(translate("kn", "Akshat Purohit")).toBe("Akshat Purohit");
    expect(translate("hi", "SBI Student Loan")).toBe("SBI Student Loan");
  });
  it("translates progress without losing document counts", () => {
    expect(translate("hi", "2 of 5 required documents matched")).toContain("5");
    expect(translate("hi", "2 of 5 required documents matched")).toContain("2");
    expect(translate("kn", "1 of 3 preparation steps saved")).not.toContain("steps");
  });
  it("renders translated option labels while preserving submitted enum values", () => {
    const html = renderToStaticMarkup(<LanguageProvider locale="kn"><select name="type" defaultValue="AADHAAR"><option value="AADHAAR"><T>Aadhaar</T></option></select></LanguageProvider>);
    expect(html).toContain("ಆಧಾರ್");
    expect(html).toContain('value="AADHAAR"');
  });
});

const cookie = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookie) }));
import { saveLanguageAction } from "@/app/language/actions";
it("saves a validated preference for the whole site", async () => {
  cookie.set.mockClear();
  const form = new FormData(); form.set("locale", "hi");
  expect(await saveLanguageAction({}, form)).toEqual({ saved: true });
  expect(cookie.set).toHaveBeenCalledWith("kaarva-language", "hi", expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }));
});
it("does not write an unsupported language", async () => {
  cookie.set.mockClear();
  const form = new FormData(); form.set("locale", "bad");
  expect(await saveLanguageAction({}, form)).toHaveProperty("error");
  expect(cookie.set).not.toHaveBeenCalled();
});
