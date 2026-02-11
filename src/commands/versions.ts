/**
 * Command: epost-kit versions
 * List available kit versions from GitHub releases
 */

import pc from 'picocolors';
import { fetchReleases } from '@/domains/github/github-client.js';
import { NetworkError } from '@/types/errors.js';
import { logger } from '@/shared/logger.js';
import type { VersionsOptions } from '@/types/commands.js';

const REPO_OWNER = 'Klara-copilot';
const REPO_NAME = 'epost_agent_kit';
const DEFAULT_LIMIT = 10;

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Truncate changelog to first line or first 80 chars
 */
function truncateChangelog(body: string | null): string {
  if (!body) return '';
  const firstLine = body.split('\n')[0];
  return firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
}

export async function runVersions(opts: VersionsOptions): Promise<void> {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const includePre = opts.pre ?? false;

  const spinner = logger.spinner('Fetching releases from GitHub...');
  spinner.start();

  try {
    const releases = await fetchReleases(REPO_OWNER, REPO_NAME, {
      includePrerelease: includePre,
    });

    spinner.stop();

    if (releases.length === 0) {
      logger.warn('No releases found');
      return;
    }

    // Display releases as a formatted table
    console.log('');
    console.log(pc.bold('Available Versions:'));
    console.log('');

    const limitedReleases = releases.slice(0, limit);
    const latest = releases[0];

    for (let i = 0; i < limitedReleases.length; i++) {
      const release = limitedReleases[i];
      const isLatest = release.tag_name === latest.tag_name;
      const date = formatDate(release.published_at);

      // Format: version | date | [status] | changelog
      let line = '';

      // Version (colored)
      const versionColor = isLatest ? pc.green : pc.white;
      line += versionColor(release.tag_name.padEnd(15));

      // Date
      line += pc.dim(date.padEnd(12));

      // Status badge
      if (isLatest) {
        line += pc.green('[LATEST]'.padEnd(10));
      } else if (release.prerelease) {
        line += pc.yellow('[PRE]'.padEnd(10));
      } else {
        line += pc.blue('[STABLE]'.padEnd(10));
      }

      // Changelog preview
      const changelog = truncateChangelog(release.name);
      line += pc.dim(changelog);

      console.log(line);
    }

    console.log('');

    // Summary footer
    const total = releases.length;
    const showing = limitedReleases.length;
    if (showing < total) {
      logger.info(`Showing ${showing} of ${total} releases. Use --limit to see more.`);
    } else {
      logger.info(`Showing all ${total} releases.`);
    }

    if (!includePre) {
      logger.info('Use --pre to include pre-releases.');
    }
  } catch (error) {
    spinner.stop();

    if (error instanceof NetworkError) {
      logger.error('Failed to fetch releases from GitHub');
      logger.error(error.message);
      process.exit(1);
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}
