import { defineConfig, devices } from "@playwright/test";

const port = 3010;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:3010",
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec next dev -p ${port}`,
    url: "http://localhost:3010",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_E2E: "1",
      HARMONYLABS_DATA_DIR: ".data-e2e",
      HARMONYLABS_DEV_AUTH: "1",
      NEXT_PUBLIC_CONVEX_URL: "",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
