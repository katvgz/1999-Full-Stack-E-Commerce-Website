import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer:
      !process.env.CI && !process.env.FIRESTORE_EMULATOR_HOST,
    env: process.env.FIRESTORE_EMULATOR_HOST
      ? {
          VITE_FIREBASE_API_KEY: "demo-key",
          VITE_FIREBASE_PROJECT_ID: "demo-1999",
          VITE_FIREBASE_AUTH_DOMAIN: "demo-1999.firebaseapp.com",
          VITE_FIREBASE_APP_ID: "demo-app",
          VITE_FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
        }
      : {},
  },
});
