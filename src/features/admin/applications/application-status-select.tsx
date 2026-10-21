"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Select } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { APPLICATION_STATUSES } from "@/lib/validation/join";
import { setApplicationStatusAction } from "./actions";

type Status = (typeof APPLICATION_STATUSES)[number];

export function ApplicationStatusSelect({ id, status, label }: { id: string; status: Status; label: string }) {
  const t = useTranslations("status.application");
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
          const next = e.target.value as Status;
          startTransition(async () => {
            const res = await setApplicationStatusAction(id, next);
            if (res.ok) {
              setValue(next);
              setError(undefined);
            } else setError(res.error);
          });
        }}
      >
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t(s)}
          </option>
        ))}
      </Select>
      {error ? <span role="alert" className="text-xs text-destructive">{errorText(error)}</span> : null}
    </div>
  );
}
