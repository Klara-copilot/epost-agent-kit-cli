/**
 * Command: epost-kit update
 * Re-installs kit packages using existing installation metadata.
 * No setup prompts — reads profile/target/packages from .epost-metadata.json.
 */

import { resolve } from "node:path";
import ora from "ora";
import pc from "picocolors";
import { logger } from "@/shared/logger.js";
import { dirExists } from "@/shared/file-system.js";
import { readMetadata } from "@/services/file-operations/ownership.js";
import type { UpdateOptions } from "@/types/commands.js";

export async function runUpdate(opts: UpdateOptions): Promise<void> {
  const projectDir = opts.dir ? resolve(opts.dir) : resolve(process.cwd());
  const isDryRun = !!(opts.dryRun || opts.preview);
  const isJson = !!opts.json;

  if (opts.dir && !(await dirExists(projectDir))) {
    throw new Error(`Directory not found: ${projectDir}`);
  }

  // Read existing installation metadata
  const spinner = isJson ? null : ora("Reading installation metadata...").start();
  const metadata = await readMetadata(projectDir);

  if (!metadata) {
    spinner?.fail("No installation found");
    if (isJson) {
      console.log(JSON.stringify({ error: "No installation found", updated: false }, null, 2));
    } else {
      console.log(
        pc.yellow(
          "\nℹ  Run `epost-kit init` first to set up your project.\n",
        ),
      );
    }
    return;
  }

  spinner?.succeed(
    `Found installation: profile=${pc.cyan(metadata.profile || "(custom)")}, ` +
    `target=${pc.cyan(metadata.target)}, ` +
    `packages=${pc.cyan(String(metadata.installedPackages?.length ?? 0))}`,
  );

  const resolvedSource = opts.source ?? metadata.source;

  // ── Dry-run / preview mode ──
  if (isDryRun) {
    const preview = {
      profile: metadata.profile || "(custom)",
      target: metadata.target,
      packages: metadata.installedPackages || [],
      lastInstalled: metadata.installedAt?.split("T")[0] ?? null,
      source: resolvedSource ?? null,
      dryRun: true,
    };

    if (isJson) {
      console.log(JSON.stringify(preview, null, 2));
    } else {
      console.log('');
      console.log(pc.bold('[dry-run] Would update with:'));
      console.log(`  Profile  : ${preview.profile}`);
      console.log(`  Target   : ${preview.target}`);
      console.log(`  Packages : ${preview.packages.join(", ")}`);
      console.log(`  Last run : ${preview.lastInstalled}`);
      if (preview.source) {
        console.log(`  Source   : ${preview.source} (local dev mode)`);
      }
      console.log('');
      logger.info('[dry-run] No changes applied.');
    }
    return;
  }

  if (!isJson) {
    // Show what will be updated
    logger.info(`\n  Profile  : ${metadata.profile || "(custom)"}`);
    logger.info(`  Target   : ${metadata.target}`);
    logger.info(`  Packages : ${(metadata.installedPackages || []).join(", ")}`);
    logger.info(`  Last run : ${metadata.installedAt.split("T")[0]}\n`);

    if (resolvedSource) {
      logger.info(`  Source   : ${resolvedSource} (local dev mode)`);
    }
  }

  // Import and run init with existing config — no prompts
  // smart-merge is default: preserve user-modified files, only overwrite kit-owned ones
  // --fresh forces a clean wipe (old behavior)
  const { runInit } = await import("./init.js");
  await runInit({
    ...opts,
    yes: true,
    fresh: opts.fresh ?? false,
    profile: metadata.profile,
    packages: metadata.installedPackages?.join(","),
    target: metadata.target,
    dir: opts.dir,
    source: resolvedSource,
  });

  if (isJson) {
    console.log(JSON.stringify({
      updated: true,
      profile: metadata.profile || "(custom)",
      target: metadata.target,
      packages: metadata.installedPackages || [],
    }, null, 2));
  }
}
