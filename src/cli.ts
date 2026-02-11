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

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
});

cli.parse();
