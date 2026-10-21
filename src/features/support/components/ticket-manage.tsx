"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/validation/support";
import { updateTicketAction } from "../actions";

type Values = { status: TicketStatus; priority: "basse" | "normale" | "haute"; assignedTo: string };

/** Équipe : statut, priorité et attribution d'un ticket. */
export function TicketManage({ ticketId, initial, staff }: { ticketId: string; initial: Values; staff: { id: string; label: string }[] }) {
  const t = useTranslations("support");
  const ts = useTranslations("status.ticket");
  const tp = useTranslations("videos.priorities");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<"saved" | string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {status === "saved" ? <Callout tone="ok">{tc("saved")}</Callout> : null}
      {status && status !== "saved" ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <Field label={t("status")} htmlFor="ticket-status">
        <Select id="ticket-status" value={values.status} onChange={(e) => setValues({ ...values, status: e.target.value as TicketStatus })}>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ts(s)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("priority")} htmlFor="ticket-priority">
        <Select id="ticket-priority" value={values.priority} onChange={(e) => setValues({ ...values, priority: e.target.value as Values["priority"] })}>
          {(["basse", "normale", "haute"] as const).map((p) => (
            <option key={p} value={p}>
              {tp(p)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("assignedTo")} htmlFor="ticket-assignee">
        <Select id="ticket-assignee" value={values.assignedTo} onChange={(e) => setValues({ ...values, assignedTo: e.target.value })}>
          <option value="">—</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        variant="secondary"
        className="self-end"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await updateTicketAction(ticketId, values);
            setStatus(res.ok ? "saved" : res.error);
          })
        }
      >
        {tc("save")}
      </Button>
    </div>
  );
}
