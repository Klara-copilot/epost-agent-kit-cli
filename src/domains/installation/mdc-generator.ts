/**
 * MDC file generator for Cursor rules
 *
 * Generates .cursor/rules/epost-kit.mdc from package snippets.
 * The .mdc format is a markdown file with YAML frontmatter used by Cursor
 * to inject context into every chat (alwaysApply: true).
 */

import { safeWriteFile } from "@/shared/file-system.js";
import { logger } from "@/shared/logger.js";
import type { PackageSnippet } from "@/domains/installation/claude-md-generator.js";

export interface MdcOptions {
  /** Short description shown in Cursor UI */
  description?: string;
  /** Glob pattern for files this rule applies to (omit for project-wide) */
  globs?: string;
  /** Whether to inject this rule in every chat session */
  alwaysApply?: boolean;
}

/**
 * Generate a .mdc Cursor rules file from package snippets.
 *
 * @param snippets - Package snippets in layer order
 * @param outputPath - Where to write the .mdc file
 * @param options - MDC frontmatter options
 */
export async function generateMdcFile(
  snippets: PackageSnippet[],
  outputPath: string,
  options: MdcOptions = {},
): Promise<void> {
  const {
    description = "epost-kit project context, conventions, and agent workflows",
    alwaysApply = true,
  } = options;

  const fmLines: string[] = ["---"];
  fmLines.push(`description: ${description}`);
  if (options.globs) {
    fmLines.push(`globs: ${options.globs}`);
  }
  fmLines.push(`alwaysApply: ${alwaysApply}`);
  fmLines.push("---");

  const body = assembleSnippetContent(snippets);

  const content = fmLines.join("\n") + "\n" + body;
  await safeWriteFile(outputPath, content);
  logger.debug(`[mdc-generator] Generated ${outputPath} (${snippets.length} snippets)`);
}

/**
 * Assemble snippet content, stripping any YAML frontmatter from individual snippets.
 */
function assembleSnippetContent(snippets: PackageSnippet[]): string {
  if (snippets.length === 0) return "";

  return snippets
    .map((s) => stripFrontmatter(s.content))
    .join("\n\n---\n\n");
}

/**
 * Strip YAML frontmatter from snippet content if present.
 */
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}
