/**
 * Safe file system operations with error handling
 * All operations use node:fs/promises for async I/O
 */

import {
  readFile,
  writeFile,
  mkdir,
  access,
  readdir,
  stat,
  copyFile,
  rename,
  unlink,
  constants,
} from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { PROTECTED_FILE_PATTERNS } from './constants.js';

/**
 * Read file safely, returns null on error
 */
export async function safeReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Write file safely with atomic write (temp file + rename)
 * Creates parent directories if needed
 */
export async function safeWriteFile(path: string, content: string): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });

  // Atomic write via temp file + rename (POSIX atomic operation)
  const tempPath = `${path}.tmp.${Date.now()}`;
  try {
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, path); // Atomic on POSIX systems
  } catch (error) {
    // Clean up temp file on failure
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Copy directory recursively with optional filter
 */
export async function safeCopyDir(
  src: string,
  dest: string,
  options?: { filter?: (_path: string) => boolean }
): Promise<void> {
  const filter = options?.filter ?? (() => true);

  const entries = await readdir(src, { withFileTypes: true });

  await mkdir(dest, { recursive: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (!filter(srcPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      await safeCopyDir(srcPath, destPath, options);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Check if file exists and is readable
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Check if directory exists and is readable
 */
export async function dirExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file matches protected patterns
 */
export function isProtectedFile(filePath: string): boolean {
  const filename = basename(filePath);

  return PROTECTED_FILE_PATTERNS.some((pattern) => {
    if (pattern.endsWith('*')) {
      // Glob pattern like .env*
      const prefix = pattern.slice(0, -1);
      return filename.startsWith(prefix);
    }
    if (pattern.endsWith('/')) {
      // Directory pattern like .git/
      return filePath.includes(pattern);
    }
    // Exact match
    return filename === pattern || filePath.includes(pattern);
  });
}
