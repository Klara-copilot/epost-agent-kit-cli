/**
 * Command: epost-kit onboard
 * Guided first-time setup wizard for new developers
 */

import { resolve, basename } from "node:path";
import { select, confirm, checkbox, input } from "@inquirer/prompts";
import { execa } from "execa";
import pc from "picocolors";
import { logger } from "@/shared/logger.js";
import { dirExists } from "@/shared/file-system.js";
import { KitPathResolver } from "@/shared/path-resolver.js";
import { loadProfiles, loadAllManifests } from "@/domains/packages/package-resolver.js";
import {
  listProfiles,
  findProfilesByTeam,
  getProfileInfo,
  getOrderedTeamChoices,
} from "@/domains/packages/profile-loader.js";
import { runInit } from "./init.js";
import {
  banner,
  box,
  packageTable,
  type PackageManifestSummary,
} from "@/domains/ui/index.js";
import type { OnboardOptions } from "@/types/commands.js";

export async function runOnboard(opts: OnboardOptions): Promise<void> {
  console.log(banner());
  console.log(
    box(
      "Welcome! This wizard sets up your dev\nenvironment with agents, skills & commands\ntailored for your team and role.",
    ),
  );

  // Resolve kit repo root (works from any cwd via npm link)
  const kitPaths = new KitPathResolver();
  const profilesPath = await kitPaths.getProfilesPath();
  const packagesDir = await kitPaths.getPackagesDir();

  const profiles = await loadProfiles(profilesPath);

  // ── Step 1/6: Team selection ──
  logger.step(1, 6, "Select your team");
  const teamChoices = getOrderedTeamChoices(profiles);

  const teamChoice = await select({
    message: "What team are you on?",
    choices: teamChoices,
  });

  // ── Step 2/6: Profile selection (multi-select) ──
  logger.step(2, 6, "Select profiles");
  const allProfiles = listProfiles(profiles);
  const teamProfiles =
    teamChoice !== "__other__"
      ? new Set(findProfilesByTeam(teamChoice, profiles).map((p) => p.name))
      : new Set<string>();

  const selectedProfiles = await checkbox({
    message: "Select profiles (space to toggle, enter to confirm):",
    choices: allProfiles.map((p) => ({
      name: `${p.displayName} (${p.packages.join(", ")})`,
      value: p.name,
      checked: teamProfiles.has(p.name),
    })),
  });

  if (selectedProfiles.length === 0) {
    logger.info("No profiles selected. Setup cancelled.");
    return;
  }

  // Merge packages from all selected profiles
  const selectedProfile =
    selectedProfiles.length === 1
      ? selectedProfiles[0]
      : selectedProfiles.join("+");

  const profilePkgs = new Set<string>();
  for (const pName of selectedProfiles) {
    const pInfo = getProfileInfo(pName, profiles);
    if (pInfo) pInfo.packages.forEach((pkg) => profilePkgs.add(pkg));
  }

  // ── Step 3/6: Package selection (all packages, profile ones pre-checked) ──
  logger.step(3, 6, "Select packages");

  const allManifests = await loadAllManifests(packagesDir);

  const selected = await checkbox({
    message: "Select packages to install:",
    choices: [...allManifests.entries()]
      .sort((a, b) => a[1].layer - b[1].layer)
      .map(([name, m]) => ({
        name: `${name} — ${m.description}`,
        value: name,
        checked: profilePkgs.has(name),
      })),
  });

  if (selected.length === 0) {
    logger.info("No packages selected. Setup cancelled.");
    return;
  }

  // ── Step 4/6: Confirm ──
  logger.step(4, 6, "Confirm installation");

  const summaries: PackageManifestSummary[] = [];
  for (const name of selected) {
    const m = allManifests.get(name);
    if (m) {
      summaries.push({
        name: m.name,
        description: m.description,
        layer: m.layer,
        agents: m.provides.agents.length,
        skills: m.provides.skills.length,
        commands: m.provides.commands.length,
      });
    }
  }

  if (summaries.length > 0) {
    console.log(packageTable(summaries));
  }

  const proceed = await confirm({
    message: `Install ${selected.length} packages?`,
    default: true,
  });

  if (!proceed) {
    logger.info("Setup cancelled.");
    return;
  }

  // ── Step 5/6: Target directory ──
  logger.step(5, 6, "Choose target directory");

  const dirChoice = await select({
    message: "Where to install?",
    choices: [
      {
        name: `Current directory (${basename(process.cwd())})`,
        value: "cwd" as const,
      },
      { name: "Enter a path...", value: "path" as const },
      { name: "Clone a git repository...", value: "clone" as const },
    ],
  });

  let targetDir = process.cwd();

  if (dirChoice === "path") {
    const dirPath = await input({ message: "Enter project directory path:" });
    targetDir = resolve(dirPath);
    if (!(await dirExists(targetDir))) {
      throw new Error(`Directory not found: ${targetDir}`);
    }
  }

  if (dirChoice === "clone") {
    const gitUrl = await input({ message: "Git repository URL:" });
    const defaultName = basename(gitUrl, ".git").replace(/\.git$/, "");
    const dirName = await input({
      message: "Clone into directory:",
      default: defaultName,
    });
    logger.info(`\nCloning ${gitUrl}...`);
    await execa("git", ["clone", gitUrl, dirName]);
    targetDir = resolve(dirName);
    logger.info(`Cloned to ${targetDir}`);
  }

  // ── Step 6/6: Install ──
  logger.step(6, 6, "Installing packages");

  process.chdir(targetDir);

  // Optimus team defaults to VS Code (GitHub Copilot)
  const target: "vscode" | undefined =
    teamChoice === "optimus" ? "vscode" : undefined;

  await runInit({
    ...opts,
    profile: selectedProfile,
    packages: selected.join(","),
    target,
    source: true, // Use source repo for package resolution (discovered from source)
  });

  // Post-install success message
  if (target === "vscode") {
    console.log(
      box(
        `Setup complete!\n\nOpen VS Code to activate GitHub Copilot.\nType ${pc.bold("/")} in chat to discover available prompts.`,
        { title: "Ready" },
      ),
    );
  } else {
    console.log(
      box(
        `Setup complete!\n\nRun ${pc.bold("claude")} to activate your AI assistant.\nType ${pc.bold("/")} to discover all available commands.`,
        { title: "Ready" },
      ),
    );
  }
}
