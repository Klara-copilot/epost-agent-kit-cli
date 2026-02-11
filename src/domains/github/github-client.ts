/**
 * GitHub API client with authentication fallback and rate limit handling
 * Auth priority: GITHUB_TOKEN env > gh CLI > unauthenticated
 */

import { execa } from 'execa';
import { NetworkError } from '@/types/errors.js';
import { logger } from '@/shared/logger.js';

const GITHUB_API_BASE = 'https://api.github.com';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface GitHubRelease {
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

/**
 * Get GitHub auth token from multiple sources
 * Priority: GITHUB_TOKEN env > gh auth token > null
 */
export async function getAuthToken(): Promise<string | null> {
  // 1. Check environment variable
  if (process.env.GITHUB_TOKEN) {
    logger.debug('Using GITHUB_TOKEN from environment');
    return process.env.GITHUB_TOKEN;
  }

  // 2. Try gh CLI
  try {
    const { stdout } = await execa('gh', ['auth', 'token']);
    if (stdout.trim()) {
      logger.debug('Using token from gh CLI');
      return stdout.trim();
    }
  } catch {
    logger.debug('gh CLI not available or not authenticated');
  }

  // 3. Fallback to unauthenticated (60 req/hr limit)
  logger.debug('Using unauthenticated GitHub API (60 req/hr limit)');
  return null;
}

/**
 * Make authenticated GitHub API request with retry logic
 */
async function githubRequest<T>(endpoint: string, attempt = 1): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'epost-kit-cli',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, { headers });

    if (!response.ok) {
      if (response.status === 403 && attempt < MAX_RETRIES) {
        // Rate limit, retry with exponential backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger.debug(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return githubRequest<T>(endpoint, attempt + 1);
      }

      throw new NetworkError(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError(
      `Failed to fetch from GitHub API: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch all releases for a repository
 */
export async function fetchReleases(
  owner: string,
  repo: string,
  options?: { includePrerelease?: boolean }
): Promise<GitHubRelease[]> {
  const releases = await githubRequest<GitHubRelease[]>(`/repos/${owner}/${repo}/releases`);

  return releases.filter((r) => {
    if (r.draft) return false;
    if (!options?.includePrerelease && r.prerelease) return false;
    return true;
  });
}

/**
 * Fetch latest stable release
 */
export async function fetchLatestRelease(owner: string, repo: string): Promise<GitHubRelease> {
  return githubRequest<GitHubRelease>(`/repos/${owner}/${repo}/releases/latest`);
}

/**
 * Download release asset with progress
 */
export async function downloadRelease(url: string, destPath: string): Promise<void> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'User-Agent': 'epost-kit-cli',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new NetworkError(`Failed to download release: ${response.status} ${response.statusText}`);
  }

  // Stream to file (implementation would use streams, simplified here)
  const buffer = Buffer.from(await response.arrayBuffer());
  const { writeFile } = await import('node:fs/promises');
  await writeFile(destPath, buffer);
}
