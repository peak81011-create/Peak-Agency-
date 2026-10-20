"use client";

import { FileUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { PROOF_MAX_BYTES, PROOF_MIME_TYPES } from "@/lib/validation/client";
import { createProofUploadAction, submitProofAction } from "../actions";

/** Dépôt de la preuve de virement : envoi direct vers le stockage privé. */
export function ProofUpload({ paymentId }: { paymentId: string }) {
  const t = useTranslations("client.payment");
  const errorText = useErrorText();
  const router = useRouter();
  const inputId = useId();
  const [error, setError] = useState<string>();
  const [over, setOver] = useState(false);
  const [pending, startTransition] = useTransition();

  const upload = (file: File) =>
    startTransition(async () => {
      setError(undefined);
      if (!(PROOF_MIME_TYPES as readonly string[]).includes(file.type)) return setError("proofType");
      if (file.size > PROOF_MAX_BYTES) return setError("proofSize");

      const prepared = await createProofUploadAction({
        paymentId,
        fileName: file.name,
        mimeType: file.type as (typeof PROOF_MIME_TYPES)[number],
        size: file.size,
      });
      if (!prepared.ok || !prepared.data) return setError(prepared.ok ? "generic" : prepared.error);

      const { error: uploadError } = await createSupabaseBrowserClient()
        .storage.from("payment-proofs")
        .uploadToSignedUrl(prepared.data.path, prepared.data.token, file, { contentType: file.type });
      if (uploadError) return setError("uploadFailed");

      const submitted = await submitProofAction({ paymentId, path: prepared.data.path, mimeType: file.type });
      if (!submitted.ok) return setError(submitted.error);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files[0];
          if (file) upload(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center",
          over ? "border-forest-700 bg-muted" : "border-sage-500 bg-sage-50",
          pending && "pointer-events-none opacity-60",
        )}
      >
        <FileUp className="size-8 text-forest-600" aria-hidden />
        <span className="font-semibold">{pending ? t("uploading") : t("dropTitle")}</span>
        <span className="text-xs text-subtle-foreground">{t("dropHint")}</span>
        <span className="sr-only">{t("chooseFile")}</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept={PROOF_MIME_TYPES.join(",")}
        className="sr-only"
        data-testid="proof-input"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="secondary" disabled={pending} onClick={() => document.getElementById(inputId)?.click()}>
        {t("chooseFile")}
      </Button>
    </div>
  );
}
