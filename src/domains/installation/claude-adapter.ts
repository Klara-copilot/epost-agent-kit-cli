/**
 * Claude Code Adapter — pass-through implementation
 *
 * Claude Code is the source format, so no transformation is needed.
 * Files are installed to .claude/ as-is.
 */

import type { TargetAdapter, TransformResult } from "./target-adapter.js";
import type { CompatibilityWarning } from "./compatibility-report.js";

export class ClaudeAdapter implements TargetAdapter {
  readonly name = "claude" as const;
  readonly installDir = ".claude";

  transformAgent(content: string, filename: string): TransformResult {
    return { content, filename };
  }

  transformSkill(content: string): string {
    return content;
  }

  transformHooks(): null {
    return null; // settings.json used as-is
  }

  usesSettingsJson(): boolean {
    return true;
  }

  hookScriptDir(): string {
    return "hooks";
  }

  rootInstructionsFilename(): string {
    return "CLAUDE.md";
  }

  replacePathRefs(content: string): string {
    return content;
  }

  getWarnings(): CompatibilityWarning[] {
    return [];
  }
}
