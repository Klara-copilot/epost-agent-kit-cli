/**
 * Command: epost-kit browse
 * Interactive terminal marketplace — browse and install role bundles.
 *
 * State machine:
 *   TAB_SELECT → CARD_LIST → ACTION_MENU → (install/remove) → TAB_SELECT
 *   TAB_SELECT → SEARCH → CARD_LIST → ACTION_MENU → TAB_SELECT
 *   TAB_SELECT → UPDATES → CARD_LIST (filtered) → ACTION_MENU → TAB_SELECT
 *   TAB_SELECT → EXIT
 */

import { resolve, join } from 'node:path';
import pc from 'picocolors';
import { logger } from '@/shared/logger.js';
import { readEpostConfig } from '@/domains/config/epost-config.js';
import {
  loadBundles,
  getAllSkillsForRole,
  getAllAgentsForRole,
} from '@/domains/resolver/bundles.js';
import { dirExists } from '@/shared/file-system.js';
import { renderCardGrid } from '@/domains/ui/marketplace-cards.js';
import {
  promptTabSelect,
  promptRoleSelect,
  promptRoleAction,
} from '@/domains/ui/marketplace-tabs.js';
import { promptSearch, filterRoles } from '@/domains/ui/marketplace-search.js';
import { fetchRemoteKitVersion } from '@/domains/github/registry-client.js';
import { compareKitVersions } from '@/domains/versioning/version-compare.js';
import type { BrowseOptions } from '@/types/commands.js';
import type { BundlesFile } from '@/domains/resolver/bundles.js';
import type { InstallState } from '@/domains/ui/marketplace-cards.js';
import type { EpostProjectConfig } from '@/types/epost-config.js';

// ─── Helpers ───

/** Load config gracefully — returns null if not found. */
async function loadConfig(cwd: string): Promise<EpostProjectConfig | null> {
  return readEpostConfig(cwd).catch(() => null);
}

/** Build install state from config. */
function buildInstallState(config: EpostProjectConfig | null): InstallState {
  const installedRoles = new Set<string>(config?.role ? [config.role] : []);
  return { installedRoles };
}

/** Print role detail card + skills/agents breakdown. */
function printRoleDetail(
  roleName: string,
  bundles: BundlesFile,
  state: InstallState,
  hasUpdate?: boolean,
): void {
  const role = bundles.roles[roleName];
  if (!role) return;

  const skills = getAllSkillsForRole(roleName, bundles.roles);
  const agents = getAllAgentsForRole(roleName, bundles.roles);
  const isInstalled = state.installedRoles.has(roleName);

  console.log('');
  const badges = [
    isInstalled ? pc.green('● installed') : '',
    hasUpdate ? pc.yellow('↑ update available') : '',
  ].filter(Boolean).join('  ');
  const titleLine = pc.bold(pc.cyan(roleName)) + (badges ? '  ' + badges : '');
  console.log(`  ${titleLine}`);
  console.log(`  ${pc.dim(role.description ?? '')}`);
  console.log('');
  console.log(`  ${pc.dim('Skills:')}  ${skills.join(', ')}`);
  console.log(`  ${pc.dim('Agents:')}  ${agents.join(', ')}`);
  console.log('');
}

// ─── Install / Remove logic ───

async function installRole(
  roleName: string,
  _bundles: BundlesFile,
  cwd: string,
  opts: BrowseOptions,
): Promise<void> {
  const claudeDir = join(cwd, '.claude');

  if (!(await dirExists(claudeDir))) {
    logger.error('No .claude/ directory found. Run `epost-kit init` first.');
    return;
  }

  const { runAdd } = await import('@/commands/add.js');
  await runAdd(undefined, { ...opts, role: roleName, dir: cwd });
}

async function removeRole(
  roleName: string,
  cwd: string,
  opts: BrowseOptions,
): Promise<void> {
  const { runRemove } = await import('@/commands/remove.js');
  await runRemove(undefined, { ...opts, role: roleName, dir: cwd });
}

// ─── Role action handler ───

async function handleRoleAction(
  roleName: string,
  bundles: BundlesFile,
  cwd: string,
  opts: BrowseOptions,
  hasUpdate = false,
): Promise<void> {
  const config = await readEpostConfig(cwd).catch(() => null);
  const freshState = buildInstallState(config);
  const isInstalled = freshState.installedRoles.has(roleName);

  printRoleDetail(roleName, bundles, freshState, hasUpdate);

  let action: string;
  try {
    action = await promptRoleAction(roleName, isInstalled);
  } catch {
    return;
  }

  if (action === 'back') return;
  if (action === 'install') await installRole(roleName, bundles, cwd, opts);
  else if (action === 'remove') await removeRole(roleName, cwd, opts);
}

// ─── Main browse loop ───

export async function runBrowse(opts: BrowseOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());
  const noCache = !!(opts as any).noCache;

  // Load bundles
  let bundles: BundlesFile;
  try {
    bundles = await loadBundles();
  } catch (err: any) {
    logger.error(`Cannot load bundles.yaml: ${err.message}`);
    process.exit(1);
  }

  const allRoles = bundles.roles;
  const roleCount = Object.keys(allRoles).length;

  console.log('');
  console.log(pc.bold('  epost-kit marketplace'));
  console.log(pc.dim(`  ${roleCount} roles available`));
  console.log('');

  // ── Prefetch remote version (non-blocking, for Updates tab) ──────────────
  let remoteKitVersion: string | null = null;
  let isOffline = false;

  fetchRemoteKitVersion(noCache)
    .then((v) => { remoteKitVersion = v; })
    .catch(() => { isOffline = true; });

  // ── Determine which installed roles have kit updates ─────────────────────
  function buildUpdateSet(config: EpostProjectConfig | null): Set<string> {
    if (!config || !remoteKitVersion) return new Set();
    const diff = compareKitVersions(config, remoteKitVersion);
    if (!diff?.hasUpdate) return new Set();
    // All installed roles get the update badge when kit has a new version
    return new Set(config.role ? [config.role] : []);
  }

  // Main navigation loop
  while (true) {
    const config = await loadConfig(cwd);
    const state = buildInstallState(config);
    const updateSet = buildUpdateSet(config);
    const installedCount = state.installedRoles.size;
    const updatesCount = updateSet.size;

    let tab: string;
    try {
      tab = await promptTabSelect(installedCount, updatesCount, isOffline);
    } catch {
      break;
    }

    if (tab === 'exit') break;

    // ── Search ──────────────────────────────────────────────────────────────
    if (tab === 'search') {
      let query: string;
      try {
        query = await promptSearch();
      } catch {
        continue;
      }

      if (!query) continue;

      const filtered = filterRoles(allRoles, query);
      const filteredCount = Object.keys(filtered).length;

      console.log('');
      if (filteredCount === 0) {
        console.log(pc.dim(`  No roles match "${query}"`));
        console.log('');
        continue;
      }

      console.log(pc.dim(`  ${filteredCount} result${filteredCount !== 1 ? 's' : ''} for "${query}"`));
      console.log('');
      console.log(renderCardGrid(filtered, state));
      console.log('');

      let selected: string;
      try {
        selected = await promptRoleSelect(Object.keys(filtered), `Select a role`);
      } catch {
        continue;
      }

      if (selected === '__back__') continue;
      await handleRoleAction(selected, bundles, cwd, opts, updateSet.has(selected));
      continue;
    }

    // ── Updates ─────────────────────────────────────────────────────────────
    if (tab === 'updates') {
      console.log('');

      if (isOffline) {
        console.log(pc.yellow('  Offline — run with network to check for kit updates.'));
        console.log(pc.dim('  All install/remove operations work offline.'));
        console.log('');
        continue;
      }

      if (!remoteKitVersion) {
        // Still fetching — show a message
        console.log(pc.dim('  Checking for updates...'));
        console.log('');
        // Give the fetch a moment to complete
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }

      if (updatesCount === 0) {
        console.log(pc.green('  ✓ All installed roles are up to date.'));
        console.log('');
        continue;
      }

      const updatedEntries = Object.fromEntries(
        Object.entries(allRoles).filter(([name]) => updateSet.has(name)),
      );
      const config2 = await loadConfig(cwd);
      const diff = config2 ? compareKitVersions(config2, remoteKitVersion) : null;

      if (diff) {
        console.log(
          `  Kit update: ${pc.yellow(diff.installedKitVersion)} → ${pc.green(diff.latestKitVersion)}`,
        );
        console.log(pc.dim('  Run `epost-kit init` to install updated skills, agents, and hooks.'));
      }
      console.log('');
      console.log(renderCardGrid(updatedEntries, state));
      console.log('');

      let selected: string;
      try {
        selected = await promptRoleSelect(Object.keys(updatedEntries), 'Roles with updates');
      } catch {
        continue;
      }

      if (selected === '__back__') continue;
      await handleRoleAction(selected, bundles, cwd, opts, true);
      continue;
    }

    // ── All Roles / Installed ───────────────────────────────────────────────
    let visibleRoles = allRoles;
    let label = 'Select a role';

    if (tab === 'installed') {
      const installedEntries = Object.fromEntries(
        Object.entries(allRoles).filter(([name]) => state.installedRoles.has(name)),
      );

      if (Object.keys(installedEntries).length === 0) {
        console.log('');
        console.log(pc.dim('  No roles installed yet. Use "All Roles" to browse.'));
        console.log('');
        continue;
      }

      visibleRoles = installedEntries;
      label = 'Installed roles — select to manage';
    }

    console.log('');
    console.log(renderCardGrid(visibleRoles, state));
    console.log('');

    let selected: string;
    try {
      selected = await promptRoleSelect(Object.keys(visibleRoles), label);
    } catch {
      continue;
    }

    if (selected === '__back__') continue;
    await handleRoleAction(selected, bundles, cwd, opts, updateSet.has(selected));
  }

  console.log('');
  console.log(pc.dim('  Goodbye.'));
  console.log('');
}
