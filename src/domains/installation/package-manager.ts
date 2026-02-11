/**
 * Package manager detection and execution
 * Detects PM via lock files: pnpm > yarn > bun > npm (precedence order)
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { execa } from 'execa';

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm';

const LOCK_FILES: Record<PackageManager, string> = {
  pnpm: 'pnpm-lock.yaml',
  yarn: 'yarn.lock',
  bun: 'bun.lockb',
  npm: 'package-lock.json',
};

/**
 * Detect package manager from lock files
 * Priority: pnpm > yarn > bun > npm (fallback)
 */
export async function detectPackageManager(cwd: string): Promise<PackageManager> {
  const pmOrder: PackageManager[] = ['pnpm', 'yarn', 'bun', 'npm'];

  for (const pm of pmOrder) {
    const lockPath = join(cwd, LOCK_FILES[pm]);
    try {
      await access(lockPath);
      return pm;
    } catch {
      // Lock file doesn't exist, try next
    }
  }

  return 'npm'; // Default fallback
}

/**
 * Execute package manager command
 */
export async function runPackageManager(
  pm: PackageManager,
  args: string[],
  cwd: string
): Promise<void> {
  await execa(pm, args, { cwd, stdio: 'inherit' });
}

/**
 * Get install command string for display
 */
export function getInstallCommand(pm: PackageManager): string {
  const commands: Record<PackageManager, string> = {
    pnpm: 'pnpm install',
    yarn: 'yarn install',
    bun: 'bun install',
    npm: 'npm install',
  };
  return commands[pm];
}
