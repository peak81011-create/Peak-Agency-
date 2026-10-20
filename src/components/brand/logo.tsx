import { cn } from "@/lib/utils";

/**
 * Logo affiché via un masque CSS sur public/brand/logo.svg : il prend la
 * couleur du texte (currentColor). Pour changer de logo, remplacez seulement
 * ce fichier SVG.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-9 w-4 shrink-0 bg-current", className)}
      style={{
        mask: "url(/brand/logo.svg) center / contain no-repeat",
        WebkitMask: "url(/brand/logo.svg) center / contain no-repeat",
      }}
    />
  );
}

export function Logo({ wordmark, className, markClassName }: { wordmark: string; className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark className={markClassName} />
      <span className="font-display text-[11px] font-medium uppercase leading-tight tracking-[0.26em] [font-stretch:112%]">
        {wordmark}
      </span>
    </span>
  );
}
