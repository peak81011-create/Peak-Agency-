import { Eye, Play } from "lucide-react";
import { PlatformBadge } from "@/components/ui/platform-badge";
import { Link } from "@/i18n/navigation";
import type { ClipRow } from "../queries";

/** Vignette verticale 9:16 d'un clip (maquette ClientClips). */
export function ClipCard({ clip, href, meta, views }: { clip: ClipRow; href: string; meta: string; views?: string }) {
  return (
    <Link href={href} className="flex min-w-0 flex-col gap-2 text-inherit no-underline">
      <div className="relative flex aspect-[9/16] flex-col justify-between overflow-hidden rounded-md bg-forest-800 p-2.5 text-white">
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-white/20">
          <Play className="size-10" />
        </span>
        <div className="relative flex items-center justify-between gap-1.5">
          {clip.account ? <PlatformBadge platform={clip.account.platform} /> : <span />}
        </div>
        {clip.hook ? (
          <p className="relative max-w-[92%] self-start bg-white px-1.5 py-1 font-display text-[13px] font-extrabold uppercase leading-tight text-forest-900 [font-stretch:110%]">
            {clip.hook}
          </p>
        ) : null}
      </div>
      <p className="truncate text-sm font-semibold">{clip.title}</p>
      <p className="flex items-center justify-between gap-1.5 text-xs text-subtle-foreground">
        <span className="truncate">{meta}</span>
        {views ? (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Eye className="size-3.5" aria-hidden />
            {views}
          </span>
        ) : null}
      </p>
    </Link>
  );
}
