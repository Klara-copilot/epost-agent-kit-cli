/**
 * Ignore patterns merger: merge .epost-ignore from multiple packages
 * Preserves comment structure from first (base) package, deduplicates patterns.
 */

import { join } from "node:path";
import { logger } from "@/shared/logger.js";
import { safeReadFile, safeWriteFile } from "@/shared/file-system.js";

export interface PackageIgnorePatterns {
  packageName: string;
  lines: string[];
}

/**
 * Load .epost-ignore from a package directory.
 * Returns all lines (including comments and blanks) to preserve structure.
 */
export async function loadIgnorePatterns(
  packageDir: string,
  packageName: string,
): Promise<PackageIgnorePatterns | null> {
  const ignorePath = join(packageDir, ".epost-ignore");
  const content = await safeReadFile(ignorePath);

  if (!content) {
    logger.debug(
      `[ignore-merger] No .epost-ignore found for "${packageName}"`,
    );
    return null;
  }

  const lines = content.split("\n");
  return { packageName, lines };
}

/**
 * Extract pattern lines (non-blank, non-comment) from a line list.
 */
function extractPatterns(lines: string[]): Set<string> {
  const patterns = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      patterns.add(trimmed);
    }
  }
  return patterns;
}

/**
 * Merge .epost-ignore from multiple packages in order.
 * Base package provides the comment structure; subsequent packages
 * contribute additional patterns (appended at end, deduplicated).
 *
 * @param packages - Array of { name, dir } in topological order
 * @param outputPath - Path to write merged .epost-ignore
 */
export async function mergeAndWriteIgnore(
  packages: Array<{ name: string; dir: string }>,
  outputPath: string,
): Promise<{ sources: string[] }> {
  const allPkgs: PackageIgnorePatterns[] = [];
  const sources: string[] = [];

  for (const pkg of packages) {
    const patterns = await loadIgnorePatterns(pkg.dir, pkg.name);
    if (patterns) {
      allPkgs.push(patterns);
      sources.push(pkg.name);
    }
  }

  if (allPkgs.length === 0) {
    logger.debug("[ignore-merger] No package ignore files found");
    return { sources: [] };
  }

  const [base, ...rest] = allPkgs;

  // Start with base content (preserves comments and structure)
  const resultLines = [...base.lines];
  const knownPatterns = extractPatterns(base.lines);

  // Append unique patterns from subsequent packages
  for (const pkg of rest) {
    const additional = extractPatterns(pkg.lines);
    const newPatterns: string[] = [];
    for (const pattern of additional) {
      if (!knownPatterns.has(pattern)) {
        newPatterns.push(pattern);
        knownPatterns.add(pattern);
      }
    }
    if (newPatterns.length > 0) {
      resultLines.push("");
      resultLines.push(`# from ${pkg.packageName}`);
      resultLines.push(...newPatterns);
      logger.debug(
        `[ignore-merger] Added ${newPatterns.length} patterns from "${pkg.packageName}"`,
      );
    }
  }

  // Ensure single trailing newline
  const content = resultLines.join("\n").trimEnd() + "\n";
  await safeWriteFile(outputPath, content);
  logger.debug(`[ignore-merger] Wrote merged ignore to ${outputPath}`);

  return { sources };
}
