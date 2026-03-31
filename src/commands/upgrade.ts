/**
 * Command: epost-kit upgrade
 * Self-update CLI via git pull + rebuild from ~/.epost-kit/cli/
 */

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
import type { UpdateOptions } from '@/types/commands.js';

export async function runUpgrade(opts: UpdateOptions): Promise<void> {
  const spinner = ora('Checking for updates...').start();

  try {
    const { current, latest, updateAvailable } = await checkForUpdate();
    spinner.stop();

    if (!updateAvailable) {
      logger.info(`Already up to date: ${pc.green(current)}`);
      return;
    }

    // Show version difference
    logger.info(`Current: ${pc.yellow(current)}`);
    logger.info(`Latest:  ${pc.green(latest)}`);
    logger.info('');

    // Show changelog preview
    const changelog = await getChangelogPreview(current, latest);
    logger.info(changelog);
    logger.info('');

    // If --check flag, just report and exit
    if (opts.check) {
      logger.info('Run `epost-kit upgrade` to update');
      return;
    }

    // Confirm update unless --yes flag
    if (!opts.yes) {
      const shouldUpdate = await confirm({
        message: 'Update now?',
        default: true,
      });

      if (!shouldUpdate) {
        logger.info('Update cancelled');
        return;
      }
    }

    // Execute update via git pull + rebuild
    spinner.start('Pulling latest changes and rebuilding...');
    try {
      await executeUpdate();
      spinner.stop();
    } catch (error) {
      spinner.stop();
      logger.error('Update failed');
      logger.info('');
      logger.info('Update manually:');
      logger.info(`  ${pc.cyan('cd ~/.epost-kit/cli && git pull origin master && npm install && npm run build')}`);
      throw error;
    }

    // Verify
    const verified = await verifyUpdate(latest);
    if (verified) {
      logger.success(`Successfully updated to ${pc.green(latest)}`);
    } else {
      logger.warn('Update completed but verification inconclusive');
      logger.info('Run `epost-kit --version` to check');
    }
  } catch (error) {
    spinner.stop();
    throw error;
  }
}
