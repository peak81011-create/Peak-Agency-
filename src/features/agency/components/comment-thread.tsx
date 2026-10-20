import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { EntityType } from "@/lib/validation/agency";
import { formatDateTime } from "@/lib/format";
import { cn, initials } from "@/lib/utils";
import { listComments } from "../queries";
import { CommentForm } from "./comment-form";

/** Fil de discussion d'un élément (les notes internes ne sont jamais renvoyées au client par la base). */
export async function CommentThread({
  entityType,
  entityId,
  viewerId,
  allowInternal = false,
  disabled = false,
}: {
  entityType: EntityType;
  entityId: string;
  viewerId: string;
  allowInternal?: boolean;
  disabled?: boolean;
}) {
  const [comments, locale, t, tr] = await Promise.all([
    listComments(entityType, entityId),
    getLocale(),
    getTranslations("comments"),
    getTranslations("roles"),
  ]);
  return (
    <div className="flex flex-col gap-4">
      {comments.length === 0 ? <p className="text-sm text-subtle-foreground">{t("empty")}</p> : null}
      <ol className="flex flex-col gap-4" data-testid="comment-thread">
        {comments.map((c) => {
          const me = c.author_id === viewerId;
          const name = c.author?.full_name || "—";
          return (
            <li key={c.id} className={cn("flex items-start gap-3", me && "flex-row-reverse")}>
              <span aria-hidden className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-300 text-[11px] font-bold text-forest-900">
                {initials(name)}
              </span>
              <div className={cn("flex max-w-[560px] flex-col gap-1", me && "items-end")}>
                <p className="flex items-center gap-2 text-xs text-subtle-foreground">
                  {me ? t("you") : `${name} · ${tr((c.author?.role ?? "client") as "client")}`} · {formatDateTime(c.created_at, locale)}
                  {c.is_internal ? <Badge tone="amber">{t("internalBadge")}</Badge> : null}
                </p>
                <p
                  className={cn(
                    "whitespace-pre-line rounded-lg border px-3.5 py-2.5 text-sm",
                    me ? "border-primary bg-primary text-sage-100" : c.is_internal ? "border-t-amber-bg bg-t-amber-bg text-t-amber-fg" : "border-border bg-sage-50",
                  )}
                >
                  {c.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <CommentForm entityType={entityType} entityId={entityId} allowInternal={allowInternal} disabled={disabled} />
    </div>
  );
}
