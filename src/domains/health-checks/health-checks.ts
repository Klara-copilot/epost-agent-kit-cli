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

export async function checkResearchEngine(cwd: string): Promise<CheckResult> {
  // Locate .epost-kit.json in install dir
  const candidates = [
    join(cwd, '.claude', '.epost-kit.json'),
    join(cwd, '.cursor', '.epost-kit.json'),
  ];

  let engine: string = 'websearch';
  for (const configPath of candidates) {
    if (existsSync(configPath)) {
      try {
        const raw = JSON.parse(await readFile(configPath, 'utf-8'));
        const e = raw?.skills?.research?.engine;
        if (typeof e === 'string') engine = e;
      } catch {
        // ignore parse errors — treat as unconfigured
      }
      break;
    }
  }

  if (engine === 'websearch') {
    return { status: 'pass', message: 'Research engine: websearch (built-in)', fixable: false };
  }

  if (engine === 'gemini') {
    // Check gemini binary
    try {
      await execa('gemini', ['--version']);
      return { status: 'pass', message: 'Research engine: Gemini CLI (found)', fixable: false };
    } catch {
      // Check GEMINI_API_KEY as fallback
      let apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const dotEnvPath = join(cwd, '.claude', '.env');
        if (existsSync(dotEnvPath)) {
          try {
            const lines = (await readFile(dotEnvPath, 'utf-8')).split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('GEMINI_API_KEY=')) {
                apiKey = trimmed.slice('GEMINI_API_KEY='.length).replace(/^["']|["']$/g, '');
                break;
              }
            }
          } catch { /* ignore */ }
        }
      }
      if (apiKey) {
        return { status: 'pass', message: 'Research engine: Gemini (API key set, no CLI)', fixable: false };
      }
      return {
        status: 'warn',
        message: 'Research engine: Gemini — CLI not found and GEMINI_API_KEY not set. Run: npm i -g @google/gemini-cli',
        fixable: false,
      };
    }
  }

  if (engine === 'perplexity') {
    let apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      const dotEnvPath = join(cwd, '.claude', '.env');
      if (existsSync(dotEnvPath)) {
        try {
          const lines = (await readFile(dotEnvPath, 'utf-8')).split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('PERPLEXITY_API_KEY=')) {
              apiKey = trimmed.slice('PERPLEXITY_API_KEY='.length).replace(/^["']|["']$/g, '');
              break;
            }
          }
        } catch { /* ignore */ }
      }
    }
    if (apiKey) {
      return { status: 'pass', message: 'Research engine: Perplexity (API key set)', fixable: false };
    }
    return {
      status: 'warn',
      message: 'Research engine: Perplexity — PERPLEXITY_API_KEY not set. Set via `epost-kit config` → Secrets → PERPLEXITY_API_KEY',
      fixable: false,
    };
  }

  // Unknown engine — pass with info
  return { status: 'pass', message: `Research engine: ${engine} (unrecognized, skipping check)`, fixable: false };
}

export async function runAllChecks(cwd: string): Promise<CheckResult[]> {
  return Promise.all([
    checkNodeVersion(),
    checkClaudeDir(cwd),
    checkMetadata(cwd),
    checkGitHubAuth(),
    checkFilePermissions(cwd),
    checkDependencies(cwd),
    checkResearchEngine(cwd),
  ]);
}
