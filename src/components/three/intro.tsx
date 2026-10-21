"use client";

import { useState } from "react";
import { Logo3D } from "./logo-3d";

/**
 * Écran d'entrée : le logo Peak arrive en 3D, le nom s'écrit, puis l'écran
 * remonte et dévoile le site. Une seule fois par visite ; un clic le passe.
 * Tout est en CSS (il disparaît seul même sans JavaScript) ; le script
 * INTRO_SCRIPT le masque d'emblée pour une visite déjà commencée, les tests
 * automatisés et « réduire les animations ».
 */
export function IntroSplash({ word, tagline }: { word: string; tagline: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className={done ? "peak-intro is-done" : "peak-intro"} onClick={() => setDone(true)} aria-hidden data-testid="intro">
      <div className="peak-intro-logo">
        <Logo3D height={220} motion="sway" />
      </div>
      <p className="peak-intro-word font-display text-[56px] font-extrabold leading-none tracking-[0.12em] text-forest-900 md:text-[84px] [font-stretch:118%]">
        {Array.from(word).map((ch, i) => (
          <span key={i} style={{ animationDelay: `${0.55 + i * 0.09}s` }}>
            {ch}
          </span>
        ))}
      </p>
      <p className="peak-intro-tagline font-display text-xs font-semibold uppercase tracking-[0.32em] text-forest-600 [font-stretch:112%]">{tagline}</p>
    </div>
  );
}

/** Script exécuté avant l'affichage : décide si l'écran d'entrée est joué. */
export const INTRO_SCRIPT = `try{var d=document.documentElement;d.classList.add("js");if(sessionStorage.getItem("peak-intro")||navigator.webdriver||matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("intro-skip")}else{sessionStorage.setItem("peak-intro","1")}}catch(e){}`;
