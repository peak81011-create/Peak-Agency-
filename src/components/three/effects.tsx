"use client";

import { type PointerEvent, type ReactNode, useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Apparition en 3D au défilement : chaque bloc marqué `data-reveal` bascule
 * vers l'avant quand il entre à l'écran. Sans JavaScript, tout reste visible.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])"));
    if (!("IntersectionObserver" in window)) {
      for (const el of items) el.dataset.shown = "";
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.shown = "";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    for (const el of items) observer.observe(el);
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}

/** Inclinaison 3D qui suit la souris (cartes d'offres). */
export function Tilt3D({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty("--ry", `${(x * max * 2).toFixed(2)}deg`);
    ref.current.style.setProperty("--rx", `${(-y * max * 2).toFixed(2)}deg`);
  };
  const leave = () => {
    ref.current?.style.setProperty("--ry", "0deg");
    ref.current?.style.setProperty("--rx", "0deg");
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={cn("peak-tilt", className)}>
      {children}
    </div>
  );
}
