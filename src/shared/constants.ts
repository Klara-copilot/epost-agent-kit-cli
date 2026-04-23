/**
 * Application-wide constants for epost-kit CLI
 */

export const APP_NAME = 'epost-kit';

export const GITHUB_ORG = 'Klara-copilot';
export const GITHUB_REPO = 'epost_agent_kit';
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_ORG}/${GITHUB_REPO}`;

/**
 * Configuration file names (searched in order via cosmiconfig)
 */
export const CONFIG_FILE_NAMES = [
  '.epostrc',
  '.epostrc.json',
  '.epostrc.yaml',
  '.epostrc.yml',
  'epost.config.js',
  'epost.config.cjs',
  'epost.config.mjs'
];

/**
 * File patterns that should NEVER be modified by epost-kit
 */
export const PROTECTED_FILE_PATTERNS = [
  '.git/**',
  'node_modules/**',
  '.env',
  '.env.*',
  '*.key',
  '*.pem',
  '*.p12',
  '*.pfx'
];

/**
 * Default target directories for IDE-specific installations
 */
export const IDE_TARGETS = {
  CLAUDE: '.claude',
  CURSOR: '.cursor',
  GITHUB_COPILOT: '.github'
} as const;

/**
 * Metadata file for tracking installed files and ownership
 */
export const METADATA_FILE = '.epost-metadata.json';

/**
 * Keys that must be stripped during config merging to prevent prototype pollution
 */
export const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'] as const;
