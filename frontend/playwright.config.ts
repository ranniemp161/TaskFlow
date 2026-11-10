import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  use: { baseURL: "http://localhost:3101", trace: "retain-on-failure", channel: process.env.PLAYWRIGHT_CHANNEL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --port 3101",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
