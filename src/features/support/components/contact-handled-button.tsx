"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markContactHandledAction } from "../actions";

export function ContactHandledButton({ id, handled }: { id: string; handled: boolean }) {
  const t = useTranslations("admin.support");
  const [pending, startTransition] = useTransition();
  return (
    <Button size="sm" variant={handled ? "ghost" : "secondary"} disabled={pending} onClick={() => startTransition(async () => void (await markContactHandledAction(id, !handled)))}>
      {handled ? t("markUnhandled") : t("markHandled")}
    </Button>
  );
}
