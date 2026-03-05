/**
 * Skill health checks for epost-kit lint: connection validation, frontmatter
 * completeness, orphan detection, package.yaml sync, skill-index staleness.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { PackageManifest } from "@/domains/packages/package-resolver.js";

// ─── Types ───

export type Severity = "error" | "warn" | "info";

export interface HealthIssue {
  rule: string;
  severity: Severity;
  skill: string;
  message: string;
}

interface SkillFrontmatter {
  name: string;
  description?: string;
  keywords?: string[];
  platforms?: string[];
  connections?: {
    extends?: string[];
    requires?: string[];
    conflicts?: string[];
    enhances?: string[];
  };
}

// ─── Frontmatter Parser (lightweight, same approach as init.ts) ───

function parseSkillFrontmatter(content: string): SkillFrontmatter | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const metadata: Record<string, string | string[]> = {};
  const lines = match[1].split("\n");
  let currentKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("-") && currentKey) {
      const value = trimmed.substring(1).trim();
      if (!Array.isArray(metadata[currentKey])) metadata[currentKey] = [];
      (metadata[currentKey] as string[]).push(value);
      continue;
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    let value = trimmed.substring(colonIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      metadata[key] = value
        .substring(1, value.length - 1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter((item) => item);
    } else if (value) {
      metadata[key] = value;
    } else {
      currentKey = key;
    }
  }

  if (!metadata.name || typeof metadata.name !== "string") return null;

  const asArr = (v: string | string[] | undefined): string[] =>
    Array.isArray(v) ? v : [];

  return {
    name: metadata.name,
    description:
      typeof metadata.description === "string"
        ? metadata.description
        : undefined,
    keywords: asArr(metadata.keywords),
    platforms: asArr(metadata.platforms),
    connections: {
      extends: asArr(metadata.extends),
      requires: asArr(metadata.requires),
      conflicts: asArr(metadata.conflicts),
      enhances: asArr(metadata.enhances),
    },
  };
}

// ─── Skill Discovery ───

async function findSkillFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await findSkillFiles(fullPath)));
      } else if (entry.name === "SKILL.md") {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return results;
}

async function loadAllSkillFrontmatters(
  packagesDir: string,
): Promise<Map<string, SkillFrontmatter>> {
  const skills = new Map<string, SkillFrontmatter>();
  const files = await findSkillFiles(packagesDir);

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, "utf-8");
      const fm = parseSkillFrontmatter(content);
      if (fm?.name) {
        skills.set(fm.name, fm);
      }
    } catch {
      // Skip unreadable files
    }
  }

  return skills;
}

// ─── Health Check: Connection Validation ───

function checkConnections(
  skills: Map<string, SkillFrontmatter>,
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const allNames = new Set(skills.keys());

  for (const [name, fm] of skills) {
    const conn = fm.connections;
    if (!conn) continue;

    // Check all connection targets exist
    for (const rel of [
      "extends",
      "requires",
      "conflicts",
      "enhances",
    ] as const) {
      for (const target of conn[rel] ?? []) {
        if (!allNames.has(target)) {
          issues.push({
            rule: "connection-target-exists",
            severity: "error",
            skill: name,
            message: `${rel} target "${target}" not found in skill registry`,
          });
        }
      }
    }

    // Check bidirectional conflicts
    for (const target of conn.conflicts ?? []) {
      if (!allNames.has(target)) continue;
      const targetConn = skills.get(target)?.connections;
      if (!targetConn?.conflicts?.includes(name)) {
        issues.push({
          rule: "conflict-pair",
          severity: "warn",
          skill: name,
          message: `conflicts with "${target}" but "${target}" does not conflict back`,
        });
      }
    }
  }

  // Check for circular extends chains
  for (const [name] of skills) {
    const visited = new Set<string>();
    let current = name;
    while (current) {
      if (visited.has(current)) {
        issues.push({
          rule: "connection-cycle",
          severity: "error",
          skill: name,
          message: `circular extends chain: ${[...visited, current].join(" → ")}`,
        });
        break;
      }
      visited.add(current);
      const ext = skills.get(current)?.connections?.extends;
      current = ext?.[0] ?? "";
      if (!current) break;
    }
  }

  return issues;
}

// ─── Health Check: Frontmatter Completeness ───

function checkFrontmatterCompleteness(
  skills: Map<string, SkillFrontmatter>,
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  for (const [name, fm] of skills) {
    if (!fm.description) {
      issues.push({
        rule: "frontmatter-completeness",
        severity: "warn",
        skill: name,
        message: "missing description",
      });
    }

    if (!fm.keywords || fm.keywords.length === 0) {
      issues.push({
        rule: "frontmatter-completeness",
        severity: "warn",
        skill: name,
        message: "missing keywords",
      });
    }

    if (!fm.platforms || fm.platforms.length === 0) {
      issues.push({
        rule: "frontmatter-completeness",
        severity: "warn",
        skill: name,
        message: "missing platforms",
      });
    }

    if (fm.description && fm.description.length > 200) {
      issues.push({
        rule: "description-quality",
        severity: "warn",
        skill: name,
        message: `description is ${fm.description.length} chars (>200) — consider moving detail to body`,
      });
    }
  }

  return issues;
}

// ─── Health Check: Orphan Skills ───

function checkOrphanSkills(
  skills: Map<string, SkillFrontmatter>,
  agentSkillLists: Map<string, string[]>,
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  // Collect all skills referenced by agents or connections
  const referenced = new Set<string>();
  for (const skillList of agentSkillLists.values()) {
    for (const s of skillList) referenced.add(s);
  }
  for (const fm of skills.values()) {
    const conn = fm.connections;
    if (!conn) continue;
    for (const rel of [
      "extends",
      "requires",
      "conflicts",
      "enhances",
    ] as const) {
      for (const target of conn[rel] ?? []) referenced.add(target);
    }
  }

  for (const name of skills.keys()) {
    if (!referenced.has(name)) {
      issues.push({
        rule: "orphan-skill",
        severity: "info",
        skill: name,
        message: "not referenced by any agent skills list or connection",
      });
    }
  }

  return issues;
}

// ─── Health Check: Package YAML Sync ───

function checkPackageYamlSync(
  skills: Map<string, SkillFrontmatter>,
  manifests: Map<string, PackageManifest>,
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  const declared = new Set<string>();
  for (const manifest of manifests.values()) {
    for (const s of manifest.provides.skills) declared.add(s);
  }

  for (const name of skills.keys()) {
    if (!declared.has(name)) {
      issues.push({
        rule: "package-yaml-sync",
        severity: "error",
        skill: name,
        message: "exists on disk but missing from package.yaml provides.skills",
      });
    }
  }

  for (const name of declared) {
    if (!skills.has(name)) {
      issues.push({
        rule: "package-yaml-sync",
        severity: "error",
        skill: name,
        message:
          "declared in package.yaml but no SKILL.md found on disk",
      });
    }
  }

  return issues;
}

// ─── Health Check: Skill-Index Staleness ───

async function checkSkillIndexStaleness(
  claudeDir: string,
  diskSkillCount: number,
): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];
  const indexPath = join(claudeDir, "skills", "skill-index.json");

  if (!existsSync(indexPath)) {
    issues.push({
      rule: "skill-index-stale",
      severity: "warn",
      skill: "(index)",
      message: "skill-index.json not found — run epost-kit init to generate",
    });
    return issues;
  }

  try {
    const indexContent = JSON.parse(await readFile(indexPath, "utf-8"));
    const indexCount = indexContent.count ?? 0;
    if (indexCount !== diskSkillCount) {
      issues.push({
        rule: "skill-index-stale",
        severity: "warn",
        skill: "(index)",
        message: `skill-index.json has ${indexCount} skills but ${diskSkillCount} SKILL.md files found on disk`,
      });
    }
  } catch {
    issues.push({
      rule: "skill-index-stale",
      severity: "warn",
      skill: "(index)",
      message: "skill-index.json is malformed",
    });
  }

  return issues;
}

// ─── Health Check: Duplicate Keywords ───

function checkDuplicateKeywords(
  skills: Map<string, SkillFrontmatter>,
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  // keyword@platform → [skill names]
  const seen = new Map<string, string[]>();

  for (const [name, fm] of skills) {
    const platforms = fm.platforms?.length ? fm.platforms : ["all"];
    for (const platform of platforms) {
      for (const kw of fm.keywords ?? []) {
        const key = `${kw}@${platform}`;
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key)!.push(name);
      }
    }
  }

  // Deduplicate: only report each duplicate group once
  const reported = new Set<string>();
  for (const [key, claimants] of seen) {
    if (claimants.length <= 1) continue;
    const groupKey = claimants.sort().join(",");
    if (reported.has(groupKey + key.split("@")[0])) continue;
    reported.add(groupKey + key.split("@")[0]);

    const [keyword, platform] = key.split("@");
    issues.push({
      rule: "duplicate-keyword",
      severity: "warn",
      skill: claimants[0],
      message: `keyword "${keyword}" shared with ${claimants.slice(1).join(", ")} on ${platform}`,
    });
  }

  return issues;
}

// ─── Agent Skills Extraction ───

async function extractAgentSkillLists(
  claudeDir: string,
): Promise<Map<string, string[]>> {
  const agentSkills = new Map<string, string[]>();
  const agentsDir = join(claudeDir, "agents");

  if (!existsSync(agentsDir)) return agentSkills;

  try {
    const entries = await readdir(agentsDir);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const content = await readFile(join(agentsDir, entry), "utf-8");
      const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (!match) continue;

      for (const line of match[1].split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("skills:")) {
          const value = trimmed.slice("skills:".length).trim();
          if (value.startsWith("[") && value.endsWith("]")) {
            const skills = value
              .slice(1, -1)
              .split(",")
              .map((s) => s.trim().replace(/^["']|["']$/g, ""))
              .filter(Boolean);
            agentSkills.set(entry.replace(".md", ""), skills);
          }
        }
      }
    }
  } catch {
    // Agents dir not readable
  }

  return agentSkills;
}

// ─── Main Runner ───

export interface HealthCheckResult {
  issues: HealthIssue[];
  stats: {
    skillCount: number;
    connectionCount: {
      extends: number;
      requires: number;
      conflicts: number;
      enhances: number;
    };
    completeness: {
      withKeywords: number;
      withPlatforms: number;
      withDescription: number;
    };
  };
}

export async function runSkillHealthChecks(
  packagesDir: string,
  claudeDir: string,
  manifests: Map<string, PackageManifest>,
): Promise<HealthCheckResult> {
  const skills = await loadAllSkillFrontmatters(packagesDir);
  const agentSkills = await extractAgentSkillLists(claudeDir);

  // Aggregate connection counts
  const connectionCount = {
    extends: 0,
    requires: 0,
    conflicts: 0,
    enhances: 0,
  };
  for (const fm of skills.values()) {
    const conn = fm.connections;
    if (!conn) continue;
    connectionCount.extends += conn.extends?.length ?? 0;
    connectionCount.requires += conn.requires?.length ?? 0;
    connectionCount.conflicts += conn.conflicts?.length ?? 0;
    connectionCount.enhances += conn.enhances?.length ?? 0;
  }

  // Completeness stats
  let withKeywords = 0,
    withPlatforms = 0,
    withDescription = 0;
  for (const fm of skills.values()) {
    if (fm.keywords && fm.keywords.length > 0) withKeywords++;
    if (fm.platforms && fm.platforms.length > 0) withPlatforms++;
    if (fm.description) withDescription++;
  }

  const issues: HealthIssue[] = [
    ...checkConnections(skills),
    ...checkFrontmatterCompleteness(skills),
    ...checkOrphanSkills(skills, agentSkills),
    ...checkPackageYamlSync(skills, manifests),
    ...(await checkSkillIndexStaleness(claudeDir, skills.size)),
    ...checkDuplicateKeywords(skills),
  ];

  return {
    issues,
    stats: {
      skillCount: skills.size,
      connectionCount,
      completeness: { withKeywords, withPlatforms, withDescription },
    },
  };
}
