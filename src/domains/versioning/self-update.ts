/**
 * CLI self-update functionality
 * Detects package manager, checks for updates, fetches changelog
 */

import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import { APP_NAME } from '@/shared/constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

/** Read current CLI version from package.json */
export async function getCurrentVersion(): Promise<string> {
  try {
    const pkgPath = join(__dirname, '../../package.json');
    const content = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);
    return pkg.version;
  } catch (error) {
    throw new Error(`Failed to read current version: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/** Fetch latest version from npm registry */
export async function getLatestVersion(): Promise<string> {
  try {
    const result = await execa('npm', ['view', APP_NAME, 'version']);
    return result.stdout.trim();
  } catch (error) {
    throw new Error(`Failed to fetch latest version: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/** Check if update is available */
export async function checkForUpdate(): Promise<{
  current: string;
  latest: string;
  updateAvailable: boolean;
}> {
  const current = await getCurrentVersion();
  const latest = await getLatestVersion();
  const updateAvailable = current !== latest;
  return { current, latest, updateAvailable };
}

/** Detect package manager used to install CLI */
export async function detectPackageManager(): Promise<PackageManager> {
  try {
    // Try to find global installation path (for future use)
    await execa('npm', ['prefix', '-g']);

    // Check if installed via pnpm
    try {
      await execa('pnpm', ['list', '-g', APP_NAME]);
      return 'pnpm';
    } catch {
      // Not installed via pnpm
    }

    // Check if installed via yarn
    try {
      await execa('yarn', ['global', 'list']);
      return 'yarn';
    } catch {
      // Not installed via yarn
    }

    // Default to npm
    return 'npm';
  } catch {
    return 'npm'; // Fallback to npm
  }
}

/** Get update command for package manager */
export function getUpdateCommand(pm: PackageManager): string {
  switch (pm) {
    case 'npm':
      return `npm install -g ${APP_NAME}@latest`;
    case 'pnpm':
      return `pnpm add -g ${APP_NAME}@latest`;
    case 'yarn':
      return `yarn global add ${APP_NAME}@latest`;
  }
}

/** Execute update via package manager */
export async function executeUpdate(pm: PackageManager): Promise<void> {
  const args = pm === 'npm'
    ? ['install', '-g', `${APP_NAME}@latest`]
    : pm === 'pnpm'
    ? ['add', '-g', `${APP_NAME}@latest`]
    : ['global', 'add', `${APP_NAME}@latest`];

  await execa(pm, args, { stdio: 'inherit' });
}

/** Verify update succeeded by checking version */
export async function verifyUpdate(expectedVersion: string): Promise<boolean> {
  try {
    const current = await getCurrentVersion();
    return current === expectedVersion;
  } catch {
    return false;
  }
}

/** Fetch changelog preview from GitHub (simplified version) */
export async function getChangelogPreview(fromVersion: string, toVersion: string): Promise<string> {
  // For now, return a placeholder. Full implementation would:
  // 1. Fetch GitHub releases API
  // 2. Parse release notes between versions
  // 3. Format into readable preview
  return `Update available: ${fromVersion} → ${toVersion}\n\nSee full changelog at: https://github.com/Klara-copilot/epost_agent_kit/releases`;
}
