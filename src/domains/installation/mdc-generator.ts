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

// ── Split MDC generation ──

interface PlatformMdcConfig {
  filename: string;
  description: string;
  globs?: string;
  alwaysApply: boolean;
}

/**
 * Platform → MDC file config
 * core + kit + domains + connectors → always-apply
 * Platform packages → file-scoped globs
 * Cross-cutting (a11y, design-system) → no globs, manual @rule invoke
 */
export const PLATFORM_MDC_CONFIG: Record<string, PlatformMdcConfig> = {
  core:           { filename: "epost-kit-core.mdc",    description: "epost-kit core context, agent routing, and conventions",        alwaysApply: true },
  web:            { filename: "epost-kit-web.mdc",     description: "epost-kit web platform context (React, Next.js, TypeScript)",   alwaysApply: false, globs: "**/*.{ts,tsx,scss,css}" },
  ios:            { filename: "epost-kit-ios.mdc",     description: "epost-kit iOS platform context (Swift, SwiftUI)",               alwaysApply: false, globs: "**/*.swift" },
  android:        { filename: "epost-kit-android.mdc", description: "epost-kit Android platform context (Kotlin, Compose)",          alwaysApply: false, globs: "**/*.kt" },
  backend:        { filename: "epost-kit-backend.mdc", description: "epost-kit backend platform context (Java, Jakarta EE)",         alwaysApply: false, globs: "**/*.java" },
  "design-system":{ filename: "epost-kit-design.mdc",  description: "epost-kit design system context (Figma, design tokens)",        alwaysApply: false },
  a11y:           { filename: "epost-kit-a11y.mdc",    description: "epost-kit accessibility context (WCAG 2.1 AA, a11y patterns)",  alwaysApply: false },
};

/**
 * Map a package name to its platform key for MDC grouping.
 */
export function packageToPlatformKey(packageName: string): string {
  const map: Record<string, string> = {
    "core":           "core",
    "kit":            "core",
    "domains":        "core",
    "connectors":     "core",
    "platform-web":   "web",
    "platform-ios":   "ios",
    "platform-android": "android",
    "platform-backend": "backend",
    "design-system":  "design-system",
    "a11y":           "a11y",
  };
  return map[packageName] ?? "core";
}

/**
 * Group snippets by platform key using package name → platform mapping.
 */
export function groupSnippetsByPlatform(
  snippets: PackageSnippet[],
): Map<string, PackageSnippet[]> {
  const grouped = new Map<string, PackageSnippet[]>();
  for (const snippet of snippets) {
    const platform = packageToPlatformKey(snippet.packageName);
    const existing = grouped.get(platform) ?? [];
    existing.push(snippet);
    grouped.set(platform, existing);
  }
  return grouped;
}

/**
 * Generate split .mdc files — one per platform — into rulesDir.
 * Returns list of written filenames.
 * Deletes the old monolithic epost-kit.mdc if present (migration).
 */
export async function generateSplitMdcFiles(
  snippets: PackageSnippet[],
  rulesDir: string,
): Promise<string[]> {
  const { rm } = await import("node:fs/promises");
  const { join } = await import("node:path");

  // Migration: remove old monolithic file
  try {
    await rm(join(rulesDir, "epost-kit.mdc"), { force: true });
  } catch { /* ignore */ }

  const snippetsByPlatform = groupSnippetsByPlatform(snippets);
  const written: string[] = [];

  for (const [platform, platformSnippets] of snippetsByPlatform) {
    const config = PLATFORM_MDC_CONFIG[platform];
    if (!config) continue;

    const outputPath = join(rulesDir, config.filename);
    await generateMdcFile(platformSnippets, outputPath, {
      description: config.description,
      globs: config.globs,
      alwaysApply: config.alwaysApply,
    });
    written.push(config.filename);
  }

  return written;
}

// ── Helpers ──

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
