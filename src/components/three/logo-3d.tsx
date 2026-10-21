import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const MASK = "url(/brand/logo.svg) center / contain no-repeat";

const TONES = {
  // Vert forêt de la maquette (logo sur fond clair)
  forest: { face: "linear-gradient(160deg, var(--forest-600) 0%, var(--forest-900) 75%)", edge: "var(--forest-950)", back: "var(--forest-800)" },
  // Vert sauge (logo sur fond forêt)
  sage: { face: "linear-gradient(160deg, var(--sage-200) 0%, var(--sage-500) 80%)", edge: "var(--forest-700)", back: "var(--sage-600)" },
} as const;

/**
 * Monogramme Peak en relief (3D en CSS) : le logo est empilé en plusieurs
 * couches décalées en profondeur, puis la pièce oscille ou tourne.
 * `motion` : "sway" (balancier), "spin" (tour complet) ou "none".
 */
export function Logo3D({
  height = 160,
  tone = "forest",
  motion = "sway",
  className,
}: {
  height?: number;
  tone?: keyof typeof TONES;
  motion?: "sway" | "spin" | "none";
  className?: string;
}) {
  const colors = TONES[tone];
  const width = Math.round((height * 268) / 594);
  const layers = 16;
  const depth = Math.max(10, Math.round(height * 0.11));
  const layer = (i: number, background: string): CSSProperties => ({
    position: "absolute",
    inset: 0,
    background,
    mask: MASK,
    WebkitMask: MASK,
    transform: `translateZ(${(-depth * i) / (layers - 1)}px)`,
  });
  return (
    <span aria-hidden className={cn("peak-3d-scene inline-block", className)} style={{ width, height }}>
      <span className={cn("peak-3d relative block size-full", motion === "sway" && "peak-3d-sway", motion === "spin" && "peak-3d-spin")}>
        {Array.from({ length: layers }, (_, i) => {
          const i2 = layers - 1 - i; // du fond vers l'avant
          const bg = i2 === layers - 1 ? colors.back : colors.edge;
          return <span key={i} style={layer(i2, i2 === 0 ? colors.face : bg)} />;
        })}
      </span>
    </span>
  );
}

/** Pièce « 0,99 € » en relief qui tourne sur elle-même. */
export function Coin3D({ label, size = 132, className }: { label: string; size?: number; className?: string }) {
  const layers = 12;
  const depth = Math.round(size * 0.12);
  const face = (back: boolean): CSSProperties => ({
    transform: back ? `translateZ(${-depth}px) rotateY(180deg)` : "translateZ(0)",
    backfaceVisibility: "hidden",
  });
  return (
    <span aria-hidden className={cn("peak-3d-scene inline-block", className)} style={{ width: size, height: size }}>
      <span className="peak-3d peak-3d-coin relative block size-full">
        {Array.from({ length: layers }, (_, i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full bg-money-700"
            style={{ transform: `translateZ(${(-depth * i) / (layers - 1)}px)` }}
          />
        ))}
        {[false, true].map((back) => (
          <span
            key={String(back)}
            className="absolute inset-0 grid place-items-center rounded-full border-4 border-money-300 bg-gradient-to-br from-money-500 to-money-700 font-display text-[22px] font-extrabold text-white shadow-[inset_0_0_0_6px_rgba(255,255,255,0.12)] [font-stretch:112%]"
            style={face(back)}
          >
            {label}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Carrousel 3D de clips verticaux qui tourne (une vidéo → plusieurs clips). */
export function ClipCarousel3D({ count = 6, className }: { count?: number; className?: string }) {
  const radius = 150;
  return (
    <div aria-hidden className={cn("peak-3d-scene relative mx-auto h-[220px] w-full max-w-[420px]", className)}>
      <div className="peak-3d peak-3d-carousel absolute left-1/2 top-1/2 h-[180px] w-[100px] -translate-x-1/2 -translate-y-1/2">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="absolute inset-0 flex flex-col justify-end gap-1.5 rounded-xl border border-sage-500/50 bg-gradient-to-b from-forest-700 to-forest-900 p-2.5 shadow-3"
            style={{ transform: `rotateY(${(360 / count) * i}deg) translateZ(${radius}px)` }}
          >
            <span className="mb-auto grid size-7 place-items-center self-center rounded-full bg-white/15 text-[11px] text-white">▶</span>
            <span className="h-1.5 w-4/5 rounded-full bg-sage-300/80" />
            <span className="h-1.5 w-3/5 rounded-full bg-sage-300/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
