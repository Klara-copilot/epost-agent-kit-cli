/**
 * Command: epost-kit fix-refs
 * Auto-fix stale references using rename maps from package.yaml manifests.
 * Dry-run by default; use --apply to write changes.
 */

import { join, resolve } from "node:path";
import pc from "picocolors";
import { dirExists, fileExists } from "@/shared/file-system.js";
import { loadAllManifests } from "@/domains/packages/package-resolver.js";
import {
  buildRenameMap,
  fixReferences,
  type FixResult,
} from "@/domains/validation/ref-validator.js";
import { logger } from "@/shared/logger.js";

interface FixRefsOptions {
  verbose?: boolean;
  yes?: boolean;
  apply?: boolean;
  dir?: string;
}

async function findPackagesDir(cwd: string): Promise<string | null> {
  const paths = [join(cwd, "packages"), join(cwd, "..", "packages")];
  for (const p of paths) {
    const resolved = resolve(p);
    if (
      (await dirExists(resolved)) &&
      (await fileExists(join(resolved, "core", "package.yaml")))
    ) {
      return resolved;
    }
  }
  return null;
}

export async function runFixRefs(opts: FixRefsOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : process.cwd();
  const claudeDir = join(cwd, ".claude");
  const packagesDir = await findPackagesDir(cwd);

  if (!packagesDir) {
    logger.error(
      "Cannot find packages/ directory. Run from the kit repo directory.",
    );
    process.exit(1);
  }

  // Build rename map from all package manifests
  const manifests = await loadAllManifests(packagesDir);
  const renameMap = buildRenameMap(manifests);

  if (renameMap.size === 0) {
    logger.info("No renames defined in any package.yaml. Nothing to fix.");
    return;
  }

  console.log(
    `\n  Rename map: ${pc.bold(String(renameMap.size))} entries from package.yaml manifests\n`,
  );

  for (const [oldName, newName] of renameMap) {
    console.log(`    ${pc.red(oldName)} → ${pc.green(newName)}`);
  }
  console.log();

  const dryRun = !opts.apply;

  // Fix in both trees
  const allResults: FixResult[] = [];

  // Fix in packages/ (source)
  const pkgResults = await fixReferences(packagesDir, renameMap, dryRun);
  for (const r of pkgResults) {
    allResults.push({ ...r, file: `packages/${r.file}` });
  }

  // Fix in .claude/ (installed)
  if (await dirExists(claudeDir)) {
    const claudeResults = await fixReferences(claudeDir, renameMap, dryRun);
    for (const r of claudeResults) {
      allResults.push({ ...r, file: `.claude/${r.file}` });
    }
  }

  if (allResults.length === 0) {
    logger.success("No stale references found matching the rename map.");
    return;
  }

  const totalReplacements = allResults.reduce(
    (sum, r) => sum + r.replacements.length,
    0,
  );
  const prefix = dryRun ? pc.cyan("[dry-run]") : pc.green("[applied]");

  console.log(
    `  ${prefix} ${totalReplacements} replacement(s) in ${allResults.length} file(s):\n`,
  );

  for (const result of allResults) {
    console.log(`  ${pc.dim(result.file)}`);
    for (const rep of result.replacements) {
      console.log(
        `    L${rep.line}: ${pc.red(rep.old)} → ${pc.green(rep.new)}`,
      );
    }
  }

  if (dryRun) {
    console.log(
      `\n  ${pc.dim("Run with --apply to write changes to disk.")}\n`,
    );
  } else {
    console.log(
      `\n  ${pc.green("✓")} All replacements written to disk.\n`,
    );
  }
}
