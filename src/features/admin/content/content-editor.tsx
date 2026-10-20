"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useErrorText } from "@/features/auth/components/use-translated-error";
import { saveContentAction } from "./actions";
import { LIST_FIELDS, type ListFieldsKey } from "./fields";

type Item = Record<string, string>;

function parseItems(raw: string): Item[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function ListEditor({
  contentKey,
  items,
  onChange,
  lang,
}: {
  contentKey: ListFieldsKey;
  items: Item[];
  onChange: (items: Item[]) => void;
  lang: "fr" | "en";
}) {
  const t = useTranslations("admin.content");
  const fields = LIST_FIELDS[contentKey];
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? <p className="text-sm text-subtle-foreground">{t("emptyList")}</p> : null}
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
          {fields.map((f) => {
            const id = `${contentKey}-${lang}-${i}-${f}`;
            const long = f === "body" || f === "a" || f === "quote";
            const change = (value: string) => onChange(items.map((it, j) => (j === i ? { ...it, [f]: value } : it)));
            return (
              <Field key={f} label={t(`listFields.${f}`)} htmlFor={id}>
                {long ? (
                  <Textarea id={id} rows={2} value={item[f] ?? ""} onChange={(e) => change(e.target.value)} />
                ) : (
                  <Input id={id} value={item[f] ?? ""} onChange={(e) => change(e.target.value)} />
                )}
              </Field>
            );
          })}
          <Button type="button" variant="ghost" size="sm" className="self-end" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2 aria-hidden />
            {t("remove")}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => onChange([...items, Object.fromEntries(fields.map((f) => [f, ""]))])}
      >
        <Plus aria-hidden />
        {t("add")}
      </Button>
    </div>
  );
}

/** Édition d'un contenu (texte ou liste) en français et en anglais. */
export function ContentEditor({ contentKey, valueFr, valueEn }: { contentKey: string; valueFr: string; valueEn: string }) {
  const t = useTranslations("admin.content");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const isList = contentKey in LIST_FIELDS;
  const [fr, setFr] = useState(valueFr);
  const [en, setEn] = useState(valueEn);
  const [status, setStatus] = useState<string>();
  const [pending, startTransition] = useTransition();
  const long = contentKey.startsWith("legal.") || contentKey.endsWith(".lead");

  const editor = (lang: "fr" | "en", value: string, set: (v: string) => void) => {
    const id = `${contentKey}-${lang}`;
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-subtle-foreground">{t(`lang.${lang}`)}</p>
        {isList ? (
          <ListEditor
            contentKey={contentKey as ListFieldsKey}
            lang={lang}
            items={parseItems(value)}
            onChange={(items) => set(JSON.stringify(items))}
          />
        ) : long ? (
          <Textarea id={id} aria-label={t(`lang.${lang}`)} rows={contentKey.startsWith("legal.") ? 16 : 3} value={value} onChange={(e) => set(e.target.value)} />
        ) : (
          <Input id={id} aria-label={t(`lang.${lang}`)} value={value} onChange={(e) => set(e.target.value)} />
        )}
      </div>
    );
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setStatus(undefined);
          const res = await saveContentAction(contentKey, fr, en);
          setStatus(res.ok ? "saved" : res.error);
        });
      }}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {editor("fr", fr, setFr)}
        {editor("en", en, setEn)}
      </div>
      {status === "saved" ? <Callout tone="ok">{tc("saved")}</Callout> : null}
      {status && status !== "saved" ? <Callout tone="error">{errorText(status)}</Callout> : null}
      <Button type="submit" variant="secondary" className="self-end" disabled={pending}>
        {tc("save")}
      </Button>
    </form>
  );
}
