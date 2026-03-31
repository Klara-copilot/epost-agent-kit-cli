/**
 * Version comparison engine for kit content updates.
 *
 * Compares installed kit version (from .epost.json) against remote kit version
 * (from GitHub registry). Uses semver comparison.
 */

import type { EpostProjectConfig } from '@/types/epost-config.js';

export interface VersionDiff {
  /** Kit version installed in this project (from .epost.json) */
  installedKitVersion: string;
  /** Latest kit version available remotely */
  latestKitVersion: string;
  /** True if latestKitVersion > installedKitVersion */
  hasUpdate: boolean;
  /** Human-readable update label, e.g. "1.0.0 → 1.1.0" */
  label: string;
}

/**
 * Parse a semver-like string into comparable numbers.
 * Supports "v1.2.3" or "1.2.3" formats.
 */
function parseVersion(v: string): [number, number, number] {
  const clean = v.replace(/^v/, '').trim();
  const parts = clean.split('.').map((p) => parseInt(p, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Returns true if `remote` is strictly greater than `installed`.
 */
function isNewer(installed: string, remote: string): boolean {
  const [ia, ib, ic] = parseVersion(installed);
  const [ra, rb, rc] = parseVersion(remote);
  if (ra !== ia) return ra > ia;
  if (rb !== ib) return rb > ib;
  return rc > ic;
}

/**
 * Compare installed kit version against remote.
 * Returns null if either version is unknown.
 */
export function compareKitVersions(
  config: Pick<EpostProjectConfig, 'kitVersion'>,
  remoteKitVersion: string | null,
): VersionDiff | null {
  if (!remoteKitVersion) return null;

  const installed = config.kitVersion;
  if (!installed) return null;

  const hasUpdate = isNewer(installed, remoteKitVersion);

  return {
    installedKitVersion: installed,
    latestKitVersion: remoteKitVersion,
    hasUpdate,
    label: `${installed} → ${remoteKitVersion}`,
  };
}

/**
 * Format a VersionDiff for console display.
 */
export function formatVersionDiff(diff: VersionDiff): string {
  if (!diff.hasUpdate) {
    return `Kit content is up to date (${diff.installedKitVersion})`;
  }
  return `Kit update available: ${diff.label}`;
}
