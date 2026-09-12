"use client";
import { T } from "@/components/language/LanguageProvider";


export function UploadDocumentsButton() {
  return <button type="button" className="button-primary" onClick={() => {
    const section = document.getElementById("documents");
    if (section instanceof HTMLDetailsElement) section.open = true;
    const form = document.getElementById("document-upload-form");
    (form ?? section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    form?.querySelector<HTMLSelectElement>("select")?.focus({ preventScroll: true });
  }}><T>Upload documents</T></button>;
}
