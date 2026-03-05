/**
 * Spawns `epost-kit dev` as a detached background process.
 * Called after `dev init` / `dev update` so the terminal stays free for claude.
 */

import { spawn } from "node:child_process";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import pc from "picocolors";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface SpawnDevWatcherOptions {
  dir?: string;   // Target project dir (passed to --target)
  source?: string; // Kit source path (passed to --source)
}

export async function spawnDevWatcher(opts: SpawnDevWatcherOptions = {}): Promise<void> {
  const targetDir = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  // Redirect watcher logs to .epost-data/dev-watcher.log inside the target project
  const logDir = join(targetDir, ".epost-data");
  await mkdir(logDir, { recursive: true });
  const logPath = join(logDir, "dev-watcher.log");
  const pidPath = join(logDir, "dev-watcher.pid");

  // Build CLI entry point path (works for both ts-node and compiled dist)
  const cliEntry = resolve(__dirname, "../cli.js");

  const args = ["dev"];
  if (opts.dir) args.push("--target", resolve(opts.dir));
  if (opts.source) args.push("--source", opts.source);

  // openSync gives an immediately valid fd — required by spawn for detached processes
  const logFd = openSync(logPath, "a");

  const child = spawn(process.execPath, [cliEntry, ...args], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });

  child.unref(); // Allow parent process to exit independently

  // Save PID for later management (epost-kit dev stop)
  const { writeFile } = await import("node:fs/promises");
  await writeFile(pidPath, String(child.pid), "utf-8");

  console.log(`\n  ${pc.green("✓")} Dev watcher started ${pc.dim(`(PID ${child.pid})`)}`);
  console.log(`  ${pc.dim("Logs:")} ${logPath}`);
  console.log(`  ${pc.dim("Stop:")} epost-kit dev stop\n`);
}
