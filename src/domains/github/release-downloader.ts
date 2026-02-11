/**
 * GitHub Release Downloader
 * Downloads and extracts releases from GitHub repositories
 */

import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extract } from 'tar';
import ora from 'ora';
import { logger } from '@/shared/logger.js';
import { safeCopyDir, fileExists } from '@/shared/file-system.js';
import { KitPathResolver } from '@/shared/path-resolver.js';
import { getCachedRelease, cacheRelease } from './release-cache.js';
import { validateRelease } from './release-validator.js';
import { fetchLatestRelease, downloadRelease } from './github-client.js';

export interface DownloadOptions {
  forceDownload?: boolean;
  onProgress?: (downloaded: number, total: number) => void;
}

// GitHub API calls now consolidated through github-client.ts

/**
 * Extract tarball to destination directory
 */
async function extractTarball(tarballPath: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });

  await extract({
    file: tarballPath,
    cwd: destDir,
    strip: 1, // Remove top-level directory
  });
}

/**
 * Download latest release from GitHub
 * @param repo Repository in format "owner/repo"
 * @param options Download options
 * @returns Path to extracted directory
 */
export async function downloadLatestRelease(
  repo: string,
  options: DownloadOptions = {},
): Promise<string> {
  const spinner = ora('Fetching release info...').start();

  try {
    // 1. Get latest release info using consolidated client
    const [owner, repoName] = repo.split('/');
    const release = await fetchLatestRelease(owner, repoName);
    const tarballUrl = release.tarball_url;
    const releaseTag = release.tag_name;

    spinner.text = `Found release: ${releaseTag}`;
    logger.debug(`Release tag: ${releaseTag}, tarball URL: ${tarballUrl}`);

    // 2. Check cache first (unless force download)
    const cacheKey = `${repo.replace('/', '-')}-${releaseTag}.tar.gz`;

    if (!options.forceDownload) {
      const cachedPath = await getCachedRelease(cacheKey);
      if (cachedPath) {
        spinner.succeed('Using cached release');
        logger.debug(`Using cached release: ${cachedPath}`);

        // Extract from cache
        const tempDir = join(tmpdir(), `epost-kit-${Date.now()}`);
        await extractTarball(cachedPath, tempDir);

        return tempDir;
      }
    }

    // 3. Download tarball using consolidated client
    const tempDir = join(tmpdir(), `epost-kit-${Date.now()}`);
    const tarballPath = join(tempDir, 'release.tar.gz');

    await mkdir(tempDir, { recursive: true });

    spinner.text = 'Downloading release...';
    await downloadRelease(tarballUrl, tarballPath);

    spinner.text = 'Download complete, extracting...';

    // 4. Extract tarball
    const extractDir = join(tempDir, 'extracted');
    await extractTarball(tarballPath, extractDir);

    spinner.succeed('Release downloaded and extracted');

    // 5. Cache the tarball
    await cacheRelease(cacheKey, tarballPath, releaseTag);

    return extractDir;
  } catch (error) {
    spinner.fail('Failed to download release');
    throw error;
  }
}

/**
 * Copy packages and profiles from extracted release
 * @param extractedDir Path to extracted release directory
 * @param targetDir Optional target directory (defaults to process.cwd())
 */
export async function copyPackagesAndProfiles(
  extractedDir: string,
  targetDir?: string,
): Promise<void> {
  const spinner = ora('Validating release structure...').start();

  // Create resolver lazily with correct working directory
  const kitPaths = new KitPathResolver(targetDir || process.cwd());

  // 1. Validate release structure
  const validationResult = await validateRelease(extractedDir);

  if (!validationResult.valid) {
    spinner.fail('Release validation failed');
    await rm(extractedDir, { recursive: true, force: true });
    throw new Error(`Invalid release: ${validationResult.errors.join(', ')}`);
  }

  if (validationResult.warnings.length > 0) {
    validationResult.warnings.forEach((warning) => {
      logger.warn(warning);
    });
  }

  spinner.succeed('Release structure validated');

  // 2. Copy packages directory
  spinner.start('Copying packages...');
  const packagesSource = join(extractedDir, 'packages');
  const packagesDir = await kitPaths.getPackagesDir();

  await safeCopyDir(packagesSource, packagesDir);
  spinner.succeed(`Packages copied to ${packagesDir}`);

  // 3. Copy profiles.yaml if exists
  const profilesSource = join(extractedDir, 'profiles', 'profiles.yaml');

  if (await fileExists(profilesSource)) {
    spinner.start('Copying profiles...');
    const profilesPath = await kitPaths.getProfilesPath();
    const { copyFile } = await import('node:fs/promises');
    await copyFile(profilesSource, profilesPath);
    spinner.succeed(`Profiles copied to ${profilesPath}`);
  }

  // 4. Cleanup temp directory
  spinner.start('Cleaning up...');
  await rm(extractedDir, { recursive: true, force: true });
  spinner.succeed('Setup complete');
}
