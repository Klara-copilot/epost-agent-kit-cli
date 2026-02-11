/**
 * Command: epost-kit init
 * Initialize epost-agent-kit in existing project
 * Supports both legacy kit-based and new package-based installation
 */

import { join, resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readFile,
  writeFile,
  readdir,
  copyFile,
  mkdir,
  rm,
} from "node:fs/promises";
import { select, confirm, checkbox } from "@inquirer/prompts";
import ora from "ora";
import pc from "picocolors";
import { logger } from "@/shared/logger.js";
import { fileExists, dirExists, safeCopyDir } from "@/shared/file-system.js";
import { KitPathResolver } from "@/shared/path-resolver.js";
import {
  box,
  keyValue,
  packageTable,
  indent,
  PackageManifestSummary,
} from "@/domains/ui/index.js";
import {
  readMetadata,
  writeMetadata,
  generateMetadata,
} from "@/services/file-operations/ownership.js";
import { downloadKit, getKitFiles } from "@/domains/installation/template-manager.js";
import {
  classifyFiles,
  planMerge,
  executeMerge,
  previewMerge,
} from "@/domains/installation/smart-merge.js";
import { createBackup } from "@/services/file-operations/backup-manager.js";
import { hashFile } from "@/services/file-operations/checksum.js";
import {
  resolvePackages,
  loadAllManifests,
  loadProfiles,
} from "@/domains/packages/package-resolver.js";
import { mergeAndWriteSettings } from "@/domains/config/settings-merger.js";
import {
  generateClaudeMd,
  collectSnippets,
  type ClaudeMdContext,
} from "@/domains/help/claude-md-generator.js";
import { detectProjectProfile, listProfiles } from "@/domains/packages/profile-loader.js";
import { tmpdir } from "node:os";
import type { InitOptions } from "@/types/commands.js";
import type { FileOwnership } from "@/types/index.js";

/**
 * Determine if we should use package-based installation
 */
function usePackageMode(opts: InitOptions): boolean {
  return !!(opts.profile || opts.packages);
}

// Centralized kit path resolver
const kitPaths = new KitPathResolver(
  dirname(fileURLToPath(import.meta.url)),
);

// ─── Package-Based Installation ───

async function runPackageInit(opts: InitOptions): Promise<void> {
  // Support --dir to install into a different directory
  if (opts.dir) {
    const targetPath = resolve(opts.dir);
    if (!(await dirExists(targetPath))) {
      throw new Error(`Directory not found: ${targetPath}`);
    }
    process.chdir(targetPath);
  }

  const projectDir = resolve(process.cwd());
  const projectName = basename(projectDir);

  // ── Step 1/7: Find packages ──
  logger.step(1, 7, "Locating packages");
  const packagesDir = await kitPaths.getPackagesDir();
  logger.debug(`Using packages from: ${packagesDir}`);

  const profilesPath = await kitPaths.getProfilesPath();

  const metadata = await readMetadata(projectDir);
  const isUpdate = !!metadata && !opts.fresh;

  // Parse comma-separated options
  const packagesList = opts.packages
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const optionalList = opts.optional
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const excludeList = opts.exclude
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // ── Step 2/7: Detect profile ──
  let profileName = opts.profile;

  if (!profileName && !packagesList) {
    logger.step(2, 7, "Detecting project type");
    // Try auto-detect
    const profiles = await loadProfiles(profilesPath);
    const detected = await detectProjectProfile(projectDir, profiles);

    if (detected && !opts.yes) {
      const useDetected = await confirm({
        message: `Detected project type: ${detected.displayName} (${detected.confidence} confidence). Use this profile?`,
        default: true,
      });

      if (useDetected) {
        profileName = detected.profile;
      }
    } else if (detected && opts.yes) {
      profileName = detected.profile;
      logger.info(`Auto-detected profile: ${detected.displayName}`);
    }

    // If still no profile, let user choose
    if (!profileName && !packagesList && !opts.yes) {
      const allProfiles = listProfiles(profiles);
      profileName = await select({
        message: "Select a profile:",
        choices: allProfiles.map((p) => ({
          name: `${p.displayName} (${p.packages.length} packages)`,
          value: p.name,
        })),
      });
    }
  }

  // ── Step 3/7: Resolve packages ──
  logger.step(3, 7, "Resolving packages");
  const spinner = ora("Resolving packages...").start();
  const resolved = await resolvePackages({
    packagesDir,
    profilesPath,
    profile: profileName,
    packages: packagesList,
    includeOptional: optionalList,
    exclude: excludeList,
  });
  spinner.succeed(
    `Resolved ${resolved.packages.length} packages: ${resolved.packages.join(", ")}`,
  );

  // Show recommendations
  if (resolved.recommended.length > 0 && !opts.yes) {
    logger.info(`\nRecommended packages: ${resolved.recommended.join(", ")}`);
    const addRecommended = await confirm({
      message: "Include recommended packages?",
      default: false,
    });
    if (addRecommended) {
      // Re-resolve with recommendations
      const reResolved = await resolvePackages({
        packagesDir,
        profilesPath,
        profile: profileName,
        packages: [...resolved.packages, ...resolved.recommended],
        includeOptional: optionalList,
        exclude: excludeList,
      });
      resolved.packages.length = 0;
      resolved.packages.push(...reResolved.packages);
    }
  }

  // ── Step 4/7: Select options ──
  logger.step(4, 7, "Selecting options");
  if (resolved.optional.length > 0 && !opts.yes) {
    const selectedOptional = await checkbox({
      message: "Select optional packages to include:",
      choices: resolved.optional.map((name) => ({
        name,
        value: name,
      })),
    });

    if (selectedOptional.length > 0) {
      const reResolved = await resolvePackages({
        packagesDir,
        profilesPath,
        profile: profileName,
        packages: [...resolved.packages, ...selectedOptional],
        exclude: excludeList,
      });
      resolved.packages.length = 0;
      resolved.packages.push(...reResolved.packages);
    }
  }

  // Select IDE target
  let target: "claude" | "cursor" | "github-copilot" =
    metadata?.target || "claude";
  if (!metadata && !opts.yes) {
    target = await select({
      message: "Select IDE target:",
      choices: [
        { name: "Claude Code", value: "claude" as const },
        { name: "Cursor", value: "cursor" as const },
        { name: "GitHub Copilot", value: "github-copilot" as const },
      ],
      default: "claude" as const,
    });
  }

  // Determine install directory based on target
  const installDirName =
    target === "claude"
      ? ".claude"
      : target === "cursor"
        ? ".cursor"
        : ".github";
  const installDir = join(projectDir, installDirName);

  // Load manifests for install
  const manifests = await loadAllManifests(packagesDir);

  // Build summary for display
  const pkgSummaries: PackageManifestSummary[] = resolved.packages
    .map((name) => {
      const m = manifests.get(name);
      return m
        ? {
            name,
            layer: m.layer,
            agents: m.provides.agents.length,
            skills: m.provides.skills.length,
            commands: m.provides.commands.length,
          }
        : null;
    })
    .filter((s): s is PackageManifestSummary => s !== null);

  // Dry-run preview
  if (opts.dryRun) {
    const summaryContent = [
      `Profile: ${profileName || "(explicit packages)"}`,
      `Target:  ${target} (${installDirName}/)`,
      `Packages: ${resolved.packages.length}`,
    ].join("\n");
    console.log(box(summaryContent, { title: "Dry Run Preview" }));

    console.log(indent(packageTable(pkgSummaries), 2));
    console.log("\n  No changes made (dry-run mode).\n");
    return;
  }

  // Confirm
  if (!opts.yes) {
    logger.info(
      `\nWill install ${resolved.packages.length} packages into ${installDirName}/`,
    );
    const proceed = await confirm({ message: "Proceed?", default: true });
    if (!proceed) {
      logger.info("Cancelled");
      return;
    }
  }

  // ── Step 5/7: Backup (if updating) ──
  if (isUpdate) {
    logger.step(5, 7, "Creating backup");
    const backupSpinner = ora("Creating backup...").start();
    await createBackup(projectDir, "pre-update");
    backupSpinner.succeed("Backup created");
  }

  // ── Step 5/7: Install packages ──
  logger.step(5, 7, "Installing packages");
  const installSpinner = ora("Installing packages...").start();
  await mkdir(installDir, { recursive: true });

  const allFiles: Record<string, FileOwnership> = {};
  let totalAgents = 0,
    totalSkills = 0,
    totalCommands = 0;
  const settingsPackages: Array<{
    name: string;
    dir: string;
    strategy: "base" | "merge" | "skip";
  }> = [];
  const snippetPackages: Array<{
    name: string;
    dir: string;
    layer: number;
    snippetFile?: string;
  }> = [];

  for (const pkgName of resolved.packages) {
    const manifest = manifests.get(pkgName);
    if (!manifest) {
      logger.warn(`Package "${pkgName}" manifest not found, skipping`);
      continue;
    }

    const pkgDir = join(packagesDir, pkgName);

    // Copy files according to manifest's files mapping
    for (const [srcSubDir, destSubDir] of Object.entries(manifest.files)) {
      const srcPath = join(pkgDir, srcSubDir);
      const destPath = join(installDir, destSubDir);

      // Handle single file mapping (e.g., "settings.json: settings.json")
      if (!srcSubDir.endsWith("/")) {
        if (await fileExists(srcPath)) {
          // Settings files handled separately
          if (srcSubDir === "settings.json") continue;
          await mkdir(join(destPath, ".."), { recursive: true });
          await copyFile(srcPath, destPath);

          // Track file
          const relativePath = join(installDirName, destSubDir);
          const checksum = await hashFile(destPath);
          allFiles[relativePath] = {
            path: relativePath,
            checksum,
            installedAt: new Date().toISOString(),
            version: manifest.version,
            modified: false,
            package: pkgName,
          };
        }
        continue;
      }

      // Directory copy
      if (await dirExists(srcPath)) {
        // Snapshot existing files before copy to avoid overwriting prior package attribution
        const existingFiles = (await dirExists(destPath))
          ? new Set(await scanDirFiles(destPath))
          : new Set<string>();

        await safeCopyDir(srcPath, destPath);

        // Track only NEW files from this package (not files from prior packages)
        const allFilesNow = await scanDirFiles(destPath);
        for (const file of allFilesNow) {
          if (existingFiles.has(file)) continue;
          const relativePath = join(installDirName, destSubDir, file);
          const fullPath = join(destPath, file);
          const checksum = await hashFile(fullPath);
          allFiles[relativePath] = {
            path: relativePath,
            checksum,
            installedAt: new Date().toISOString(),
            version: manifest.version,
            modified: false,
            package: pkgName,
          };
        }
      }
    }

    // Track settings for merge
    settingsPackages.push({
      name: pkgName,
      dir: pkgDir,
      strategy: manifest.settings_strategy,
    });

    // Track snippets
    if (manifest.claude_snippet) {
      snippetPackages.push({
        name: pkgName,
        dir: pkgDir,
        layer: manifest.layer,
        snippetFile: manifest.claude_snippet,
      });
    }

    // Count provides
    totalAgents += manifest.provides.agents.length;
    totalSkills += manifest.provides.skills.length;
    totalCommands += manifest.provides.commands.length;
  }

  // Recount from actual installed files for accuracy
  const agentsDir = join(installDir, "agents");
  const commandsDir = join(installDir, "commands");
  if (await dirExists(agentsDir)) {
    const agentFiles = (await scanDirFiles(agentsDir)).filter((f) =>
      f.endsWith(".md"),
    );
    totalAgents = agentFiles.length;
  }
  if (await dirExists(commandsDir)) {
    const commandFiles = (await scanDirFiles(commandsDir)).filter((f) =>
      f.endsWith(".md"),
    );
    totalCommands = commandFiles.length;
  }

  installSpinner.succeed(`Installed ${resolved.packages.length} packages`);

  // Show per-package details
  for (const pkgName of resolved.packages) {
    const m = manifests.get(pkgName);
    if (m) {
      const parts: string[] = [];
      if (m.provides.agents.length > 0)
        parts.push(
          `${m.provides.agents.length} agent${m.provides.agents.length !== 1 ? "s" : ""}`,
        );
      if (m.provides.skills.length > 0)
        parts.push(
          `${m.provides.skills.length} skill${m.provides.skills.length !== 1 ? "s" : ""}`,
        );
      const detail = parts.length > 0 ? parts.join(", ") : "config";
      const dots = ".".repeat(Math.max(1, 22 - pkgName.length));
      console.log(`    ${pc.green("✓")} ${pkgName} ${pc.dim(dots)} ${detail}`);
    }
  }

  // ── Step 6/7: Generate configuration ──
  logger.step(6, 7, "Generating configuration");
  const skillIndexSpinner = ora("Generating skill index...").start();
  const skillsDir = join(installDir, "skills");
  if (await dirExists(skillsDir)) {
    const skillIndex = await generateSkillIndex(skillsDir);
    const skillIndexPath = join(skillsDir, "skill-index.json");
    await writeFile(
      skillIndexPath,
      JSON.stringify(skillIndex, null, 2),
      "utf-8",
    );
    // Track the generated file
    const skillIndexRelPath = join(
      installDirName,
      "skills",
      "skill-index.json",
    );
    const skillIndexChecksum = await hashFile(skillIndexPath);
    allFiles[skillIndexRelPath] = {
      path: skillIndexRelPath,
      checksum: skillIndexChecksum,
      installedAt: new Date().toISOString(),
      version: "1.0.0",
      modified: false,
      package: "core",
    };
    totalSkills = skillIndex.count;
    skillIndexSpinner.succeed(
      `Skill index generated: ${skillIndex.count} skills`,
    );
  } else {
    skillIndexSpinner.warn("No skills directory found");
  }

  // Merge settings
  const settingsSpinner = ora("Merging settings...").start();
  const settingsOutput = join(installDir, "settings.json");
  const { sources: settingsSources } = await mergeAndWriteSettings(
    settingsPackages,
    settingsOutput,
  );
  settingsSpinner.succeed(
    `Settings merged from ${settingsSources.length} packages`,
  );

  // Generate CLAUDE.md
  const claudeSpinner = ora("Generating CLAUDE.md...").start();
  const snippets = await collectSnippets(snippetPackages);
  const templatesDir = await kitPaths.getTemplatesDir();
  const templatePath = templatesDir
    ? join(templatesDir, "repo-claude.md.hbs")
    : "";

  const platforms = new Set<string>();
  for (const pkgName of resolved.packages) {
    const manifest = manifests.get(pkgName);
    if (manifest) {
      for (const p of manifest.platforms) platforms.add(p);
    }
  }

  const claudeContext: ClaudeMdContext = {
    profile: profileName,
    packages: resolved.packages,
    target,
    kitVersion: "1.0.0",
    cliVersion: "0.1.0",
    installedAt: new Date().toISOString().split("T")[0],
    projectName,
    platforms: [...platforms],
    agentCount: totalAgents,
    skillCount: totalSkills,
    commandCount: totalCommands,
  };

  const claudeMdPath = join(projectDir, "CLAUDE.md");
  await generateClaudeMd(templatePath, claudeContext, snippets, claudeMdPath);
  claudeSpinner.succeed("CLAUDE.md generated");

  // ── Step 7/7: Finalize ──
  logger.step(7, 7, "Finalizing");
  const metaSpinner = ora("Updating metadata...").start();
  const newMetadata = generateMetadata("0.1.0", target, "1.0.0", allFiles, {
    profile: profileName,
    installedPackages: resolved.packages,
  });
  await writeMetadata(projectDir, newMetadata);
  metaSpinner.succeed("Metadata updated");

  // Success summary
  console.log("\n");
  const summaryPairs: Array<[string, string]> = [];
  if (profileName) summaryPairs.push(["Profile", profileName]);
  summaryPairs.push([
    "Target",
    `${target === "claude" ? "Claude Code" : target === "cursor" ? "Cursor" : "GitHub Copilot"} (${installDirName}/)`,
  ]);
  summaryPairs.push(["Packages", `${resolved.packages.length}`]);
  summaryPairs.push(["Agents", `${totalAgents}`]);
  summaryPairs.push(["Skills", `${totalSkills}`]);
  summaryPairs.push(["Commands", `${totalCommands}`]);
  console.log(
    box(keyValue(summaryPairs, { indent: 0 }), {
      title: "Installation Complete",
    }),
  );

  console.log(
    box(
      `Run ${pc.bold("claude")} to activate your AI assistant.\nType ${pc.bold("/")} to discover all available commands.`,
      { title: "Ready" },
    ),
  );
}

// ─── Utility: scan directory for relative file paths ───

async function scanDirFiles(dir: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = prefix ? join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) {
        files.push(
          ...(await scanDirFiles(join(dir, entry.name), relativePath)),
        );
      } else {
        files.push(relativePath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return files;
}

// ─── Utility: generate skill-index.json from installed SKILL.md files ───

interface SkillIndexEntry {
  name: string;
  description: string;
  keywords: string[];
  platforms: string[];
  triggers: string[];
  "agent-affinity": string[];
  path: string;
}

async function generateSkillIndex(skillsDir: string): Promise<{
  generated: string;
  version: string;
  count: number;
  skills: SkillIndexEntry[];
}> {
  const skillFiles = await findSkillFiles(skillsDir);
  const skills: SkillIndexEntry[] = [];

  for (const filePath of skillFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      const metadata = extractSkillFrontmatter(content);
      if (!metadata || !metadata.name) continue;

      const relativePath = filePath.substring(skillsDir.length + 1); // strip skillsDir prefix + /
      const asStr = (v: string | string[] | undefined, fallback: string) =>
        typeof v === "string" ? v : fallback;
      const asArr = (v: string | string[] | undefined, fallback: string[]) =>
        Array.isArray(v) ? v : fallback;
      skills.push({
        name: asStr(metadata.name, ""),
        description: asStr(metadata.description, ""),
        keywords: asArr(metadata.keywords, []),
        platforms: asArr(metadata.platforms, ["all"]),
        triggers: asArr(metadata.triggers, []),
        "agent-affinity": asArr(metadata["agent-affinity"], []),
        path: relativePath,
      });
    } catch {
      // Skip files that can't be read
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));

  return {
    generated: new Date().toISOString(),
    version: "1.0.0",
    count: skills.length,
    skills,
  };
}

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

function extractSkillFrontmatter(
  content: string,
): Record<string, string | string[]> | null {
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

    // Remove quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.substring(1, value.length - 1);
    }

    // Inline array [a, b, c]
    if (value.startsWith("[") && value.endsWith("]")) {
      const items = value
        .substring(1, value.length - 1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter((item) => item);
      metadata[key] = items;
    } else if (value) {
      metadata[key] = value;
    } else {
      currentKey = key;
    }
  }

  return metadata;
}

// ─── Legacy Kit-Based Installation ───

async function runKitInit(opts: InitOptions): Promise<void> {
  const projectDir = resolve(process.cwd());

  // Step 1: Validate project directory
  const hasPackageJson = await fileExists(join(projectDir, "package.json"));
  const hasGit = await dirExists(join(projectDir, ".git"));

  if (!hasPackageJson && !hasGit) {
    throw new Error("No project detected (missing package.json or .git)");
  }

  // Step 2: Check for existing installation
  let metadata = await readMetadata(projectDir);

  // Step 3: Check for ClaudeKit migration
  const claudekitMetadata = join(projectDir, ".claude", "metadata.json");
  if (!metadata && (await fileExists(claudekitMetadata))) {
    logger.info("ClaudeKit installation detected");

    try {
      const content = await readFile(claudekitMetadata, "utf-8");
      const ckMeta = JSON.parse(content);

      if (ckMeta.name === "claudekit-engineer") {
        logger.info("ClaudeKit Engineer kit detected - migration available");

        let migrationTarget: "claude" | "cursor" | "github-copilot" = "claude";
        if (!opts.yes) {
          migrationTarget = await select({
            message: "Select epost-agent-kit target for migration:",
            choices: [
              { name: "Claude Code", value: "claude" as const },
              {
                name: "Cursor (not yet supported)",
                value: "cursor" as const,
                disabled: true,
              },
              {
                name: "GitHub Copilot (not yet supported)",
                value: "github-copilot" as const,
                disabled: true,
              },
            ],
            default: "claude" as const,
          });
        }

        logger.info(`Migration target: ${migrationTarget}`);
        metadata = null;
      }
    } catch (error) {
      logger.debug(`Failed to read ClaudeKit metadata: ${error}`);
    }
  }

  // Step 4: Determine installation mode
  const isUpdate = !!metadata;
  const isFresh = opts.fresh || !metadata;

  if (isUpdate && !isFresh) {
    logger.info("Updating existing installation");
  } else {
    logger.info("Fresh installation");
  }

  // Step 5: Select target
  let target: "claude" | "cursor" | "github-copilot" =
    metadata?.target || "claude";
  if (!metadata && !opts.yes) {
    target = await select({
      message: "Select IDE target:",
      choices: [
        { name: "Claude Code", value: "claude" as const },
        { name: "Cursor", value: "cursor" as const },
        { name: "GitHub Copilot", value: "github-copilot" as const },
      ],
      default: "claude" as const,
    });
  }

  // Step 6: Download kit
  const spinner = ora("Downloading kit template...").start();
  const tempDir = join(tmpdir(), `epost-kit-${Date.now()}`);

  try {
    await mkdir(tempDir, { recursive: true });
    await downloadKit(opts.kit || "engineer", "latest", tempDir);
    spinner.succeed("Kit downloaded");
  } catch (error) {
    spinner.fail("Download failed");
    await rm(tempDir, { recursive: true, force: true });
    throw error;
  }

  try {
    // Step 7: Classify files
    spinner.start("Analyzing project files...");
    const kitFiles = await getKitFiles(tempDir);
    const classification = await classifyFiles(projectDir, kitFiles, metadata);
    const plan = planMerge(classification);
    spinner.succeed("Analysis complete");

    // Step 8: Dry-run preview
    if (opts.dryRun) {
      logger.info("\n" + previewMerge(plan));
      logger.info("\nDry-run mode - no changes made");
      await rm(tempDir, { recursive: true, force: true });
      return;
    }

    // Step 9: Show merge plan
    logger.info("\n" + previewMerge(plan));

    // Step 10: Handle conflicts
    const conflictResolutions = new Map<string, "keep" | "overwrite">();
    if (plan.summary.conflict > 0 && !opts.yes) {
      logger.info("\nConflicts detected - requires manual resolution:");

      for (const [file, action] of plan.actions) {
        if (action === "conflict") {
          const resolution = await select({
            message: `Resolve conflict: ${file}`,
            choices: [
              {
                name: "Keep current version (skip update)",
                value: "keep" as const,
              },
              {
                name: "Use new version (overwrite)",
                value: "overwrite" as const,
              },
            ],
          });
          conflictResolutions.set(file, resolution as "keep" | "overwrite");
        }
      }
    } else if (plan.summary.conflict > 0 && opts.yes) {
      for (const [file, action] of plan.actions) {
        if (action === "conflict") {
          conflictResolutions.set(file, "keep");
        }
      }
      logger.info("Auto-resolved conflicts (keeping user modifications)");
    }

    // Step 11: Confirm
    if (!opts.yes) {
      const proceed = await confirm({
        message: "Apply changes?",
        default: true,
      });
      if (!proceed) {
        logger.info("Cancelled");
        await rm(tempDir, { recursive: true, force: true });
        return;
      }
    }

    // Step 12: Backup
    if (metadata) {
      spinner.start("Creating backup...");
      await createBackup(projectDir, "pre-update");
      spinner.succeed("Backup created");
    }

    // Step 13: Execute merge
    spinner.start("Applying changes...");
    await executeMerge(plan, tempDir, projectDir, {
      resolveConflicts: conflictResolutions,
    });
    spinner.succeed("Changes applied");

    // Step 14: Update metadata
    spinner.start("Updating metadata...");
    const files: Record<string, FileOwnership> = {};

    for (const relativePath of kitFiles) {
      const fullPath = join(projectDir, relativePath);
      if (await fileExists(fullPath)) {
        const checksum = await hashFile(fullPath);
        files[relativePath] = {
          path: relativePath,
          checksum,
          installedAt:
            metadata?.files[relativePath]?.installedAt ||
            new Date().toISOString(),
          version: "latest",
          modified: false,
        };
      }
    }

    const newMetadata = generateMetadata("0.1.0", target, "latest", files);
    await writeMetadata(projectDir, newMetadata);
    spinner.succeed("Metadata updated");

    // Step 15: Success
    logger.info("\n✓ Installation complete!");
    logger.info(`\nSummary:`);
    logger.info(`  Created: ${plan.summary.create} file(s)`);
    logger.info(`  Updated: ${plan.summary.overwrite} file(s)`);
    logger.info(`  Skipped: ${plan.summary.skip} file(s)`);
    if (plan.summary.conflict > 0) {
      logger.info(`  Conflicts: ${plan.summary.conflict} file(s)`);
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

// ─── Main Entry ───

export async function runInit(opts: InitOptions): Promise<void> {
  if (usePackageMode(opts)) {
    return runPackageInit(opts);
  }

  // Try package-based if packages/ dir exists and no explicit --kit
  if (!opts.kit) {
    try {
      await kitPaths.getPackagesDir();
      logger.debug(
        "Packages directory found, using package-based installation",
      );
      return runPackageInit(opts);
    } catch {
      // No packages dir found, continue with kit-based installation
    }
  }

  return runKitInit(opts);
}
