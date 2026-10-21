"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { cn } from "@/lib/utils";
import { rateTicketAction, reopenTicketAction, resolveTicketAction } from "../actions";

/** Actions de l'auteur : marquer résolu, rouvrir (7 jours), noter la réponse. */
export function TicketUserActions({ ticketId, status, canReopen, rated }: { ticketId: string; status: string; canReopen: boolean; rated: boolean }) {
  const t = useTranslations("support");
  const errorText = useErrorText();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setError(res.ok ? undefined : res.error);
    });

  if (status !== "resolu") {
    return (
      <Button variant="secondary" disabled={pending} onClick={() => run(() => resolveTicketAction(ticketId))}>
        {t("markResolved")}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      {!rated ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-paper p-4">
          <p className="font-semibold">{t("rateTitle")}</p>
          <div className="flex gap-1" role="radiogroup" aria-label={t("rateTitle")}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={t("stars", { n })}
                onClick={() => setRating(n)}
                className="rounded-sm p-1 hover:bg-muted"
              >
                <Star className={cn("size-6", n <= rating ? "fill-forest-700 text-forest-700" : "text-sage-500")} aria-hidden />
              </button>
            ))}
          </div>
          <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("rateComment")} aria-label={t("rateComment")} />
          <Button className="self-start" disabled={pending || rating === 0} onClick={() => run(() => rateTicketAction(ticketId, rating, comment))}>
            {t("rateSend")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-forest-700">{t("rated")}</p>
      )}
      {canReopen ? (
        <Button variant="ghost" className="self-start" disabled={pending} onClick={() => run(() => reopenTicketAction(ticketId))}>
          {t("reopen")}
        </Button>
      ) : null}
    </div>
  );
}
