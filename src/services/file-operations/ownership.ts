/**
 * File ownership tracking system
 * Implements three-tier classification: epost-owned, epost-modified, user-created
 */

import { readFile, writeFile, access } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { minimatch } from 'minimatch';
import { verifyChecksum } from '@/services/file-operations/checksum.js';
import { FileOwnershipError } from '@/types/errors.js';
import { METADATA_FILE, PROTECTED_FILE_PATTERNS } from '@/shared/constants.js';
import type { Metadata, FileOwnership } from '@/types/index.js';

/**
 * Ownership tiers for file classification
 */
export type OwnershipTier = 'epost-owned' | 'epost-modified' | 'user-created';

/**
 * Check if file path matches protected patterns
 */
export function isProtectedPath(relativePath: string): boolean {
  return PROTECTED_FILE_PATTERNS.some(pattern =>
    minimatch(relativePath, pattern, { dot: true })
  );
}

/** Read metadata from project directory (returns null if missing/invalid) */
export async function readMetadata(projectDir: string): Promise<Metadata | null> {
  try {
    const metadataPath = join(projectDir, METADATA_FILE);
    await access(metadataPath);
    const content = await readFile(metadataPath, 'utf-8');
    const metadata = JSON.parse(content) as Metadata;
    if (!metadata.cliVersion || !metadata.target || !metadata.files) return null;
    return metadata;
  } catch {
    return null;
  }
}

/** Write metadata atomically (temp file + rename) */
export async function writeMetadata(projectDir: string, metadata: Metadata): Promise<void> {
  try {
    const metadataPath = join(projectDir, METADATA_FILE);
    const content = JSON.stringify(metadata, null, 2);
    await writeFile(metadataPath, content, 'utf-8');
  } catch (error) {
    throw new FileOwnershipError(
      `Failed to write metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/** Generate fresh metadata for new installation */
export function generateMetadata(
  cliVersion: string,
  target: 'claude' | 'cursor' | 'github-copilot',
  kitVersion: string,
  files: Record<string, FileOwnership>,
  options?: { profile?: string; installedPackages?: string[] }
): Metadata {
  return {
    cliVersion,
    target,
    kitVersion,
    profile: options?.profile,
    installedPackages: options?.installedPackages,
    installedAt: new Date().toISOString(),
    files
  };
}

/** Update metadata with file changes */
export async function updateMetadata(
  projectDir: string,
  updates: {
    add?: Record<string, FileOwnership>;
    remove?: string[];
    modify?: Record<string, Partial<FileOwnership>>;
  }
): Promise<void> {
  const metadata = await readMetadata(projectDir);
  if (!metadata) throw new FileOwnershipError('Metadata not found');

  if (updates.add) Object.assign(metadata.files, updates.add);
  if (updates.remove) {
    for (const path of updates.remove) delete metadata.files[path];
  }
  if (updates.modify) {
    for (const [path, changes] of Object.entries(updates.modify)) {
      if (metadata.files[path]) Object.assign(metadata.files[path], changes);
    }
  }

  metadata.updatedAt = new Date().toISOString();
  await writeMetadata(projectDir, metadata);
}

/** Classify file based on ownership tier */
export async function classifyFile(
  filePath: string,
  projectDir: string,
  metadata: Metadata | null
): Promise<OwnershipTier> {
  const relativePath = relative(projectDir, filePath);

  if (isProtectedPath(relativePath)) return 'user-created';
  if (!metadata || !metadata.files[relativePath]) return 'user-created';

  const fileEntry = metadata.files[relativePath];
  const matches = await verifyChecksum(filePath, fileEntry.checksum);
  return matches ? 'epost-owned' : 'epost-modified';
}

/** Get all files with specific ownership tier */
export async function getFilesByOwnership(
  projectDir: string,
  metadata: Metadata,
  tier: OwnershipTier
): Promise<string[]> {
  const results: string[] = [];
  for (const relativePath of Object.keys(metadata.files)) {
    try {
      const fullPath = join(projectDir, relativePath);
      await access(fullPath);
      const fileTier = await classifyFile(fullPath, projectDir, metadata);
      if (fileTier === tier) results.push(relativePath);
    } catch {
      continue;
    }
  }
  return results;
}

/** Get files modified by user (checksum mismatch) */
export async function getModifiedFiles(projectDir: string, metadata: Metadata): Promise<string[]> {
  return getFilesByOwnership(projectDir, metadata, 'epost-modified');
}

/** Get files safe to update (epost-owned) */
export async function getOwnedFiles(projectDir: string, metadata: Metadata): Promise<string[]> {
  return getFilesByOwnership(projectDir, metadata, 'epost-owned');
}
