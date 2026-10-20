"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { useRouter } from "@/i18n/navigation";
import { convertRequestToClipAction, updateRequestAction } from "../actions";

type Values = { status: "nouvelle" | "en_cours" | "terminee" | "refusee"; priority: "basse" | "normale" | "haute"; assignedTo: string };

/** Attribution, statut et priorité d'une demande ; transformation en clip. */
export function RequestManage({ requestId, initial, staff, canConvert }: { requestId: string; initial: Values; staff: { id: string; label: string }[]; canConvert: boolean }) {
  const t = useTranslations("admin.requests");
  const ts = useTranslations("status.request");
  const tv = useTranslations("videos.priorities");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<"saved" | string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {status === "saved" ? <Callout tone="ok">{tc("saved")}</Callout> : null}
      {status && status !== "saved" ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Field label={t("assignedTo")} htmlFor="req-assign">
          <Select id="req-assign" value={values.assignedTo} onChange={(e) => setValues({ ...values, assignedTo: e.target.value })}>
            <option value="">—</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("status")} htmlFor="req-status">
          <Select id="req-status" value={values.status} onChange={(e) => setValues({ ...values, status: e.target.value as Values["status"] })}>
            {(["nouvelle", "en_cours", "terminee", "refusee"] as const).map((s) => (
              <option key={s} value={s}>
                {ts(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("priority")} htmlFor="req-priority">
          <Select id="req-priority" value={values.priority} onChange={(e) => setValues({ ...values, priority: e.target.value as Values["priority"] })}>
            {(["basse", "normale", "haute"] as const).map((p) => (
              <option key={p} value={p}>
                {tv(p)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {canConvert ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await convertRequestToClipAction(requestId);
                if (res.ok && res.data) router.push(`/admin/clips/${res.data.clipId}`);
                else if (!res.ok) setStatus(res.error);
              })
            }
          >
            {t("toClip")}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateRequestAction(requestId, values);
              setStatus(res.ok ? "saved" : res.error);
            })
          }
        >
          {tc("save")}
        </Button>
      </div>
    </div>
  );
}
