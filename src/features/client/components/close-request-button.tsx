"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { closeRequestAction } from "@/features/agency/actions";

export function CloseRequestButton({ requestId }: { requestId: string }) {
  const t = useTranslations("requests");
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" size="sm" disabled={pending} onClick={() => startTransition(async () => void (await closeRequestAction(requestId)))}>
      {t("markResolved")}
    </Button>
  );
}
