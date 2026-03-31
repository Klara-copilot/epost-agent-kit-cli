/**
 * Read/write module for .epost.json — user project install state.
 * Schema lives in src/types/epost-config.ts (Zod).
 */

import { join } from 'node:path';
import { z } from 'zod';
import { EpostConfigSchema, EPOST_CONFIG_FILE, type EpostProjectConfig } from '@/types/epost-config.js';
import { safeReadFile, safeWriteFile } from '@/shared/file-system.js';
import { ConfigError } from '@/types/errors.js';

/**
 * Read .epost.json from the given project directory.
 * Returns null if file does not exist.
 * Throws ConfigError on parse/validation failure.
 */
export async function readEpostConfig(cwd: string): Promise<EpostProjectConfig | null> {
  const filePath = join(cwd, EPOST_CONFIG_FILE);
  const raw = await safeReadFile(filePath);

  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(`${EPOST_CONFIG_FILE} is not valid JSON`);
  }

  try {
    return EpostConfigSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ConfigError(`${EPOST_CONFIG_FILE} schema error: ${issues}`);
    }
    throw error;
  }
}

/**
 * Write .epost.json to the given project directory.
 * Validates before writing.
 */
export async function writeEpostConfig(cwd: string, config: EpostProjectConfig): Promise<void> {
  const validated = EpostConfigSchema.parse(config);
  const filePath = join(cwd, EPOST_CONFIG_FILE);
  await safeWriteFile(filePath, JSON.stringify(validated, null, 2) + '\n');
}
