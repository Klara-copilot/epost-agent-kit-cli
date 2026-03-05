#!/usr/bin/env node

import { cac } from "cac";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const packageJsonPath = join(__dirname, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

const cli = cac("epost-kit");

cli
  .version(packageJson.version)
  .help()
  .option("--verbose", "Enable verbose logging")
  .option("--yes", "Skip interactive prompts (CI mode)");

// Command: new - Create new project
cli
  .command("new", "Create new project with epost-agent-kit")
  .option("--kit <name>", "Kit template to use", { default: "engineer" })
  .option("--dir <path>", "Target directory")
  .action(async (opts: any) => {
    const { runNew } = await import("./commands/new.js");
    await runNew({ ...cli.globalCommand.options, ...opts });
  });

// Command: init - Initialize in existing project
cli
  .command("init", "Initialize epost-agent-kit in existing project")
  .option("--kit <name>", "Kit template to use (legacy mode)")
  .option("--profile <name>", "Developer profile (e.g., web-b2b, ios-b2c)")
  .option(
    "--packages <list>",
    "Comma-separated package list (e.g., core,platform-web)"
  )
  .option("--optional <list>", "Comma-separated optional packages to include")
  .option("--exclude <list>", "Comma-separated packages to exclude")
  .option("--fresh", "Fresh install (ignore existing files)")
  .option("--dry-run", "Preview changes without applying")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runInit } = await import("./commands/init.js");
    await runInit({ ...cli.globalCommand.options, ...opts });
  });

// Command: doctor - Verify installation
cli
  .command("doctor", "Verify installation and environment health")
  .option("--fix", "Automatically fix issues")
  .option("--report", "Generate detailed report")
  .action(async (opts: any) => {
    const { runDoctor } = await import("./commands/doctor.js");
    await runDoctor({ ...cli.globalCommand.options, ...opts });
  });

// Command: versions - List available versions
cli
  .command("versions", "List available kit versions from GitHub")
  .option("--limit <number>", "Max versions to display", { default: "10" })
  .option("--pre", "Include pre-release versions")
  .action(async (opts: any) => {
    const { runVersions } = await import("./commands/versions.js");
    await runVersions({
      ...cli.globalCommand.options,
      ...opts,
      limit: parseInt(opts.limit || "10"),
    });
  });

// Command: update - Update installed kit
cli
  .command("update", "Update installed kit to latest version")
  .option("--check", "Only check for updates")
  .action(async (opts: any) => {
    const { runUpdate } = await import("./commands/update.js");
    await runUpdate({ ...cli.globalCommand.options, ...opts });
  });

// Command: uninstall - Remove kit
cli
  .command("uninstall", "Remove installed kit from project")
  .option("--dir <path>", "Target project directory")
  .option("--keep-custom", "Keep user-modified files")
  .option("--force", "Force removal without confirmation")
  .action(async (opts: any) => {
    const { runUninstall } = await import("./commands/uninstall.js");
    await runUninstall({ ...cli.globalCommand.options, ...opts });
  });

// Command: profile - Manage developer profiles
cli
  .command("profile list", "List available developer profiles")
  .option("--team <name>", "Filter by team name")
  .action(async (opts: any) => {
    const { runProfileList } = await import("./commands/profile.js");
    await runProfileList({ ...cli.globalCommand.options, ...opts });
  });

cli
  .command("profile show <name>", "Show details of a specific profile")
  .action(async (name: any, opts: any) => {
    const { runProfileShow } = await import("./commands/profile.js");
    await runProfileShow({ ...cli.globalCommand.options, ...opts, name });
  });

// Command: package - Manage installed packages
cli
  .command("package list", "List available packages")
  .action(async (opts: any) => {
    const { runPackageList } = await import("./commands/package.js");
    await runPackageList({ ...cli.globalCommand.options, ...opts });
  });

cli
  .command("package add <name>", "Add a package to existing installation")
  .action(async (name: any, opts: any) => {
    const { runPackageAdd } = await import("./commands/package.js");
    await runPackageAdd({ ...cli.globalCommand.options, ...opts, name });
  });

cli
  .command("package remove <name>", "Remove a package from installation")
  .option("--force", "Skip confirmation")
  .action(async (name: any, opts: any) => {
    const { runPackageRemove } = await import("./commands/package.js");
    await runPackageRemove({ ...cli.globalCommand.options, ...opts, name });
  });

// Command: onboard - Guided first-time setup wizard
cli
  .command("onboard", "Guided first-time setup wizard for new developers")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runOnboard } = await import("./commands/onboard.js");
    await runOnboard({ ...cli.globalCommand.options, ...opts });
  });

// Command: workspace - Multi-repo workspace management
cli
  .command("workspace init", "Generate workspace-level CLAUDE.md")
  .option("--dir <path>", "Workspace root directory")
  .action(async (opts: any) => {
    const { runWorkspaceInit } = await import("./commands/workspace.js");
    await runWorkspaceInit({ ...cli.globalCommand.options, ...opts });
  });

// Command: dev - Watch packages and live-sync
cli
  .command("dev", "Watch packages/ and live-sync to target .claude/ directory")
  .option("--target <dir>", "Target project directory")
  .option("--profile <name>", "Only watch packages for this profile")
  .option("--force", "Overwrite user-modified files")
  .action(async (opts: any) => {
    const { runDev } = await import("./commands/dev.js");
    await runDev({ ...cli.globalCommand.options, ...opts });
  });

// Command: lint - Validate references
cli
  .command("lint", "Validate references across installed agent/skill/command files")
  .option("--json", "Output results as JSON")
  .option("--fix", "Auto-fix stale references using rename map")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    if (opts.fix) {
      const { runFixRefs } = await import("./commands/fix-refs.js");
      await runFixRefs({ ...cli.globalCommand.options, apply: true, dir: opts.dir });
    } else {
      const { runLint } = await import("./commands/lint.js");
      await runLint({ ...cli.globalCommand.options, ...opts });
    }
  });

// Command: fix-refs - Auto-fix stale references
cli
  .command("fix-refs", "Auto-fix stale references using rename maps from package.yaml")
  .option("--apply", "Write changes to disk (default: dry-run)")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runFixRefs } = await import("./commands/fix-refs.js");
    await runFixRefs({ ...cli.globalCommand.options, ...opts });
  });

// Command: verify - Pre-release audit pipeline
cli
  .command("verify", "Full pre-release audit: integrity + lint + health checks + dependency graph")
  .option("--strict", "Treat warnings as errors (CI gate)")
  .option("--json", "Output machine-readable JSON report")
  .option("--fix", "Re-sync drifted files via epost-kit init")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runVerify } = await import("./commands/verify.js");
    await runVerify({ ...cli.globalCommand.options, ...opts });
  });

// ─── Go-style command suggestions ───

/** Levenshtein edit distance (Damerau variant, max 8) */
function editDistance(a: string, b: string): number {
  const maxDist = 8;
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Find the closest command name(s) among candidates.
 * Threshold: similarity >= 0.5
 */
function findSuggestions(word: string, candidates: string[]): string[] {
  const w = word.toLowerCase();
  let best: string[] = [];
  let bestDist = Infinity;

  for (const candidate of candidates) {
    const c = candidate.toLowerCase();
    const prefixMatch = c.startsWith(w) || w.startsWith(c);
    const dist = prefixMatch ? 0 : editDistance(w, c);
    const maxLen = Math.max(w.length, c.length);
    const similarity = (maxLen - dist) / maxLen;

    if (similarity < 0.5 && !prefixMatch) continue;

    if (dist < bestDist) {
      bestDist = dist;
      best = [candidate];
    } else if (dist === bestDist) {
      best.push(candidate);
    }
  }

  return best;
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});

try {
  cli.parse();
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('Unknown command')) {
    const match = msg.match(/Unknown command `?([^`\s]+)`?/);
    const unknown = match?.[1];
    if (unknown) {
      const allCommands = (cli.commands as Array<{ name: string }>)
        .map((c) => c.name)
        .filter(Boolean);
      const suggestions = findSuggestions(unknown, allCommands);
      process.stderr.write(`error: unknown command '${unknown}' for 'epost-kit'\n`);
      if (suggestions.length > 0) {
        process.stderr.write(`\nDid you mean ${suggestions.length === 1 ? "this" : "one of these"}?\n`);
        for (const s of suggestions) {
          process.stderr.write(`        ${s}\n`);
        }
      }
      process.stderr.write(`\nRun 'epost-kit --help' for a list of all commands.\n`);
      process.exit(1);
    }
  }
  console.error("Error:", msg);
  process.exit(1);
}
