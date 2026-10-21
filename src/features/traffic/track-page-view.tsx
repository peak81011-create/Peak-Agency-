"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Compte une page vue (sans cookie ni donnée personnelle) : seul le chemin de
 * la page et le site d'origine sont envoyés.
 */
export function TrackPageView() {
  const pathname = usePathname();
  useEffect(() => {
    let referrer = "";
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.host !== window.location.host) referrer = ref.host;
    } catch {
      referrer = "";
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: window.location.pathname, referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
