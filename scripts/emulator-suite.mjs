import { spawnSync } from "node:child_process";

if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error("Refusing to run Firestore tests without the emulator.");
for (const args of [
  ["scripts/verify-firestore.mjs"],
  ["node_modules/@playwright/test/cli.js", "test"],
]) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
