import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "npm run dev -- --host 0.0.0.0 --port 5173",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
