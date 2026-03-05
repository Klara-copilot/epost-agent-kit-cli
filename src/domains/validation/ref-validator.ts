/**
 * Reference validator: builds registry from package manifests,
 * validates agent/skill/command references across installed markdown files.
 */

import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { existsSync } from "node:fs";
import {
  loadAllManifests,
  type PackageManifest,
} from "@/domains/packages/package-resolver.js";

// ─── Types ───

export interface RefRegistry {
  agents: Set<string>;
  skills: Set<string>;
  commands: Set<string>;
}

export type RefType = "agent" | "skill" | "command";

export interface RefError {
  file: string;
  line: number;
  type: RefType;
  ref: string;
  location: "frontmatter" | "body";
  suggestion?: string;
}

// ─── Registry Builder ───

/**
 * Build a reference registry from all package manifests.
 * Union of all provides.agents/skills/commands across packages.
 */
export function buildRefRegistry(
  manifests: Map<string, PackageManifest>,
): RefRegistry {
  const registry: RefRegistry = {
    agents: new Set(),
    skills: new Set(),
    commands: new Set(),
  };

  for (const manifest of manifests.values()) {
    for (const a of manifest.provides.agents) registry.agents.add(a);
    for (const s of manifest.provides.skills) registry.skills.add(s);
    for (const c of manifest.provides.commands) registry.commands.add(c);
  }

  return registry;
}

/**
 * Build registry directly from packages/ directory.
 */
export async function buildRefRegistryFromDir(
  packagesDir: string,
): Promise<RefRegistry> {
  const manifests = await loadAllManifests(packagesDir);
  return buildRefRegistry(manifests);
}

// ─── Frontmatter Extraction ───

interface ParsedFrontmatter {
  skills?: string[];
  agent?: string;
  raw: string;
  endLine: number; // line number where frontmatter ends (0-indexed)
}

function parseFrontmatter(content: string): ParsedFrontmatter | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const raw = match[1];
  const endLine = raw.split("\n").length + 1; // +1 for opening ---
  const result: ParsedFrontmatter = { raw, endLine };

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    // skills: [core, web-nextjs, ...]
    if (trimmed.startsWith("skills:")) {
      const value = trimmed.slice("skills:".length).trim();
      if (value.startsWith("[") && value.endsWith("]")) {
        result.skills = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      }
    }

    // agent: epost-web-developer
    if (trimmed.startsWith("agent:")) {
      const value = trimmed.slice("agent:".length).trim().replace(/^["']|["']$/g, "");
      if (value) result.agent = value;
    }
  }

  return result;
}

// ─── Body Scanner ───

interface BodyRef {
  type: RefType;
  ref: string;
  line: number;
}

// Skip lines inside code blocks (``` ... ```)
function isInsideCodeBlock(lines: string[], lineIdx: number): boolean {
  let fenceCount = 0;
  for (let i = 0; i < lineIdx; i++) {
    if (lines[i].trim().startsWith("```")) fenceCount++;
  }
  return fenceCount % 2 === 1;
}

/**
 * Scan markdown body for references using conservative patterns.
 * Only matches explicit reference patterns to minimize false positives:
 * - Agent: backtick-wrapped `epost-{role}-{name}` (distinctive prefix)
 * - Skill: explicit "skill: name" or "skills: [list]" patterns in prose
 * - Command: backtick-wrapped `/namespace:action` with known namespaces
 */
function scanBody(content: string, fmEndLine: number): BodyRef[] {
  const refs: BodyRef[] = [];
  const lines = content.split("\n");

  for (let i = fmEndLine; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines inside fenced code blocks
    if (isInsideCodeBlock(lines, i)) continue;

    // Agent refs: `epost-{role}-{rest}` — distinctive, low false-positive
    const agentMatches = line.matchAll(/`(epost-[a-z][a-z0-9]+-[a-z][a-z0-9-]*)`/g);
    for (const m of agentMatches) {
      refs.push({ type: "agent", ref: m[1], line: i + 1 });
    }

    // Skill refs: explicit "skill: name" or "Use skill: name" patterns
    // Excludes commit-message patterns like "feat(skill): ..."
    const skillExplicit = line.matchAll(
      /(?<!\()\bskills?:\s+`?([a-z][a-z0-9-]+)`?/gi,
    );
    for (const m of skillExplicit) {
      const ref = m[1];
      // Require hyphen or min 5 chars to skip short false positives
      if (ref.includes("-") || ref.length >= 5) {
        refs.push({ type: "skill", ref, line: i + 1 });
      }
    }

    // Command refs: `/namespace:action` or `/namespace/action` in backticks
    const cmdMatches = line.matchAll(
      /`(\/[a-z][a-z0-9-]*(?:[:/][a-z][a-z0-9-]*)+)`/g,
    );
    for (const m of cmdMatches) {
      const normalized = m[1].slice(1).replace(/:/g, "/");
      const firstSegment = normalized.split("/")[0];
      const knownNamespaces = [
        "web", "ios", "android", "backend", "kit", "cli", "docs",
        "fix", "git", "plan", "cook", "review", "audit", "bootstrap",
        "epost", "add-command",
      ];
      if (knownNamespaces.includes(firstSegment)) {
        refs.push({ type: "command", ref: normalized, line: i + 1 });
      }
    }
  }

  return refs;
}

// ─── Fuzzy Matching ───

/**
 * Levenshtein edit distance between two strings.
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * Find the closest match in a set, returning it if within threshold.
 * Threshold: max(3, 30% of ref length)
 */
function findSuggestion(ref: string, candidates: Set<string>): string | undefined {
  const threshold = Math.max(3, Math.ceil(ref.length * 0.3));
  let best: string | undefined;
  let bestDist = Infinity;

  for (const candidate of candidates) {
    const dist = editDistance(ref, candidate);
    if (dist < bestDist && dist <= threshold) {
      bestDist = dist;
      best = candidate;
    }
  }

  return best;
}

// ─── File Scanner ───

async function findMdFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await findMdFiles(fullPath)));
      } else if (entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return results;
}

// ─── Main Validator ───

/**
 * Validate all references in installed .claude/ markdown files.
 * Scans frontmatter (high confidence) and body (broader coverage).
 */
export async function validateReferences(
  claudeDir: string,
  registry: RefRegistry,
): Promise<RefError[]> {
  const errors: RefError[] = [];

  const agentsDir = join(claudeDir, "agents");
  // Support both Claude ("commands") and Copilot ("prompts") directory names
  const commandsDir = existsSync(join(claudeDir, "commands"))
    ? join(claudeDir, "commands")
    : join(claudeDir, "prompts");
  const skillsDir = join(claudeDir, "skills");

  // Scan agent files for skills: [...] frontmatter
  if (existsSync(agentsDir)) {
    const agentFiles = await findMdFiles(agentsDir);
    for (const file of agentFiles) {
      const content = await readFile(file, "utf-8");
      const relPath = relative(claudeDir, file);
      const fm = parseFrontmatter(content);

      if (fm?.skills) {
        // Find the line number of skills: in frontmatter
        const fmLines = fm.raw.split("\n");
        let skillsLine = 1; // default to line 1
        for (let i = 0; i < fmLines.length; i++) {
          if (fmLines[i].trim().startsWith("skills:")) {
            skillsLine = i + 2; // +2: 1 for --- line, 1 for 0-index
            break;
          }
        }

        for (const skill of fm.skills) {
          if (!registry.skills.has(skill)) {
            errors.push({
              file: relPath,
              line: skillsLine,
              type: "skill",
              ref: skill,
              location: "frontmatter",
              suggestion: findSuggestion(skill, registry.skills),
            });
          }
        }
      }

      // Scan body
      const fmEnd = fm?.endLine ?? 0;
      const bodyRefs = scanBody(content, fmEnd);
      for (const br of bodyRefs) {
        const candidates =
          br.type === "agent"
            ? registry.agents
            : br.type === "skill"
              ? registry.skills
              : registry.commands;
        if (!candidates.has(br.ref)) {
          errors.push({
            file: relPath,
            line: br.line,
            type: br.type,
            ref: br.ref,
            location: "body",
            suggestion: findSuggestion(br.ref, candidates),
          });
        }
      }
    }
  }

  // Scan command files for agent: frontmatter
  if (existsSync(commandsDir)) {
    const cmdFiles = await findMdFiles(commandsDir);
    for (const file of cmdFiles) {
      const content = await readFile(file, "utf-8");
      const relPath = relative(claudeDir, file);
      const fm = parseFrontmatter(content);

      if (fm?.agent && !registry.agents.has(fm.agent)) {
        // Find line number of agent: in frontmatter
        const fmLines = fm.raw.split("\n");
        let agentLine = 1;
        for (let i = 0; i < fmLines.length; i++) {
          if (fmLines[i].trim().startsWith("agent:")) {
            agentLine = i + 2;
            break;
          }
        }

        errors.push({
          file: relPath,
          line: agentLine,
          type: "agent",
          ref: fm.agent,
          location: "frontmatter",
          suggestion: findSuggestion(fm.agent, registry.agents),
        });
      }

      // Scan body
      const fmEnd = fm?.endLine ?? 0;
      const bodyRefs = scanBody(content, fmEnd);
      for (const br of bodyRefs) {
        const candidates =
          br.type === "agent"
            ? registry.agents
            : br.type === "skill"
              ? registry.skills
              : registry.commands;
        if (!candidates.has(br.ref)) {
          errors.push({
            file: relPath,
            line: br.line,
            type: br.type,
            ref: br.ref,
            location: "body",
            suggestion: findSuggestion(br.ref, candidates),
          });
        }
      }
    }
  }

  // Scan skill files for body references
  if (existsSync(skillsDir)) {
    const skillFiles = await findMdFiles(skillsDir);
    for (const file of skillFiles) {
      const content = await readFile(file, "utf-8");
      const relPath = relative(claudeDir, file);
      const fm = parseFrontmatter(content);
      const fmEnd = fm?.endLine ?? 0;

      const bodyRefs = scanBody(content, fmEnd);
      for (const br of bodyRefs) {
        const candidates =
          br.type === "agent"
            ? registry.agents
            : br.type === "skill"
              ? registry.skills
              : registry.commands;
        if (!candidates.has(br.ref)) {
          errors.push({
            file: relPath,
            line: br.line,
            type: br.type,
            ref: br.ref,
            location: "body",
            suggestion: findSuggestion(br.ref, candidates),
          });
        }
      }
    }
  }

  // Deduplicate (same file + line + ref can appear from overlapping scans)
  const seen = new Set<string>();
  return errors.filter((e) => {
    const key = `${e.file}:${e.line}:${e.ref}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Rename Map & Auto-Fix ───

export interface FixReplacement {
  old: string;
  new: string;
  line: number;
}

export interface FixResult {
  file: string;
  replacements: FixReplacement[];
}

/**
 * Build a unified rename map from all package manifests.
 * Merges renames from all packages into a single old→new map.
 */
export function buildRenameMap(
  manifests: Map<string, PackageManifest>,
): Map<string, string> {
  const renameMap = new Map<string, string>();

  for (const manifest of manifests.values()) {
    if (!manifest.renames) continue;
    const sections = [
      manifest.renames.skills,
      manifest.renames.agents,
      manifest.renames.commands,
    ];
    for (const section of sections) {
      if (!section) continue;
      for (const [oldName, newName] of Object.entries(section) as Array<[string, string]>) {
        renameMap.set(oldName, newName);
      }
    }
  }

  return renameMap;
}

/**
 * Fix stale references in markdown files using the rename map.
 * Handles both frontmatter fields and body text.
 * Returns list of files modified with their replacements.
 */
export async function fixReferences(
  dir: string,
  renameMap: Map<string, string>,
  dryRun: boolean = true,
): Promise<FixResult[]> {
  const { writeFile } = await import("node:fs/promises");
  const results: FixResult[] = [];

  // Skip files that shouldn't be auto-fixed (changelogs, historical docs)
  const skipPatterns = ["CHANGELOG.md", "changelog.md", "HISTORY.md"];

  const allFiles = await findMdFiles(dir);

  for (const filePath of allFiles) {
    if (skipPatterns.some((p) => filePath.endsWith(p))) continue;
    const original = await readFile(filePath, "utf-8");
    let modified = original;
    const replacements: FixReplacement[] = [];

    const lines = original.split("\n");

    for (const [oldName, newName] of renameMap) {
      // Fix frontmatter: skills: [... oldName ...]
      // Match inside inline arrays: [a, oldName, b]
      const fmArrayPattern = new RegExp(
        `(skills:\\s*\\[(?:[^\\]]*,\\s*)?)\\b${escapeRegex(oldName)}\\b`,
        "g",
      );
      const beforeFmArray = modified;
      modified = modified.replace(fmArrayPattern, `$1${newName}`);
      if (modified !== beforeFmArray) {
        const lineNum = findLineOfChange(lines, oldName);
        replacements.push({ old: oldName, new: newName, line: lineNum });
      }

      // Fix frontmatter: agent: oldName
      const fmAgentPattern = new RegExp(
        `(agent:\\s*)${escapeRegex(oldName)}\\b`,
        "g",
      );
      const beforeFmAgent = modified;
      modified = modified.replace(fmAgentPattern, `$1${newName}`);
      if (modified !== beforeFmAgent) {
        const lineNum = findLineOfChange(lines, oldName);
        replacements.push({ old: oldName, new: newName, line: lineNum });
      }

      // Fix body: backtick-wrapped `oldName`
      const bodyBacktick = new RegExp(
        `\`${escapeRegex(oldName)}\``,
        "g",
      );
      const beforeBody = modified;
      modified = modified.replace(bodyBacktick, `\`${newName}\``);
      if (modified !== beforeBody) {
        const lineNum = findLineOfChange(lines, oldName);
        replacements.push({ old: oldName, new: newName, line: lineNum });
      }

      // Fix body: "skill: oldName" patterns
      const bodySkillRef = new RegExp(
        `(\\bskills?:\\s+)${escapeRegex(oldName)}\\b`,
        "gi",
      );
      const beforeSkillRef = modified;
      modified = modified.replace(bodySkillRef, `$1${newName}`);
      if (modified !== beforeSkillRef) {
        const lineNum = findLineOfChange(lines, oldName);
        replacements.push({ old: oldName, new: newName, line: lineNum });
      }
    }

    if (replacements.length > 0) {
      const relPath = relative(dir, filePath);
      results.push({ file: relPath, replacements });

      if (!dryRun) {
        await writeFile(filePath, modified, "utf-8");
      }
    }
  }

  return results;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findLineOfChange(lines: string[], searchStr: string): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr)) return i + 1;
  }
  return 0;
}
