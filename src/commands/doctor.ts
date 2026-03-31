/**
 * Command: epost-kit doctor
 * Verify installation and environment health
 */

import { runAllChecks, type CheckResult } from "@/domains/health-checks/health-checks.js";
import { logger } from "@/shared/logger.js";
import { heading, checkResult, checkSummary } from "@/domains/ui/index.js";
import type { DoctorOptions } from "@/types/commands.js";

/**
 * Generate JSON report of all check results
 */
function generateReport(results: CheckResult[]): string {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      warnings: results.filter((r) => r.status === "warn").length,
      failures: results.filter((r) => r.status === "fail").length,
    },
    checks: results.map((r) => ({
      status: r.status,
      message: r.message,
      fixable: r.fixable,
    })),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Determine exit code based on worst result
 */
function getExitCode(results: CheckResult[]): number {
  const hasFailures = results.some((r) => r.status === "fail");
  const hasWarnings = results.some((r) => r.status === "warn");

  if (hasFailures) return 1; // Failure
  if (hasWarnings) return 2; // Warnings
  return 0; // All pass
}

export async function runDoctor(opts: DoctorOptions): Promise<void> {
  const { resolve } = await import("node:path");
  const cwd = opts.dir ? resolve(opts.dir) : process.cwd();
  const shouldFix = opts.fix ?? false;
  const shouldReport = opts.report ?? false;

  // Run all health checks
  const spinner = logger.spinner("Running health checks...");
  spinner.start();

  const results = await runAllChecks(cwd);
  spinner.stop();

  // If report mode, output JSON and exit
  if (shouldReport) {
    console.log(generateReport(results));
    process.exit(getExitCode(results));
  }

  // Display results
  console.log(heading("Health Check Results"));
  console.log("");

  for (const result of results) {
    console.log(checkResult(result.status, result.message));
  }

  console.log("");

  // Summary
  const passed = results.filter((r) => r.status === "pass").length;
  const warnings = results.filter((r) => r.status === "warn").length;
  const failures = results.filter((r) => r.status === "fail").length;

  console.log(checkSummary(passed, warnings, failures));

  // Auto-fix if requested
  if (shouldFix) {
    const fixable = results.filter((r) => r.fixable && r.fix);

    if (fixable.length === 0) {
      logger.info("No fixable issues found.");
    } else {
      logger.info(`Attempting to fix ${fixable.length} issue(s)...`);
      console.log("");

      for (const result of fixable) {
        try {
          await result.fix!();
          logger.success(`Fixed: ${result.message}`);
        } catch (error) {
          logger.error(`Failed to fix: ${result.message}`);
          logger.debug(error instanceof Error ? error.message : String(error));
        }
      }

      console.log("");
      logger.info("Re-run doctor to verify fixes.");
    }
  } else if (results.some((r) => r.fixable)) {
    logger.info(
      "Some issues can be auto-fixed. Run with --fix to attempt repairs.",
    );
  }

  process.exit(getExitCode(results));
}
