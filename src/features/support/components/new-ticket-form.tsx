"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { AnswerText } from "@/features/faq/answer-text";
import type { FaqEntry } from "@/features/faq/queries";
import { searchFaq } from "@/features/faq/search";
import { useRouter } from "@/i18n/navigation";
import { type TicketInput, ticketSchema } from "@/lib/validation/support";
import { createTicketAction } from "../actions";

/**
 * Nouveau ticket. Pendant la saisie du sujet, 3 réponses de la FAQ sont
 * proposées : la question est souvent réglée tout de suite.
 */
export function NewTicketForm({ categories, faq, responseLine }: { categories: readonly string[]; faq: FaqEntry[]; responseLine: string | null }) {
  const t = useTranslations("support");
  const tc = useTranslations("support.categories");
  const errorText = useErrorText();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control, setError: setFieldError, formState } = useForm<TicketInput>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { category: categories[0] as TicketInput["category"], subject: "", message: "" },
  });
  const { errors } = formState;
  const subject = useWatch({ control, name: "subject" }) ?? "";
  const suggestions = subject.trim().length >= 3 ? searchFaq(faq, subject, 3) : [];

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((values) =>
        startTransition(async () => {
          setError(undefined);
          const res = await createTicketAction(values);
          if (res.ok && res.data) router.push(`/support/${res.data.id}`);
          else if (!res.ok) {
            for (const [f, k] of Object.entries(res.fieldErrors ?? {})) setFieldError(f as keyof TicketInput, { message: k });
            if (!res.fieldErrors) setError(res.error);
          }
        }),
      )}
    >
      {error ? <Callout tone="error">{errorText(error)}</Callout> : null}
      <Field label={t("category")} htmlFor="ticket-category">
        <Select id="ticket-category" {...register("category")}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {tc(c as never)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("subject")} htmlFor="ticket-subject" error={errorText(errors.subject?.message)}>
        <Input id="ticket-subject" aria-invalid={!!errors.subject} {...register("subject")} />
      </Field>
      {suggestions.length ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-paper p-4" data-testid="faq-suggestions">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="size-4 text-forest-600" aria-hidden />
            {t("suggestions")}
          </p>
          {suggestions.map((s) => (
            <details key={s.id} className="text-sm">
              <summary className="cursor-pointer font-semibold">{s.question}</summary>
              <p className="mt-1 text-muted-foreground">
                <AnswerText text={s.answer} />
              </p>
            </details>
          ))}
        </div>
      ) : null}
      <Field label={t("message")} htmlFor="ticket-message" error={errorText(errors.message?.message)}>
        <Textarea id="ticket-message" rows={6} aria-invalid={!!errors.message} {...register("message")} />
      </Field>
      {responseLine ? <p className="text-sm font-medium text-forest-700">{responseLine}</p> : null}
      <Button type="submit" size="lg" className="self-start" disabled={pending}>
        {t("create")}
      </Button>
    </form>
  );
}
