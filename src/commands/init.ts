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
  rm,
} from "node:fs/promises";
import { select, confirm, checkbox, Separator } from "@inquirer/prompts";
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
import { mergeAndWriteKitConfig } from "@/domains/config/kit-config-merger.js";
import { mergeAndWriteIgnore } from "@/domains/config/ignore-merger.js";
import {
  generateClaudeMd,
  collectSnippets,
  type ClaudeMdContext,
  type PackageSnippet,
} from "@/domains/help/claude-md-generator.js";
import { generateMdcFile } from "@/domains/installation/mdc-generator.js";
import { detectProjectProfile, listProfiles, getProfileInfo } from "@/domains/packages/profile-loader.js";
import { VERSION } from "@/domains/help/branding.js";
import {
  createTargetAdapter,
  type TargetAdapter,
  type TargetName,
} from "@/domains/installation/target-adapter.js";
import { formatCompatibilityReport } from "@/domains/installation/compatibility-report.js";
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
 *
 * With --source flag: uses local source repo for package resolution (dev mode)
 */

// Centralized kit path resolver
const kitPaths = new KitPathResolver(
  dirname(fileURLToPath(import.meta.url)),
);

/**
 * Get packages directory based on mode
 * - source mode: use KitPathResolver (local source repo)
 * - default: use GitHub cache (~/.epost-kit/packages)
 */
async function getPackagesDir(source?: string | boolean): Promise<string> {
  if (source) {
    if (typeof source === "string") {
      process.env.EPOST_KIT_ROOT = resolve(source);
      kitPaths.clearCache();
    }
    const packagesDir = await kitPaths.getPackagesDir();
    if (!packagesDir) {
      throw new Error(
        "Source mode requires local kit repo. Ensure epost-agent-kit is available."
      );
    }
    return packagesDir;
  }
  // Default: GitHub cache
  const { homedir } = await import("node:os");
  return join(homedir(), ".epost-kit", "packages");
}

/**
 * Get profiles path based on mode
 */
async function getProfilesPath(source?: string | boolean): Promise<string> {
  if (source) {
    const profilesPath = await kitPaths.getProfilesPath();
    if (!profilesPath) {
      throw new Error(
        "Source mode requires local kit repo. Ensure epost-agent-kit is available."
      );
    }
    return profilesPath;
  }
  // Default: GitHub cache
  const { homedir } = await import("node:os");
  return join(homedir(), ".epost-kit", "profiles", "profiles.yaml");
}

// ─── Package-Based Installation ───

/** Fallback descriptions for profiles that don't define a description field in profiles.yaml */
const PROFILE_DESCRIPTIONS: Record<string, string> = {
  "web-fullstack":   "Next.js web app + backend API + B2B domain modules",
  "web-ui-lib":      "Next.js web app + component library + design tokens",
  "ios-b2c":         "Swift/SwiftUI iOS app for consumer-facing features",
  "ios-ui-lib":      "Swift/SwiftUI iOS app + component library + design tokens",
  "android-b2c":     "Kotlin/Jetpack Compose Android consumer app",
  "android-ui-lib":  "Kotlin/Jetpack Compose Android app + component library",
  "mobile-b2c":      "iOS + Android consumer apps in one profile",
  "backend-api":     "Java EE backend — WildFly, JAX-RS, PostgreSQL, MongoDB",
  "cloud-architect": "Infrastructure + backend — Terraform, Cloud Build, GCP",
  "kit-designer":    "Author and maintain agents, skills, and commands",
  "full":            "Every platform — web, iOS, Android, backend, and kit tools",
};

async function runPackageInit(opts: InitOptions): Promise<void> {
  // Support --dir to install into a different directory
  if (opts.dir) {
    const targetPath = resolve(opts.dir);
    if (!(await dirExists(targetPath))) {
      throw new Error(`Directory not found: ${targetPath}`);
    }
    process.chdir(targetPath);
  }

  let projectDir = resolve(process.cwd());
  const projectName = basename(projectDir);

  // ── Step 1/7: Find packages ──
  logger.step(1, 7, "Locating packages");

  // Use source mode or GitHub cache based on opts.source
  const packagesDir = await getPackagesDir(opts.source);
  const profilesPath = await getProfilesPath(opts.source);

  if (!(await dirExists(packagesDir))) {
    if (opts.source) {
      throw new Error(
        "Source packages not found. Ensure epost-agent-kit is available locally."
      );
    }
    throw new Error(
      'Packages not found. Run "epost-kit init" first to download packages from GitHub.'
    );
  }

  logger.debug(`Using packages from: ${packagesDir}`);

  // ── Scope selection: project-local vs user-global ──
  let installScope: "project" | "user" = "project";
  if (!opts.yes && !opts.dir) {
    const { homedir: getHomedir } = await import("node:os");
    const scopeChoice = await select({
      message: "Where should the agent kit be installed?",
      choices: [
        {
          name: `This project  →  committed with your repo, only active here`,
          value: "project",
        },
        {
          name: `My user account  →  ~/.claude/  available in every project you open`,
          value: "user",
        },
      ],
      default: "project",
    });
    if (scopeChoice === "user") {
      installScope = "user";
      projectDir = getHomedir();
    }
  }

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

  // ── Step 2/7: Select profiles ──
  let profileName = opts.profile;
  let mergedProfilePackages: string[] | undefined;

  // Handle combined profiles stored as "profile-a+profile-b" (from multi-profile selection)
  if (profileName && profileName.includes("+") && profileName !== "(custom)") {
    const profilesForMerge = await loadProfiles(profilesPath);
    const parts = profileName.split("+");
    const pkgSet = new Set<string>();
    for (const pName of parts) {
      const pInfo = getProfileInfo(pName, profilesForMerge);
      if (pInfo) pInfo.packages.forEach((pkg) => pkgSet.add(pkg));
    }
    mergedProfilePackages = [...pkgSet];
    logger.debug(`Expanded combined profile "${profileName}" → ${mergedProfilePackages.join(", ")}`);
  }

  if (!profileName && !packagesList) {
    logger.step(2, 7, "Selecting profile");
    const profiles = await loadProfiles(profilesPath);

    if (opts.yes) {
      // CI mode: auto-detect and use detected profile (skip for user scope — no project to detect)
      const detected = installScope === "project"
        ? await detectProjectProfile(projectDir, profiles)
        : null;
      if (detected) {
        profileName = detected.profile;
        logger.info(`Auto-detected profile: ${detected.displayName}`);
      }
    } else {
      // Interactive: checkbox with descriptions, auto-detected profile pre-checked
      const detected = installScope === "project"
        ? await detectProjectProfile(projectDir, profiles)
        : null;
      const allProfiles = listProfiles(profiles);

      if (detected) {
        logger.info(`Looks like a ${detected.displayName} project — pre-selected below.`);
      }

      const CUSTOM = "__custom__";
      const selectedProfiles = await checkbox({
        message: "Which best describes this project?  (space to toggle, enter to confirm)",
        pageSize: 12,
        choices: [
          ...allProfiles.map((p) => {
            const desc = p.description || PROFILE_DESCRIPTIONS[p.name] || "";
            const label = desc
              ? `${p.displayName.padEnd(26)} ${pc.dim(desc)}`
              : p.displayName;
            return {
              name: label,
              value: p.name,
              checked: detected ? p.name === detected.profile : false,
            };
          }),
          new Separator(),
          {
            name: `Custom  ${pc.dim("→ let me pick packages manually")}`,
            value: CUSTOM,
          },
        ],
      });

      if (selectedProfiles.length === 0) {
        logger.info("No profiles selected. Cancelled.");
        return;
      } else if (selectedProfiles.includes(CUSTOM)) {
        // Custom: show all available packages for manual selection
        const allPkgManifests = await loadAllManifests(packagesDir);
        const allPkgNames = [...allPkgManifests.keys()].sort();
        const selectedPkgs = await checkbox({
          message: "Select packages to install:",
          pageSize: 12,
          choices: allPkgNames.map((name) => {
            const m = allPkgManifests.get(name);
            const desc = m?.description || "";
            const label = desc ? `${name.padEnd(24)} ${pc.dim(desc)}` : name;
            return { name: label, value: name };
          }),
        });
        if (selectedPkgs.length === 0) {
          logger.info("No packages selected. Cancelled.");
          return;
        }
        mergedProfilePackages = selectedPkgs;
        profileName = "(custom)";
      } else if (selectedProfiles.length === 1) {
        profileName = selectedProfiles[0];
      } else {
        // Merge packages from all selected profiles with deduplication
        const pkgSet = new Set<string>();
        for (const pName of selectedProfiles) {
          const pInfo = getProfileInfo(pName, profiles);
          if (pInfo) pInfo.packages.forEach((pkg) => pkgSet.add(pkg));
        }
        mergedProfilePackages = [...pkgSet];
        profileName = selectedProfiles.join("+");
        logger.info(`Merged ${selectedProfiles.length} profiles: ${profileName}`);
      }
    }
  }

  // ── Step 3/7: Resolve packages ──
  logger.step(3, 7, "Resolving packages");
  const spinner = ora("Resolving packages...").start();
  const resolved = await resolvePackages({
    packagesDir,
    profilesPath,
    profile: mergedProfilePackages ? undefined : profileName,
    packages: mergedProfilePackages ?? packagesList,
    includeOptional: optionalList,
    exclude: excludeList,
  });
  spinner.succeed(
    `Resolved ${resolved.packages.length} packages: ${resolved.packages.join(", ")}`,
  );

  // ── Step 4/7: Add-ons ──
  // Merge recommended (pre-checked) + optional (unchecked) into one unified step
  const recommendedSet = new Set(resolved.recommended);
  const allAddons = [
    ...resolved.recommended,
    ...resolved.optional.filter((n) => !recommendedSet.has(n)),
  ];

  if (allAddons.length > 0 && !opts.yes) {
    logger.step(4, 7, "Add-ons");
    // Load manifests for descriptions (reads local YAML cache)
    const addonManifests = await loadAllManifests(packagesDir);
    const selectedAddons = await checkbox({
      message: "Add optional packages?  (pre-checked = recommended for your profile)",
      pageSize: 8,
      choices: allAddons.map((name) => {
        const manifest = addonManifests.get(name);
        const desc = manifest?.description || "";
        const label = desc ? `${name.padEnd(24)} ${pc.dim(desc)}` : name;
        return { name: label, value: name, checked: recommendedSet.has(name) };
      }),
    });

    if (selectedAddons.length > 0) {
      const reResolved = await resolvePackages({
        packagesDir,
        profilesPath,
        profile: mergedProfilePackages ? undefined : profileName,
        packages: mergedProfilePackages
          ? [...mergedProfilePackages, ...selectedAddons]
          : [...resolved.packages, ...selectedAddons],
        exclude: excludeList,
      });
      resolved.packages.length = 0;
      resolved.packages.push(...reResolved.packages);
    }
  } else {
    logger.step(4, 7, "Add-ons");
  }

  // ── Select IDE/editor ──
  const validTargets: TargetName[] = ["claude", "cursor", "vscode"];
  let target: TargetName =
    (opts.target as TargetName) ||
    (metadata?.target as TargetName) ||
    "claude";

  if (opts.target && !validTargets.includes(opts.target as TargetName)) {
    throw new Error(
      `Invalid target "${opts.target}". Valid: ${validTargets.join(", ")}`,
    );
  }

  if (!opts.target && !opts.yes) {
    logger.step(5, 7, "Selecting editor");
    target = await select({
      message: "Which editor are you using?",
      choices: [
        { name: `Claude Code            → .claude/`, value: "claude" as const },
        { name: `Cursor                 → .cursor/`, value: "cursor" as const },
        { name: `VS Code (Copilot)      → .github/`, value: "vscode" as const },
      ],
      default: target,
    });
    // Warn: user-scope + VS Code writes to ~/.github/ which is unusual
    if (installScope === "user" && target === "vscode") {
      logger.warn("User-scope install with VS Code writes to ~/.github/ — consider project scope instead.");
    }
  }

  // Create adapter — drives install dir, file transforms, and hook format
  const adapter = await createTargetAdapter(target);
  const installDirName = adapter.installDir;
  const installDir = join(projectDir, installDirName);

  // Phase 5 — dual-target detection: warn when VS Code install coexists with .claude/
  // VS Code Copilot natively reads .claude/agents/ AND .github/agents/ simultaneously.
  // This means agents installed here will appear twice in VS Code's agent picker.
  if (target === "vscode" && await dirExists(join(projectDir, ".claude", "agents"))) {
    logger.warn(
      "Dual-target detected: .claude/agents/ already exists.\n" +
      "  VS Code Copilot reads BOTH .claude/agents/ and .github/agents/ natively.\n" +
      "  Agents installed to .github/ will appear alongside .claude/ agents in VS Code.\n" +
      "  This is expected if you use both Claude Code and VS Code Copilot.",
    );
  }

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

  // Preview + confirm
  if (!opts.yes) {
    const scopeLabel = installScope === "user"
      ? `~/${installDirName}/  (global)`
      : `${projectName}/${installDirName}/`;
    const allAgents   = pkgSummaries.flatMap((s) => manifests.get(s.name)?.provides.agents   ?? []);
    const allSkills   = pkgSummaries.flatMap((s) => manifests.get(s.name)?.provides.skills   ?? []);
    const allCommands = pkgSummaries.flatMap((s) => manifests.get(s.name)?.provides.commands ?? []);
    const truncate = (arr: string[], max = 4) =>
      arr.length <= max ? arr.join(", ") : `${arr.slice(0, max).join(", ")}  (+${arr.length - max} more)`;

    const previewContent = [
      keyValue([
        ["Profile", profileName || "(custom)"],
        ["Target ", `${target === "claude" ? "Claude Code" : target === "cursor" ? "Cursor" : "VS Code"}  →  ${scopeLabel}`],
      ], { indent: 0 }),
      "",
      "You'll get",
      ...(allAgents.length   ? [`  ${pc.cyan("agents   ")}  ${truncate(allAgents)}`]   : []),
      ...(allSkills.length   ? [`  ${pc.cyan("skills   ")}  ${truncate(allSkills, 5)}`] : []),
      ...(allCommands.length ? [`  ${pc.cyan("commands ")}  ${truncate(allCommands)}`] : []),
    ].join("\n");

    console.log("\n" + box(previewContent, { title: "Ready to install" }));
    const proceed = await confirm({ message: "Install now?", default: true });
    if (!proceed) {
      logger.info("Cancelled");
      return;
    }
  }

  // ── Step 5/7: Backup then clean-wipe install dir ──
  logger.step(5, 7, "Installing packages");
  if (isUpdate) {
    const backupSpinner = ora("Creating backup...").start();
    await createBackup(projectDir, "pre-update", { subdirectory: installDirName });
    backupSpinner.succeed("Backup created");
  }

  // Always wipe install dir for a clean, deterministic install
  if (await dirExists(installDir)) {
    await rm(installDir, { recursive: true, force: true });
  }

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
  const kitConfigPackages: Array<{ name: string; dir: string }> = [];
  const ignorePackages: Array<{ name: string; dir: string }> = [];
  const snippetPackages: Array<{
    name: string;
    dir: string;
    layer: number;
    snippetFile?: string;
  }> = [];
  const copilotSnippetPackages: Array<{
    name: string;
    dir: string;
    layer: number;
    snippetFile?: string;
  }> = [];
  const cursorSnippetPackages: Array<{
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
          // Config files handled separately (merged after package loop)
          if (srcSubDir === "settings.json") continue;
          if (srcSubDir === ".epost-kit.json") continue;
          if (srcSubDir === ".epost-ignore") continue;
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

      // Directory copy — apply adapter transforms for agents/skills, path-fix for hooks
      if (await dirExists(srcPath)) {
        const isAgentDir = destSubDir.startsWith("agents");
        const isSkillDir = destSubDir.startsWith("skills");
        const isHookDir = destSubDir.startsWith("hooks");

        // Hook scripts go to adapter's hookScriptDir (may differ for vscode)
        const actualDestSubDir = isHookDir ? adapter.hookScriptDir() : destSubDir;
        const actualDestPath = join(installDir, actualDestSubDir);

        const existingFiles = (await dirExists(actualDestPath))
          ? new Set(await scanDirFiles(actualDestPath))
          : new Set<string>();

        await mkdir(actualDestPath, { recursive: true });

        if (isAgentDir || isSkillDir) {
          await transformAndCopyDir(
            srcPath,
            actualDestPath,
            adapter,
            isAgentDir ? "agent" : "skill",
          );
        } else {
          await safeCopyDir(srcPath, actualDestPath);
          if (isHookDir) {
            // Replace .claude/ references in hook scripts for non-claude targets
            await replacePathsInDir(actualDestPath, adapter);
          }
        }

        // Track only NEW files from this package
        const allFilesNow = await scanDirFiles(actualDestPath);
        for (const file of allFilesNow) {
          if (existingFiles.has(file)) continue;
          const relativePath = join(installDirName, actualDestSubDir, file);
          const fullPath = join(actualDestPath, file);
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

    // Track kit config files for merge
    kitConfigPackages.push({ name: pkgName, dir: pkgDir });
    ignorePackages.push({ name: pkgName, dir: pkgDir });

    // Track snippets (separate for Claude vs Copilot)
    if (manifest.claude_snippet) {
      snippetPackages.push({
        name: pkgName,
        dir: pkgDir,
        layer: manifest.layer,
        snippetFile: manifest.claude_snippet,
      });
    }
    // Copilot: use copilot_snippet if available, fall back to claude_snippet
    const copilotSnippetFile = manifest.copilot_snippet || manifest.claude_snippet;
    if (copilotSnippetFile) {
      copilotSnippetPackages.push({
        name: pkgName,
        dir: pkgDir,
        layer: manifest.layer,
        snippetFile: copilotSnippetFile,
      });
    }
    // Cursor: use cursor_snippet if available, fall back to claude_snippet
    const cursorSnippetFile = manifest.cursor_snippet || manifest.claude_snippet;
    if (cursorSnippetFile) {
      cursorSnippetPackages.push({
        name: pkgName,
        dir: pkgDir,
        layer: manifest.layer,
        snippetFile: cursorSnippetFile,
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
    totalSkills = skillIndex.total;
    skillIndexSpinner.succeed(
      `Skill index generated: ${skillIndex.total} skills`,
    );
  } else {
    skillIndexSpinner.warn("No skills directory found");
  }

  // Collect snippets (separate per target: Claude, Copilot, Cursor)
  const snippets = await collectSnippets(snippetPackages);
  const copilotSnippets = await collectSnippets(copilotSnippetPackages);
  const cursorSnippets = await collectSnippets(cursorSnippetPackages);
  const platforms = new Set<string>();
  for (const pkgName of resolved.packages) {
    const manifest = manifests.get(pkgName);
    if (manifest) for (const p of manifest.platforms) platforms.add(p);
  }

  // Extract kit version from resolved packages (all unified to same version)
  let kitVersion = "2.0.0"; // fallback
  for (const pkgName of resolved.packages) {
    const manifest = manifests.get(pkgName);
    if (manifest?.version) { kitVersion = manifest.version; break; }
  }

  const instrContext: ClaudeMdContext = {
    profile: profileName,
    packages: resolved.packages,
    target,
    kitVersion,
    cliVersion: VERSION,
    installedAt: new Date().toISOString().split("T")[0],
    projectName,
    platforms: [...platforms],
    agentCount: totalAgents,
    skillCount: totalSkills,
    commandCount: totalCommands,
  };

  if (adapter.usesSettingsJson()) {
    // Claude/Cursor: write settings.json directly
    const settingsSpinner = ora("Merging settings...").start();
    const settingsOutput = join(installDir, "settings.json");
    const { sources: settingsSources } = await mergeAndWriteSettings(
      settingsPackages,
      settingsOutput,
    );
    settingsSpinner.succeed(`Settings merged from ${settingsSources.length} packages`);

    // Merge .epost-kit.json
    const kitConfigSpinner = ora("Merging kit config...").start();
    const kitConfigOutput = join(installDir, ".epost-kit.json");
    const { sources: kitConfigSources } = await mergeAndWriteKitConfig(kitConfigPackages, kitConfigOutput);
    if (kitConfigSources.length > 0) {
      const kitConfigRelPath = join(installDirName, ".epost-kit.json");
      const kitConfigChecksum = await hashFile(kitConfigOutput);
      allFiles[kitConfigRelPath] = {
        path: kitConfigRelPath,
        checksum: kitConfigChecksum,
        installedAt: new Date().toISOString(),
        version: "1.0.0",
        modified: false,
        package: kitConfigSources[0],
      };
      kitConfigSpinner.succeed(`Kit config merged from ${kitConfigSources.length} packages`);
    } else {
      kitConfigSpinner.warn("No kit config found");
    }

    // Merge .epost-ignore
    const ignoreSpinner = ora("Merging ignore patterns...").start();
    const ignoreOutput = join(installDir, ".epost-ignore");
    const { sources: ignoreSources } = await mergeAndWriteIgnore(ignorePackages, ignoreOutput);
    if (ignoreSources.length > 0) {
      const ignoreRelPath = join(installDirName, ".epost-ignore");
      const ignoreChecksum = await hashFile(ignoreOutput);
      allFiles[ignoreRelPath] = {
        path: ignoreRelPath,
        checksum: ignoreChecksum,
        installedAt: new Date().toISOString(),
        version: "1.0.0",
        modified: false,
        package: ignoreSources[0],
      };
      ignoreSpinner.succeed(`Ignore patterns merged from ${ignoreSources.length} packages`);
    } else {
      ignoreSpinner.warn("No ignore patterns found");
    }

    // Generate CLAUDE.md at project root
    const claudeSpinner = ora("Generating CLAUDE.md...").start();
    const templatesDir = await kitPaths.getTemplatesDir();
    const templatePath = templatesDir
      ? join(templatesDir, "repo-claude.md.hbs")
      : "";
    await generateClaudeMd(
      templatePath,
      instrContext,
      snippets,
      join(projectDir, "CLAUDE.md"),
    );
    claudeSpinner.succeed("CLAUDE.md generated");

    // Generate .cursor/rules/epost-kit.mdc for Cursor target
    if (target === "cursor") {
      const mdcSpinner = ora("Generating .cursor/rules/epost-kit.mdc...").start();
      const rulesDir = join(installDir, "rules");
      await mkdir(rulesDir, { recursive: true });
      await generateMdcFile(cursorSnippets, join(rulesDir, "epost-kit.mdc"));
      const mdcRelPath = join(".cursor", "rules", "epost-kit.mdc");
      allFiles[mdcRelPath] = {
        path: mdcRelPath,
        checksum: "",
        installedAt: new Date().toISOString(),
        version: "generated",
        modified: false,
        package: "core",
      };
      mdcSpinner.succeed(".cursor/rules/epost-kit.mdc generated");
    }

    // Copy GEMINI.md to project root (Gemini CLI system prompt — only if not present)
    const kitRoot = await kitPaths.resolve().then((p) => p.root).catch(() => null);
    if (kitRoot) {
      const geminiMdSrc = join(kitRoot, "packages", "core", "assets", "GEMINI.md");
      const geminiMdDest = join(projectDir, "GEMINI.md");
      if (await fileExists(geminiMdSrc) && !(await fileExists(geminiMdDest))) {
        await copyFile(geminiMdSrc, geminiMdDest);
        logger.info("GEMINI.md → created at project root (Gemini CLI system prompt)");
      } else if (await fileExists(geminiMdDest)) {
        logger.debug("GEMINI.md already exists — skipping (user may have customized it)");
      }
    }
  } else {
    // VS Code / GitHub Copilot: merge settings in-memory → transform to hooks.json
    const settingsSpinner = ora("Generating hooks configuration...").start();
    const { tmpdir } = await import("node:os");
    const tmpPath = join(tmpdir(), `epost-settings-${Date.now()}.json`);
    const { merged } = await mergeAndWriteSettings(settingsPackages, tmpPath);
    const hookResult = adapter.transformHooks(
      merged as Record<string, unknown>,
    );
    if (hookResult) {
      const hooksDir = join(installDir, "hooks");
      await mkdir(hooksDir, { recursive: true });
      await writeFile(
        join(hooksDir, hookResult.filename),
        hookResult.content,
        "utf-8",
      );
    }
    try { const { rm } = await import("node:fs/promises"); await rm(tmpPath); } catch { /* ignore */ }
    settingsSpinner.succeed("Hooks configuration generated");

    // Merge .epost-kit.json and .epost-ignore for all targets
    const kitConfigOutput2 = join(installDir, ".epost-kit.json");
    const { sources: kitConfigSources2 } = await mergeAndWriteKitConfig(
      kitConfigPackages,
      kitConfigOutput2,
      (content) => adapter.replacePathRefs(content),
    );
    if (kitConfigSources2.length > 0) {
      const kitConfigRelPath2 = join(installDirName, ".epost-kit.json");
      const kitConfigChecksum2 = await hashFile(kitConfigOutput2);
      allFiles[kitConfigRelPath2] = {
        path: kitConfigRelPath2,
        checksum: kitConfigChecksum2,
        installedAt: new Date().toISOString(),
        version: "1.0.0",
        modified: false,
        package: kitConfigSources2[0],
      };
    }
    const ignoreOutput2 = join(installDir, ".epost-ignore");
    const { sources: ignoreSources2 } = await mergeAndWriteIgnore(ignorePackages, ignoreOutput2);
    if (ignoreSources2.length > 0) {
      const ignoreRelPath2 = join(installDirName, ".epost-ignore");
      const ignoreChecksum2 = await hashFile(ignoreOutput2);
      allFiles[ignoreRelPath2] = {
        path: ignoreRelPath2,
        checksum: ignoreChecksum2,
        installedAt: new Date().toISOString(),
        version: "1.0.0",
        modified: false,
        package: ignoreSources2[0],
      };
    }

    // Generate copilot-instructions.md inside install dir
    const copilotSpinner = ora("Generating copilot-instructions.md...").start();
    const instrPath = join(installDir, adapter.rootInstructionsFilename());
    await generateCopilotInstructions(instrContext, copilotSnippets, instrPath);
    copilotSpinner.succeed("copilot-instructions.md generated");
  }

  // ── Step 7/7: Finalize ──
  logger.step(7, 7, "Finalizing");
  const metaSpinner = ora("Updating metadata...").start();
  const newMetadata = generateMetadata(VERSION, target, kitVersion, allFiles, {
    profile: profileName,
    installedPackages: resolved.packages,
    // Persist source path so `epost-kit update` can reuse it without --source flag
    source: typeof opts.source === "string" ? opts.source : undefined,
  });
  await writeMetadata(projectDir, newMetadata);
  metaSpinner.succeed("Metadata updated");

  // Compatibility report (VS Code + Cursor — shows dropped/unsupported features)
  const targetLabel = target === "cursor" ? "Cursor" : target === "vscode" ? "VS Code" : undefined;
  const warnings = adapter.getWarnings();
  if (targetLabel && warnings.length > 0) {
    const compatReport = formatCompatibilityReport(warnings, targetLabel);
    if (compatReport) {
      console.log("\n" + compatReport);
    }
  }

  // Success summary
  console.log("\n");
  const summaryPairs: Array<[string, string]> = [];
  if (profileName) summaryPairs.push(["Profile", profileName]);
  summaryPairs.push([
    "Target",
    `${target === "claude" ? "Claude Code" : target === "cursor" ? "Cursor" : "VS Code"} (${installDirName}/)`,
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

  const readyMsg =
    target === "vscode"
      ? [
          `Open VS Code → Copilot Chat → type ${pc.bold("@")} to discover agents.`,
          ``,
          `Try these:`,
          `  ${pc.cyan("/cook")}   implement a feature`,
          `  ${pc.cyan("/fix")}    debug an error`,
          `  ${pc.cyan("/plan")}   design before you build`,
          ``,
          `Customize:  ${pc.bold("epost-kit config")}`,
        ].join("\n")
      : [
          `Run ${pc.bold("claude")} to start.`,
          ``,
          `Try these commands:`,
          `  ${pc.cyan("/cook")}   implement a feature`,
          `  ${pc.cyan("/fix")}    debug an error`,
          `  ${pc.cyan("/plan")}   design before you build`,
          ``,
          `Customize:  ${pc.bold("epost-kit config")}`,
        ].join("\n");
  console.log(box(readyMsg, { title: "Ready" }));
}

// ─── Utility: transform and copy directory through adapter ───

async function transformAndCopyDir(
  srcDir: string,
  destDir: string,
  adapter: TargetAdapter,
  fileType: "agent" | "skill",
): Promise<void> {
  const files = await scanDirFiles(srcDir);
  for (const relPath of files) {
    const srcFile = join(srcDir, relPath);
    const content = await readFile(srcFile, "utf-8");

    if (!relPath.endsWith(".md")) {
      // Non-markdown: copy as-is with path refs replaced
      const destFile = join(destDir, relPath);
      await mkdir(dirname(destFile), { recursive: true });
      await writeFile(destFile, adapter.replacePathRefs(content), "utf-8");
      continue;
    }

    const result =
      fileType === "agent"
        ? adapter.transformAgent(content, basename(relPath))
        : { content: adapter.transformSkill(content), filename: relPath };

    // agents: new filename may differ (e.g. .agent.md), preserve sub-dir
    // skills: filename IS relPath (full relative path)
    const destFile =
      fileType === "agent"
        ? join(destDir, dirname(relPath), result.filename)
        : join(destDir, result.filename);
    await mkdir(dirname(destFile), { recursive: true });
    await writeFile(destFile, result.content, "utf-8");
  }
}

// ─── Utility: replace path references in hook script files ───

async function replacePathsInDir(
  dir: string,
  adapter: TargetAdapter,
): Promise<void> {
  const files = await scanDirFiles(dir);
  for (const relPath of files) {
    if (!/\.(cjs|js|json)$/.test(relPath)) continue;
    const filePath = join(dir, relPath);
    const content = await readFile(filePath, "utf-8");
    const transformed = adapter.replacePathRefs(content);
    if (transformed !== content) await writeFile(filePath, transformed, "utf-8");
  }
}

// ─── Utility: generate copilot-instructions.md for VS Code target ───

async function generateCopilotInstructions(
  ctx: ClaudeMdContext,
  snippets: PackageSnippet[],
  outputPath: string,
): Promise<void> {
  const lines: string[] = [
    `# GitHub Copilot Instructions`,
    ``,
    `**Project**: ${ctx.projectName}`,
    `**Profile**: ${ctx.profile || "(custom)"}`,
    `**Packages**: ${ctx.packages.join(", ")}`,
    `**Installed by**: epost-kit v${ctx.cliVersion} on ${ctx.installedAt}`,
    ``,
    `## Agent System`,
    ``,
    `- **Agents**: \`.github/agents/\` — ${ctx.agentCount} agents`,
    `- **Skills**: \`.github/skills/\` — ${ctx.skillCount} invokable skills`,
    ``,
  ];

  // Include package snippets (strip frontmatter from each)
  for (const snippet of snippets) {
    if (snippet.content) {
      lines.push(snippet.content, ``);
    }
  }

  lines.push(
    `## Usage`,
    ``,
    `Open Copilot Chat → type \`@\` to select an agent, \`/\` for skills.`,
    ``,
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, lines.join("\n"), "utf-8");
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
  total: number;
  skills: SkillIndexEntry[];
}> {
  const skillFiles = await findSkillFiles(skillsDir);
  // Deduplicate by skill name — same skill may exist in multiple packages/profiles
  const skillsByName = new Map<string, SkillIndexEntry & { invokable: boolean }>();

  for (const filePath of skillFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      const metadata = extractSkillFrontmatter(content);
      if (!metadata || !metadata.name) continue;

      const name = typeof metadata.name === "string" ? metadata.name : "";
      if (!name || skillsByName.has(name)) continue; // first-wins dedup

      const relativePath = filePath.substring(skillsDir.length + 1); // strip skillsDir prefix + /
      const asStr = (v: string | string[] | undefined, fallback: string) =>
        typeof v === "string" ? v : fallback;
      const asArr = (v: string | string[] | undefined, fallback: string[]) =>
        Array.isArray(v) ? v : fallback;
      skillsByName.set(name, {
        name,
        description: asStr(metadata.description, ""),
        keywords: asArr(metadata.keywords, []),
        platforms: asArr(metadata.platforms, ["all"]),
        triggers: asArr(metadata.triggers, []),
        "agent-affinity": asArr(metadata["agent-affinity"], []),
        path: relativePath,
        invokable: metadata["user-invocable"] === "true",
      });
    } catch {
      // Skip files that can't be read
    }
  }

  const allSkills = [...skillsByName.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  // Count only unique user-invocable skills for the summary
  const invokableCount = allSkills.filter((s) => s.invokable).length;
  // Strip internal `invokable` field before writing to index
  const skills: SkillIndexEntry[] = allSkills.map(
    ({ invokable: _invokable, ...entry }) => entry,
  );

  return {
    generated: new Date().toISOString(),
    version: "1.0.0",
    count: invokableCount,
    total: allSkills.length,
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
  // Source mode: skip GitHub download, use local source repo
  if (opts.source) {
    return runPackageInit(opts);
  }

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
