// Antigravity Adapter — generates GEMINI.md + AGENTS.md at project root
//
// Antigravity supports:
//   - GEMINI.md (highest priority, Antigravity-specific)
//   - AGENTS.md (cross-tool compatibility standard)
//   - .antigravity/agents/{name}.yaml (custom agent definitions)
//   - skills/{name}/SKILL.md (invocable via slash commands, Markdown-only)
//   - .agent/rules/{platform}.md (platform-scoped rules)
//
// No hooks, commands, or MCP config equivalent.

import type { TargetAdapter, TransformResult, DroppedFeature } from "./target-adapter.js";
import type { CompatibilityWarning } from "./compatibility-report.js";
import { parseFrontmatter } from "./target-adapter.js";

export class AntigravityAdapter implements TargetAdapter {
  readonly name = "antigravity" as const;
  readonly installDir = ".";  // GEMINI.md + AGENTS.md go at project root

  transformAgent(content: string, filename: string): TransformResult {
    // Parse Claude Code frontmatter and emit Antigravity YAML
    const { frontmatter, body } = parseFrontmatter(content);

    const yaml: Record<string, unknown> = {
      name: (frontmatter.name as string) ?? filename.replace(".md", ""),
      description: (frontmatter.description as string) ?? "",
      role: body
        .split("\n")
        .filter((l) => l.trim())
        .slice(0, 3)
        .join(" ")
        .trim(),
    };

    // Model mapping: short aliases → full Anthropic model IDs
    const modelMap: Record<string, string> = {
      haiku: "claude-haiku-4-5",
      sonnet: "claude-sonnet-4-6",
      opus: "claude-opus-4-6",
    };
    if (frontmatter.model) {
      const m = frontmatter.model as string;
      yaml.model = modelMap[m] ?? m;
    }

    // permissionMode: plan → readonly: true
    if (frontmatter.permissionMode === "plan") {
      yaml.readonly = true;
    }

    // disallowedTools → restrictedTools array
    if (frontmatter.disallowedTools) {
      const tools = frontmatter.disallowedTools as string | string[];
      yaml.restrictedTools = Array.isArray(tools)
        ? tools
        : tools.split(",").map((t) => t.trim());
    }

    const yamlContent = stringifyAgentYaml(yaml);
    return {
      content: yamlContent,
      filename: filename.replace(".md", ".yaml"),
    };
  }

  transformSkill(content: string): string {
    // Strip YAML frontmatter — keep body only
    const { body } = parseFrontmatter(content);
    return body.trimStart();
  }

  transformHooks(
    _settingsJson: Record<string, unknown>,
  ): { content: string; filename: string; droppedFeatures?: DroppedFeature[] } | null {
    return null; // Antigravity has no hooks support
  }

  usesSettingsJson(): boolean {
    return false;
  }

  hookScriptDir(): string {
    return "hooks"; // unused
  }

  rootInstructionsFilename(): string {
    return "GEMINI.md";  // Primary Antigravity file
  }

  replacePathRefs(content: string): string {
    return content; // No path replacement needed for root-level files
  }

  getWarnings(): CompatibilityWarning[] {
    return [
      {
        severity: "medium",
        category: "config",
        feature: "hooks",
        source: "Antigravity target",
        reason: "Antigravity has no hook system — PreToolUse/PostToolUse hooks are not supported",
      },
      {
        severity: "low",
        category: "config",
        feature: "commands",
        source: "Antigravity target",
        reason: "Antigravity has no slash command equivalent — commands are not converted",
      },
    ];
  }
}

// ── Simple YAML serializer for agent definitions ──

function stringifyAgentYaml(obj: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === "string" && value.includes("\n")) {
      lines.push(`${key}: |`);
      for (const line of value.split("\n")) {
        lines.push(`  ${line}`);
      }
    } else if (typeof value === "string" && (value.includes(":") || value.includes("#") || value === "")) {
      lines.push(`${key}: '${value.replace(/'/g, "''")}'`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  return lines.join("\n") + "\n";
}
