"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Input, Select } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { initials } from "@/lib/utils";
import { assignTeamAction, unassignTeamAction } from "../actions";

/** Équipe attribuée : un employé ne voit que les clients qui lui sont attribués. */
export function TeamPanel({
  clientId,
  members,
  staff,
  editable,
}: {
  clientId: string;
  members: { user_id: string; team_role: string; name: string }[];
  staff: { id: string; label: string }[];
  editable: boolean;
}) {
  const t = useTranslations("admin.clients.team");
  const errorText = useErrorText();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setError(res.ok ? undefined : res.error);
    });

  return (
    <div className="flex flex-col gap-3">
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      {members.length === 0 ? <p className="text-sm text-muted-foreground">{t("empty")}</p> : null}
      <ul className="flex flex-col gap-2" data-testid="team-list">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3">
            <span aria-hidden className="inline-flex size-8 items-center justify-center rounded-full bg-forest-700 text-[11px] font-bold text-sage-100">
              {initials(m.name)}
            </span>
            <span className="grow text-sm">
              <span className="font-semibold">{m.name}</span> <span className="text-subtle-foreground">· {m.team_role}</span>
            </span>
            {editable ? (
              <Button variant="ghost" size="icon" aria-label={t("remove", { name: m.name })} disabled={pending} onClick={() => run(() => unassignTeamAction(clientId, m.user_id))}>
                <X aria-hidden />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {editable ? (
        <div className="flex flex-wrap items-end gap-2">
          <Select aria-label={t("member")} value={userId} onChange={(e) => setUserId(e.target.value)} className="min-w-48 grow">
            <option value="">{t("choose")}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
          <Input aria-label={t("role")} placeholder={t("rolePlaceholder")} value={role} onChange={(e) => setRole(e.target.value)} className="min-w-40 grow" />
          <Button variant="secondary" disabled={pending || !userId} onClick={() => run(() => assignTeamAction(clientId, userId, role))}>
            {t("assign")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
