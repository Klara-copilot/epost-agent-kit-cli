/**
 * Cursor Adapter — transforms Claude Code agent format → Cursor agent format
 *
 * Cursor agents support only 5 fields: name, description, model, readonly, background
 * All other Claude Code fields are silently ignored by Cursor.
 *
 * Skills and rules context is delivered via .cursor/rules/epost-kit.mdc (alwaysApply: true)
 * rather than per-agent injection.
 *
 * Cursor Task tool bug:
 *   The Task tool is broken in .cursor/agents/ (known bug, Cursor v2.4–2.5, March 2026).
 *   Subagent delegation via Task tool will fail silently.
 *   Monitor: https://forum.cursor.com / Cursor GitHub issues
 *   Remove warning when Cursor confirms Task tool works in .cursor/agents/.
 *   Last verified broken: March 2026
 */

import type { TargetAdapter, TransformResult } from "./target-adapter.js";
import { parseFrontmatter, serializeFrontmatter } from "./target-adapter.js";
import type { CompatibilityWarning } from "./compatibility-report.js";

// Patterns to detect Task tool usage in agent body
const TASK_TOOL_PATTERNS = [
  /\bTask\s+tool\b/i,
  /\bTaskCreate\b/,
  /\bTaskUpdate\b/,
  /\bTaskGet\b/,
  /\bTaskList\b/,
  /spawn.*subagent/i,
];

// Fields that Claude Code supports but Cursor does NOT
const UNSUPPORTED_FIELDS: Array<{
  key: string;
  severity: CompatibilityWarning["severity"];
  reason: string;
}> = [
  {
    key: "color",
    severity: "low",
    reason: "Cursor does not support agent color labels",
  },
  {
    key: "skills",
    severity: "medium",
    reason: "Cursor does not support skill preloading — skill context comes from .cursor/rules/epost-kit.mdc",
  },
  {
    key: "memory",
    severity: "medium",
    reason: "Cursor does not support agent memory scopes — MEMORY.md will not be auto-loaded",
  },
  {
    key: "permissionMode",
    severity: "high",
    reason: "Cursor uses readonly: true/false instead of permissionMode — mapped automatically for 'plan' value",
  },
  {
    key: "hooks",
    severity: "high",
    reason: "Cursor does not support per-agent hooks — hook automation will not run",
  },
  {
    key: "isolation",
    severity: "medium",
    reason: "Cursor does not support worktree isolation — agent runs in main workspace",
  },
  {
    key: "disallowedTools",
    severity: "medium",
    reason: "Cursor does not support per-agent tool denylists",
  },
  {
    key: "mcpServers",
    severity: "medium",
    reason: "Cursor MCP config is global (not per-agent) — mcpServers field is ignored",
  },
  {
    key: "argument-hint",
    severity: "low",
    reason: "Cursor does not support argument-hint — removed from output",
  },
  {
    key: "user-invocable",
    severity: "low",
    reason: "Cursor does not support user-invocable — all agents are invocable",
  },
];

export class CursorAdapter implements TargetAdapter {
  readonly name = "cursor" as const;
  readonly installDir = ".cursor";

  private readonly _warnings: CompatibilityWarning[] = [];

  getWarnings(): CompatibilityWarning[] {
    return [...this._warnings];
  }

  transformAgent(content: string, filename: string): TransformResult {
    const { frontmatter: fm, body } = parseFrontmatter(content);
    const newFm: Record<string, unknown> = {};

    // Keep only Cursor-supported fields
    if (fm.name) newFm.name = fm.name;
    if (fm.description) newFm.description = fm.description;
    if (fm.model) newFm.model = fm.model;

    // Map permissionMode: plan → readonly: true
    if (fm.permissionMode === "plan") {
      newFm.readonly = true;
    }

    // Keep background if present
    if (fm.background !== undefined && fm.background !== null) {
      newFm.background = fm.background;
    }

    // Emit warnings for dropped fields
    for (const { key, severity, reason } of UNSUPPORTED_FIELDS) {
      // permissionMode warning is only for non-plan values (plan is handled above)
      if (key === "permissionMode" && fm[key] === "plan") continue;
      if (fm[key] !== undefined && fm[key] !== null && fm[key] !== "") {
        this._warnings.push({
          severity,
          category: "agents",
          feature: `${key}: ${Array.isArray(fm[key]) ? (fm[key] as unknown[]).join(", ") : String(fm[key])}`,
          source: filename,
          reason,
        });
      }
    }

    // Warn if agent body uses Task tool (broken in Cursor agents)
    if (TASK_TOOL_PATTERNS.some((p) => p.test(body))) {
      this._warnings.push({
        severity: "high",
        category: "agents",
        feature: "Task tool usage",
        source: filename,
        reason:
          "Cursor Task tool is broken in .cursor/agents/ (Cursor v2.4–2.5, March 2026) — subagent delegation will fail silently",
      });
    }

    return {
      content: serializeFrontmatter(newFm, body),
      filename,
    };
  }

  transformSkill(content: string): string {
    return content;
  }

  transformHooks(): null {
    return null; // Cursor uses settings.json as-is
  }

  usesSettingsJson(): boolean {
    return true;
  }

  hookScriptDir(): string {
    return "hooks";
  }

  rootInstructionsFilename(): string {
    return "rules/epost-kit.mdc";
  }

  replacePathRefs(content: string): string {
    return content.replace(/\.claude\//g, ".cursor/");
  }
}
