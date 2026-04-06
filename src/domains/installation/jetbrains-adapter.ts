/**
 * JetBrains Adapter — generates a single AGENTS.md at project root
 *
 * JetBrains AI (IntelliJ, WebStorm, etc.) supports a single markdown guidance
 * file at the project root. No agents, skills, hooks, or commands directories.
 */

import type { TargetAdapter, TransformResult, DroppedFeature } from "./target-adapter.js";
import type { CompatibilityWarning } from "./compatibility-report.js";

export class JetBrainsAdapter implements TargetAdapter {
  readonly name = "jetbrains" as const;
  readonly installDir = ".";  // AGENTS.md goes at project root

  transformAgent(content: string, filename: string): TransformResult {
    // JetBrains doesn't use individual agent files
    // Agents are documented in AGENTS.md
    return { content, filename };
  }

  transformSkill(content: string): string {
    return content; // Skills not used in JetBrains target
  }

  transformHooks(
    _settingsJson: Record<string, unknown>,
  ): { content: string; filename: string; droppedFeatures?: DroppedFeature[] } | null {
    return null; // JetBrains has no hooks support
  }

  usesSettingsJson(): boolean {
    return false;
  }

  hookScriptDir(): string {
    return "hooks"; // unused
  }

  rootInstructionsFilename(): string {
    return "AGENTS.md";
  }

  replacePathRefs(content: string): string {
    return content; // No path replacement needed
  }

  getWarnings(): CompatibilityWarning[] {
    return [
      {
        severity: "medium",
        category: "config",
        feature: "agent system",
        source: "JetBrains target",
        reason:
          "JetBrains only supports AGENTS.md — agents, skills, hooks, and commands are represented as documentation only",
      },
    ];
  }
}
