/**
 * GitHub Release Cache
 * Manages caching of downloaded releases
 */

import { join } from 'node:path';
import { mkdir, readFile, writeFile, copyFile, stat, rm, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { logger } from '@/shared/logger.js';
import { fileExists } from '@/shared/file-system.js';

const CACHE_DIR = join(homedir(), '.epost-kit', 'cache', 'releases');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheMeta {
  cacheKey: string;
  cachedAt: string;
  fileSize: number;
  releaseTag: string;
}

/**
 * Get cached release if available and not expired
 * @param cacheKey Unique key for the cached release
 * @returns Path to cached file or null if not found/expired
 */
export async function getCachedRelease(cacheKey: string): Promise<string | null> {
  // Sanitize to prevent path traversal
  const safeCacheKey = sanitizeFilename(cacheKey);
  const cachePath = join(CACHE_DIR, safeCacheKey);
  const metaPath = join(CACHE_DIR, `${safeCacheKey}.meta.json`);

  if (!(await fileExists(cachePath))) {
    logger.debug(`Cache miss for ${cacheKey}`);
    return null;
  }

  try {
    // Check TTL
    const metaContent = await readFile(metaPath, 'utf-8');
    const meta: CacheMeta = JSON.parse(metaContent);
    const age = Date.now() - new Date(meta.cachedAt).getTime();

    if (age > CACHE_TTL_MS) {
      logger.debug(`Cache expired for ${cacheKey} (age: ${Math.round(age / 1000 / 60)} minutes)`);
      // Clean up expired cache
      await rm(cachePath, { force: true });
      await rm(metaPath, { force: true });
      return null;
    }

    logger.debug(`Cache hit for ${cacheKey} (age: ${Math.round(age / 1000 / 60)} minutes)`);
    return cachePath;
  } catch (error) {
    logger.debug(`Failed to read cache metadata for ${cacheKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Sanitize filename to prevent path traversal
 */
function sanitizeFilename(filename: string): string {
  // Remove path separators and parent directory references
  return filename.replace(/[/\\]|\.\.+/g, '-');
}

/**
 * Cache a downloaded release
 * @param cacheKey Unique key for the cached release
 * @param sourcePath Path to the release tarball
 * @param releaseTag Git tag of the release
 */
export async function cacheRelease(
  cacheKey: string,
  sourcePath: string,
  releaseTag: string,
): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });

    // Sanitize to prevent path traversal
    const safeCacheKey = sanitizeFilename(cacheKey);
    const cachePath = join(CACHE_DIR, safeCacheKey);
    const metaPath = join(CACHE_DIR, `${safeCacheKey}.meta.json`);

    // Copy tarball to cache
    await copyFile(sourcePath, cachePath);

    // Write metadata
    const stats = await stat(cachePath);
    const meta: CacheMeta = {
      cacheKey,
      cachedAt: new Date().toISOString(),
      fileSize: stats.size,
      releaseTag,
    };

    await writeFile(metaPath, JSON.stringify(meta, null, 2));
    logger.debug(`Cached release: ${cacheKey} (${releaseTag})`);
  } catch (error) {
    logger.warn(`Failed to cache release: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Clear all cached releases
 */
export async function clearCache(): Promise<void> {
  try {
    if (!(await fileExists(CACHE_DIR))) {
      logger.debug('Cache directory does not exist');
      return;
    }

    const files = await readdir(CACHE_DIR);
    for (const file of files) {
      await rm(join(CACHE_DIR, file), { force: true });
    }

    logger.debug(`Cleared ${files.length} cached file(s)`);
  } catch (error) {
    logger.error(`Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get cache statistics
 * @returns Object with cache statistics
 */
export async function getCacheStats(): Promise<{
  count: number;
  totalSize: number;
  caches: Array<{ key: string; size: number; age: number; tag: string }>;
}> {
  try {
    if (!(await fileExists(CACHE_DIR))) {
      return { count: 0, totalSize: 0, caches: [] };
    }

    const files = await readdir(CACHE_DIR);
    const metaFiles = files.filter((f) => f.endsWith('.meta.json'));

    let totalSize = 0;
    const caches: Array<{ key: string; size: number; age: number; tag: string }> = [];

    for (const metaFile of metaFiles) {
      const metaPath = join(CACHE_DIR, metaFile);
      const metaContent = await readFile(metaPath, 'utf-8');
      const meta: CacheMeta = JSON.parse(metaContent);

      const age = Date.now() - new Date(meta.cachedAt).getTime();
      totalSize += meta.fileSize;

      caches.push({
        key: meta.cacheKey,
        size: meta.fileSize,
        age: Math.round(age / 1000 / 60), // age in minutes
        tag: meta.releaseTag,
      });
    }

    return {
      count: metaFiles.length,
      totalSize,
      caches,
    };
  } catch (error) {
    logger.error(`Failed to get cache stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { count: 0, totalSize: 0, caches: [] };
  }
}
