import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { getAppConfig } from "../src/lib/config.ts";

const command = process.argv[2];
if (command !== "dev" && command !== "start") {
  console.error("Usage: node scripts/next.mjs dev|start");
  process.exit(1);
}

// Next loads .env itself, but this script runs first and the logger reads LOG_* from the env.
if (existsSync(".env")) process.loadEnvFile(".env");

const { port } = getAppConfig();
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, command, "-p", String(port)], { stdio: "inherit" });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
