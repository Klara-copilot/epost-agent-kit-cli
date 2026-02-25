/**
 * Backup management for safe file operations
 */

import { join, basename } from 'node:path';
import { mkdir, readdir, stat, rm } from 'node:fs/promises';
import { safeCopyDir, dirExists } from '@/shared/file-system.js';
import { logger } from '@/shared/logger.js';

const BACKUP_DIR = '.epost-kit-backup';

// Directories to always exclude from backup
const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  '.cache',
  'coverage',
  '.epost-kit-backup',
];

export interface BackupOptions {
  /** Only backup this specific subdirectory (e.g., ".claude") */
  subdirectory?: string;
}

/** Create backup of directory with timestamp label */
export async function createBackup(
  sourceDir: string,
  label: string,
  options?: BackupOptions,
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${label}-${timestamp}`;
  const backupPath = join(sourceDir, BACKUP_DIR, backupName);

  logger.debug(`Creating backup: ${backupPath}`);

  await mkdir(join(sourceDir, BACKUP_DIR), { recursive: true });

  // If subdirectory specified, only backup that directory
  if (options?.subdirectory) {
    const subdirPath = join(sourceDir, options.subdirectory);
    if (await dirExists(subdirPath)) {
      await safeCopyDir(subdirPath, join(backupPath, options.subdirectory), {
        filter: (path: string) => !EXCLUDE_DIRS.some((d) => path.includes(`/${d}`) || path.includes(`\\${d}`)),
      });
      logger.debug(`Backup created: ${backupPath} (subdirectory: ${options.subdirectory})`);
    } else {
      logger.debug(`Subdirectory not found, skipping backup: ${options.subdirectory}`);
    }
    return backupPath;
  }

  // Full backup with exclusions
  await safeCopyDir(sourceDir, backupPath, {
    filter: (path: string) => {
      const name = basename(path);
      return !EXCLUDE_DIRS.includes(name);
    },
  });

  logger.debug(`Backup created: ${backupPath}`);
  return backupPath;
}

/** Restore from backup */
export async function restoreBackup(backupPath: string, targetDir: string): Promise<void> {
  logger.debug(`Restoring backup from ${backupPath} to ${targetDir}`);

  if (!(await dirExists(backupPath))) {
    throw new Error(`Backup not found: ${backupPath}`);
  }

  await safeCopyDir(backupPath, targetDir);
  logger.debug(`Backup restored successfully`);
}

/** List available backups */
export async function listBackups(projectDir: string): Promise<string[]> {
  const backupPath = join(projectDir, BACKUP_DIR);

  if (!(await dirExists(backupPath))) {
    return [];
  }

  const entries = await readdir(backupPath, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/** Clean old backups, keeping only the N most recent */
export async function cleanOldBackups(projectDir: string, keepCount: number): Promise<void> {
  const backupPath = join(projectDir, BACKUP_DIR);

  if (!(await dirExists(backupPath))) {
    return;
  }

  const entries = await readdir(backupPath, { withFileTypes: true });
  const backups = entries.filter((e) => e.isDirectory());

  // Sort by modification time (newest first)
  const sorted = await Promise.all(
    backups.map(async (entry) => {
      const fullPath = join(backupPath, entry.name);
      const stats = await stat(fullPath);
      return { name: entry.name, mtime: stats.mtime, path: fullPath };
    })
  );

  sorted.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  // Remove old backups
  const toRemove = sorted.slice(keepCount);
  for (const backup of toRemove) {
    logger.debug(`Removing old backup: ${backup.name}`);
    await rm(backup.path, { recursive: true, force: true });
  }
}
