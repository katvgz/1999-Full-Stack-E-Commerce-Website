import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({ plugins: [react(), {
  name: "local-order-email-api",
  configureServer(server) {
    const env = loadEnv(mode, server.config.envDir, "");
    for (const key of ["RESEND_API_KEY", "RESEND_FROM", "FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]) {
      if (!process.env[key] && env[key]) process.env[key] = env[key];
    }
    server.middlewares.use("/api/order-status-email", async (request, response) => {
      try {
        const { default: handler } = await import("./api/order-status-email.js");
        await handler(request, response);
      } catch {
        response.statusCode = 503;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ error: "Local email API unavailable. Check server configuration." }));
      }
    });
  },
}] }));
