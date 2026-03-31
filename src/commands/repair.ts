/**
 * Command: epost-kit repair
 * Auto-fix validation failures by re-running the install engine with --force.
 */

import { resolve } from "node:path";
import { confirm } from "@inquirer/prompts";
import pc from "picocolors";
import { logger } from "@/shared/logger.js";
import type { RepairOptions } from "@/types/commands.js";

// Re-export check functions from validate for testing
export {
  runValidate,
} from "@/commands/validate.js";

type ValidateStatus = "pass" | "fail" | "warn";
interface ValidateCheck {
  name: string;
  status: ValidateStatus;
  message: string;
}

/** Run all validate checks and return results */
async function runChecks(cwd: string): Promise<ValidateCheck[]> {
  // Dynamically import to avoid circular deps and keep validate self-contained
  const { runValidate: _runValidate, ...rest } = await import(
    "@/commands/validate.js"
  );
  void _runValidate; // not used directly here
  void rest;

  // Re-implement check runner by importing the individual check functions.
  // validate.ts does not export them, so we replicate the call pattern.
  const { existsSync } = await import("node:fs");
  const { readFile, readdir } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const { readEpostConfig } = await import(
    "@/domains/config/epost-config.js"
  );

  const checks: ValidateCheck[] = [];

  // 1. Config validity
  try {
    const config = await readEpostConfig(cwd);
    if (!config) {
      checks.push({
        name: "config",
        status: "fail",
        message: ".epost.json not found — run `epost-kit init` first",
      });
    } else {
      checks.push({
        name: "config",
        status: "pass",
        message: `.epost.json valid (kitVersion: ${config.kitVersion})`,
      });
    }
  } catch (err: any) {
    checks.push({
      name: "config",
      status: "fail",
      message: `.epost.json invalid: ${err.message}`,
    });
  }

  // 2. Skills on disk
  try {
    const config = await readEpostConfig(cwd);
    if (!config) {
      checks.push({ name: "skills", status: "fail", message: "No config — skip" });
    } else if (config.skills.length === 0) {
      checks.push({ name: "skills", status: "warn", message: "No skills installed" });
    } else {
      const claudeDir = join(cwd, ".claude", "skills");
      const missing: string[] = [];
      for (const skill of config.skills) {
        if (!existsSync(join(claudeDir, skill))) missing.push(skill);
      }
      if (missing.length > 0) {
        checks.push({
          name: "skills",
          status: "fail",
          message: `Missing skill directories: ${missing.join(", ")}`,
        });
      } else {
        checks.push({
          name: "skills",
          status: "pass",
          message: `${config.skills.length} skills present on disk`,
        });
      }
    }
  } catch (err: any) {
    checks.push({ name: "skills", status: "fail", message: `Skills check error: ${err.message}` });
  }

  // 3. Routing availability
  const claudeMdPath = join(cwd, "CLAUDE.md");
  if (!existsSync(claudeMdPath)) {
    checks.push({
      name: "routing",
      status: "fail",
      message: "CLAUDE.md not found — routing unavailable",
    });
  } else {
    try {
      const content = await readFile(claudeMdPath, "utf-8");
      if (content.includes("## Routing") || content.includes("Intent Map")) {
        checks.push({ name: "routing", status: "pass", message: "CLAUDE.md present with routing table" });
      } else {
        checks.push({ name: "routing", status: "warn", message: "CLAUDE.md found but no routing table detected" });
      }
    } catch {
      checks.push({ name: "routing", status: "fail", message: "CLAUDE.md unreadable" });
    }
  }

  // 4. Delegation readiness
  const agentsDir = join(cwd, ".claude", "agents");
  if (!existsSync(agentsDir)) {
    checks.push({
      name: "delegation",
      status: "fail",
      message: ".claude/agents/ not found — delegation unavailable",
    });
  } else {
    try {
      const agents = (await readdir(agentsDir)).filter((f) => f.endsWith(".md"));
      if (agents.length === 0) {
        checks.push({ name: "delegation", status: "warn", message: "No agent files found in .claude/agents/" });
      } else {
        checks.push({ name: "delegation", status: "pass", message: `${agents.length} agents available for delegation` });
      }
    } catch {
      checks.push({ name: "delegation", status: "fail", message: ".claude/agents/ unreadable" });
    }
  }

  // 5. Hook safety
  const hooksDir = join(cwd, ".claude", "hooks");
  if (!existsSync(hooksDir)) {
    checks.push({ name: "hooks", status: "pass", message: "No hooks directory — hooks not in use" });
  } else {
    const settingsPath = join(cwd, ".claude", "settings.json");
    if (!existsSync(settingsPath)) {
      checks.push({ name: "hooks", status: "warn", message: "hooks/ exists but settings.json not found" });
    } else {
      try {
        const raw = await readFile(settingsPath, "utf-8");
        const settings = JSON.parse(raw);
        const hooksConfig = settings.hooks;
        if (!hooksConfig || Object.keys(hooksConfig).length === 0) {
          checks.push({ name: "hooks", status: "warn", message: "hooks/ present but no hooks registered in settings.json" });
        } else {
          checks.push({ name: "hooks", status: "pass", message: `${Object.keys(hooksConfig).length} hook event(s) registered` });
        }
      } catch {
        checks.push({ name: "hooks", status: "fail", message: "settings.json parse error — hooks status unknown" });
      }
    }
  }

  return checks;
}

export async function runRepair(opts: RepairOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  // Step 1: Run validation checks
  const checks = await runChecks(cwd);
  const failed = checks.filter((c) => c.status === "fail");

  if (opts.json) {
    if (failed.length === 0) {
      console.log(
        JSON.stringify({ repaired: false, message: "Nothing to repair", checks }, null, 2)
      );
      process.exit(0);
    }

    // Confirm in JSON mode only if --yes passed
    if (!opts.yes) {
      console.log(
        JSON.stringify({
          repaired: false,
          message: "Repair requires --yes flag in JSON mode",
          failed: failed.map((c) => c.name),
        }, null, 2)
      );
      process.exit(1);
    }

    // Run repair
    const { runInit } = await import("@/commands/init.js");
    await runInit({ dir: opts.dir, fresh: true, forceDownload: true, yes: true });

    // Re-run checks
    const afterChecks = await runChecks(cwd);
    const stillFailed = afterChecks.filter((c) => c.status === "fail");
    console.log(
      JSON.stringify({
        repaired: true,
        success: stillFailed.length === 0,
        checks: afterChecks,
      }, null, 2)
    );
    process.exit(stillFailed.length > 0 ? 1 : 0);
  }

  // Human mode
  console.log("");
  logger.heading("Repair — Auto-fix validation failures");
  console.log("");

  if (failed.length === 0) {
    console.log(pc.green("  Nothing to repair — all checks pass."));
    console.log("");
    process.exit(0);
  }

  console.log(pc.yellow(`  ${failed.length} check(s) failed:`));
  for (const check of failed) {
    console.log(`    ${pc.red("✗")}  ${pc.bold(check.name.padEnd(12))}  ${check.message}`);
  }
  console.log("");

  // Confirm unless --yes
  const shouldRepair = opts.yes
    ? true
    : await confirm({
        message: "Re-run init with --force to repair these failures?",
        default: true,
      });

  if (!shouldRepair) {
    logger.info("Repair cancelled.");
    process.exit(0);
  }

  console.log("");
  logger.info("Running `epost-kit init --force`...");
  console.log("");

  const { runInit } = await import("@/commands/init.js");
  await runInit({ dir: opts.dir, fresh: true, forceDownload: true, yes: true });

  console.log("");
  logger.info("Re-running validation checks...");
  console.log("");

  const afterChecks = await runChecks(cwd);
  const stillFailed = afterChecks.filter((c) => c.status === "fail");

  for (const check of afterChecks) {
    const icon =
      check.status === "pass"
        ? pc.green("✓")
        : check.status === "warn"
        ? pc.yellow("△")
        : pc.red("✗");
    console.log(`  ${icon}  ${pc.bold(check.name.padEnd(12))}  ${check.message}`);
  }
  console.log("");

  if (stillFailed.length === 0) {
    logger.success("All checks now pass.");
  } else {
    logger.error(`${stillFailed.length} check(s) still failing after repair.`);
    process.exit(1);
  }
}
