/**
 * Config security: prototype-pollution guards, value sanitization, file permissions
 */

import { chmod } from 'node:fs/promises';
import { DANGEROUS_KEYS } from '@/shared/constants.js';
import { deepMerge } from './settings-merger.js';

/**
 * Check whether a key is safe to merge (not a prototype-pollution vector)
 */
export function isSafeKey(key: string): boolean {
  return !(DANGEROUS_KEYS as readonly string[]).includes(key);
}

/**
 * Recursively strip functions and symbols from config values
 */
export function sanitizeConfigValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (Array.isArray(value)) return value.map(sanitizeConfigValue);
  if (typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (!isSafeKey(k)) continue;
      const sanitized = sanitizeConfigValue(v);
      if (sanitized !== undefined) clean[k] = sanitized;
    }
    return clean;
  }
  return value;
}

/**
 * Deep merge with prototype-pollution guard.
 * Strips dangerous keys before delegating to the existing deepMerge.
 */
export function safeDeepMerge(
  base: Record<string, any>,
  override: Record<string, any>,
): Record<string, any> {
  const safeOverride: Record<string, any> = {};
  for (const key of Object.keys(override)) {
    if (!isSafeKey(key)) continue;
    safeOverride[key] = override[key];
  }
  return deepMerge(base, safeOverride);
}

const isWindows = process.platform === 'win32';

/**
 * Restrict config file to owner-read/write only (0o600). No-op on Windows.
 */
export async function enforceFilePermissions(filePath: string): Promise<void> {
  if (isWindows) return;
  try {
    await chmod(filePath, 0o600);
  } catch {
    // Permission enforcement is best-effort; log callers may warn downstream
  }
}

/**
 * Restrict config directory to owner-only access (0o700). No-op on Windows.
 */
export async function enforceDirPermissions(dirPath: string): Promise<void> {
  if (isWindows) return;
  try {
    await chmod(dirPath, 0o700);
  } catch {
    // Permission enforcement is best-effort; log callers may warn downstream
  }
}
