import { cn } from "@/lib/utils";

const STYLES = {
  tiktok: { cls: "bg-plat-tiktok", label: "TikTok" },
  instagram: { cls: "bg-plat-instagram", label: "Reels" },
  youtube: { cls: "bg-plat-youtube", label: "Shorts" },
  autre: { cls: "bg-forest-900", label: "Autre" },
} as const;

/** Pastille de plateforme (texte toujours présent : jamais la couleur seule). */
export function PlatformBadge({ platform, className }: { platform: keyof typeof STYLES; className?: string }) {
  const s = STYLES[platform] ?? STYLES.autre;
  return (
    <span className={cn("inline-flex h-[22px] items-center rounded-xs px-2 text-[11px] font-bold tracking-wide text-white", s.cls, className)}>
      {s.label}
    </span>
  );
}
