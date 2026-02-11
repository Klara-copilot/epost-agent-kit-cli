/**
 * Configuration loader with multi-level precedence and Zod validation
 * Precedence: env vars > local config > global config
 */

import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ConfigError } from '@/types/errors.js';
import { safeReadFile } from '@/shared/file-system.js';
import { APP_NAME } from '@/shared/constants.js';

/**
 * Zod schema for epost-kit configuration
 */
export const ConfigSchema = z.object({
  kit: z.string().optional(),
  version: z.string().optional(),
  target: z.enum(['claude', 'cursor', 'github-copilot']).optional(),
  registry: z.string().url().optional(),
  /** Profile name (e.g., "web-b2b", "ios-b2c") */
  profile: z.string().optional(),
  /** Explicit list of packages to install */
  packages: z.array(z.string()).optional(),
  /** Optional packages to include */
  optional: z.array(z.string()).optional(),
  /** Packages to exclude from installation */
  exclude: z.array(z.string()).optional(),
  /** Workspace configuration */
  workspace: z.object({
    root: z.string().optional(),
    shared_claude_md: z.boolean().default(true),
  }).optional(),
});

export type EpostConfig = z.infer<typeof ConfigSchema>;

/**
 * Load configuration with precedence: env > local > global
 */
export async function loadConfig(cwd?: string): Promise<EpostConfig> {
  const config: EpostConfig = {};

  // 1. Global config from ~/.epost-kit/config.json
  const globalConfigPath = getGlobalConfigPath();
  const globalContent = await safeReadFile(globalConfigPath);
  if (globalContent) {
    try {
      const globalConfig = JSON.parse(globalContent);
      Object.assign(config, globalConfig);
    } catch {
      throw new ConfigError(`Invalid JSON in global config: ${globalConfigPath}`);
    }
  }

  // 2. Local config via cosmiconfig
  const explorer = cosmiconfig(APP_NAME);
  const result = await explorer.search(cwd);
  if (result && !result.isEmpty) {
    Object.assign(config, result.config);
  }

  // 3. Environment variables (highest priority)
  if (process.env.EPOST_KIT_TARGET) {
    config.target = process.env.EPOST_KIT_TARGET as EpostConfig['target'];
  }
  if (process.env.EPOST_KIT_VERSION) {
    config.version = process.env.EPOST_KIT_VERSION;
  }
  if (process.env.EPOST_KIT_REGISTRY) {
    config.registry = process.env.EPOST_KIT_REGISTRY;
  }
  if (process.env.EPOST_KIT_PROFILE) {
    config.profile = process.env.EPOST_KIT_PROFILE;
  }

  // Validate merged config
  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ConfigError(`Invalid configuration: ${issues}`);
    }
    throw error;
  }
}

/**
 * Get path to local config file (if exists)
 */
export async function getConfigPath(cwd?: string): Promise<string | null> {
  const explorer = cosmiconfig(APP_NAME);
  const result = await explorer.search(cwd);
  return result?.filepath ?? null;
}

/**
 * Get path to global config file
 */
export function getGlobalConfigPath(): string {
  return join(homedir(), `.${APP_NAME}`, 'config.json');
}
