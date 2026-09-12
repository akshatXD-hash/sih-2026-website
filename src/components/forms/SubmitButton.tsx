"use client";
import { T } from "@/components/language/LanguageProvider";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel = "Working...",
  className = "button-primary",
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={disabled || pending}>
      {pending ? <T>{pendingLabel}</T> : typeof children === "string" ? <T>{children}</T> : children}
    </button>
  );
}
