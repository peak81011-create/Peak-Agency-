"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { useRouter } from "@/i18n/navigation";
import { clipFormSchema, type ClipFormInput } from "@/lib/validation/admin-agency";
import { saveClipAction } from "../actions";

type Option = { id: string; label: string };

export function ClipForm({
  clipId,
  defaults,
  clients,
  videos,
  accounts,
  editors,
}: {
  clipId: string | null;
  defaults: ClipFormInput;
  clients: Option[];
  videos: (Option & { clientId: string })[];
  accounts: (Option & { clientId: string })[];
  editors: Option[];
}) {
  const t = useTranslations("admin.clips.form");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const router = useRouter();
  const [status, setStatus] = useState<"saved" | string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control, setError, formState } = useForm<ClipFormInput>({
    resolver: zodResolver(clipFormSchema),
    defaultValues: defaults,
  });
  const { errors } = formState;
  const clientId = useWatch({ control, name: "clientId" });
  const hook = useWatch({ control, name: "hook" }) ?? "";

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          setStatus(undefined);
          const res = await saveClipAction(clipId, values);
          if (res.ok && res.data) {
            if (!clipId) router.push(`/admin/clips/${res.data.id}`);
            else setStatus("saved");
          } else if (!res.ok) {
            for (const [f, k] of Object.entries(res.fieldErrors ?? {})) setError(f as keyof ClipFormInput, { message: k });
            if (!res.fieldErrors) setStatus(res.error);
          }
        }),
      )}
    >
      {status === "saved" ? <Callout tone="ok">{tc("saved")}</Callout> : null}
      {status && status !== "saved" ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("client")} htmlFor="clip-client" error={errorText(errors.clientId?.message)}>
          <Select id="clip-client" disabled={!!clipId} {...register("clientId")}>
            <option value="">—</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("title")} htmlFor="clip-title" error={errorText(errors.title?.message)}>
          <Input id="clip-title" {...register("title")} />
        </Field>
        <Field label={t("source")} htmlFor="clip-source">
          <Select id="clip-source" {...register("sourceVideoId")}>
            <option value="">—</option>
            {videos.filter((v) => v.clientId === clientId).map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("account")} htmlFor="clip-account">
          <Select id="clip-account" {...register("socialAccountId")}>
            <option value="">—</option>
            {accounts.filter((a) => a.clientId === clientId).map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("start")} htmlFor="clip-start" hint={t("timecodeHint")} error={errorText(errors.start?.message)}>
          <Input id="clip-start" placeholder="1:05:00" {...register("start")} />
        </Field>
        <Field label={t("end")} htmlFor="clip-end" error={errorText(errors.end?.message)}>
          <Input id="clip-end" placeholder="1:06:10" {...register("end")} />
        </Field>
        <Field label={t("hook")} htmlFor="clip-hook" hint={t("hookHint", { count: hook.length })} error={errorText(errors.hook?.message)}>
          <Input id="clip-hook" maxLength={80} {...register("hook")} />
        </Field>
        <Field label={t("editor")} htmlFor="clip-editor">
          <Select id="clip-editor" {...register("editorId")}>
            <option value="">—</option>
            {editors.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("dueAt")} htmlFor="clip-due">
          <Input id="clip-due" type="datetime-local" {...register("dueAt")} />
        </Field>
        <Field label={t("scheduledAt")} htmlFor="clip-scheduled">
          <Input id="clip-scheduled" type="datetime-local" {...register("scheduledAt")} />
        </Field>
      </div>
      <Field label={t("caption")} htmlFor="clip-caption" error={errorText(errors.caption?.message)}>
        <Textarea id="clip-caption" rows={3} {...register("caption")} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("hashtags")} htmlFor="clip-hashtags" hint={t("hashtagsHint")}>
          <Input id="clip-hashtags" {...register("hashtags")} />
        </Field>
        <Field label={t("publishedUrl")} htmlFor="clip-url" error={errorText(errors.publishedUrl?.message)}>
          <Input id="clip-url" type="url" placeholder="https://" {...register("publishedUrl")} />
        </Field>
      </div>
      <Button type="submit" className="self-end" disabled={pending}>
        {clipId ? tc("save") : t("create")}
      </Button>
    </form>
  );
}
