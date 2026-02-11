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

  // ── Step 2/6: Role selection ──
  logger.step(2, 6, "Choose your role");
  let selectedProfile: string;

  if (teamChoice === "__other__") {
    const allProfiles = listProfiles(profiles);
    selectedProfile = await select({
      message: "Select a developer profile:",
      choices: allProfiles.map((p) => ({
        name: `${p.displayName} (${p.packages.join(", ")})`,
        value: p.name,
      })),
    });
  } else {
    const teamProfiles = findProfilesByTeam(teamChoice, profiles);

    if (teamProfiles.length === 1) {
      logger.info(`\nSuggested profile: ${teamProfiles[0].displayName}`);
      logger.info(`Packages: ${teamProfiles[0].packages.join(", ")}`);
      const useIt = await confirm({
        message: "Use this profile?",
        default: true,
      });
      if (useIt) {
        selectedProfile = teamProfiles[0].name;
      } else {
        const allProfiles = listProfiles(profiles);
        selectedProfile = await select({
          message: "Select a developer profile:",
          choices: allProfiles.map((p) => ({
            name: `${p.displayName} (${p.packages.join(", ")})`,
            value: p.name,
          })),
        });
      }
    } else if (teamProfiles.length > 1) {
      selectedProfile = await select({
        message: "Select your role:",
        choices: teamProfiles.map((p) => ({
          name: `${p.displayName} (${p.packages.length} packages)`,
          value: p.name,
        })),
      });
    } else {
      // No profiles for this team — show all
      const allProfiles = listProfiles(profiles);
      selectedProfile = await select({
        message: "Select a developer profile:",
        choices: allProfiles.map((p) => ({
          name: `${p.displayName} (${p.packages.join(", ")})`,
          value: p.name,
        })),
      });
    }
  }

  const info = getProfileInfo(selectedProfile, profiles);

  // ── Step 3/6: Package selection (all packages, profile ones pre-checked) ──
  logger.step(3, 6, "Select packages");

  const allManifests = await loadAllManifests(packagesDir);
  const profilePkgs = new Set(info?.packages || []);

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

  await runInit({
    ...opts,
    packages: selected.join(","),
  });

  // Post-install success message
  console.log(
    box(
      `Setup complete!\n\nRun ${pc.bold("claude")} to activate your AI assistant.\nType ${pc.bold("/")} to discover all available commands.`,
      { title: "Ready" },
    ),
  );
}
