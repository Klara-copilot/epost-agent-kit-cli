/**
 * Command: epost-kit dev
 * Watch local kit source (../epost_agent_kit) and auto-regenerate .claude/ on changes.
 * Triggers a full `runUpdate --source` rebuild so all transforms and config are applied correctly.
 */

import { resolve, join } from "node:path";
import { watch } from "node:fs";
import { logger } from "@/shared/logger.js";
import { dirExists } from "@/shared/file-system.js";
import { readMetadata } from "@/services/file-operations/ownership.js";
import type { DevWatcherOptions } from "@/types/commands.js";

export async function runDev(opts: DevWatcherOptions): Promise<void> {
  // Resolve kit source — explicit flag > default sibling repo
  const sourcePath = opts.source
    ? resolve(opts.source)
    : resolve(process.cwd(), "..", "epost_agent_kit");

  const packagesDir = join(sourcePath, "packages");

  if (!(await dirExists(sourcePath))) {
    throw new Error(
      `Kit source not found: ${sourcePath}\nUse --source <path> to specify the kit repo location.`,
    );
  }
  if (!(await dirExists(packagesDir))) {
    throw new Error(
      `packages/ not found inside kit source: ${packagesDir}\nEnsure the path points to a valid epost_agent_kit repo.`,
    );
  }

  // Resolve target project directory
  const targetDir = opts.target ? resolve(opts.target) : resolve(process.cwd());

  // Validate target has an installation (needs metadata to know profile/packages)
  const metadata = await readMetadata(targetDir);
  if (!metadata) {
    logger.warn(`No installation found at ${targetDir}`);
    logger.info("Run `epost-kit dev init` first to set up the target project.");
    return;
  }

  logger.info(`[dev] Source : ${sourcePath}`);
  logger.info(`[dev] Target : ${targetDir}`);
  logger.info(`[dev] Profile: ${metadata.profile || "(custom)"}, Packages: ${(metadata.installedPackages || []).join(", ")}`);
  logger.info(`[dev] Watching for changes... Press Ctrl+C to stop\n`);

  // Debounce — batch rapid file saves into a single rebuild
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let rebuilding = false;

  const triggerRebuild = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (rebuilding) {
        // Re-schedule if a rebuild is already in progress
        triggerRebuild();
        return;
      }
      rebuilding = true;
      try {
        logger.info(`[dev] Change detected — rebuilding...`);
        const { runUpdate } = await import("./update.js");
        await runUpdate({
          source: opts.source ?? "../epost_agent_kit",
          dir: opts.target,
          yes: true,
        });
        logger.info(`[dev] ✓ Rebuild complete\n`);
      } catch (err) {
        logger.error(`[dev] Rebuild failed: ${err instanceof Error ? err.message : String(err)}\n`);
      } finally {
        rebuilding = false;
      }
    }, 500);
  };

  // Watch entire packages/ directory recursively
  let watcher: ReturnType<typeof watch>;
  try {
    watcher = watch(packagesDir, { recursive: true }, (_eventType, filename) => {
      if (!filename) return;
      // Skip hidden files and lock files
      if (filename.startsWith(".") || filename.endsWith(".lock")) return;
      triggerRebuild();
    });
  } catch (err) {
    throw new Error(
      `Cannot watch ${packagesDir}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Clean shutdown on Ctrl+C
  process.on("SIGINT", () => {
    logger.info("\n[dev] Stopping watcher...");
    watcher.close();
    if (debounceTimer) clearTimeout(debounceTimer);
    logger.info("[dev] Done");
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}
