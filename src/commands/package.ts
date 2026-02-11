/**
 * Command: epost-kit package list|add|remove
 * Manage installed packages
 */

import { resolve, join } from "node:path";
import { rm } from "node:fs/promises";
import { confirm } from "@inquirer/prompts";
import ora from "ora";
import { logger } from "@/shared/logger.js";
import { fileExists, dirExists, safeCopyDir } from "@/shared/file-system.js";
import { readMetadata, writeMetadata } from "@/services/file-operations/ownership.js";
import {
  loadAllManifests,
  loadPackageManifest,
} from "@/domains/packages/package-resolver.js";
import {
  heading,
  layerDiagram,
  type PackageManifestSummary,
} from "@/domains/ui/ui.js";
import type {
  PackageListOptions,
  PackageAddOptions,
  PackageRemoveOptions,
} from "@/types/commands.js";

async function findPackagesDir(): Promise<string> {
  const paths = [
    join(process.cwd(), "packages"),
    join(process.cwd(), "..", "packages"),
  ];
  for (const p of paths) {
    const resolved = resolve(p);
    if (
      (await dirExists(resolved)) &&
      (await fileExists(join(resolved, "core", "package.yaml")))
    ) {
      return resolved;
    }
  }
  throw new Error(
    "Cannot find packages/ directory. Run from the kit repo directory.",
  );
}

export async function runPackageList(_opts: PackageListOptions): Promise<void> {
  const packagesDir = await findPackagesDir();
  const manifests = await loadAllManifests(packagesDir);

  // Check what's installed
  const metadata = await readMetadata(process.cwd());
  const installedPackages = new Set(metadata?.installedPackages || []);

  console.log(heading(`Available Packages (${manifests.size})`));
  console.log("");

  // Sort by layer, then name
  const sorted = [...manifests.entries()].sort(([, a], [, b]) => {
    if (a.layer !== b.layer) return a.layer - b.layer;
    return a.name.localeCompare(b.name);
  });

  // Build package summaries
  const summaries: PackageManifestSummary[] = [];
  for (const [name, manifest] of sorted) {
    const installed = installedPackages.has(name);
    const summary: PackageManifestSummary = {
      name,
      description: manifest.description,
      layer: manifest.layer,
      installed,
      agents: manifest.provides.agents.length,
      skills: manifest.provides.skills.length,
      commands: manifest.provides.commands.length,
      platforms: manifest.platforms,
      dependencies: manifest.dependencies,
    };
    summaries.push(summary);
  }

  console.log(layerDiagram(summaries));

  if (installedPackages.size > 0) {
    console.log("");
    logger.info(`Installed: ${[...installedPackages].join(", ")}`);
  }
}

export async function runPackageAdd(opts: PackageAddOptions): Promise<void> {
  const packagesDir = await findPackagesDir();
  const projectDir = resolve(process.cwd());

  // Verify package exists
  const manifest = await loadPackageManifest(packagesDir, opts.name);
  logger.info(`Adding package: ${manifest.name} (${manifest.description})`);

  // Check dependencies
  const metadata = await readMetadata(projectDir);
  const installedPackages = new Set(metadata?.installedPackages || []);

  if (installedPackages.has(opts.name)) {
    logger.warn(`Package "${opts.name}" is already installed`);
    return;
  }

  // Check deps
  const missingDeps = manifest.dependencies.filter(
    (d) => !installedPackages.has(d),
  );
  if (missingDeps.length > 0) {
    logger.warn(`Missing dependencies: ${missingDeps.join(", ")}`);
    if (!opts.yes) {
      const addDeps = await confirm({
        message: `Also install dependencies: ${missingDeps.join(", ")}?`,
        default: true,
      });
      if (!addDeps) {
        logger.info("Cancelled — dependencies required");
        return;
      }
    }
  }

  // Install
  const spinner = ora(`Installing ${opts.name}...`).start();
  const installDir = join(projectDir, ".claude");

  const packagesToInstall = [...missingDeps, opts.name];

  for (const pkgName of packagesToInstall) {
    const pkgManifest = await loadPackageManifest(packagesDir, pkgName);
    const pkgDir = join(packagesDir, pkgName);

    for (const [srcSubDir, destSubDir] of Object.entries(pkgManifest.files)) {
      const srcPath = join(pkgDir, srcSubDir);
      const destPath = join(installDir, destSubDir);

      if (srcSubDir === "settings.json") continue;

      if (srcSubDir.endsWith("/")) {
        if (await dirExists(srcPath)) {
          await safeCopyDir(srcPath, destPath);
        }
      } else {
        if (await fileExists(srcPath)) {
          const { mkdir, copyFile } = await import("node:fs/promises");
          await mkdir(join(destPath, ".."), { recursive: true });
          await copyFile(srcPath, destPath);
        }
      }
    }
  }

  spinner.succeed(`Installed: ${packagesToInstall.join(", ")}`);

  // Update metadata
  if (metadata) {
    const updatedPackages = [
      ...(metadata.installedPackages || []),
      ...packagesToInstall,
    ];
    metadata.installedPackages = [...new Set(updatedPackages)];
    metadata.updatedAt = new Date().toISOString();
    await writeMetadata(projectDir, metadata);
    logger.info("Metadata updated");
  }

  logger.info(`\n✓ Added ${packagesToInstall.length} package(s)`);
}

export async function runPackageRemove(
  opts: PackageRemoveOptions,
): Promise<void> {
  const packagesDir = await findPackagesDir();
  const projectDir = resolve(process.cwd());

  const metadata = await readMetadata(projectDir);
  if (!metadata?.installedPackages?.includes(opts.name)) {
    logger.error(`Package "${opts.name}" is not installed`);
    return;
  }

  // Check if other packages depend on this one
  const manifests = await loadAllManifests(packagesDir);
  const dependents = (metadata.installedPackages || []).filter((pkg) => {
    const m = manifests.get(pkg);
    return m && m.dependencies.includes(opts.name);
  });

  if (dependents.length > 0) {
    logger.error(
      `Cannot remove "${opts.name}" — required by: ${dependents.join(", ")}`,
    );
    return;
  }

  // Confirm
  if (!opts.force && !opts.yes) {
    const proceed = await confirm({
      message: `Remove package "${opts.name}" and its files?`,
      default: false,
    });
    if (!proceed) {
      logger.info("Cancelled");
      return;
    }
  }

  // Remove files owned by this package
  const spinner = ora(`Removing ${opts.name}...`).start();
  let removedCount = 0;

  for (const [path, ownership] of Object.entries(metadata.files)) {
    if (ownership.package === opts.name) {
      try {
        const fullPath = join(projectDir, path);
        await rm(fullPath, { force: true });
        delete metadata.files[path];
        removedCount++;
      } catch {
        logger.debug(`Failed to remove: ${path}`);
      }
    }
  }

  // Update metadata
  metadata.installedPackages = (metadata.installedPackages || []).filter(
    (p) => p !== opts.name,
  );
  metadata.updatedAt = new Date().toISOString();
  await writeMetadata(projectDir, metadata);

  spinner.succeed(`Removed ${opts.name} (${removedCount} files)`);
}
