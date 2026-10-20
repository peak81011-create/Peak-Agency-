import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const TONES = {
  neutral: "bg-t-neutral-bg text-t-neutral-fg",
  blue: "bg-t-blue-bg text-t-blue-fg",
  amber: "bg-t-amber-bg text-t-amber-fg",
  green: "bg-t-green-bg text-t-green-fg",
  violet: "bg-t-violet-bg text-t-violet-fg",
  teal: "bg-t-teal-bg text-t-teal-fg",
  red: "bg-t-red-bg text-t-red-fg",
  indigo: "bg-t-indigo-bg text-t-indigo-fg",
  orange: "bg-t-orange-bg text-t-orange-fg",
  forest: "bg-t-forest-bg text-t-forest-fg",
} as const;
export type Tone = keyof typeof TONES;

/** Pastille : toujours un texte lisible, jamais la couleur seule. */
export function Badge({
  tone = "neutral",
  dot = true,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold leading-none",
        dot && "pl-2 before:size-1.5 before:shrink-0 before:rounded-full before:bg-current",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
