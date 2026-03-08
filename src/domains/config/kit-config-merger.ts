/**
 * Kit config merger: deep-merge .epost-kit.json from multiple packages
 * Follows same pattern as settings-merger.ts
 */

import { join } from "node:path";
import { logger } from "@/shared/logger.js";
import { safeReadFile, safeWriteFile } from "@/shared/file-system.js";
import { deepMerge } from "./settings-merger.js";

export interface PackageKitConfig {
  packageName: string;
  config: Record<string, any>;
}

/**
 * Load .epost-kit.json from a package directory
 */
export async function loadKitConfig(
  packageDir: string,
  packageName: string,
): Promise<PackageKitConfig | null> {
  const configPath = join(packageDir, ".epost-kit.json");
  const content = await safeReadFile(configPath);

  if (!content) {
    logger.debug(`[kit-config] No .epost-kit.json found for "${packageName}"`);
    return null;
  }

  try {
    const config = JSON.parse(content);
    return { packageName, config };
  } catch {
    logger.warn(`[kit-config] Invalid JSON in ${configPath}, skipping`);
    return null;
  }
}

/**
 * Merge .epost-kit.json from multiple packages in order.
 * First package is the base; subsequent packages deep-merge on top.
 *
 * @param packages - Array of { name, dir } in topological order
 * @param outputPath - Path to write merged .epost-kit.json
 * @param pathTransformer - Optional function to transform path references in string values
 *   (e.g., replace `.claude/` with `.github/` for VS Code target)
 */
export async function mergeAndWriteKitConfig(
  packages: Array<{ name: string; dir: string }>,
  outputPath: string,
  pathTransformer?: (content: string) => string,
): Promise<{ merged: Record<string, any>; sources: string[] }> {
  const allConfigs: PackageKitConfig[] = [];
  const sources: string[] = [];

  for (const pkg of packages) {
    const kitConfig = await loadKitConfig(pkg.dir, pkg.name);
    if (kitConfig) {
      allConfigs.push(kitConfig);
      sources.push(pkg.name);
    }
  }

  if (allConfigs.length === 0) {
    logger.debug("[kit-config] No package kit configs found");
    return { merged: {}, sources: [] };
  }

  let merged: Record<string, any> = {};
  for (const pkg of allConfigs) {
    if (Object.keys(merged).length === 0) {
      merged = { ...pkg.config };
      logger.debug(`[kit-config] Base config from "${pkg.packageName}"`);
    } else {
      merged = deepMerge(merged, pkg.config);
      logger.debug(`[kit-config] Merged config from "${pkg.packageName}"`);
    }
  }

  let content = JSON.stringify(merged, null, 2);
  if (pathTransformer) {
    content = pathTransformer(content);
    logger.debug("[kit-config] Applied path transformer to kit config");
  }
  await safeWriteFile(outputPath, content);
  logger.debug(`[kit-config] Wrote merged kit config to ${outputPath}`);

  return { merged, sources };
}
