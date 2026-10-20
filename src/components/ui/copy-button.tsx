"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "./button";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      aria-label={label ? `${t("copy")} — ${label}` : t("copy")}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
    </Button>
  );
}
