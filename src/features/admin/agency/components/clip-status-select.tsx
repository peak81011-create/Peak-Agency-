"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Select } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { CLIP_STATUSES } from "@/lib/validation/admin-agency";
import { setClipStatusAction } from "../actions";

/** Changement rapide de statut (Kanban, liste, fiche du clip). */
export function ClipStatusSelect({ clipId, status, label }: { clipId: string; status: (typeof CLIP_STATUSES)[number]; label: string }) {
  const t = useTranslations("status.clip");
  const errorText = useErrorText();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <Select
        aria-label={label}
        value={value}
        disabled={pending}
        className="min-h-9 py-1 text-[13px]"
        onChange={(e) => {
          const next = e.target.value as (typeof CLIP_STATUSES)[number];
          startTransition(async () => {
            const res = await setClipStatusAction(clipId, next);
            if (res.ok) {
              setValue(next);
              setError(undefined);
            } else setError(res.error);
          });
        }}
      >
        {CLIP_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(s)}
          </option>
        ))}
      </Select>
      {error ? <span role="alert" className="text-xs text-destructive">{errorText(error)}</span> : null}
    </div>
  );
}
