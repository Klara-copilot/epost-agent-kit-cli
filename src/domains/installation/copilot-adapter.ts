/**
 * Copilot Adapter — transforms Claude Code format → GitHub Copilot / VS Code format
 *
 * Agents:   name.md → name.agent.md  (new frontmatter: target, tools, handoffs, agents)
 * Skills:   SKILL.md → SKILL.md      (path refs replaced)
 * Hooks:    settings.json → hooks.json (command→bash, timeout→timeoutSec, version:1)
 * Install:  .claude/ → .github/
 */

import type { TargetAdapter, TransformResult, DroppedFeature } from "./target-adapter.js";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "./target-adapter.js";
import type { CompatibilityWarning } from "./compatibility-report.js";

// ── Mapping Tables ──

const MODEL_MAP: Record<string, string> = {
  haiku: "Claude Haiku 4.5",
  sonnet: "Claude Sonnet 4.6",
  opus: "Claude Opus 4.6",
};

// VS Code Copilot tool names (unquoted identifiers in YAML)
// Correct names verified March 2026: execute, read, edit, search, web
const TOOL_MAP: Record<string, string> = {
  Read: "read",
  Write: "edit",
  Edit: "edit",
  Bash: "execute",
  Grep: "search",
  Glob: "read",
  WebFetch: "web",
  WebSearch: "web",
  Browser: "browser",
  Agent: "agent",
  // Sub-tool specifiers (VS Code April 2026) — passthrough
  "web/fetch": "web/fetch",
  "search/codebase": "search/codebase",
  "search/usages": "search/usages",
  "search/file": "search/file",
};

// All VS Code Copilot built-in tools (verified March 2026)
const DEFAULT_TOOLS = ["agent", "browser", "edit", "execute", "read", "search", "todo", "vscode", "web"];

// Read-only subset for permissionMode: plan agents
const READONLY_TOOLS = ["agent", "browser", "read", "search", "todo", "web"];

// ── Adapter ──

export class CopilotAdapter implements TargetAdapter {
  readonly name = "vscode" as const;
  readonly installDir = ".github";

  private readonly _warnings: CompatibilityWarning[] = [];

  getWarnings(): CompatibilityWarning[] {
    return [...this._warnings];
  }

  transformAgent(content: string, filename: string): TransformResult {
    const { frontmatter: fm, body } = parseFrontmatter(content);
    const newFm: Record<string, unknown> = {};

    newFm.target = "vscode";
    if (fm.description) newFm.description = fm.description;
    if (fm.name) newFm.name = fm.name;
    if (fm["argument-hint"]) newFm["argument-hint"] = fm["argument-hint"];

    const rawModel = fm.model;
    if (Array.isArray(rawModel)) {
      // Prioritized model list — map known aliases, pass through unknowns
      newFm.model = (rawModel as string[]).map((m) => MODEL_MAP[m] || m);
    } else {
      const model = String(rawModel || "");
      if (model && MODEL_MAP[model]) {
        newFm.model = MODEL_MAP[model];
      } else if (model) {
        newFm.model = model;
      }
    }

    newFm.tools = this.buildToolsArray(fm);

    if (Array.isArray(fm.handoffs) && fm.handoffs.length > 0) {
      newFm.handoffs = fm.handoffs;
    }

    // agents field — subagent delegation control (VS Code April 2026)
    if (fm.agents !== undefined) {
      newFm.agents = fm.agents;
    }

    // Warn on dropped agent fields
    if (fm.color) {
      this._warnings.push({
        severity: "low",
        category: "agents",
        feature: `color: ${fm.color}`,
        source: filename,
        reason: "VS Code agent files do not support a color field",
      });
    }
    if (fm.skills) {
      this._warnings.push({
        severity: "medium",
        category: "agents",
        feature: `skills: ${Array.isArray(fm.skills) ? (fm.skills as string[]).join(", ") : String(fm.skills)}`,
        source: filename,
        reason: "VS Code agent files do not support a skills field — skill loading is manual",
      });
    }
    if (fm.memory) {
      this._warnings.push({
        severity: "medium",
        category: "agents",
        feature: `memory: ${fm.memory}`,
        source: filename,
        reason: "VS Code agent files do not support a memory field",
      });
    }

    return {
      content: serializeFrontmatter(newFm, this.replacePathRefs(body)),
      filename: filename.replace(/\.md$/, ".agent.md"),
    };
  }

  transformSkill(content: string): string {
    return this.replacePathRefs(content);
  }

  transformHooks(
    settingsJson: Record<string, unknown>,
  ): { content: string; filename: string; droppedFeatures?: DroppedFeature[] } | null {
    const hooks = settingsJson.hooks as
      | Record<string, unknown[]>
      | undefined;
    if (!hooks) return null;

    const copilotHooks: Record<string, unknown[]> = {};
    const droppedFeatures: DroppedFeature[] = [];

    // VS Code Copilot only supports SessionStart and Stop (March 2026)
    // All other events (UserPromptSubmit, PreToolUse, PostToolUse, SubagentStart, SubagentStop)
    // are Claude Code / Copilot CLI extensions and silently fail in VS Code.
    const VSCODE_SUPPORTED_EVENTS = new Set(["SessionStart", "Stop"]);

    for (const [eventName, groups] of Object.entries(hooks)) {
      if (!Array.isArray(groups)) continue;

      if (!VSCODE_SUPPORTED_EVENTS.has(eventName)) {
        droppedFeatures.push({
          feature: "unsupported-hook-event",
          event: eventName,
          reason: `VS Code Copilot does not support the ${eventName} hook event — only SessionStart and Stop are supported`,
        });
        this._warnings.push({
          severity: "medium",
          category: "hooks",
          feature: `hook event: ${eventName}`,
          source: "settings.json",
          reason: `VS Code Copilot only supports SessionStart and Stop hook events — ${eventName} will not fire`,
        });
        continue;
      }

      const entries: unknown[] = [];
      for (const group of groups) {
        const g = group as Record<string, unknown>;
        const matcher = g.matcher ? String(g.matcher) : undefined;
        const hookList = (g.hooks || [g]) as Array<Record<string, unknown>>;

        for (const hook of hookList) {
          if (hook.type === "prompt") {
            // Copilot has no prompt-type hook equivalent
            droppedFeatures.push({
              feature: "prompt-hook",
              event: eventName,
              reason: "Copilot hooks.json does not support prompt-type hooks",
            });
            this._warnings.push({
              severity: "medium",
              category: "hooks",
              feature: `prompt-type hook`,
              source: `${eventName} hook group`,
              reason: "Copilot hooks.json does not support prompt-type hooks — this hook will not run",
            });
            continue;
          }

          const entry: Record<string, unknown> = { type: "command" };
          if (hook.command) {
            entry.bash = this.replacePathRefs(String(hook.command));
          }
          if (hook.timeout && typeof hook.timeout === "number") {
            entry.timeoutSec = Math.ceil(hook.timeout / 1000);
          }

          // Copilot hooks.json has no matcher/pattern field — record as dropped
          if (matcher && matcher !== "*") {
            droppedFeatures.push({
              feature: "hook-matcher",
              event: eventName,
              detail: matcher,
              reason:
                "Copilot hooks.json does not support tool matchers — hook fires unconditionally",
            });
            this._warnings.push({
              severity: "high",
              category: "hooks",
              feature: `hook matcher: ${matcher}`,
              source: `${eventName} hook group`,
              reason: "Copilot hooks.json does not support tool matchers — hook fires unconditionally",
            });
          }

          entries.push(entry);
        }
      }

      if (entries.length > 0) {
        copilotHooks[eventName] = entries;
      }
    }

    if (Object.keys(copilotHooks).length === 0) return null;

    return {
      content: JSON.stringify({ version: 1, hooks: copilotHooks }, null, 2),
      filename: "hooks.json",
      droppedFeatures: droppedFeatures.length > 0 ? droppedFeatures : undefined,
    };
  }

  usesSettingsJson(): boolean {
    return false;
  }

  hookScriptDir(): string {
    return "hooks"; // scripts go to .github/hooks/ to match hooks.json paths
  }

  rootInstructionsFilename(): string {
    return "copilot-instructions.md";
  }

  replacePathRefs(content: string): string {
    return content
      .replace(/\.claude\//g, ".github/")
      .replace(/\.cursor\//g, ".github/");
  }

  private buildToolsArray(fm: Record<string, unknown>): string[] {
    if (fm.permissionMode === "plan") return READONLY_TOOLS;

    // Explicit tools list from source — map each through TOOL_MAP, passthrough unknowns
    if (Array.isArray(fm.tools) && fm.tools.length > 0) {
      return (fm.tools as string[]).map((t) => TOOL_MAP[t] || t);
    }

    const disallowed = String(fm.disallowedTools || "");
    if (!disallowed) return DEFAULT_TOOLS;

    const disallowedCopilot = new Set(
      disallowed
        .split(",")
        .map((t) => TOOL_MAP[t.trim()])
        .filter(Boolean),
    );

    return DEFAULT_TOOLS.filter((t) => !disallowedCopilot.has(t));
  }
}
