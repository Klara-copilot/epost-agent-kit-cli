/**
 * Template management: download, extract, and list kit templates from GitHub releases
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, rm, readdir } from 'node:fs/promises';
import { execa } from 'execa';
import { fetchLatestRelease, fetchReleases, downloadRelease } from '@/domains/github/github-client.js';
import { NetworkError } from '@/types/errors.js';
import { logger } from '@/shared/logger.js';
import { GITHUB_ORG, GITHUB_REPO } from '@/shared/constants.js';

export interface KitTemplate {
  id: string;
  name: string;
  description: string;
  targets: Array<'claude' | 'cursor' | 'github-copilot'>;
}

/** Available kit templates (hardcoded for v1, engineer only) */
export const AVAILABLE_KITS: KitTemplate[] = [
  {
    id: 'engineer',
    name: 'Engineer Kit',
    description: 'Full-stack development with 19 agents + 17 skills',
    targets: ['claude', 'cursor', 'github-copilot'],
  },
];

/** List available kit templates */
export function listAvailableKits(): KitTemplate[] {
  return AVAILABLE_KITS;
}

/** Download kit from GitHub release */
export async function downloadKit(
  kit: string,
  version: string,
  destPath: string
): Promise<void> {
  logger.debug(`Downloading kit ${kit}@${version} to ${destPath}`);

  // Fetch release info
  const releases = await fetchReleases(GITHUB_ORG, GITHUB_REPO);
  const targetRelease = version === 'latest'
    ? await fetchLatestRelease(GITHUB_ORG, GITHUB_REPO)
    : releases.find(r => r.tag_name === version);

  if (!targetRelease) {
    throw new NetworkError(`Release ${version} not found`);
  }

  // Find tarball asset (source code archive)
  const tarballAsset = targetRelease.assets.find(a => a.name.endsWith('.tar.gz'));
  if (!tarballAsset) {
    throw new NetworkError(`No tarball found in release ${version}`);
  }

  // Download to temp directory
  const tempDir = join(tmpdir(), `epost-kit-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    const tarballPath = join(tempDir, tarballAsset.name);
    await downloadRelease(tarballAsset.browser_download_url, tarballPath);

    // Extract tarball to destination
    await extractTemplate(tarballPath, destPath);

    logger.debug(`Kit ${kit}@${version} extracted to ${destPath}`);
  } finally {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  }
}

/** Extract tarball template to destination (flattens top-level directory) */
export async function extractTemplate(tarballPath: string, destPath: string): Promise<void> {
  logger.debug(`Extracting ${tarballPath} to ${destPath}`);

  await mkdir(destPath, { recursive: true });

  // Extract using tar command (cross-platform)
  await execa('tar', [
    '-xzf',
    tarballPath,
    '-C',
    destPath,
    '--strip-components=1',
  ]);
}

/** Get list of files in extracted kit (relative paths) */
export async function getKitFiles(kitPath: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(dir: string, prefix = ''): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = join(prefix, entry.name);

      if (entry.isDirectory()) {
        await scan(join(dir, entry.name), relativePath);
      } else {
        files.push(relativePath);
      }
    }
  }

  await scan(kitPath);
  return files;
}
