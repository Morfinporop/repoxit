// Entry point for production — runs server with tsx
import { fileURLToPath } from "url";
import path from "path";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = spawn(
  process.execPath,
  [path.join(__dirname, "node_modules/.bin/tsx"), "server/index.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
    cwd: __dirname,
  }
);

server.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGTERM", () => server.kill("SIGTERM"));
process.on("SIGINT", () => server.kill("SIGINT"));
