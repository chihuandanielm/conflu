import { defineConfig, devices } from "@playwright/test";

// Runs against the production build served the way GitHub Pages serves it: under /conflu/, with the CSP meta tag.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:4321/conflu/", trace: "off", acceptDownloads: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } }, grepInvert: /@phone/ },
    // Phone runs with reduced motion on, so instant transitions are covered too.
    { name: "phone", use: { ...devices["Pixel 7"], reducedMotion: "reduce" }, grep: /@phone/ },
  ],
  webServer: { command: "BASE_PATH=/conflu/ npm run build && node scripts/serve.mjs 4321 /conflu/", url: "http://localhost:4321/conflu/", reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
