import { Archivo, Inter, JetBrains_Mono } from "next/font/google";

// Polices de la maquette. Pour en changer : modifier ici et dans src/styles/tokens.css.
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});
