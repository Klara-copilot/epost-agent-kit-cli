/**
 * Command: epost-kit status
 * Show installed kit scope, enabled items, and mode.
 * Reads .epost-metadata.json + .epost.json
 */

import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import pc from "picocolors";
import { logger } from "@/shared/logger.js";
import { METADATA_FILE } from "@/shared/constants.js";
import type { StatusOptions } from "@/types/commands.js";

interface MetadataSnapshot {
  cliVersion?: string;
  kitVersion?: string;
  profile?: string;
  installedPackages?: string[];
  installedAt?: string;
  target?: string;
}

async function readMetadataFile(cwd: string): Promise<MetadataSnapshot | null> {
  const path = join(cwd, METADATA_FILE);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return null;
  }
}

export async function runStatus(opts: StatusOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  const { readEpostConfig } = await import("@/domains/config/epost-config.js");

  const [metadata, config] = await Promise.all([
    readMetadataFile(cwd),
    readEpostConfig(cwd).catch(() => null),
  ]);

  if (!metadata && !config) {
    if (opts.json) {
      console.log(JSON.stringify({ error: "Not installed", installed: false }, null, 2));
    } else {
      logger.error("epost-kit is not installed in this project.");
      logger.info("Run `epost-kit init` to get started.");
    }
    process.exit(1);
  }

  // Count hooks from settings.json
  let hookCount = 0;
  const settingsPath = join(cwd, ".claude", "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(await readFile(settingsPath, "utf-8"));
      if (settings.hooks) {
        hookCount = Object.values(settings.hooks as Record<string, unknown[]>).reduce(
          (sum: number, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
          0
        ) as number;
      }
    } catch {
      // ignore
    }
  }

  const kitVersion = metadata?.kitVersion ?? config?.kitVersion ?? "unknown";
  const profile = metadata?.profile ?? config?.role ?? null;
  const packages = metadata?.installedPackages ?? [];
  const skills = config?.skills ?? [];
  const agents = config?.agents ?? [];
  const target = metadata?.target ?? "claude";
  const updatesMode = config?.updatesMode ?? "interactive";
  const installedAt = metadata?.installedAt ?? config?.lastUpdated ?? null;

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          installed: true,
          kitVersion,
          profile,
          packages,
          target,
          enabled: {
            skills: skills.length,
            agents: agents.length,
            hooks: hookCount,
          },
          mode: {
            updates: updatesMode,
            safe: true,
          },
          installedAt,
        },
        null,
        2
      )
    );
    return;
  }

  console.log("");
  logger.heading("epost-kit Status");
  console.log("");

  // Installed scope
  console.log(pc.bold("Installed scope:"));
  if (profile) {
    console.log(`  ${pc.dim("profile:")}  ${pc.cyan(profile)}`);
  }
  if (packages.length > 0) {
    console.log(`  ${pc.dim("packages:")} ${packages.join(", ")}`);
  } else if (skills.length > 0) {
    console.log(`  ${pc.dim("skills:")}  ${skills.join(", ")}`);
  }
  console.log(`  ${pc.dim("target:")}   ${target}`);
  console.log(`  ${pc.dim("version:")}  ${pc.cyan(kitVersion)}`);
  if (installedAt) {
    const date = new Date(installedAt).toLocaleDateString();
    console.log(`  ${pc.dim("installed:")} ${date}`);
  }

  console.log("");

  // Enabled items
  console.log(pc.bold("Enabled:"));
  console.log(`  ${pc.green("●")} ${skills.length} skill(s)`);
  console.log(`  ${pc.green("●")} ${agents.length} agent(s)`);
  if (hookCount > 0) {
    console.log(`  ${pc.green("●")} ${hookCount} hook(s)`);
  }

  console.log("");

  // Mode
  console.log(pc.bold("Mode:"));
  console.log(`  ${pc.dim("updates:")}     ${updatesMode}`);
  console.log(`  ${pc.dim("safe mode:")}   ${pc.green("on")}`);

  console.log("");
}
