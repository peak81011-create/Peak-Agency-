import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { FR_PATHS } from "./src/lib/public-paths";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Application majoritairement privée et dynamique : rendu à la demande
  // classique (voir DECISIONS.md).
  cacheComponents: false,
  poweredByHeader: false,
  // Rendu des factures PDF côté serveur (bibliothèque chargée telle quelle par Node)
  serverExternalPackages: ["@react-pdf/renderer"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Adresses françaises des pages publiques (voir src/lib/public-paths.ts)
  async rewrites() {
    return {
      beforeFiles: [
        ...Object.entries(FR_PATHS).map(([en, fr]) => ({ source: `/fr${fr}`, destination: `/fr${en}` })),
        { source: "/fr/tarifs/:slug", destination: "/fr/pricing/:slug" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [
      { source: "/fr/join", destination: "/fr/clippers/postuler", permanent: true },
      { source: "/en/join", destination: "/en/clippers/apply", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
