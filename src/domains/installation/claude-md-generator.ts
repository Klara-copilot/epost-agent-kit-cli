/**
 * CLAUDE.md generator: assemble from template + package snippets
 * Uses a simple template engine (no Handlebars dependency)
 */

import { join } from "node:path";
import { logger } from "@/shared/logger.js";
import { safeReadFile, safeWriteFile } from "@/shared/file-system.js";

// ─── Simple Template Engine ───

/**
 * Render a simple template with variable substitution and basic control flow.
 * Supports: {{var}}, {{nested.var}}, {{#if var}}...{{/if}}, {{#each items}}{{this}}{{/each}}
 */
export function renderTemplate(
  template: string,
  context: Record<string, any>,
): string {
  let result = template;

  // Process {{#each items}}...{{/each}} blocks
  result = result.replace(
    /\{\{#each\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, path, body) => {
      const items = getNestedValue(context, path);
      if (!Array.isArray(items)) return "";
      return items
        .map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;
          const itemContext =
            typeof item === "object"
              ? { ...context, ...item, this: item, "@index": index, "@last": isLast, "@first": isFirst }
              : { ...context, this: item, "@index": index, "@last": isLast, "@first": isFirst };
          return renderTemplate(body, itemContext);
        })
        .join("");
    },
  );

  // Process {{#if var}}...{{else}}...{{/if}} blocks
  result = result.replace(
    /\{\{#if\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, path, body) => {
      const value = getNestedValue(context, path);
      const isTruthy = Array.isArray(value) ? value.length > 0 : !!value;

      // Check for {{else}} inside
      const elseParts = body.split("{{else}}");
      if (isTruthy) {
        return renderTemplate(elseParts[0], context);
      } else {
        return elseParts.length > 1
          ? renderTemplate(elseParts[1], context)
          : "";
      }
    },
  );

  // Process {{#unless var}}...{{/unless}} blocks
  result = result.replace(
    /\{\{#unless\s+(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_, path, body) => {
      const value = getNestedValue(context, path);
      const isTruthy = Array.isArray(value) ? value.length > 0 : !!value;
      return !isTruthy ? renderTemplate(body, context) : "";
    },
  );

  // Process triple-brace {{{variable}}} (raw output, same as double for us)
  result = result.replace(/\{\{\{(\w+(?:\.\w+)*)\}\}\}/g, (_, path) => {
    const value = getNestedValue(context, path);
    if (value === undefined || value === null) return "";
    return String(value);
  });

  // Process {{@last}} and {{#unless @last}} for array iteration helpers
  result = result.replace(/\{\{#unless @last\}\}([\s\S]*?)\{\{\/unless\}\}/g, (match) => {
    // This is handled within the each block's item context
    const isLast = getNestedValue(context, "@last");
    return isLast ? "" : match.replace(/\{\{#unless @last\}\}/, "").replace(/\{\{\/unless\}\}/, "");
  });

  // Process simple {{variable}} and {{nested.variable}} substitutions
  result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const value = getNestedValue(context, path);
    if (value === undefined || value === null) return "";
    return String(value);
  });

  // Process @-prefixed helpers like {{@last}}, {{@index}}
  result = result.replace(/\{\{(@\w+)\}\}/g, (_, path) => {
    const value = context[path];
    if (value === undefined || value === null) return "";
    return String(value);
  });

  return result;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

// ─── Snippet Collection ───

export interface PackageSnippet {
  packageName: string;
  layer: number;
  content: string;
}

/**
 * Load CLAUDE.snippet.md from a package directory
 */
export async function loadPackageSnippet(
  packageDir: string,
  packageName: string,
  layer: number,
  snippetFile?: string,
): Promise<PackageSnippet | null> {
  const filename = snippetFile || "CLAUDE.snippet.md";
  const snippetPath = join(packageDir, filename);
  const content = await safeReadFile(snippetPath);

  if (!content) {
    logger.debug(`[claude-md] No snippet found for "${packageName}"`);
    return null;
  }

  return { packageName, layer, content: content.trim() };
}

/**
 * Collect all snippets from packages in layer order
 */
export async function collectSnippets(
  packages: Array<{
    name: string;
    dir: string;
    layer: number;
    snippetFile?: string;
  }>,
): Promise<PackageSnippet[]> {
  const snippets: PackageSnippet[] = [];

  for (const pkg of packages) {
    const snippet = await loadPackageSnippet(
      pkg.dir,
      pkg.name,
      pkg.layer,
      pkg.snippetFile,
    );
    if (snippet) {
      snippets.push(snippet);
    }
  }

  // Sort by layer (should already be sorted if packages are in topo order)
  snippets.sort((a, b) => a.layer - b.layer);

  return snippets;
}

// ─── CLAUDE.md Generation ───

export interface ClaudeMdContext {
  /** Profile name (if used) */
  profile?: string;
  /** Installed package names */
  packages: string[];
  /** Target IDE */
  target: string;
  /** Kit version */
  kitVersion: string;
  /** Project name (directory name) */
  projectName: string;
  /** Platform-specific info */
  platforms: string[];
  /** Number of agents installed */
  agentCount: number;
  /** Number of skills installed */
  skillCount: number;
  /** Number of commands installed */
  commandCount: number;
  /** Any additional context */
  [key: string]: any;
}

/**
 * Generate CLAUDE.md from template + snippets
 *
 * @param templatePath - Path to .hbs template file
 * @param context - Template variables
 * @param snippets - Package snippets in layer order
 * @param outputPath - Where to write the generated CLAUDE.md
 */
export async function generateClaudeMd(
  templatePath: string,
  context: ClaudeMdContext,
  snippets: PackageSnippet[],
  outputPath: string,
): Promise<void> {
  // Load template
  const template = await safeReadFile(templatePath);
  if (!template) {
    logger.warn(
      `[claude-md] Template not found: ${templatePath}, using default`,
    );
    // Generate a minimal CLAUDE.md
    const content = generateDefaultClaudeMd(context, snippets);
    await safeWriteFile(outputPath, content);
    return;
  }

  // Render template
  const contextWithSnippets = {
    ...context,
    snippets,
    hasSnippets: snippets.length > 0,
    snippetContent: snippets.map((s) => s.content).join("\n\n"),
  };
  let content = renderTemplate(template, contextWithSnippets);

  // Append snippets if template doesn't include {{snippetContent}}
  if (
    !template.includes("{{snippetContent}}") &&
    !template.includes("{{#each snippets}}")
  ) {
    if (snippets.length > 0) {
      content += "\n\n---\n\n";
      content += snippets.map((s) => s.content).join("\n\n---\n\n");
    }
  }

  await safeWriteFile(outputPath, content);
  logger.debug(`[claude-md] Generated CLAUDE.md at ${outputPath}`);
}

/**
 * Generate a default CLAUDE.md when no template is available
 */
function generateDefaultClaudeMd(
  context: ClaudeMdContext,
  snippets: PackageSnippet[],
): string {
  const lines: string[] = [];

  lines.push("# CLAUDE.md");
  lines.push("");
  lines.push(
    `This file provides guidance to Claude Code when working with code in this repository.`,
  );
  lines.push("");
  lines.push("## Project Overview");
  lines.push("");
  lines.push(`**Project**: ${context.projectName}`);
  if (context.profile) {
    lines.push(`**Profile**: ${context.profile}`);
  }
  lines.push(`**Platforms**: ${context.platforms.join(", ")}`);
  lines.push(
    `**Agents**: ${context.agentCount} | **Skills**: ${context.skillCount} | **Commands**: ${context.commandCount}`,
  );
  lines.push("");

  // Agent system
  lines.push("## Claude Code Agent System");
  lines.push("");
  lines.push(`- **Agents**: \`.claude/agents/\``);
  lines.push(`- **Commands**: \`.claude/commands/\``);
  lines.push(`- **Skills**: \`.claude/skills/\``);
  lines.push("");

  // Append snippets
  if (snippets.length > 0) {
    for (const snippet of snippets) {
      lines.push("---");
      lines.push("");
      lines.push(snippet.content);
      lines.push("");
    }
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push(
    `*Generated by epost-kit v${context.kitVersion} on ${new Date().toISOString().split("T")[0]}*`,
  );

  return lines.join("\n");
}

/**
 * Generate workspace-level CLAUDE.md
 */
export async function generateWorkspaceClaudeMd(
  templatePath: string,
  context: Record<string, any>,
  outputPath: string,
): Promise<void> {
  const template = await safeReadFile(templatePath);
  if (!template) {
    logger.warn(`[claude-md] Workspace template not found: ${templatePath}`);
    const content = [
      "# CLAUDE.md (Workspace)",
      "",
      "This workspace-level CLAUDE.md is automatically inherited by all repos below this directory.",
      "",
      "## Organization Conventions",
      "",
      "- Add cross-repo conventions here",
      "- Team ownership and responsibilities",
      "- API format standards",
      "- Branch naming conventions",
      "",
      `*Generated by epost-kit on ${new Date().toISOString().split("T")[0]}*`,
    ].join("\n");
    await safeWriteFile(outputPath, content);
    return;
  }

  const content = renderTemplate(template, context);
  await safeWriteFile(outputPath, content);
  logger.debug(`[claude-md] Generated workspace CLAUDE.md at ${outputPath}`);
}
