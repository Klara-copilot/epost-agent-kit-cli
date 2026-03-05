/**
 * Target Adapter — transforms source files for different IDE targets
 *
 * Single source (packages/*) → target-specific output:
 *   claude  → .claude/   (pass-through)
 *   cursor  → .cursor/   (pass-through)
 *   vscode  → .github/   (transform agents, skills, hooks)
 */

// ── Types ──

export type TargetName = "claude" | "cursor" | "vscode";

export interface TransformResult {
  content: string;
  filename: string;
}

// ── Interface ──

export interface TargetAdapter {
  readonly name: TargetName;
  readonly installDir: string; // '.claude' | '.cursor' | '.github'

  /** Transform an agent .md file. */
  transformAgent(content: string, filename: string): TransformResult;

  /** Transform a SKILL.md file. */
  transformSkill(content: string): string;

  /**
   * Transform settings.json hooks → target hook format.
   * Returns null if target uses settings.json directly (claude/cursor).
   */
  transformHooks(
    settingsJson: Record<string, unknown>,
  ): { content: string; filename: string } | null;

  /** Whether this target uses settings.json as-is (true for claude/cursor). */
  usesSettingsJson(): boolean;

  /** Directory for hook scripts: 'hooks' or 'hooks/scripts' */
  hookScriptDir(): string;

  /** Root instructions filename: 'CLAUDE.md' or 'copilot-instructions.md' */
  rootInstructionsFilename(): string;

  /** Replace install dir path references in content (e.g., .claude/ → .github/) */
  replacePathRefs(content: string): string;
}

// ── Factory ──

export async function createTargetAdapter(
  target: TargetName,
): Promise<TargetAdapter> {
  switch (target) {
    case "claude":
    case "cursor": {
      const { ClaudeAdapter } = await import("./claude-adapter.js");
      return new ClaudeAdapter(target);
    }
    case "vscode": {
      const { CopilotAdapter } = await import("./copilot-adapter.js");
      return new CopilotAdapter();
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

  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).trim();
    let value: unknown = line.substring(colonIdx + 1).trim();

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
      const items = value.map((v) =>
        typeof v === "string" ? `'${v}'` : String(v),
      );
      lines.push(`${key}: [${items.join(", ")}]`);
    } else if (typeof value === "object") {
      continue; // handoffs serialized separately below
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
