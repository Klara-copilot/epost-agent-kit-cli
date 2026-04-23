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
  .alias("install")
  .option("--kit <name>", "Kit template to use (legacy mode)")
  .option("--profile <name>", "Developer profile (e.g., web-b2b, ios-b2c)")
  .option(
    "--packages <list>",
    "Comma-separated package list (e.g., core,platform-web)"
  )
  .option("--optional <list>", "Comma-separated optional packages to include")
  .option("--exclude <list>", "Comma-separated packages to exclude")
  .option("--full", "Non-interactive: install full kit (all packages)")
  .option("--bundle <name>", "Non-interactive: install a role bundle (e.g., web, ios-developer)")
  .option("--skill <name>", "Non-interactive: install a single skill (e.g., discover, plan)")
  .option("--fresh", "Fresh install (ignore existing files)")
  .option("--force", "Force fresh download and reinstall (combines --force-download and --fresh)")
  .option("--force-download", "Skip cache and re-download release from GitHub")
  .option("--source [path]", "Use local source repo for packages (dev mode, skips GitHub download)")
  .option("--dry-run", "Preview changes without applying")
  .option("--preview", "Show file list before writing (alias for --dry-run)")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runInit } = await import("./commands/init.js");
    const force = opts.force ?? false;
    await runInit({
      ...cli.globalCommand.options,
      ...opts,
      forceDownload: force || opts.forceDownload,
      fresh: force || opts.fresh,
      // --preview is an alias for --dry-run
      dryRun: opts.dryRun || opts.preview,
      // --full maps to profile "full"
      profile: opts.full ? "full" : (opts.bundle ? opts.bundle : opts.profile),
      // --skill maps to single-package install
      packages: opts.skill ? opts.skill : opts.packages,
      // Trigger non-interactive mode for --full, --bundle, or --skill
      yes: opts.yes || opts.full || !!opts.bundle || !!opts.skill,
    });
  });

// Command: doctor - Verify installation
cli
  .command("doctor", "Verify installation and environment health")
  .option("--fix", "Automatically fix issues")
  .option("--report", "Generate detailed report")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runDoctor } = await import("./commands/doctor.js");
    await runDoctor({ ...cli.globalCommand.options, ...opts });
  });

// Command: status - Show installed scope and enabled items
cli
  .command("status", "Show installed kit scope, enabled items, and mode")
  .option("--dir <path>", "Target project directory")
  .option("--json", "Output as JSON")
  .action(async (opts: any) => {
    const { runStatus } = await import("./commands/status.js");
    await runStatus({ ...cli.globalCommand.options, ...opts });
  });

// Command: validate - Post-install structured check
cli
  .command("validate", "Validate installed config, skills, routing, delegation, and hooks")
  .option("--dir <path>", "Target project directory")
  .option("--json", "Output as JSON")
  .action(async (opts: any) => {
    const { runValidate } = await import("./commands/validate.js");
    await runValidate({ ...cli.globalCommand.options, ...opts });
  });

// Command: dry-run - Simulate routing for a prompt
cli
  .command('dry-run [prompt]', 'Simulate routing for a natural language prompt')
  .option('--dir <path>', 'Target project directory')
  .option('--json', 'Output as JSON')
  .action(async (prompt: any, opts: any) => {
    const { runDryRunCommand } = await import('./commands/dry-run-command.js');
    await runDryRunCommand(prompt, { ...cli.globalCommand.options, ...opts });
  });

// Command: trace - Show full orchestration path for a prompt
cli
  .command('trace [prompt]', 'Show full routing trace for a natural language prompt')
  .option('--dir <path>', 'Target project directory')
  .option('--json', 'Output as JSON')
  .action(async (prompt: any, opts: any) => {
    const { runTrace } = await import('./commands/trace.js');
    await runTrace(prompt, { ...cli.globalCommand.options, ...opts });
  });

// Command: show - Display routing table or config
cli
  .command('show routing', 'Extract and render routing table from installed CLAUDE.md')
  .option('--dir <path>', 'Target project directory')
  .option('--json', 'Output as JSON')
  .action(async (opts: any) => {
    const { runShowRouting } = await import('./commands/show.js');
    await runShowRouting({ ...cli.globalCommand.options, ...opts });
  });

cli
  .command('show config', 'Display current .epost.json and .epost-metadata.json config')
  .option('--dir <path>', 'Target project directory')
  .option('--json', 'Output as JSON')
  .action(async (opts: any) => {
    const { runShowConfig } = await import('./commands/show.js');
    await runShowConfig({ ...cli.globalCommand.options, ...opts });
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

// Command: roles - List available role bundles
cli
  .command('roles', 'List available role bundles')
  .option('--json', 'Output as JSON')
  .action(async (opts: any) => {
    const { runRoles } = await import('./commands/roles.js');
    await runRoles({ ...cli.globalCommand.options, ...opts });
  });

// Command: add - Install a skill or role bundle
cli
  .command('add [name]', 'Install a skill or role bundle')
  .option('--role <name>', 'Install a role bundle by name')
  .option('--dir <path>', 'Target project directory')
  .option('--dry-run', 'Preview changes without applying')
  .option('--preview', 'Preview changes without applying (alias for --dry-run)')
  .option('--json', 'Output as JSON')
  .action(async (name: any, opts: any) => {
    const { runAdd } = await import('./commands/add.js');
    await runAdd(name, {
      ...cli.globalCommand.options,
      ...opts,
      dryRun: opts.dryRun || opts.preview,
    });
  });

// Command: remove - Remove a skill or role bundle
cli
  .command('remove [name]', 'Remove a skill or role bundle')
  .option('--role <name>', 'Remove a role bundle by name')
  .option('--dir <path>', 'Target project directory')
  .option('--force', 'Skip confirmation and reverse-dep warning')
  .option('--dry-run', 'Preview changes without applying')
  .option('--preview', 'Preview changes without applying (alias for --dry-run)')
  .option('--json', 'Output as JSON')
  .action(async (name: any, opts: any) => {
    const { runRemove } = await import('./commands/remove.js');
    await runRemove(name, {
      ...cli.globalCommand.options,
      ...opts,
      dryRun: opts.dryRun || opts.preview,
    });
  });

// Command: enable - Enable a skill or hook
cli
  .command('enable <type> <name>', 'Enable an installed skill or hook')
  .option('--dir <path>', 'Target project directory')
  .option('--json', 'Output as JSON')
  .action(async (type: any, name: any, opts: any) => {
    const { runEnableDisable } = await import('./commands/enable-disable.js');
    await runEnableDisable('enable', type, name, { ...cli.globalCommand.options, ...opts });
  });

// Command: disable - Disable a skill or hook (without removing from disk)
cli
  .command('disable <type> <name>', 'Disable an installed skill or hook (without removing from disk)')
  .option('--dir <path>', 'Target project directory')
  .option('--json', 'Output as JSON')
  .action(async (type: any, name: any, opts: any) => {
    const { runEnableDisable } = await import('./commands/enable-disable.js');
    await runEnableDisable('disable', type, name, { ...cli.globalCommand.options, ...opts });
  });

// Command: browse - Interactive marketplace TUI
cli
  .command('browse', 'Interactive marketplace — browse and install roles')
  .alias('marketplace')
  .option('--dir <path>', 'Target project directory')
  .option('--no-cache', 'Bypass registry cache for fresh remote version check')
  .action(async (opts: any) => {
    const { runBrowse } = await import('./commands/browse.js');
    await runBrowse({ ...cli.globalCommand.options, ...opts });
  });

// Command: proposals - Review and apply skill evolution proposals
cli
  .command('proposals', 'List, inspect, and apply skill improvement proposals')
  .option('--show <id>', 'Show full proposal with diff')
  .option('--approve <id>', 'Apply proposal to packages/ source skill')
  .option('--reject <id>', 'Mark proposal rejected')
  .option('--reason <text>', 'Rejection reason (use with --reject)')
  .option('--stats', 'Show signal/proposal counts by skill')
  .option('--all', 'Include approved and rejected proposals in listing')
  .option('--dir <path>', 'Target project directory')
  .action(async (opts: any) => {
    const { runProposals } = await import('./commands/proposals.js');
    await runProposals({ ...cli.globalCommand.options, ...opts });
  });

// Command: list hooks - Show registered hooks from settings.json
// NOTE: must be registered BEFORE bare 'list' so CAC matches 'list hooks' first
cli
  .command('list hooks', 'Show registered hooks from .claude/settings.json')
  .option('--dir <path>', 'Target project directory')
  .option('--json', 'Output as JSON')
  .action(async (opts: any) => {
    const { runListHooks } = await import('./commands/list.js');
    await runListHooks({ ...cli.globalCommand.options, ...opts });
  });

// Command: list - Show installed skills and roles
cli
  .command('list', 'Show installed skills and roles')
  .option('--dir <path>', 'Target project directory')
  .option('--json', 'Output as JSON')
  .action(async (opts: any) => {
    const { runList } = await import('./commands/list.js');
    await runList({ ...cli.globalCommand.options, ...opts });
  });

// Command: update - Re-install kit packages from existing metadata (no setup flow)
cli
  .command("update", "Update installed kit packages (uses existing profile/target)")
  .option("--dir <path>", "Target project directory")
  .option("--source [path]", "Use local source repo for packages (dev mode)")
  .option("--force-download", "Skip cache and re-download release from GitHub")
  .option("--json", "Output as JSON")
  .option("--dry-run", "Preview changes without applying")
  .option("--preview", "Preview changes without applying (alias for --dry-run)")
  .option("--fresh", "Force clean wipe and reinstall (discards local customizations)")
  .action(async (opts: any) => {
    const { runUpdate } = await import("./commands/update.js");
    await runUpdate({
      ...cli.globalCommand.options,
      ...opts,
      dryRun: opts.dryRun || opts.preview,
    });
  });

// Command: upgrade - Self-update CLI and check kit content updates
cli
  .command("upgrade", "Check and install CLI + kit content updates")
  .option("--check", "Only check for updates, don't install")
  .option("--no-cache", "Bypass registry cache for fresh remote check")
  .option("--dir <path>", "Target project directory (for kit version check)")
  .option("--json", "Output as JSON")
  .action(async (opts: any) => {
    const { runUpgrade } = await import("./commands/upgrade.js");
    await runUpgrade({ ...cli.globalCommand.options, ...opts });
  });

// Command: repair - Auto-fix validation failures
cli
  .command("repair", "Auto-fix validation failures (re-runs init with --force)")
  .option("--dir <path>", "Target project directory")
  .option("--json", "Output as JSON")
  .action(async (opts: any) => {
    const { runRepair } = await import("./commands/repair.js");
    await runRepair({ ...cli.globalCommand.options, ...opts });
  });

// Command: convert - Convert kit to IDE-specific format
cli
  .command("convert", "Convert Claude-Code agents/skills to IDE-specific format")
  .option("--target <name>", "IDE target: vscode (default), cursor, jetbrains")
  .option("--output <path>", "Output directory (default: .github for vscode, .cursor for cursor)")
  .option("--packages <list>", "Comma-separated package names to convert")
  .option("--profile <name>", "Profile filter")
  .option("--dry-run", "Preview changes without writing files")
  .option("--source", "Use local source repo for packages (dev mode)")
  .action(async (opts: any) => {
    const { runConvert } = await import("./commands/convert.js");
    await runConvert({
      ...cli.globalCommand.options,
      ...opts,
      dryRun: opts.dryRun,
    });
  });

// Command: uninstall - Remove kit
cli
  .command("uninstall", "Remove installed kit from project")
  .option("--dir <path>", "Target project directory")
  .option("--keep-custom", "Keep user-modified files")
  .option("--force", "Force removal without confirmation")
  .option("--dry-run", "Preview what would be removed without applying")
  .option("--preview", "Preview what would be removed without applying (alias for --dry-run)")
  .option("--json", "Output as JSON")
  .action(async (opts: any) => {
    const { runUninstall } = await import("./commands/uninstall.js");
    await runUninstall({
      ...cli.globalCommand.options,
      ...opts,
      dryRun: opts.dryRun || opts.preview,
    });
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

// Command: dev init - Initialize using local source repo, then start background watcher
// NOTE: must be registered BEFORE "dev" so CAC matches "dev init" before "dev"
cli
  .command("dev init", "Initialize using local ../epost_agent_kit source, then start watcher")
  .option("--profile <name>", "Developer profile")
  .option("--packages <list>", "Comma-separated package list")
  .option("--optional <list>", "Comma-separated optional packages to include")
  .option("--exclude <list>", "Comma-separated packages to exclude")
  .option("--fresh", "Fresh install (ignore existing files)")
  .option("--dry-run", "Preview changes without applying")
  .option("--dir <path>", "Target project directory")
  .option("--no-watch", "Skip starting the background watcher after init")
  .action(async (opts: any) => {
    const { runInit } = await import("./commands/init.js");
    await runInit({
      ...cli.globalCommand.options,
      ...opts,
      source: "../epost_agent_kit",
    });

    // Start watcher in background unless --no-watch or dry-run
    if (!opts.noWatch && !opts.dryRun) {
      const { spawnDevWatcher } = await import("./commands/dev-spawn.js");
      await spawnDevWatcher({ dir: opts.dir });
    }
  });

// Command: dev update - Update using local source repo (dev mode shorthand)
cli
  .command("dev update", "Update packages using local ../epost_agent_kit source (dev mode)")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runUpdate } = await import("./commands/update.js");
    await runUpdate({
      ...cli.globalCommand.options,
      ...opts,
      source: "../epost_agent_kit",
    });
  });

// Command: dev stop - Kill background watcher
cli
  .command("dev stop", "Stop the background dev watcher")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { resolve, join } = await import("node:path");
    const { readFile, unlink } = await import("node:fs/promises");
    const targetDir = opts.dir ? resolve(opts.dir) : resolve(process.cwd());
    const pidPath = join(targetDir, ".epost-data", "dev-watcher.pid");
    try {
      const pid = parseInt(await readFile(pidPath, "utf-8"), 10);
      process.kill(pid, "SIGTERM");
      await unlink(pidPath);
      console.log(`Watcher stopped (PID ${pid})`);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        console.log("No watcher running (no PID file found)");
      } else if (err.code === "ESRCH") {
        await unlink(pidPath).catch(() => {});
        console.log("Watcher was already stopped");
      } else {
        console.error(`Failed to stop watcher: ${err.message}`);
      }
    }
  });

// Command: dev - Watch local kit source and auto-rebuild target project
cli
  .command("dev", "Watch local kit source and auto-regenerate .claude/ on changes")
  .option("--target <dir>", "Target project directory to sync into")
  .option("--source <path>", "Local kit source path (default: ../epost_agent_kit)")
  .option("--profile <name>", "Only watch packages for this profile")
  .option("--force", "Overwrite user-modified files")
  .option("--detach", "Run watcher as a background process (logs to .epost-data/dev-watcher.log)")
  .action(async (opts: any) => {
    if (opts.detach) {
      const { spawnDevWatcher } = await import("./commands/dev-spawn.js");
      await spawnDevWatcher({ dir: opts.target, source: opts.source });
      return;
    }
    const { runDev } = await import("./commands/dev.js");
    await runDev({ ...cli.globalCommand.options, ...opts });
  });

// Command: config show
cli
  .command("config show", "Show current .epost-kit.json configuration")
  .option("--dir <path>", "Target project directory")
  .option("--json", "Output as JSON")
  .option("--global", "Show global config only")
  .option("--local", "Show project config only")
  .option("--sources", "Show where each value comes from")
  .action(async (opts: any) => {
    const { runShow } = await import("./commands/config/index.js");
    await runShow({ ...cli.globalCommand.options, ...opts });
  });

// Command: config get
cli
  .command("config get <key>", "Get a config value by dot-notation key (e.g. plan.dateFormat)")
  .option("--dir <path>", "Target project directory")
  .option("--json", "Output as JSON")
  .option("--global", "Read from global config")
  .option("--local", "Read from project config")
  .action(async (key: any, opts: any) => {
    const { runGet } = await import("./commands/config/index.js");
    await runGet({ ...cli.globalCommand.options, ...opts, key });
  });

// Command: config set
cli
  .command("config set <key> <value>", "Set a config value by dot-notation key")
  .option("--dir <path>", "Target project directory")
  .option("--global", "Write to global config")
  .option("--local", "Write to project config")
  .action(async (key: any, value: any, opts: any) => {
    const { runSet } = await import("./commands/config/index.js");
    await runSet({ ...cli.globalCommand.options, ...opts, key, value });
  });

// Command: config reset
cli
  .command("config reset", "Restore .epost-kit.json defaults from installed packages")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runReset } = await import("./commands/config/index.js");
    await runReset({ ...cli.globalCommand.options, ...opts });
  });

// Command: config ignore
cli
  .command("config ignore", "Show current .epost-ignore patterns")
  .option("--dir <path>", "Target project directory")
  .option("--json", "Output as JSON")
  .action(async (opts: any) => {
    const { runConfigIgnore } = await import("./commands/config/index.js");
    await runConfigIgnore({ ...cli.globalCommand.options, ...opts });
  });

// Command: config ignore add
cli
  .command("config ignore add <pattern>", "Append a pattern to .epost-ignore")
  .option("--dir <path>", "Target project directory")
  .action(async (pattern: any, opts: any) => {
    const { runConfigIgnoreAdd } = await import("./commands/config/index.js");
    await runConfigIgnoreAdd({ ...cli.globalCommand.options, ...opts, pattern });
  });

// Command: config ignore remove
cli
  .command("config ignore remove <pattern>", "Remove a pattern from .epost-ignore")
  .option("--dir <path>", "Target project directory")
  .action(async (pattern: any, opts: any) => {
    const { runConfigIgnoreRemove } = await import("./commands/config/index.js");
    await runConfigIgnoreRemove({ ...cli.globalCommand.options, ...opts, pattern });
  });

// Command: config ui — web dashboard (MUST be before bare config for CAC matching)
cli
  .command("config ui", "Launch web dashboard for visual config editing")
  .option("--port <number>", "Port number (default: auto-select 3456-3460)")
  .option("--host <addr>", "Bind address (default: localhost)")
  .option("--no-open", "Don't auto-open browser")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runConfigUI } = await import("./commands/config/index.js");
    await runConfigUI({ ...cli.globalCommand.options, ...opts });
  });

// Bare config — interactive TUI (registered after subcommands so CAC matches specific first)
cli
  .command("config", "Interactively view and edit kit configuration")
  .option("--dir <path>", "Target project directory")
  .action(async (opts: any) => {
    const { runConfigInteractive } = await import("./commands/config/index.js");
    await runConfigInteractive({ ...cli.globalCommand.options, ...opts });
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

// ─── Multi-word command argv preprocessor ────────────────────────────────────

/**
 * cac only matches a command when args[0] equals the full command name.
 * For multi-word commands like "config show", argv arrives as ['config', 'show'].
 * This joins those tokens into a single arg so cac can match correctly.
 */
function preprocessArgv(argv: string[], commands: Array<{ name: string }>): string[] {
  const args = argv.slice(2); // everything after 'node <script>'

  // Extract the literal prefix (before any <arg> or [arg] placeholders)
  const prefixes = commands
    .map((c) => c.name.split(/[<[]/)[0].trim())
    .filter((prefix) => prefix.includes(" "))
    .sort((a, b) => b.split(" ").length - a.split(" ").length); // longest first

  for (const prefix of prefixes) {
    const parts = prefix.split(" ");
    if (parts.every((part, i) => args[i] === part)) {
      return [...argv.slice(0, 2), prefix, ...args.slice(parts.length)];
    }
  }
  return argv;
}

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

// ─── JSON error serialization helper ───────────────────────────────────────

function emitJsonError(code: string, message: string, exitCode: number): void {
  process.stdout.write(
    JSON.stringify({ type: "error", code, message, exitCode }) + "\n"
  );
}

const isJsonMode = process.argv.includes("--json");

// Error handling
process.on("unhandledRejection", (error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (isJsonMode) {
    emitJsonError("UNHANDLED_REJECTION", message, 1);
  } else {
    console.error("Error:", message);
  }
  process.exit(1);
});

try {
  cli.parse(preprocessArgv(process.argv, cli.commands));
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
      if (isJsonMode) {
        emitJsonError("UNKNOWN_COMMAND", `unknown command '${unknown}' for 'epost-kit'`, 1);
      } else {
        process.stderr.write(`error: unknown command '${unknown}' for 'epost-kit'\n`);
        if (suggestions.length > 0) {
          process.stderr.write(`\nDid you mean ${suggestions.length === 1 ? "this" : "one of these"}?\n`);
          for (const s of suggestions) {
            process.stderr.write(`        ${s}\n`);
          }
        }
        process.stderr.write(`\nRun 'epost-kit --help' for a list of all commands.\n`);
      }
      process.exit(1);
    }
  }
  if (isJsonMode) {
    emitJsonError("CLI_ERROR", msg, 1);
  } else {
    console.error("Error:", msg);
  }
  process.exit(1);
}
