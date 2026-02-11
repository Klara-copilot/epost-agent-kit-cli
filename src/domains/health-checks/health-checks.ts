/**
 * Health check functions for doctor command
 * Each check returns status, message, and optional fix function
 */

import { access, mkdir, readFile, chmod, constants } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { platform } from 'node:os';
import { execa } from 'execa';
import { logger } from '@/shared/logger.js';
import { METADATA_FILE } from '@/shared/constants.js';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface CheckResult {
  status: CheckStatus;
  message: string;
  fixable: boolean;
  fix?: () => Promise<void>;
}

const MIN_NODE_VERSION = 18;
const isWindows = platform() === 'win32';
const REQUIRED_DIRS = ['agents', 'commands', 'skills'];

export async function checkNodeVersion(): Promise<CheckResult> {
  const version = process.versions.node;
  const major = parseInt(version.split('.')[0], 10);

  return major >= MIN_NODE_VERSION
    ? {
        status: 'pass',
        message: `Node.js ${version} (>= ${MIN_NODE_VERSION} required)`,
        fixable: false,
      }
    : {
        status: 'fail',
        message: `Node.js ${version} too old (>= ${MIN_NODE_VERSION} required)`,
        fixable: false,
      };
}

async function getMissingDirs(claudeDir: string): Promise<string[]> {
  const missing: string[] = [];
  for (const dir of REQUIRED_DIRS) {
    if (!existsSync(join(claudeDir, dir))) missing.push(dir);
  }
  return missing;
}

async function createClaudeStructure(claudeDir: string): Promise<void> {
  await mkdir(claudeDir, { recursive: true });
  for (const dir of REQUIRED_DIRS) {
    await mkdir(join(claudeDir, dir), { recursive: true });
  }
}

export async function checkClaudeDir(cwd: string): Promise<CheckResult> {
  const claudeDir = join(cwd, '.claude');

  try {
    await access(claudeDir, constants.R_OK);
    const missing = await getMissingDirs(claudeDir);

    if (missing.length === 0) {
      return { status: 'pass', message: '.claude/ structure complete', fixable: false };
    }

    return {
      status: 'warn',
      message: `Missing: ${missing.join(', ')}`,
      fixable: true,
      fix: async () => {
        for (const dir of missing) {
          await mkdir(join(claudeDir, dir), { recursive: true });
        }
      },
    };
  } catch {
    return {
      status: 'fail',
      message: '.claude/ not found',
      fixable: true,
      fix: () => createClaudeStructure(claudeDir),
    };
  }
}

export async function checkMetadata(cwd: string): Promise<CheckResult> {
  const path = join(cwd, METADATA_FILE);

  try {
    const data = JSON.parse(await readFile(path, 'utf-8'));
    const missing = ['cliVersion', 'kitVersion', 'installedAt'].filter((k) => !data[k]);

    return missing.length === 0
      ? { status: 'pass', message: 'metadata.json valid', fixable: false }
      : {
          status: 'warn',
          message: `metadata.json missing: ${missing.join(', ')}`,
          fixable: true,
          fix: async () => logger.debug('Update metadata fields'),
        };
  } catch {
    return {
      status: 'warn',
      message: 'metadata.json not found',
      fixable: true,
      fix: async () => {
        await mkdir(dirname(path), { recursive: true });
        logger.debug('Generate metadata.json');
      },
    };
  }
}

export async function checkGitHubAuth(): Promise<CheckResult> {
  if (process.env.GITHUB_TOKEN) {
    return { status: 'pass', message: 'GitHub auth (GITHUB_TOKEN)', fixable: false };
  }

  try {
    const { stdout } = await execa('gh', ['auth', 'token']);
    if (stdout.trim()) {
      return { status: 'pass', message: 'GitHub auth (gh CLI)', fixable: false };
    }
  } catch {
    // Fall through
  }

  return {
    status: 'warn',
    message: 'GitHub not authenticated (60 req/hr). Run: gh auth login',
    fixable: false,
  };
}

export async function checkFilePermissions(cwd: string): Promise<CheckResult> {
  if (isWindows) {
    return { status: 'pass', message: 'Permissions (Windows - skipped)', fixable: false };
  }

  const claudeDir = join(cwd, '.claude');

  try {
    await access(claudeDir, constants.R_OK | constants.W_OK);
    return { status: 'pass', message: 'File permissions OK', fixable: false };
  } catch {
    return {
      status: 'fail',
      message: '.claude/ not readable/writable',
      fixable: true,
      fix: () => chmod(claudeDir, 0o755),
    };
  }
}

export async function checkDependencies(cwd: string): Promise<CheckResult> {
  if (!existsSync(join(cwd, 'package.json'))) {
    return { status: 'pass', message: 'No package.json', fixable: false };
  }

  if (!existsSync(join(cwd, 'node_modules'))) {
    return { status: 'warn', message: 'node_modules missing. Run: npm install', fixable: false };
  }

  return { status: 'pass', message: 'Dependencies installed', fixable: false };
}

export async function runAllChecks(cwd: string): Promise<CheckResult[]> {
  return Promise.all([
    checkNodeVersion(),
    checkClaudeDir(cwd),
    checkMetadata(cwd),
    checkGitHubAuth(),
    checkFilePermissions(cwd),
    checkDependencies(cwd),
  ]);
}
