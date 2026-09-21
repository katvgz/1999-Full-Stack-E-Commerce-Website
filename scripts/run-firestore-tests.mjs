import { readdirSync, existsSync } from "node:fs";
import { resolve, join, delimiter } from "node:path";
import { spawn } from "node:child_process";

const env = { ...process.env };
// Avoid verbose CLI environment dumps in test output.
delete env.DEBUG;
env.CI = "true";
const localJava = resolve(".tools/java");
if (existsSync(localJava)) {
  const runtime = readdirSync(localJava)
    .map((name) => join(localJava, name))
    .find((path) => existsSync(join(path, "bin/java.exe")));
  if (runtime) {
    env.JAVA_HOME = runtime;
    const pathKey =
      Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
    env[pathKey] = `${join(runtime, "bin")}${delimiter}${env[pathKey] || ""}`;
  }
}
env.FIREBASE_EMULATORS_PATH = resolve(".tools/emulators");
const child = spawn(
  process.execPath,
  [
    "node_modules/firebase-tools/lib/bin/firebase.js",
    "emulators:exec",
    "--only",
    "firestore",
    "--project",
    "demo-1999",
    "node scripts/emulator-suite.mjs",
  ],
  { env, stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
