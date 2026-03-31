/**
 * Command: epost-kit validate
 * Post-install structured check — config, skills, routing, delegation, hooks
 */

import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import pc from "picocolors";
import { logger } from "@/shared/logger.js";
import type { ValidateOptions } from "@/types/commands.js";

export type ValidateStatus = "pass" | "fail" | "warn";

export interface ValidateCheck {
  name: string;
  status: ValidateStatus;
  message: string;
}

async function checkConfigValidity(cwd: string): Promise<ValidateCheck> {
  const { readEpostConfig } = await import("@/domains/config/epost-config.js");
  try {
    const config = await readEpostConfig(cwd);
    if (!config) {
      return {
        name: "config",
        status: "fail",
        message: ".epost.json not found — run `epost-kit init` first",
      };
    }
    return {
      name: "config",
      status: "pass",
      message: `.epost.json valid (kitVersion: ${config.kitVersion})`,
    };
  } catch (err: any) {
    return {
      name: "config",
      status: "fail",
      message: `.epost.json invalid: ${err.message}`,
    };
  }
}

async function checkSkillLoading(cwd: string): Promise<ValidateCheck> {
  const { readEpostConfig } = await import("@/domains/config/epost-config.js");
  const config = await readEpostConfig(cwd);
  if (!config) {
    return { name: "skills", status: "fail", message: "No config — skip" };
  }

  if (config.skills.length === 0) {
    return { name: "skills", status: "warn", message: "No skills installed" };
  }

  // Check that skill directories exist on disk
  const claudeDir = join(cwd, ".claude", "skills");
  const missing: string[] = [];
  for (const skill of config.skills) {
    if (!existsSync(join(claudeDir, skill))) {
      missing.push(skill);
    }
  }

  if (missing.length > 0) {
    return {
      name: "skills",
      status: "fail",
      message: `Missing skill directories: ${missing.join(", ")}`,
    };
  }

  return {
    name: "skills",
    status: "pass",
    message: `${config.skills.length} skills present on disk`,
  };
}

async function checkRoutingAvailability(cwd: string): Promise<ValidateCheck> {
  // Check CLAUDE.md exists and has routing table
  const claudeMdPath = join(cwd, "CLAUDE.md");
  if (!existsSync(claudeMdPath)) {
    return {
      name: "routing",
      status: "fail",
      message: "CLAUDE.md not found — routing unavailable",
    };
  }

  try {
    const content = await readFile(claudeMdPath, "utf-8");
    if (content.includes("## Routing") || content.includes("Intent Map")) {
      return {
        name: "routing",
        status: "pass",
        message: "CLAUDE.md present with routing table",
      };
    }
    return {
      name: "routing",
      status: "warn",
      message: "CLAUDE.md found but no routing table detected",
    };
  } catch {
    return {
      name: "routing",
      status: "fail",
      message: "CLAUDE.md unreadable",
    };
  }
}

async function checkDelegationReadiness(cwd: string): Promise<ValidateCheck> {
  // Delegation requires agents to be present
  const agentsDir = join(cwd, ".claude", "agents");
  if (!existsSync(agentsDir)) {
    return {
      name: "delegation",
      status: "fail",
      message: ".claude/agents/ not found — delegation unavailable",
    };
  }

  const { readdir } = await import("node:fs/promises");
  try {
    const agents = (await readdir(agentsDir)).filter((f) => f.endsWith(".md"));
    if (agents.length === 0) {
      return {
        name: "delegation",
        status: "warn",
        message: "No agent files found in .claude/agents/",
      };
    }
    return {
      name: "delegation",
      status: "pass",
      message: `${agents.length} agents available for delegation`,
    };
  } catch {
    return {
      name: "delegation",
      status: "fail",
      message: ".claude/agents/ unreadable",
    };
  }
}

async function checkHookSafety(cwd: string): Promise<ValidateCheck> {
  const hooksDir = join(cwd, ".claude", "hooks");
  if (!existsSync(hooksDir)) {
    return {
      name: "hooks",
      status: "pass",
      message: "No hooks directory — hooks not in use",
    };
  }

  const settingsPath = join(cwd, ".claude", "settings.json");
  if (!existsSync(settingsPath)) {
    return {
      name: "hooks",
      status: "warn",
      message: "hooks/ exists but settings.json not found",
    };
  }

  try {
    const raw = await readFile(settingsPath, "utf-8");
    const settings = JSON.parse(raw);
    const hooksConfig = settings.hooks;
    if (!hooksConfig || Object.keys(hooksConfig).length === 0) {
      return {
        name: "hooks",
        status: "warn",
        message: "hooks/ present but no hooks registered in settings.json",
      };
    }
    return {
      name: "hooks",
      status: "pass",
      message: `${Object.keys(hooksConfig).length} hook event(s) registered`,
    };
  } catch {
    return {
      name: "hooks",
      status: "fail",
      message: "settings.json parse error — hooks status unknown",
    };
  }
}

function statusIcon(status: ValidateStatus): string {
  if (status === "pass") return pc.green("✓");
  if (status === "warn") return pc.yellow("△");
  return pc.red("✗");
}

export async function runValidate(opts: ValidateOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  const checks = await Promise.all([
    checkConfigValidity(cwd),
    checkSkillLoading(cwd),
    checkRoutingAvailability(cwd),
    checkDelegationReadiness(cwd),
    checkHookSafety(cwd),
  ]);

  const passed = checks.filter((c) => c.status === "pass").length;
  const warned = checks.filter((c) => c.status === "warn").length;
  const failed = checks.filter((c) => c.status === "fail").length;

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          summary: { total: checks.length, passed, warned, failed },
          checks: checks.map((c) => ({
            name: c.name,
            status: c.status,
            message: c.message,
          })),
        },
        null,
        2
      )
    );
    process.exit(failed > 0 ? 1 : 0);
  }

  console.log("");
  logger.heading("Validate — Post-Install Check");
  console.log("");

  for (const check of checks) {
    const icon = statusIcon(check.status);
    const label = pc.bold(check.name.padEnd(12));
    console.log(`  ${icon}  ${label}  ${check.message}`);
  }

  console.log("");

  if (failed > 0) {
    console.log(
      pc.red(`  ${failed} check(s) failed`) +
        (warned > 0 ? pc.yellow(`, ${warned} warning(s)`) : "") +
        `, ${passed} passed`
    );
    console.log("");
    console.log(pc.dim("  Run `epost-kit repair` to attempt auto-fix of failures."));
  } else if (warned > 0) {
    console.log(
      pc.yellow(`  ${warned} warning(s)`) + `, ${passed} passed`
    );
  } else {
    console.log(pc.green(`  All ${passed} checks passed.`));
  }

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}
