/**
 * Compatibility Report — warning types and terminal formatter for VS Code installs
 *
 * Tracks features dropped during CopilotAdapter transforms and renders a
 * structured report grouped by severity.
 */

import pc from "picocolors";

// ── Types ──

export type WarningSeverity = "high" | "medium" | "low";
export type WarningCategory = "hooks" | "agents" | "skills" | "config";

export interface CompatibilityWarning {
  severity: WarningSeverity;
  category: WarningCategory;
  feature: string;   // e.g., "hook matcher: Edit|Write"
  source: string;    // e.g., "PreToolUse hook group"
  reason: string;    // e.g., "VS Code hooks.json does not support matchers"
}

// ── Formatter ──

const SEVERITY_COLOR: Record<WarningSeverity, (s: string) => string> = {
  high:   (s) => pc.red(s),
  medium: (s) => pc.yellow(s),
  low:    (s) => pc.dim(s),
};

const SEVERITY_LABEL: Record<WarningSeverity, string> = {
  high:   "HIGH  ",
  medium: "MED   ",
  low:    "LOW   ",
};

const CATEGORY_LABEL: Record<WarningCategory, string> = {
  hooks:  "hooks",
  agents: "agents",
  skills: "skills",
  config: "config",
};

/**
 * Render a compatibility report to a string.
 * Groups warnings by severity (high → medium → low), then category.
 * Returns empty string if no warnings.
 *
 * @param target  Label used in the report header (e.g. "VS Code", "Cursor")
 */
export function formatCompatibilityReport(
  warnings: CompatibilityWarning[],
  target = "VS Code",
): string {
  if (warnings.length === 0) return "";

  const lines: string[] = [];

  // Summary header
  const highCount   = warnings.filter((w) => w.severity === "high").length;
  const medCount    = warnings.filter((w) => w.severity === "medium").length;
  const lowCount    = warnings.filter((w) => w.severity === "low").length;

  const parts: string[] = [];
  if (highCount > 0)  parts.push(pc.red(`${highCount} high`));
  if (medCount > 0)   parts.push(pc.yellow(`${medCount} medium`));
  if (lowCount > 0)   parts.push(pc.dim(`${lowCount} low`));

  lines.push(pc.bold(`  ${target} compatibility: ${parts.join(", ")} issue${warnings.length !== 1 ? "s" : ""}`));
  lines.push("");

  // Group by severity then category
  const severityOrder: WarningSeverity[] = ["high", "medium", "low"];

  for (const sev of severityOrder) {
    const sevWarnings = warnings.filter((w) => w.severity === sev);
    if (sevWarnings.length === 0) continue;

    const categories = [...new Set(sevWarnings.map((w) => w.category))] as WarningCategory[];

    for (const cat of categories) {
      const catWarnings = sevWarnings.filter((w) => w.category === cat);

      for (const w of catWarnings) {
        const tag   = SEVERITY_COLOR[sev](SEVERITY_LABEL[sev]);
        const label = pc.cyan(CATEGORY_LABEL[cat]);
        lines.push(`  ${tag} ${label}  ${w.feature}`);
        lines.push(`         ${pc.dim(`from: ${w.source}`)}`);
        lines.push(`         ${w.reason}`);
        lines.push("");
      }
    }
  }

  // Actionable footer for high-severity
  if (highCount > 0) {
    if (target === "Cursor") {
      lines.push(pc.dim("  HIGH issues affect Cursor agent behavior — permissionMode and hooks are not enforced."));
      lines.push(pc.dim("  Cursor Task tool is currently broken in .cursor/agents/ (known bug, Jan 2026)."));
    } else {
      lines.push(pc.dim("  HIGH issues change behavior — hooks with matchers now fire unconditionally."));
      lines.push(pc.dim("  Review .github/hooks/ to confirm hook conditions are still correct."));
    }
    lines.push("");
  }

  return lines.join("\n");
}
