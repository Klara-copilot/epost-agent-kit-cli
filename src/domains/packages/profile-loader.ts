/**
 * Profile loader: auto-detection, listing, and profile info
 */

import { join } from "node:path";
import { readdir } from "node:fs/promises";
import { Separator } from "@inquirer/prompts";
import { logger } from "@/shared/logger.js";
import { fileExists, dirExists, safeReadFile } from "@/shared/file-system.js";
import {
  type ProfilesConfig,
  type AutoDetectRule,
} from "@/domains/packages/package-resolver.js";

// ─── Auto-Detection ───

export interface DetectionResult {
  /** Suggested profile name */
  profile: string;
  /** Display name of the profile */
  displayName: string;
  /** Confidence level */
  confidence: "high" | "medium" | "low";
  /** Which rules matched */
  matchedRules: string[];
}

/**
 * Auto-detect project type and suggest a profile
 */
export async function detectProjectProfile(
  projectDir: string,
  profilesConfig: ProfilesConfig,
): Promise<DetectionResult | null> {
  const rules = profilesConfig.auto_detect?.rules;
  if (!rules || rules.length === 0) {
    logger.debug("[detect] No auto-detect rules configured");
    return null;
  }

  for (const rule of rules) {
    const matched = await matchRule(projectDir, rule);
    if (matched.match) {
      const profile = profilesConfig.profiles[rule.suggest];
      return {
        profile: rule.suggest,
        displayName: profile?.display_name || rule.suggest,
        confidence: matched.confidence,
        matchedRules: matched.reasons,
      };
    }
  }

  logger.debug("[detect] No auto-detect rules matched");
  return null;
}

/**
 * Check if a single auto-detect rule matches the project
 */
async function matchRule(
  projectDir: string,
  rule: AutoDetectRule,
): Promise<{
  match: boolean;
  confidence: "high" | "medium" | "low";
  reasons: string[];
}> {
  const reasons: string[] = [];
  let matchCount = 0;
  let totalChecks = 0;

  // Check file patterns
  if (rule.match.files) {
    totalChecks += rule.match.files.length;
    for (const pattern of rule.match.files) {
      const found = await matchFilePattern(projectDir, pattern);
      if (found) {
        matchCount++;
        reasons.push(`file: ${pattern}`);
      }
    }
  }

  // Check directory patterns
  if (rule.match.directories) {
    totalChecks += rule.match.directories.length;
    for (const pattern of rule.match.directories) {
      const found = await matchDirPattern(projectDir, pattern);
      if (found) {
        matchCount++;
        reasons.push(`dir: ${pattern}`);
      }
    }
  }

  // Check package.json dependencies
  if (rule.match.dependencies) {
    totalChecks += rule.match.dependencies.length;
    const deps = await getProjectDependencies(projectDir);
    for (const dep of rule.match.dependencies) {
      if (deps.has(dep)) {
        matchCount++;
        reasons.push(`dep: ${dep}`);
      }
    }
  }

  if (totalChecks === 0)
    return { match: false, confidence: "low", reasons: [] };

  // All checks must match for the rule to apply (AND logic)
  const match = matchCount === totalChecks;
  const confidence =
    matchCount === totalChecks ? "high" : matchCount > 0 ? "medium" : "low";

  return { match, confidence, reasons };
}

/**
 * Match a file pattern against project root (supports simple glob: *.ext, name.*)
 */
async function matchFilePattern(
  projectDir: string,
  pattern: string,
): Promise<boolean> {
  // Exact file check
  if (!pattern.includes("*")) {
    return fileExists(join(projectDir, pattern));
  }

  // Glob pattern matching
  try {
    const entries = await readdir(projectDir);
    const regex = globToRegex(pattern);
    return entries.some((entry) => regex.test(entry));
  } catch {
    return false;
  }
}

/**
 * Match a directory pattern against project (supports simple glob)
 */
async function matchDirPattern(
  projectDir: string,
  pattern: string,
): Promise<boolean> {
  // Check if it's a path with slashes
  if (pattern.includes("/")) {
    return dirExists(join(projectDir, pattern));
  }

  // Glob pattern: check top-level directories
  if (pattern.includes("*")) {
    try {
      const entries = await readdir(projectDir, { withFileTypes: true });
      const regex = globToRegex(pattern);
      return entries.some(
        (entry) => entry.isDirectory() && regex.test(entry.name),
      );
    } catch {
      return false;
    }
  }

  return dirExists(join(projectDir, pattern));
}

/**
 * Get dependencies from package.json
 */
async function getProjectDependencies(
  projectDir: string,
): Promise<Set<string>> {
  const pkgPath = join(projectDir, "package.json");
  const content = await safeReadFile(pkgPath);
  if (!content) return new Set();

  try {
    const pkg = JSON.parse(content);
    const deps = new Set<string>();
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach((d) => deps.add(d));
    }
    if (pkg.devDependencies) {
      Object.keys(pkg.devDependencies).forEach((d) => deps.add(d));
    }
    return deps;
  } catch {
    return new Set();
  }
}

/**
 * Convert simple glob pattern to regex
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

// ─── Profile Info ───

export interface ProfileInfo {
  name: string;
  displayName: string;
  teams: string[];
  packages: string[];
  optional: string[];
}

/**
 * Get detailed info about a specific profile
 */
export function getProfileInfo(
  name: string,
  profiles: ProfilesConfig,
): ProfileInfo | null {
  const profile = profiles.profiles[name];
  if (!profile) return null;

  return {
    name,
    displayName: profile.display_name,
    teams: profile.teams || [],
    packages: profile.packages,
    optional: profile.optional || [],
  };
}

/**
 * List all available profiles
 */
export function listProfiles(profiles: ProfilesConfig): ProfileInfo[] {
  return Object.entries(profiles.profiles).map(([name, profile]) => ({
    name,
    displayName: profile.display_name,
    teams: profile.teams || [],
    packages: profile.packages,
    optional: profile.optional || [],
  }));
}

/**
 * Find profiles matching a team name
 */
export function findProfilesByTeam(
  teamName: string,
  profiles: ProfilesConfig,
): ProfileInfo[] {
  return listProfiles(profiles).filter((p) =>
    p.teams.includes(teamName.toLowerCase()),
  );
}

// ─── Kit Root Resolution ───

/**
 * Find the epost_agent_kit repo root
 * @deprecated Use KitPathResolver from @/shared/path-resolver.js instead
 */
export async function findKitRoot(): Promise<string | null> {
  const { KitPathResolver } = await import("@/shared/path-resolver.js");
  const resolver = new KitPathResolver();
  try {
    return await resolver.getRoot();
  } catch {
    return null;
  }
}

// ─── Team Ordering ───

const TEAM_ORDER = [
  { group: "Feature Teams", teams: ["helios", "miracle", "titan", "hacka", "kepler"] },
  { group: "Mobile", teams: ["optimus"] },
  { group: "Specialist", teams: ["future", "muji"] },
];

/**
 * Return team choices in curated order with Separator dividers.
 * Only includes teams that actually exist in the profiles config.
 */
export function getOrderedTeamChoices(
  profiles: ProfilesConfig,
): Array<Separator | { name: string; value: string }> {
  const existingTeams = new Set<string>();
  for (const p of Object.values(profiles.profiles)) {
    for (const t of p.teams || []) existingTeams.add(t);
  }

  const choices: Array<Separator | { name: string; value: string }> = [];

  for (const group of TEAM_ORDER) {
    const groupTeams = group.teams.filter((t) => existingTeams.has(t));
    if (groupTeams.length === 0) continue;

    if (choices.length > 0) choices.push(new Separator());

    for (const t of groupTeams) {
      choices.push({
        name: t.charAt(0).toUpperCase() + t.slice(1),
        value: t,
      });
      existingTeams.delete(t);
    }
  }

  // Any remaining teams not in TEAM_ORDER
  if (existingTeams.size > 0) {
    choices.push(new Separator());
    for (const t of existingTeams) {
      choices.push({
        name: t.charAt(0).toUpperCase() + t.slice(1),
        value: t,
      });
    }
  }

  // Always add "Others" at the end
  choices.push(new Separator());
  choices.push({ name: "Others / I'm exploring", value: "__other__" });

  return choices;
}
