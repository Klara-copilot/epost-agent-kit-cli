/**
 * Command: epost-kit init
 * Initialize epost-agent-kit in existing project
 * GitHub-only distribution - downloads packages from Klara-copilot/epost_agent_kit
 */

import { join, resolve, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readFile,
  writeFile,
  readdir,
  copyFile,
  mkdir,
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
import type { InitOptions } from "@/types/commands.js";
import type { FileOwnership } from "@/types/index.js";
import {
  getGitHubToken,
  checkRepoAccess,
  checkGhCliInstalled,
} from "@/domains/github/access-checker.js";
import {
  downloadLatestRelease,
  copyPackagesAndProfiles,
} from "@/domains/github/release-downloader.js";

/**
 * GitHub-only init flow
 * Always downloads packages from Klara-copilot/epost_agent_kit
 */

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

  // Use global packages directory from GitHub download
  const { homedir } = await import('node:os');
  const packagesDir = join(homedir(), '.epost-kit', 'packages');
  const profilesPath = join(homedir(), '.epost-kit', 'profiles', 'profiles.yaml');

  if (!(await dirExists(packagesDir))) {
    throw new Error(
      'Packages not found. Run "epost-kit init" first to download packages from GitHub.'
    );
  }

  logger.debug(`Using packages from: ${packagesDir}`);

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

// Legacy kit-based installation removed - now using GitHub-only distribution

// ─── Main Entry ───

export async function runInit(opts: InitOptions): Promise<void> {
  // Step 1: Check GitHub CLI installation
  const ghInstalled = await checkGhCliInstalled();
  if (!ghInstalled) {
    logger.error('GitHub CLI (gh) is not installed');
    console.log(pc.yellow('\nℹ  Install gh CLI:'));
    console.log('   → macOS: brew install gh');
    console.log('   → Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md');
    console.log('   → Windows: https://github.com/cli/cli#windows\n');
    return;
  }

  // Step 2: Check GitHub authentication
  const spinner = ora('Checking GitHub access...').start();
  const token = await getGitHubToken();

  if (!token) {
    spinner.fail('GitHub CLI not authenticated');
    console.log(pc.yellow('\nℹ  Run: gh auth login\n'));
    return;
  }

  // Step 3: Check repository access
  const { hasAccess, error } = await checkRepoAccess('Klara-copilot/epost_agent_kit');

  if (!hasAccess) {
    spinner.fail('No access to epost_agent_kit repository');
    console.log(pc.yellow('\nℹ  Repository: github.com/Klara-copilot/epost_agent_kit'));

    if (error?.includes('404')) {
      console.log('   → Check your email for GitHub invitation');
      console.log('   → Or contact the repository owner for access\n');
    } else if (error?.includes('401')) {
      console.log('   → Your token may have expired');
      console.log('   → Run: gh auth refresh\n');
    } else {
      console.log(`   → Error: ${error}\n`);
    }

    return;
  }

  spinner.succeed('Kit access verified');

  // Step 4: Download and extract release
  try {
    const extractedDir = await downloadLatestRelease(
      'Klara-copilot/epost_agent_kit',
      { forceDownload: opts.forceDownload }
    );

    // Step 5: Copy packages and profiles
    await copyPackagesAndProfiles(extractedDir);

    // Step 6: Continue with package installation
    return runPackageInit(opts);
  } catch (error) {
    logger.error(`Failed to download release: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log(pc.yellow('\nℹ  Troubleshooting:'));
    console.log('   → Check your internet connection');
    console.log('   → Verify repository access: gh repo view Klara-copilot/epost_agent_kit');
    console.log('   → Try again with --force-download flag\n');
    throw error;
  }
}
