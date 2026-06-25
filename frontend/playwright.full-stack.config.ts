import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/full-stack",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  outputDir: "test-results/full-stack",
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: "playwright-report/full-stack",
        open: "never",
      },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-full-stack",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command:
      "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
