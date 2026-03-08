/**
 * Core type definitions for epost-kit CLI
 */

/**
 * User configuration loaded from .epostrc or epost.config.*
 */
export interface EpostConfig {
  /** GitHub repository URL (default: Klara-copilot/epost_agent_kit) */
  repository?: string;
  /** Target IDE (claude | cursor | vscode) */
  target?: 'claude' | 'cursor' | 'vscode';
  /** Installation directory (default: .claude | .cursor | .github) */
  installDir?: string;
  /** Protected file patterns to exclude from modification */
  protectedPatterns?: string[];
}

/**
 * File ownership metadata for tracking installed files
 */
export interface FileOwnership {
  /** File path relative to project root */
  path: string;
  /** SHA256 checksum of file content (after LF normalization) */
  checksum: string;
  /** Installation timestamp (ISO 8601) */
  installedAt: string;
  /** Source version from which file was installed */
  version: string;
  /** Whether file was modified after installation */
  modified: boolean;
  /** Which package owns this file */
  package?: string;
}

/**
 * Metadata file structure (.epost-metadata.json)
 */
export interface Metadata {
  /** epost-kit CLI version used for installation */
  cliVersion: string;
  /** Target IDE */
  target: 'claude' | 'cursor' | 'vscode';
  /** Installed epost-agent-kit version */
  kitVersion: string;
  /** Active profile (if installed via profile) */
  profile?: string;
  /** List of installed package names */
  installedPackages?: string[];
  /** Source path used during installation (local dev mode) */
  source?: string;
  /** Installation timestamp */
  installedAt: string;
  /** Last update timestamp */
  updatedAt?: string;
  /** Tracked files */
  files: Record<string, FileOwnership>;
}

/**
 * Common options for all commands
 */
export interface CommandOptions {
  /** Enable verbose logging */
  verbose?: boolean;
  /** Suppress interactive prompts (CI mode) */
  yes?: boolean;
  /** Dry run mode (no file modifications) */
  dryRun?: boolean;
}

/**
 * GitHub release asset information
 */
export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}
