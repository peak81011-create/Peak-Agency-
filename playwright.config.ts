import { defineConfig, devices } from "@playwright/test";

// Parcours de bout en bout : nécessitent Supabase local (`npx supabase start`)
// et le seed (`npm run seed`). Voir README, section « Tests ».
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    locale: "fr-FR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3000/fr",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: { RATE_LIMIT_FACTOR: "100" },
      },
});
