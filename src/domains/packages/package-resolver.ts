/**
 * Package resolver: profile → packages, dependency validation, topological sort
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfigError } from "@/types/errors.js";
import { logger } from "@/shared/logger.js";

// ─── Types ───

export interface PackageManifest {
  name: string;
  version: string;
  description: string;
  layer: number;
  platforms: string[];
  dependencies: string[];
  recommends?: string[];
  provides: {
    agents: string[];
    skills: string[];
    commands: string[];
  };
  files: Record<string, string>;
  settings_strategy: "base" | "merge" | "skip";
  claude_snippet?: string;
}

export interface ProfileDefinition {
  display_name: string;
  teams?: string[];
  packages: string[];
  optional?: string[];
}

export interface AutoDetectRule {
  match: {
    files?: string[];
    directories?: string[];
    dependencies?: string[];
  };
  suggest: string;
}

export interface ProfilesConfig {
  profiles: Record<string, ProfileDefinition>;
  auto_detect?: {
    rules: AutoDetectRule[];
  };
}

export interface ResolvedPackages {
  /** Packages in topological order (dependencies first) */
  packages: string[];
  /** Optional packages available but not included */
  optional: string[];
  /** Recommended packages from installed packages */
  recommended: string[];
  /** Profile name if resolved from profile */
  profile?: string;
}

// ─── YAML Parsing (simple, no external dep) ───

/**
 * Simple YAML parser for our subset (no flow style, no anchors).
 * Handles: strings, arrays, nested objects, comments.
 * For production, consider js-yaml. This covers our package.yaml/profiles.yaml needs.
 */
export function parseSimpleYaml(content: string): any {
  // Implementation: Parse line-by-line YAML for the subset we use
  // This avoids adding js-yaml as dependency for now
  const lines = content.split("\n");
  const result: any = {};
  const stack: { indent: number; obj: any; key: string }[] = [
    { indent: -1, obj: result, key: "" },
  ];
  let currentArray: any[] | null = null;
  let currentArrayIndent = -1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.replace(/#.*$/, "").trimEnd();
    if (!trimmed || trimmed.trim() === "") continue;

    const indent = rawLine.search(/\S/);
    const content_line = trimmed.trim();

    // Close array context if indent changes
    if (
      currentArray !== null &&
      indent <= currentArrayIndent &&
      !content_line.startsWith("- ")
    ) {
      currentArray = null;
      currentArrayIndent = -1;
    }

    // Array item: "- value"
    if (content_line.startsWith("- ")) {
      const value = content_line.slice(2).trim();
      if (currentArray !== null) {
        currentArray.push(parseYamlValue(value));
      }
      continue;
    }

    // Key-value pair
    const colonIdx = content_line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = content_line.slice(0, colonIdx).trim();
    const rawValue = content_line.slice(colonIdx + 1).trim();

    // Pop stack to correct level
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;

    if (rawValue === "") {
      // Nested object or array (determined by next non-empty line)
      const nextNonEmpty = findNextNonEmpty(lines, i + 1);
      if (nextNonEmpty && nextNonEmpty.trim().startsWith("- ")) {
        // Array
        parent[key] = [];
        currentArray = parent[key];
        currentArrayIndent = indent;
      } else {
        // Nested object
        parent[key] = {};
        stack.push({ indent, obj: parent[key], key });
      }
    } else if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      // Inline array: [a, b, c]
      const inner = rawValue.slice(1, -1).trim();
      const items = inner
        ? inner.split(",").map((s) => parseYamlValue(s.trim()))
        : [];
      parent[key] = items;
    } else {
      parent[key] = parseYamlValue(rawValue);
    }
  }

  return result;
}

function findNextNonEmpty(lines: string[], startIdx: number): string | null {
  for (let i = startIdx; i < lines.length; i++) {
    const trimmed = lines[i].replace(/#.*$/, "").trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function parseYamlValue(value: string): any {
  if (!value) return "";
  // Remove surrounding quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  // Booleans
  if (value === "true") return true;
  if (value === "false") return false;
  // Numbers
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

// ─── Core Functions ───

/**
 * Load a package manifest from packages/<name>/package.yaml
 */
export async function loadPackageManifest(
  packagesDir: string,
  packageName: string,
): Promise<PackageManifest> {
  const manifestPath = join(packagesDir, packageName, "package.yaml");
  try {
    const content = await readFile(manifestPath, "utf-8");
    const parsed = parseSimpleYaml(content);
    return {
      name: parsed.name || packageName,
      version: parsed.version || "0.0.0",
      description: parsed.description || "",
      layer: parsed.layer ?? 0,
      platforms: parsed.platforms || ["all"],
      dependencies: parsed.dependencies || [],
      recommends: parsed.recommends || [],
      provides: {
        agents: parsed.provides?.agents || [],
        skills: parsed.provides?.skills || [],
        commands: parsed.provides?.commands || [],
      },
      files: parsed.files || {},
      settings_strategy: parsed.settings_strategy || "merge",
      claude_snippet: parsed.claude_snippet,
    };
  } catch (error) {
    throw new ConfigError(
      `Failed to load package manifest for "${packageName}": ${error instanceof Error ? error.message : "File not found"}`,
    );
  }
}

/**
 * Load all package manifests from packages/ directory
 */
export async function loadAllManifests(
  packagesDir: string,
): Promise<Map<string, PackageManifest>> {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const manifests = new Map<string, PackageManifest>();

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const manifest = await loadPackageManifest(packagesDir, entry.name);
      manifests.set(manifest.name, manifest);
    } catch (error) {
      logger.debug(
        `Skipping ${entry.name}: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }

  return manifests;
}

/**
 * Load profiles configuration from profiles/profiles.yaml
 */
export async function loadProfiles(
  profilesPath: string,
): Promise<ProfilesConfig> {
  try {
    const content = await readFile(profilesPath, "utf-8");
    const parsed = parseSimpleYaml(content);
    return {
      profiles: parsed.profiles || {},
      auto_detect: parsed.auto_detect,
    };
  } catch (error) {
    throw new ConfigError(
      `Failed to load profiles: ${error instanceof Error ? error.message : "File not found"}`,
    );
  }
}

/**
 * Resolve profile name → list of required packages
 */
export function resolveProfile(
  profileName: string,
  profiles: ProfilesConfig,
  includeOptional?: string[],
): string[] {
  const profile = profiles.profiles[profileName];
  if (!profile) {
    const available = Object.keys(profiles.profiles).join(", ");
    throw new ConfigError(
      `Unknown profile "${profileName}". Available: ${available}`,
    );
  }

  const packages = [...profile.packages];

  // Add selected optional packages
  if (includeOptional && profile.optional) {
    for (const opt of includeOptional) {
      if (profile.optional.includes(opt) && !packages.includes(opt)) {
        packages.push(opt);
      } else if (!profile.optional.includes(opt)) {
        logger.warn(
          `Optional package "${opt}" not available for profile "${profileName}"`,
        );
      }
    }
  }

  return packages;
}

/**
 * Validate all package dependencies are satisfied
 */
export function validateDependencies(
  packageNames: string[],
  manifests: Map<string, PackageManifest>,
): { valid: boolean; missing: Array<{ package: string; missingDep: string }> } {
  const packageSet = new Set(packageNames);
  const missing: Array<{ package: string; missingDep: string }> = [];

  for (const name of packageNames) {
    const manifest = manifests.get(name);
    if (!manifest) {
      missing.push({
        package: name,
        missingDep: `${name} (package not found)`,
      });
      continue;
    }
    for (const dep of manifest.dependencies) {
      if (!packageSet.has(dep)) {
        missing.push({ package: name, missingDep: dep });
      }
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Topological sort packages by dependencies (Kahn's algorithm)
 * Returns packages in install order (dependencies first)
 */
export function topologicalSort(
  packageNames: string[],
  manifests: Map<string, PackageManifest>,
): string[] {
  const nameSet = new Set(packageNames);
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const name of packageNames) {
    inDegree.set(name, 0);
    adjacency.set(name, []);
  }

  // Build graph
  for (const name of packageNames) {
    const manifest = manifests.get(name);
    if (!manifest) continue;
    for (const dep of manifest.dependencies) {
      if (nameSet.has(dep)) {
        adjacency.get(dep)!.push(name);
        inDegree.set(name, (inDegree.get(name) || 0) + 1);
      }
    }
  }

  // Kahn's algorithm with layer-based tie-breaking
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  // Sort queue by layer for stable ordering
  queue.sort((a, b) => {
    const layerA = manifests.get(a)?.layer ?? 99;
    const layerB = manifests.get(b)?.layer ?? 99;
    return layerA - layerB;
  });

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
        // Re-sort for stable ordering
        queue.sort((a, b) => {
          const layerA = manifests.get(a)?.layer ?? 99;
          const layerB = manifests.get(b)?.layer ?? 99;
          return layerA - layerB;
        });
      }
    }
  }

  // Check for cycles
  if (sorted.length !== packageNames.length) {
    const remaining = packageNames.filter((n) => !sorted.includes(n));
    throw new ConfigError(
      `Circular dependency detected among packages: ${remaining.join(", ")}`,
    );
  }

  return sorted;
}

/**
 * Collect recommended packages from installed packages that aren't already included
 */
export function collectRecommendations(
  packageNames: string[],
  manifests: Map<string, PackageManifest>,
): string[] {
  const installed = new Set(packageNames);
  const recommendations = new Set<string>();

  for (const name of packageNames) {
    const manifest = manifests.get(name);
    if (!manifest?.recommends) continue;
    for (const rec of manifest.recommends) {
      if (!installed.has(rec)) {
        recommendations.add(rec);
      }
    }
  }

  return [...recommendations];
}

/**
 * Full resolution pipeline: profile/packages → validated, sorted package list
 */
export async function resolvePackages(options: {
  packagesDir: string;
  profilesPath: string;
  profile?: string;
  packages?: string[];
  includeOptional?: string[];
  exclude?: string[];
}): Promise<ResolvedPackages> {
  const {
    packagesDir,
    profilesPath,
    profile,
    packages,
    includeOptional,
    exclude,
  } = options;

  // Load all manifests
  const manifests = await loadAllManifests(packagesDir);
  logger.debug(`Loaded ${manifests.size} package manifests`);

  // Determine package list
  let packageNames: string[];
  let profileName: string | undefined;

  if (profile) {
    const profiles = await loadProfiles(profilesPath);
    packageNames = resolveProfile(profile, profiles, includeOptional);
    profileName = profile;
    logger.debug(
      `Profile "${profile}" resolved to: ${packageNames.join(", ")}`,
    );
  } else if (packages && packages.length > 0) {
    packageNames = [...packages];
    logger.debug(`Explicit packages: ${packageNames.join(", ")}`);
  } else {
    // Default: core only
    packageNames = ["core"];
    logger.debug("No profile or packages specified, defaulting to core");
  }

  // Apply exclusions
  if (exclude && exclude.length > 0) {
    packageNames = packageNames.filter((p) => !exclude.includes(p));
    logger.debug(`After exclusions: ${packageNames.join(", ")}`);
  }

  // Auto-add dependencies not in list
  for (const name of [...packageNames]) {
    const manifest = manifests.get(name);
    if (!manifest) continue;
    for (const dep of manifest.dependencies) {
      if (!packageNames.includes(dep)) {
        packageNames.push(dep);
        logger.debug(`Auto-added dependency: ${dep} (required by ${name})`);
      }
    }
  }

  // Validate dependencies
  const validation = validateDependencies(packageNames, manifests);
  if (!validation.valid) {
    const details = validation.missing
      .map((m) => `"${m.package}" requires "${m.missingDep}"`)
      .join("; ");
    throw new ConfigError(`Unresolved dependencies: ${details}`);
  }

  // Topological sort
  const sorted = topologicalSort(packageNames, manifests);

  // Collect recommendations and optional
  const recommendations = collectRecommendations(sorted, manifests);
  const optionalPkgs: string[] = [];
  if (profileName) {
    const profiles = await loadProfiles(profilesPath);
    const profileDef = profiles.profiles[profileName];
    if (profileDef?.optional) {
      optionalPkgs.push(
        ...profileDef.optional.filter((o) => !sorted.includes(o)),
      );
    }
  }

  return {
    packages: sorted,
    optional: optionalPkgs,
    recommended: recommendations,
    profile: profileName,
  };
}
