/**
 * Command: epost-kit upgrade
 *
 * Two upgrade tracks:
 *   1. CLI self-update — npm package version (epost-kit CLI)
 *   2. Kit content update — skills, agents, hooks in the installed project
 *
 * Flags:
 *   --check         Check only, don't install
 *   --no-cache      Bypass registry cache for fresh remote fetch
 *   --dir <path>    Target project directory for kit content check
 */

import { resolve } from 'node:path';
import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import pc from 'picocolors';
import { logger } from '@/shared/logger.js';
import {
  checkForUpdate,
  executeUpdate,
  verifyUpdate,
  getChangelogPreview,
} from '@/domains/versioning/self-update.js';
import { fetchRemoteKitVersion } from '@/domains/github/registry-client.js';
import { compareKitVersions } from '@/domains/versioning/version-compare.js';
import { readEpostConfig } from '@/domains/config/epost-config.js';
import type { UpdateOptions } from '@/types/commands.js';

export async function runUpgrade(opts: UpdateOptions): Promise<void> {
  const cwd = resolve((opts as any).dir ?? process.cwd());
  const noCache = !!(opts as any).noCache;
  const jsonMode = !!(opts as any).json;

  // ── Track 1: CLI self-update ──────────────────────────────────────────────
  const cliSpinner = jsonMode ? null : ora('Checking CLI version...').start();
  let cliUpdateAvailable = false;
  let cliCurrent = '';
  let cliLatest = '';

  try {
    ({ current: cliCurrent, latest: cliLatest, updateAvailable: cliUpdateAvailable } =
      await checkForUpdate());
    cliSpinner?.stop();
  } catch {
    cliSpinner?.stop();
    if (!jsonMode) logger.warn('Could not check CLI version (npm unreachable)');
  }

  // ── Track 2: Kit content check ───────────────────────────────────────────
  const kitSpinner = jsonMode ? null : ora('Checking kit content version...').start();
  let kitDiff = null;

  try {
    const config = await readEpostConfig(cwd).catch(() => null);
    const remoteKitVersion = await fetchRemoteKitVersion(noCache);

    if (config && remoteKitVersion) {
      kitDiff = compareKitVersions(config, remoteKitVersion);
    }
    kitSpinner?.stop();
  } catch {
    kitSpinner?.stop();
    if (!jsonMode) logger.debug('Could not check kit content version');
  }

  // ── JSON output ──────────────────────────────────────────────────────────
  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          cliVersion: {
            current: cliCurrent || null,
            latest: cliLatest || null,
            updateAvailable: cliUpdateAvailable,
          },
          kitVersion: {
            current: kitDiff?.installedKitVersion ?? null,
            latest: kitDiff?.latestKitVersion ?? null,
            updateAvailable: kitDiff?.hasUpdate ?? false,
          },
        },
        null,
        2
      )
    );
    return;
  }

  // ── Display status ───────────────────────────────────────────────────────

  console.log('');
  console.log(pc.bold('  CLI (epost-kit)'));
  if (cliCurrent) {
    if (cliUpdateAvailable) {
      console.log(`  ${pc.yellow(cliCurrent)} → ${pc.green(cliLatest)}  ${pc.cyan('update available')}`);
    } else {
      console.log(`  ${pc.green(cliCurrent)}  ${pc.dim('up to date')}`);
    }
  } else {
    console.log(`  ${pc.dim('(version check failed)')}`);
  }

  console.log('');
  console.log(pc.bold('  Kit content (skills, agents, hooks)'));
  if (kitDiff) {
    if (kitDiff.hasUpdate) {
      console.log(`  ${pc.yellow(kitDiff.installedKitVersion)} → ${pc.green(kitDiff.latestKitVersion)}  ${pc.cyan('update available')}`);
      console.log(`  ${pc.dim('Run `epost-kit init` to install updated kit content')}`);
    } else {
      console.log(`  ${pc.green(kitDiff.installedKitVersion)}  ${pc.dim('up to date')}`);
    }
  } else {
    console.log(`  ${pc.dim('(no .epost.json found or registry unreachable)')}`);
  }

  console.log('');

  // --check: exit here
  if (opts.check) {
    if (!cliUpdateAvailable && !kitDiff?.hasUpdate) {
      logger.info('Everything is up to date.');
    }
    return;
  }

  // ── CLI update flow ───────────────────────────────────────────────────────
  if (cliUpdateAvailable) {
    const changelog = await getChangelogPreview(cliCurrent, cliLatest);
    logger.info(changelog);
    logger.info('');

    const shouldUpdate = opts.yes
      ? true
      : await confirm({ message: 'Update CLI to latest version?', default: true });

    if (shouldUpdate) {
      const spinner = ora('Updating CLI...').start();
      try {
        await executeUpdate();
        spinner.stop();
      } catch {
        spinner.stop();
        logger.error('CLI update failed');
        logger.info(`Update manually: ${pc.cyan('cd ~/.epost-kit/cli && git pull origin master && npm install && npm run build')}`);
        return;
      }

      const verified = await verifyUpdate(cliLatest);
      if (verified) {
        logger.success(`CLI updated to ${pc.green(cliLatest)}`);
      } else {
        logger.warn('Update completed but version verification failed. Run `epost-kit --version` to confirm.');
      }
    }
  }

  // ── Kit content update guidance ──────────────────────────────────────────
  if (kitDiff?.hasUpdate) {
    logger.info('');
    logger.info(pc.bold('Kit content update available:'));
    logger.info(`  ${pc.dim('Run:')} ${pc.cyan('epost-kit init')} ${pc.dim('to install the latest skills, agents, and hooks.')}`);
    logger.info(`  ${pc.dim('Changelog:')} https://github.com/Klara-copilot/epost_agent_kit/releases`);
  }
}
