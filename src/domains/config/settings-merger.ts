/**
 * Settings merger: deep-merge settings.json from multiple packages
 * Respects settings_strategy: base (foundation) | merge (overlay) | skip (ignore)
 */

import { join } from "node:path";
import { logger } from "@/shared/logger.js";
import { safeReadFile, safeWriteFile } from "@/shared/file-system.js";

/**
 * Deep merge two objects. Arrays are concatenated and deduplicated.
 * The 'override' object takes precedence for scalar values.
 */
export function deepMerge<T extends Record<string, any>>(
  base: T,
  override: Partial<T>,
): T {
  const result = { ...base };

  for (const key of Object.keys(override) as Array<keyof T>) {
    const baseVal = base[key];
    const overrideVal = override[key];

    if (overrideVal === undefined) continue;

    if (Array.isArray(baseVal) && Array.isArray(overrideVal)) {
      // Concatenate arrays and deduplicate primitives
      const merged = [...baseVal, ...overrideVal];
      result[key] = [...new Set(merged)] as any;
    } else if (
      typeof baseVal === "object" &&
      baseVal !== null &&
      !Array.isArray(baseVal) &&
      typeof overrideVal === "object" &&
      overrideVal !== null &&
      !Array.isArray(overrideVal)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(baseVal, overrideVal) as any;
    } else {
      // Scalar override
      result[key] = overrideVal as any;
    }
  }

  return result;
}

/**
 * Settings strategy for a package
 */
export type SettingsStrategy = "base" | "merge" | "skip";

export interface PackageSettings {
  packageName: string;
  strategy: SettingsStrategy;
  settings: Record<string, any>;
}

/**
 * Load settings.json from a package directory
 */
export async function loadPackageSettings(
  packageDir: string,
  packageName: string,
  strategy: SettingsStrategy,
): Promise<PackageSettings | null> {
  if (strategy === "skip") {
    logger.debug(
      `[settings] Skipping settings for "${packageName}" (strategy: skip)`,
    );
    return null;
  }

  const settingsPath = join(packageDir, "settings.json");
  const content = await safeReadFile(settingsPath);

  if (!content) {
    logger.debug(`[settings] No settings.json found for "${packageName}"`);
    return null;
  }

  try {
    const settings = JSON.parse(content);
    return { packageName, strategy, settings };
  } catch {
    logger.warn(`[settings] Invalid JSON in ${settingsPath}, skipping`);
    return null;
  }
}

/**
 * Merge settings from multiple packages in order.
 * First 'base' package becomes the foundation, subsequent 'merge' packages overlay.
 *
 * @param packageSettings - Array of package settings in topological order
 * @returns Merged settings object
 */
export function mergeAllSettings(
  packageSettings: PackageSettings[],
): Record<string, any> {
  let result: Record<string, any> = {};

  for (const pkg of packageSettings) {
    if (pkg.strategy === "skip") continue;

    if (pkg.strategy === "base") {
      // Base: use as foundation (first one wins if multiple)
      if (Object.keys(result).length === 0) {
        result = { ...pkg.settings };
        logger.debug(`[settings] Base settings from "${pkg.packageName}"`);
      } else {
        // Multiple base packages: merge (shouldn't happen, but be safe)
        result = deepMerge(result, pkg.settings);
        logger.warn(
          `[settings] Multiple base packages detected, merging "${pkg.packageName}"`,
        );
      }
    } else if (pkg.strategy === "merge") {
      // Merge: deep-merge on top of current
      result = deepMerge(result, pkg.settings);
      logger.debug(`[settings] Merged settings from "${pkg.packageName}"`);
    }
  }

  return result;
}

/**
 * Full pipeline: load settings from packages in order and produce merged result
 *
 * @param packages - Array of { name, dir, strategy } in topological order
 * @param outputPath - Path to write merged settings.json
 */
export async function mergeAndWriteSettings(
  packages: Array<{ name: string; dir: string; strategy: SettingsStrategy }>,
  outputPath: string,
): Promise<{ merged: Record<string, any>; sources: string[] }> {
  const allSettings: PackageSettings[] = [];
  const sources: string[] = [];

  for (const pkg of packages) {
    const settings = await loadPackageSettings(pkg.dir, pkg.name, pkg.strategy);
    if (settings) {
      allSettings.push(settings);
      sources.push(pkg.name);
    }
  }

  if (allSettings.length === 0) {
    logger.debug("[settings] No package settings found");
    return { merged: {}, sources: [] };
  }

  const merged = mergeAllSettings(allSettings);

  // Write merged settings
  const content = JSON.stringify(merged, null, 2);
  await safeWriteFile(outputPath, content);
  logger.debug(`[settings] Wrote merged settings to ${outputPath}`);

  return { merged, sources };
}
