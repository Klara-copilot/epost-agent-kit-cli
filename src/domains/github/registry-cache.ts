/**
 * Registry Cache — 1-hour TTL cache for remote bundles.yaml and skill-index.json.
 *
 * Separate from release-cache.ts (which caches release tarballs at 24h TTL).
 * Cache dir: ~/.epost-kit/cache/registry/
 *
 * Configurable TTL via EPOST_KIT_CACHE_TTL env var (seconds, default: 3600).
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileExists } from '@/shared/file-system.js';
import { logger } from '@/shared/logger.js';

const REGISTRY_CACHE_DIR = join(homedir(), '.epost-kit', 'cache', 'registry');

/** Default TTL: 1 hour in milliseconds */
const DEFAULT_TTL_MS = 3600 * 1000;

function getTtlMs(): number {
  const envVal = parseInt(process.env.EPOST_KIT_CACHE_TTL ?? '', 10);
  return isNaN(envVal) ? DEFAULT_TTL_MS : envVal * 1000;
}

interface CacheEntry<T> {
  cachedAt: string;
  data: T;
}

/** Sanitize a cache key to a safe filename */
function safeKey(key: string): string {
  return key.replace(/[/\\?*:|"<>]/g, '-');
}

/** Read a cached value if it exists and has not expired */
export async function readRegistryCache<T>(key: string, noCache = false): Promise<T | null> {
  if (noCache) return null;

  const file = join(REGISTRY_CACHE_DIR, safeKey(key));
  if (!(await fileExists(file))) {
    logger.debug(`Registry cache miss: ${key}`);
    return null;
  }

  try {
    const raw = await readFile(file, 'utf-8');
    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - new Date(entry.cachedAt).getTime();

    if (age > getTtlMs()) {
      logger.debug(`Registry cache expired: ${key} (age ${Math.round(age / 60000)}m)`);
      await rm(file, { force: true });
      return null;
    }

    logger.debug(`Registry cache hit: ${key} (age ${Math.round(age / 60000)}m)`);
    return entry.data;
  } catch {
    return null;
  }
}

/** Write a value to the registry cache */
export async function writeRegistryCache<T>(key: string, data: T): Promise<void> {
  try {
    await mkdir(REGISTRY_CACHE_DIR, { recursive: true });
    const entry: CacheEntry<T> = { cachedAt: new Date().toISOString(), data };
    await writeFile(
      join(REGISTRY_CACHE_DIR, safeKey(key)),
      JSON.stringify(entry),
      'utf-8',
    );
  } catch (err) {
    // Cache write failures are non-fatal
    logger.debug(`Registry cache write failed: ${err instanceof Error ? err.message : err}`);
  }
}

/** Invalidate the entire registry cache (useful for --force-download) */
export async function clearRegistryCache(): Promise<void> {
  await rm(REGISTRY_CACHE_DIR, { recursive: true, force: true });
}
