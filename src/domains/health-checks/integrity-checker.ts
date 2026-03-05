/**
 * Installed-file integrity verification via .epost-metadata.json checksums
 */

import { join, relative } from 'node:path';
import { readdir } from 'node:fs/promises';
import { hashFile } from '@/services/file-operations/checksum.js';
import { safeReadFile, fileExists } from '@/shared/file-system.js';
import { METADATA_FILE } from '@/shared/constants.js';
import type { Metadata } from '@/types/index.js';

export interface IntegrityResult {
  file: string;
  status: 'ok' | 'modified' | 'missing' | 'extra';
  /** Expected checksum (only set when status === 'modified') */
  expected?: string;
  /** Actual checksum (only set when status === 'modified') */
  actual?: string;
}

export interface IntegritySummary {
  results: IntegrityResult[];
  total: number;
  ok: number;
  modified: string[];
  missing: string[];
  extra: string[];
  metadataPresent: boolean;
}

/**
 * Scan directory recursively for all files, returning relative paths
 */
async function scanDir(dir: string, base: string, results: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(full, base, results);
      } else {
        results.push(relative(base, full));
      }
    }
  } catch {
    // skip unreadable directories
  }
  return results;
}

/**
 * Check installed file integrity against .epost-metadata.json checksums.
 * Runs all file hashes in parallel (batched to avoid fd exhaustion).
 *
 * @param cwd Project root (where .epost-metadata.json lives)
 * @returns IntegritySummary including per-file results
 */
export async function checkInstalledIntegrity(cwd: string): Promise<IntegritySummary> {
  const metadataPath = join(cwd, METADATA_FILE);
  const raw = await safeReadFile(metadataPath);

  if (!raw) {
    return {
      results: [],
      total: 0,
      ok: 0,
      modified: [],
      missing: [],
      extra: [],
      metadataPresent: false,
    };
  }

  let metadata: Metadata;
  try {
    metadata = JSON.parse(raw) as Metadata;
  } catch {
    return {
      results: [],
      total: 0,
      ok: 0,
      modified: [],
      missing: [],
      extra: [],
      metadataPresent: false,
    };
  }

  const fileEntries = Object.entries(metadata.files ?? {});
  const results: IntegrityResult[] = [];

  // Batch size to avoid opening too many file descriptors simultaneously
  const BATCH = 20;
  for (let i = 0; i < fileEntries.length; i += BATCH) {
    const batch = fileEntries.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(async ([filePath, entry]) => {
        const absPath = join(cwd, filePath);
        const exists = await fileExists(absPath);

        if (!exists) {
          return { file: filePath, status: 'missing' as const };
        }

        const actual = await hashFile(absPath);
        const expected = entry.checksum;

        if (actual === expected) {
          return { file: filePath, status: 'ok' as const };
        }

        return {
          file: filePath,
          status: 'modified' as const,
          expected,
          actual,
        };
      })
    );
    results.push(...batchResults);
  }

  // Detect extra files in .claude/ not tracked in metadata
  const claudeDir = join(cwd, '.claude');
  const trackedSet = new Set(fileEntries.map(([p]) => p));
  const diskFiles = await scanDir(claudeDir, cwd);

  for (const diskFile of diskFiles) {
    // Normalize to forward slashes for cross-platform key matching
    const normalized = diskFile.replace(/\\/g, '/');
    if (!trackedSet.has(normalized) && !trackedSet.has(diskFile)) {
      results.push({ file: normalized, status: 'extra' });
    }
  }

  const ok = results.filter((r) => r.status === 'ok').length;
  const modified = results.filter((r) => r.status === 'modified').map((r) => r.file);
  const missing = results.filter((r) => r.status === 'missing').map((r) => r.file);
  const extra = results.filter((r) => r.status === 'extra').map((r) => r.file);

  return {
    results,
    total: fileEntries.length,
    ok,
    modified,
    missing,
    extra,
    metadataPresent: true,
  };
}
