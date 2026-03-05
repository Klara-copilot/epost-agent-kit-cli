/**
 * Command: epost-kit lint
 * Validate references across installed agent/skill/command markdown files.
 * Also runs skill health checks: connections, completeness, orphans, sync.
 */

import { join, resolve } from "node:path";
import pc from "picocolors";
import { dirExists, fileExists } from "@/shared/file-system.js";
import { loadAllManifests } from "@/domains/packages/package-resolver.js";
import {
  buildRefRegistry,
  validateReferences,
  type RefError,
} from "@/domains/validation/ref-validator.js";
import {
  runSkillHealthChecks,
  type HealthIssue,
  type Severity,
} from "@/domains/health-checks/skill-health-checks.js";
import { logger } from "@/shared/logger.js";

interface LintOptions {
  verbose?: boolean;
  yes?: boolean;
  json?: boolean;
  dir?: string;
}

async function findPackagesDir(cwd: string): Promise<string | null> {
  const paths = [
    join(cwd, "packages"),
    join(cwd, "..", "packages"),
  ];
  for (const p of paths) {
    const resolved = resolve(p);
    if (
      (await dirExists(resolved)) &&
      (await fileExists(join(resolved, "core", "package.yaml")))
    ) {
      return resolved;
    }
  }
  return null;
}

export async function runLint(opts: LintOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : process.cwd();
  const claudeDir = join(cwd, ".claude");

  if (!(await dirExists(claudeDir))) {
    logger.error("No .claude/ directory found. Run epost-kit init first.");
    process.exit(1);
  }

  const packagesDir = await findPackagesDir(cwd);
  if (!packagesDir) {
    logger.error(
      "Cannot find packages/ directory. Run from the kit repo directory.",
    );
    process.exit(1);
  }

  // Build registry from package manifests
  const manifests = await loadAllManifests(packagesDir);
  const registry = buildRefRegistry(manifests);

  logger.debug(
    `Registry: ${registry.agents.size} agents, ${registry.skills.size} skills, ${registry.commands.size} commands`,
  );

  // Run ref validation + health checks in parallel
  const [refErrors, healthResult] = await Promise.all([
    validateReferences(claudeDir, registry),
    runSkillHealthChecks(packagesDir, claudeDir, manifests),
  ]);

  // JSON output mode
  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          refs: { errors: refErrors, count: refErrors.length },
          health: {
            issues: healthResult.issues,
            stats: healthResult.stats,
          },
        },
        null,
        2,
      ),
    );
    const hasErrors =
      refErrors.length > 0 ||
      healthResult.issues.some((i) => i.severity === "error");
    process.exit(hasErrors ? 1 : 0);
  }

  // ── Ref Errors Section ──
  printRefErrors(refErrors);

  // ── Health Checks Section ──
  printHealthResults(healthResult.issues, healthResult.stats, opts.verbose);

  // Exit code: 1 if any errors (not warnings/info)
  const hasErrors =
    refErrors.length > 0 ||
    healthResult.issues.some((i) => i.severity === "error");

  if (!hasErrors && healthResult.issues.filter((i) => i.severity === "warn").length === 0 && refErrors.length === 0) {
    logger.success("All checks passed.");
  }

  if (hasErrors) process.exit(1);
}

// ─── Ref Error Display ───

function printRefErrors(errors: RefError[]): void {
  if (errors.length === 0) {
    console.log(`  ${pc.green("✓")} Refs: all references valid`);
    return;
  }

  const byFile = new Map<string, RefError[]>();
  for (const err of errors) {
    const existing = byFile.get(err.file) ?? [];
    existing.push(err);
    byFile.set(err.file, existing);
  }

  console.log(
    `\n${pc.red("✗")} Refs: ${pc.bold(String(errors.length))} broken reference(s) in ${byFile.size} file(s):\n`,
  );

  for (const [file, fileErrors] of byFile) {
    console.log(`  ${pc.dim(file)}`);
    for (const err of fileErrors) {
      const loc =
        err.location === "frontmatter" ? pc.cyan("fm") : pc.dim("body");
      const suggestion = err.suggestion
        ? pc.green(` → ${err.suggestion}`)
        : "";
      console.log(
        `    ${pc.yellow("⚠")} L${err.line} [${loc}] ${err.type}: ${pc.red(err.ref)}${suggestion}`,
      );
    }
    console.log();
  }
}

// ─── Health Results Display ───

const severityIcon: Record<Severity, string> = {
  error: pc.red("✗"),
  warn: pc.yellow("⚠"),
  info: pc.blue("ℹ"),
};

function printHealthResults(
  issues: HealthIssue[],
  stats: {
    skillCount: number;
    connectionCount: { extends: number; requires: number; conflicts: number; enhances: number };
    completeness: { withKeywords: number; withPlatforms: number; withDescription: number };
  },
  verbose?: boolean,
): void {
  const { skillCount, connectionCount: cc, completeness: comp } = stats;

  // Stats summary
  const totalConn = cc.extends + cc.requires + cc.conflicts + cc.enhances;
  console.log(
    `  ${pc.green("✓")} Skills: ${skillCount} found, ${totalConn} connections (${cc.extends}e/${cc.requires}r/${cc.conflicts}c/${cc.enhances}h)`,
  );
  console.log(
    `  ${pc.green("✓")} Completeness: ${comp.withDescription}/${skillCount} descriptions, ${comp.withKeywords}/${skillCount} keywords, ${comp.withPlatforms}/${skillCount} platforms`,
  );

  // Group by severity
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warn");
  const infos = issues.filter((i) => i.severity === "info");

  if (errors.length > 0) {
    console.log(`\n${pc.red("✗")} ${errors.length} error(s):`);
    for (const issue of errors) {
      console.log(
        `    ${severityIcon.error} [${issue.rule}] ${pc.bold(issue.skill)}: ${issue.message}`,
      );
    }
  }

  if (warnings.length > 0) {
    console.log(`\n${pc.yellow("⚠")} ${warnings.length} warning(s):`);
    // In non-verbose mode, group by rule and show counts
    if (!verbose && warnings.length > 10) {
      const byRule = new Map<string, number>();
      for (const w of warnings) {
        byRule.set(w.rule, (byRule.get(w.rule) ?? 0) + 1);
      }
      for (const [rule, count] of byRule) {
        console.log(`    ${severityIcon.warn} [${rule}] × ${count}`);
      }
      console.log(pc.dim(`    Run with --verbose to see all warnings`));
    } else {
      for (const issue of warnings) {
        console.log(
          `    ${severityIcon.warn} [${issue.rule}] ${pc.bold(issue.skill)}: ${issue.message}`,
        );
      }
    }
  }

  if (verbose && infos.length > 0) {
    console.log(`\n${pc.blue("ℹ")} ${infos.length} info:`);
    for (const issue of infos) {
      console.log(
        `    ${severityIcon.info} [${issue.rule}] ${pc.bold(issue.skill)}: ${issue.message}`,
      );
    }
  } else if (infos.length > 0) {
    console.log(pc.dim(`\n  ${infos.length} info items (use --verbose to see)`));
  }

  console.log();
}
