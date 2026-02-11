/**
 * Command: epost-kit profile list|show
 * Browse available developer profiles
 */

import { resolve, join } from "node:path";
import { logger } from "@/shared/logger.js";
import { fileExists } from "@/shared/file-system.js";
import { loadProfiles, loadAllManifests } from "@/domains/packages/package-resolver.js";
import {
  listProfiles,
  getProfileInfo,
  findProfilesByTeam,
} from "@/domains/packages/profile-loader.js";
import { heading, table, keyValue } from "@/domains/ui/ui.js";
import type {
  ProfileListOptions,
  ProfileShowOptions,
} from "@/types/commands.js";

async function findProfilesPath(): Promise<string> {
  const paths = [
    join(process.cwd(), "profiles", "profiles.yaml"),
    join(process.cwd(), "..", "profiles", "profiles.yaml"),
  ];

  for (const p of paths) {
    if (await fileExists(resolve(p))) return resolve(p);
  }

  throw new Error(
    "Cannot find profiles/profiles.yaml. Run from the kit repo directory.",
  );
}

export async function runProfileList(opts: ProfileListOptions): Promise<void> {
  const profilesPath = await findProfilesPath();
  const profiles = await loadProfiles(profilesPath);

  const items = opts.team
    ? findProfilesByTeam(opts.team, profiles)
    : listProfiles(profiles);

  if (items.length === 0) {
    logger.info(
      opts.team
        ? `No profiles found for team "${opts.team}"`
        : "No profiles available",
    );
    return;
  }

  console.log(heading(`Available Profiles (${items.length})`));
  console.log("");

  const rows = items.map((profile) => {
    const pkgCount = profile.packages.length;
    const optCount = profile.optional.length;
    const teams = profile.teams.length > 0 ? profile.teams.join(", ") : "—";
    const packages = `${pkgCount}${optCount > 0 ? ` (+${optCount} opt)` : ""}`;

    return [profile.name, profile.displayName, teams, packages];
  });

  console.log(table(["Profile", "Display Name", "Teams", "Packages"], rows));
}

export async function runProfileShow(opts: ProfileShowOptions): Promise<void> {
  const profilesPath = await findProfilesPath();
  const profiles = await loadProfiles(profilesPath);

  const info = getProfileInfo(opts.name, profiles);
  if (!info) {
    const available = listProfiles(profiles)
      .map((p) => p.name)
      .join(", ");
    logger.error(`Profile "${opts.name}" not found. Available: ${available}`);
    return;
  }

  // Try to load manifests for detailed info
  let manifests;
  try {
    const packagesDir = resolve(join(process.cwd(), "packages"));
    manifests = await loadAllManifests(packagesDir);
  } catch {
    manifests = null;
  }

  console.log(heading(`Profile: ${info.name}`));
  console.log("");

  const metadata: Array<[string, string]> = [
    ["Display Name", info.displayName],
  ];

  if (info.teams.length > 0) {
    metadata.push(["Teams", info.teams.join(", ")]);
  }

  console.log(keyValue(metadata));
  console.log("");

  logger.info(`Packages (${info.packages.length}):`);
  console.log("");

  let totalAgents = 0,
    totalSkills = 0,
    totalCommands = 0;
  for (const pkg of info.packages) {
    const manifest = manifests?.get(pkg);
    if (manifest) {
      const a = manifest.provides.agents.length;
      const s = manifest.provides.skills.length;
      const c = manifest.provides.commands.length;
      totalAgents += a;
      totalSkills += s;
      totalCommands += c;
      logger.info(
        `  Layer ${manifest.layer}: ${pkg} — ${a} agents, ${s} skills, ${c} commands`,
      );
    } else {
      logger.info(`  ${pkg}`);
    }
  }

  if (info.optional.length > 0) {
    console.log("");
    logger.info(`Optional packages: ${info.optional.join(", ")}`);
  }

  if (manifests) {
    console.log("");
    logger.info(
      `Total: ${totalAgents} agents, ${totalSkills} skills, ${totalCommands} commands`,
    );
  }
}
