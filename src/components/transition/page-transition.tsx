"use client";

import { type ComponentProps, type MouseEvent, type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

type Phase = "idle" | "cover" | "reveal";
const COVER_MS = 480;
const REVEAL_MS = 520;

const TransitionContext = createContext<(href: string) => void>(() => {});

/**
 * Transition entre deux pages : un rideau vert descend du haut de l'écran
 * avec le logo Peak au milieu, la page change, puis le rideau continue sa
 * descente et dévoile la nouvelle page. Désactivée si l'utilisateur a
 * demandé à réduire les animations.
 */
export function PageTransitionProvider({ children, wordmark }: { children: ReactNode; wordmark: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const fromPath = useRef<string | null>(null);
  const timers = useRef<number[]>([]);

  const clear = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };
  const reveal = useCallback(() => {
    clear();
    setPhase("reveal");
    timers.current.push(window.setTimeout(() => setPhase("idle"), REVEAL_MS));
  }, []);

  const navigate = useCallback(
    (href: string) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }
      clear();
      fromPath.current = pathname;
      setPhase("cover");
      timers.current.push(window.setTimeout(() => router.push(href), COVER_MS));
      // Sécurité : si la page ne change pas (même adresse, erreur), on dévoile quand même.
      timers.current.push(window.setTimeout(reveal, COVER_MS + 4000));
    },
    [pathname, reveal, router],
  );

  // Nouvelle page affichée : le rideau termine sa descente.
  useEffect(() => {
    if (phase === "cover" && fromPath.current !== null && pathname !== fromPath.current) {
      fromPath.current = null;
      const id = window.setTimeout(reveal, 60);
      return () => window.clearTimeout(id);
    }
  }, [pathname, phase, reveal]);

  useEffect(() => clear, []);

  return (
    <TransitionContext.Provider value={navigate}>
      {children}
      {phase !== "idle" ? (
        <div
          aria-hidden
          data-testid="page-transition"
          className={`peak-curtain fixed inset-0 z-[100] flex items-center justify-center bg-forest-800 ${phase === "cover" ? "peak-curtain-cover" : "peak-curtain-reveal"}`}
        >
          <div className={`flex flex-col items-center gap-4 text-sage-300 ${phase === "cover" ? "peak-logo-in" : "peak-logo-out"}`}>
            <LogoMark className="h-28 w-12" />
            <span className="font-display text-xs font-semibold uppercase tracking-[0.4em] [font-stretch:112%]">{wordmark}</span>
          </div>
        </div>
      ) : null}
    </TransitionContext.Provider>
  );
}

/** Lien qui déclenche la transition (clic simple ; ctrl/cmd + clic gardent le comportement normal). */
export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const navigate = useContext(TransitionContext);
  return (
    <Link
      href={href}
      {...props}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(href);
      }}
    />
  );
}
