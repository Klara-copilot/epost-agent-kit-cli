/**
 * GitHub Access Checker
 * Verifies GitHub authentication and repository access
 */

import { execSync } from 'node:child_process';
import { logger } from '@/shared/logger.js';

export interface RepoAccessResult {
  hasAccess: boolean;
  error?: string;
}

/**
 * Get GitHub token from gh CLI
 * @returns Token string or null if not authenticated
 */
export async function getGitHubToken(): Promise<string | null> {
  try {
    const result = execSync('gh auth token', { encoding: 'utf-8' });
    const token = result.trim();

    if (token && token.length > 0) {
      logger.debug('GitHub token obtained from gh CLI');
      return token;
    }

    return null;
  } catch (error) {
    logger.debug(`Failed to get GitHub token from gh CLI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Check if gh CLI is installed
 * @returns true if gh CLI is available
 */
export async function checkGhCliInstalled(): Promise<boolean> {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user is authenticated with gh CLI
 * @returns true if authenticated
 */
export async function checkGhAuthenticated(): Promise<boolean> {
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check repository access via GitHub API
 * @param repo Repository in format "owner/repo"
 * @returns Access result with hasAccess flag and optional error message
 */
export async function checkRepoAccess(repo: string): Promise<RepoAccessResult> {
  const token = await getGitHubToken();

  if (!token) {
    return {
      hasAccess: false,
      error: 'No GitHub token available',
    };
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'epost-kit-cli',
      },
    });

    if (response.status === 200) {
      logger.debug(`Access verified for repository: ${repo}`);
      return { hasAccess: true };
    }

    if (response.status === 404) {
      return {
        hasAccess: false,
        error: 'Repository not found or no access',
      };
    }

    if (response.status === 401) {
      return {
        hasAccess: false,
        error: 'Authentication failed - token may be expired',
      };
    }

    return {
      hasAccess: false,
      error: `Unexpected response: ${response.status} ${response.statusText}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to check repository access: ${errorMessage}`);
    return {
      hasAccess: false,
      error: errorMessage,
    };
  }
}

/**
 * Check GitHub access with comprehensive error handling
 * @returns true if authenticated and CLI is available
 */
export async function checkGitHubAccess(): Promise<boolean> {
  // Check if gh CLI is installed
  const ghInstalled = await checkGhCliInstalled();
  if (!ghInstalled) {
    logger.error('gh CLI is not installed');
    return false;
  }

  // Check if authenticated
  const ghAuthenticated = await checkGhAuthenticated();
  if (!ghAuthenticated) {
    logger.error('Not authenticated with GitHub CLI');
    return false;
  }

  // Verify we can get a token
  const token = await getGitHubToken();
  if (!token) {
    logger.error('Failed to obtain GitHub token');
    return false;
  }

  logger.debug('GitHub access verified');
  return true;
}
