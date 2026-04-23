/**
 * Shared helpers for config command handlers
 * resolveInstallDir, readCurrentKitConfig, printConfig
 */

import { join, resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import { readMetadata } from '@/services/file-operations/ownership.js';
import { safeReadFile } from '@/shared/file-system.js';
import { getByPath } from '@/domains/config/config-path-utils.js';
import { enforceFilePermissions } from '@/domains/config/config-security.js';

/**
 * Resolve install directory from metadata.
 * Falls back to <dir>/.claude if metadata is missing.
 */
export async function resolveInstallDir(
  dir?: string,
): Promise<{ projectDir: string; installDir: string }> {
  const projectDir = dir ? resolve(dir) : resolve(process.cwd());
  const metadata = await readMetadata(projectDir);

  if (metadata?.target) {
    const targetDirMap: Record<string, string> = {
      claude: '.claude',
      cursor: '.cursor',
      vscode: '.github',
    };
    const installDirName = targetDirMap[metadata.target] ?? '.claude';
    return { projectDir, installDir: join(projectDir, installDirName) };
  }

  // Fallback: guess from what exists
  for (const candidate of ['.claude', '.cursor', '.github']) {
    const { dirExists } = await import('@/shared/file-system.js');
    if (await dirExists(join(projectDir, candidate))) {
      return { projectDir, installDir: join(projectDir, candidate) };
    }
  }

  return { projectDir, installDir: join(projectDir, '.claude') };
}

/** Read .epost-kit.json from installDir, returns {} on missing/invalid */
export async function readCurrentKitConfig(
  installDir: string,
): Promise<Record<string, any>> {
  const configPath = join(installDir, '.epost-kit.json');
  const content = await safeReadFile(configPath);
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/** Write config object as JSON to installDir/.epost-kit.json with permission enforcement */
export async function writeKitConfig(
  installDir: string,
  config: Record<string, any>,
): Promise<void> {
  const configPath = join(installDir, '.epost-kit.json');
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  await enforceFilePermissions(configPath);
}

/** Pretty-print a config object as aligned key: value pairs */
export function printConfig(
  obj: Record<string, any>,
  prefix = '',
): void {
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      printConfig(val, fullKey);
    } else {
      const display = JSON.stringify(val);
      console.log(`  ${pc.cyan(fullKey.padEnd(36))} ${display}`);
    }
  }
}

/** Safe nested get with fallback */
export function getPath(
  obj: Record<string, any>,
  path: string,
  fallback: any = undefined,
): any {
  const val = getByPath(obj, path);
  return val === undefined ? fallback : val;
}
