/**
 * Command: epost-kit new
 * Create new project with epost-agent-kit
 */

import { join, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { select, input, confirm } from '@inquirer/prompts';
import ora from 'ora';
import { logger } from '@/shared/logger.js';
import { dirExists, fileExists } from '@/shared/file-system.js';
import { listAvailableKits, downloadKit, getKitFiles } from '@/domains/installation/template-manager.js';
import { generateMetadata, writeMetadata } from '@/services/file-operations/ownership.js';
import { hashFile } from '@/services/file-operations/checksum.js';
import { detectPackageManager } from '@/domains/installation/package-manager.js';
import { execa } from 'execa';
import { VERSION } from '@/domains/help/branding.js';
import type { NewOptions } from '@/types/commands.js';
import type { FileOwnership } from '@/types/index.js';

export async function runNew(opts: NewOptions): Promise<void> {
  logger.info('Creating new epost-agent-kit project');

  // Step 1: Select kit template
  let kit = opts.kit || 'engineer';
  if (!opts.yes && !opts.kit) {
    const kits = listAvailableKits();
    kit = await select({
      message: 'Select kit template:',
      choices: kits.map(k => ({
        name: `${k.name} - ${k.description}`,
        value: k.id,
      })),
      default: 'engineer',
    });
  }

  // Step 2: Get project directory
  let projectDir = opts.dir;
  if (!projectDir) {
    if (opts.yes) {
      projectDir = './my-agent-project';
    } else {
      projectDir = await input({
        message: 'Project directory:',
        default: './my-agent-project',
      });
    }
  }

  const targetPath = resolve(process.cwd(), projectDir);

  // Step 3: Validate directory
  if (await dirExists(targetPath)) {
    throw new Error(`Directory already exists: ${targetPath}`);
  }

  // Step 4: Select IDE target
  let target: 'claude' | 'cursor' | 'vscode' = 'claude';
  if (!opts.yes) {
    target = await select({
      message: 'Select IDE target:',
      choices: [
        { name: 'Claude Code', value: 'claude' as const },
        { name: 'Cursor', value: 'cursor' as const },
        { name: 'VS Code (GitHub Copilot)', value: 'vscode' as const },
      ],
      default: 'claude' as const,
    });
  }

  // Step 5: Show plan
  if (!opts.yes) {
    logger.info(`\nPlan:`);
    logger.info(`  Kit: ${kit}`);
    logger.info(`  Target: ${target}`);
    logger.info(`  Path: ${targetPath}`);

    const proceed = await confirm({
      message: 'Create project?',
      default: true,
    });

    if (!proceed) {
      logger.info('Cancelled');
      return;
    }
  }

  // Step 6: Download and extract kit
  const spinner = ora('Downloading kit template...').start();
  try {
    await mkdir(targetPath, { recursive: true });
    await downloadKit(kit, 'latest', targetPath);
    spinner.succeed('Kit downloaded');
  } catch (error) {
    spinner.fail('Download failed');
    throw error;
  }

  // Step 7: Generate metadata with checksums
  spinner.start('Generating metadata...');
  try {
    const kitFiles = await getKitFiles(targetPath);
    const files: Record<string, FileOwnership> = {};

    for (const relativePath of kitFiles) {
      const fullPath = join(targetPath, relativePath);
      const checksum = await hashFile(fullPath);
      files[relativePath] = {
        path: relativePath,
        checksum,
        installedAt: new Date().toISOString(),
        version: 'latest',
        modified: false,
      };
    }

    const metadata = generateMetadata(VERSION, target, 'latest', files);
    await writeMetadata(targetPath, metadata);

    spinner.succeed('Metadata generated');
  } catch (error) {
    spinner.fail('Metadata generation failed');
    throw error;
  }

  // Step 8: Initialize git (optional)
  try {
    await execa('git', ['init'], { cwd: targetPath });
    logger.info('✓ Git repository initialized');
  } catch {
    logger.debug('Git not available, skipping git init');
  }

  // Step 9: Install dependencies (optional)
  if (await fileExists(join(targetPath, 'package.json'))) {
    const pm = await detectPackageManager(targetPath);
    if (pm && !opts.yes) {
      const install = await confirm({
        message: `Run ${pm} install?`,
        default: false,
      });

      if (install) {
        spinner.start(`Running ${pm} install...`);
        try {
          await execa(pm, ['install'], { cwd: targetPath });
          spinner.succeed('Dependencies installed');
        } catch (error) {
          spinner.fail('Install failed');
          logger.debug(`${pm} install error: ${error}`);
        }
      }
    }
  }

  // Step 10: Show summary
  logger.info('\n✓ Project created successfully!');
  logger.info(`\nNext steps:`);
  logger.info(`  cd ${projectDir}`);
  logger.info(`  Open your IDE and start coding!`);
}
