/**
 * Export Adapter — pass-through implementation for export-only target
 *
 * Installs to .epost-export/ without any editor-specific transformations.
 * No CLAUDE.md, no hooks, no settings.json.
 */

import type { TargetAdapter, TransformResult } from "./target-adapter.js";
import type { CompatibilityWarning } from "./compatibility-report.js";

export class ExportAdapter implements TargetAdapter {
  readonly name = "export" as const;
  readonly installDir = ".epost-export";

  transformAgent(content: string, filename: string): TransformResult {
    return { content, filename };
  }

  transformSkill(content: string): string {
    return content;
  }

  transformHooks(): null {
    return null;
  }

  usesSettingsJson(): boolean {
    return false;
  }

  hookScriptDir(): string {
    return "hooks";
  }

  rootInstructionsFilename(): string {
    return "README.md";
  }

  replacePathRefs(content: string): string {
    return content;
  }

  getWarnings(): CompatibilityWarning[] {
    return [];
  }
}
