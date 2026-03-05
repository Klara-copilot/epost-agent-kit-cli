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

  if (opts.dir && !(await dirExists(projectDir))) {
    throw new Error(`Directory not found: ${projectDir}`);
  }

  // Read existing installation metadata
  const spinner = ora("Reading installation metadata...").start();
  const metadata = await readMetadata(projectDir);

  if (!metadata) {
    spinner.fail("No installation found");
    console.log(
      pc.yellow(
        "\nℹ  Run `epost-kit init` first to set up your project.\n",
      ),
    );
    return;
  }

  spinner.succeed(
    `Found installation: profile=${pc.cyan(metadata.profile || "(custom)")}, ` +
    `target=${pc.cyan(metadata.target)}, ` +
    `packages=${pc.cyan(String(metadata.installedPackages?.length ?? 0))}`,
  );

  // Show what will be updated
  logger.info(`\n  Profile  : ${metadata.profile || "(custom)"}`);
  logger.info(`  Target   : ${metadata.target}`);
  logger.info(`  Packages : ${(metadata.installedPackages || []).join(", ")}`);
  logger.info(`  Last run : ${metadata.installedAt.split("T")[0]}\n`);

  // Import and run init with existing config — no prompts, clean reinstall
  const { runInit } = await import("./init.js");
  await runInit({
    ...opts,
    yes: true,        // skip all prompts
    fresh: true,      // clean wipe + reinstall
    profile: metadata.profile,
    packages: metadata.installedPackages?.join(","),
    target: metadata.target,
    dir: opts.dir,
    // source: inherited from opts if set
  });
}
