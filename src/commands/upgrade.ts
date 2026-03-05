/**
 * Command: epost-kit upgrade
 * Self-update CLI to latest version from npm registry
 */

import { confirm } from '@inquirer/prompts';
import ora from 'ora';
import pc from 'picocolors';
import { logger } from '@/shared/logger.js';
import {
  checkForUpdate,
  detectPackageManager,
  getUpdateCommand,
  executeUpdate,
  verifyUpdate,
  getChangelogPreview,
} from '@/domains/versioning/self-update.js';
import type { UpdateOptions } from '@/types/commands.js';

export async function runUpgrade(opts: UpdateOptions): Promise<void> {
  const spinner = ora('Checking for updates...').start();

  try {
    // Check current vs latest version
    const { current, latest, updateAvailable } = await checkForUpdate();
    spinner.stop();

    if (!updateAvailable) {
      logger.info(`Already on latest version: ${pc.green(current)}`);
      return;
    }

    // Show version difference
    logger.info(`Current version: ${pc.yellow(current)}`);
    logger.info(`Latest version:  ${pc.green(latest)}`);
    logger.info('');

    // Fetch changelog preview
    const changelog = await getChangelogPreview(current, latest);
    logger.info(changelog);
    logger.info('');

    // If --check flag, just report and exit
    if (opts.check) {
      logger.info('Use `epost-kit upgrade` to install the latest version');
      return;
    }

    // Confirm update unless --yes flag
    if (!opts.yes) {
      const shouldUpdate = await confirm({
        message: 'Update to latest version?',
        default: true,
      });

      if (!shouldUpdate) {
        logger.info('Update cancelled');
        return;
      }
    }

    // Detect package manager
    const pm = await detectPackageManager();
    logger.info(`Detected package manager: ${pc.cyan(pm)}`);

    // Execute update
    spinner.start('Updating CLI...');
    try {
      await executeUpdate(pm);
      spinner.stop();
    } catch (error) {
      spinner.stop();
      logger.error('Update failed');
      logger.info('');
      logger.info('Please update manually:');
      logger.info(`  ${pc.cyan(getUpdateCommand(pm))}`);
      throw error;
    }

    // Verify update succeeded
    const verified = await verifyUpdate(latest);
    if (verified) {
      logger.success(`Successfully updated to version ${pc.green(latest)}`);
    } else {
      logger.warn('Update completed but version verification failed');
      logger.info('Run `epost-kit --version` to check installed version');
    }
  } catch (error) {
    spinner.stop();
    throw error;
  }
}
