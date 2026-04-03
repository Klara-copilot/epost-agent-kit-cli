/**
 * Target Adapter — transforms source files for different IDE targets
 *
 * Single source (packages/*) → target-specific output:
 *   claude  → .claude/   (pass-through)
 *   cursor  → .cursor/   (pass-through)
 *   vscode  → .github/   (transform agents, skills, hooks)
 */

// ── Types ──

export type TargetName = "claude" | "cursor" | "vscode" | "export";

export interface TransformResult {
  content: string;
  filename: string;
}

/** A feature that could not be translated to the target IDE format */
export interface DroppedFeature {
  /** Category of dropped feature: 'hook-matcher' | 'prompt-hook' | etc. */
  feature: string;
  /** Hook event name (e.g., 'PostToolUse') */
  event: string;
  /** Optional detail (e.g., the original matcher string) */
  detail?: string;
  /** Human-readable reason */
  reason: string;
}

export type { CompatibilityWarning, WarningSeverity, WarningCategory } from "./compatibility-report.js";

// ── Interface ──

export interface TargetAdapter {
  readonly name: TargetName;
  readonly installDir: string; // '.claude' | '.cursor' | '.github'

  /** Transform an agent .md file. */
  transformAgent(_content: string, _filename: string): TransformResult;

  /** Transform a SKILL.md file. */
  transformSkill(_content: string): string;

  /**
   * Transform settings.json hooks → target hook format.
   * Returns null if target uses settings.json directly (claude/cursor).
   * `droppedFeatures` is populated when features could not be translated.
   */
  transformHooks(
    _settingsJson: Record<string, unknown>,
  ): { content: string; filename: string; droppedFeatures?: DroppedFeature[] } | null;

  /** Whether this target uses settings.json as-is (true for claude/cursor). */
  usesSettingsJson(): boolean;

  /** Directory for hook scripts: 'hooks' or 'hooks/scripts' */
  hookScriptDir(): string;

  /** Root instructions filename: 'CLAUDE.md' or 'copilot-instructions.md' */
  rootInstructionsFilename(): string;

  /** Replace install dir path references in content (e.g., .claude/ → .github/) */
  replacePathRefs(_content: string): string;

  /**
   * Returns all compatibility warnings collected during transforms.
   * ClaudeAdapter always returns []. CopilotAdapter collects warnings as it transforms.
   */
  getWarnings(): import("./compatibility-report.js").CompatibilityWarning[];
}

// ── Factory ──

export async function createTargetAdapter(
  target: TargetName,
): Promise<TargetAdapter> {
  switch (target) {
    case "claude": {
      const { ClaudeAdapter } = await import("./claude-adapter.js");
      return new ClaudeAdapter();
    }
    case "cursor": {
      const { CursorAdapter } = await import("./cursor-adapter.js");
      return new CursorAdapter();
    }
    case "vscode": {
      const { CopilotAdapter } = await import("./copilot-adapter.js");
      return new CopilotAdapter();
    }
    case "export": {
      const { ExportAdapter } = await import("./export-adapter.js");
      return new ExportAdapter();
    }
    default:
      throw new Error(`Unknown target: ${target}`);
  }
}

// ── Frontmatter Utilities ──

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
  raw: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content, raw: "" };

  const raw = match[1];
  const body = match[2];
  const frontmatter: Record<string, unknown> = {};

  const lines = raw.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = line.substring(0, colonIdx).trim();
    const rawValue = line.substring(colonIdx + 1).trim();

    // Nested list block: key with no inline value followed by indented `- ` items
    if (rawValue === "" && i + 1 < lines.length && /^\s+-\s/.test(lines[i + 1])) {
      i++;
      const items: Record<string, unknown>[] = [];
      while (i < lines.length && /^\s+-\s/.test(lines[i])) {
        // Parse first field of the list item (e.g., `  - label: Foo`)
        const itemObj: Record<string, unknown> = {};
        const firstField = lines[i].replace(/^\s+-\s+/, "");
        const firstColon = firstField.indexOf(":");
        if (firstColon !== -1) {
          const fk = firstField.substring(0, firstColon).trim();
          const fv = firstField.substring(firstColon + 1).trim().replace(/^['"]|['"]$/g, "");
          itemObj[fk] = fv;
        }
        i++;
        // Parse continuation fields (same indent depth, no leading `-`)
        while (i < lines.length && /^\s{4}/.test(lines[i]) && !/^\s+-\s/.test(lines[i])) {
          const contField = lines[i].trim();
          const contColon = contField.indexOf(":");
          if (contColon !== -1) {
            const ck = contField.substring(0, contColon).trim();
            const cv = contField.substring(contColon + 1).trim().replace(/^['"]|['"]$/g, "");
            itemObj[ck] = cv;
          }
          i++;
        }
        items.push(itemObj);
      }
      frontmatter[key] = items;
      continue;
    }

    let value: unknown = rawValue;

    if (
      typeof value === "string" &&
      value.startsWith("[") &&
      value.endsWith("]")
    ) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else if (value === "true") {
      value = true;
    } else if (value === "false") {
      value = false;
    } else if (typeof value === "string") {
      value = value.replace(/^['"]|['"]$/g, "");
    }

    frontmatter[key] = value;
    i++;
  }

  return { frontmatter, body, raw };
}

export function serializeFrontmatter(
  fm: Record<string, unknown>,
  body: string,
): string {
  const lines: string[] = ["---"];

  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      // Arrays of objects (e.g. handoffs) are serialized by the special block below
      if (value.length > 0 && typeof value[0] === "object") continue;
      // Use unquoted identifiers for simple alphanumeric values (e.g. VS Code tool names)
      // Use single quotes only when value contains special YAML characters
      const items = value.map((v) => {
        if (typeof v !== "string") return String(v);
        return /^[a-zA-Z0-9_-]+$/.test(v) ? v : `'${v}'`;
      });
      lines.push(`${key}: [${items.join(", ")}]`);
    } else if (typeof value === "object") {
      continue; // non-array objects skipped
    } else if (typeof value === "string" && value.includes(":")) {
      lines.push(`${key}: '${value}'`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  // Serialize handoffs (nested YAML)
  const handoffs = fm["handoffs"];
  if (Array.isArray(handoffs) && handoffs.length > 0) {
    lines.push("handoffs:");
    for (const h of handoffs as Array<Record<string, unknown>>) {
      lines.push(`  - label: ${h.label}`);
      lines.push(`    agent: ${h.agent}`);
      if (h.prompt) lines.push(`    prompt: ${h.prompt}`);
      if (h.send !== undefined) lines.push(`    send: ${h.send}`);
    }
  }

  lines.push("---");
  return lines.join("\n") + "\n" + body;
}
