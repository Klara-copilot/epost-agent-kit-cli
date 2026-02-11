/**
 * GitHub Release Validator
 * Validates release structure before installation
 */

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { logger } from '@/shared/logger.js';
import { fileExists, dirExists } from '@/shared/file-system.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parse simple YAML file (basic key-value pairs)
 * This is a simplified parser for profiles.yaml validation
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const lines = content.split('\n');
  const result: Record<string, unknown> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check if line is a key-value pair
    const match = trimmed.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value) {
        result[key] = value;
      } else {
        // Multi-line value starts
        result[key] = {};
      }
    }
  }

  return result;
}

/**
 * Validate release structure
 * @param extractedDir Path to extracted release directory
 * @returns Validation result with errors and warnings
 */
export async function validateRelease(extractedDir: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  logger.debug(`Validating release at: ${extractedDir}`);

  // 1. Check packages/ directory exists
  const packagesDir = join(extractedDir, 'packages');
  if (!(await dirExists(packagesDir))) {
    errors.push('Missing packages/ directory');
  } else {
    logger.debug('packages/ directory found');

    // 2. Check core package exists
    const corePackageYaml = join(packagesDir, 'core', 'package.yaml');
    if (!(await fileExists(corePackageYaml))) {
      errors.push('Missing packages/core/package.yaml - core package is required');
    } else {
      logger.debug('Core package found');
    }
  }

  // 3. Validate profiles.yaml if exists
  const profilesPath = join(extractedDir, 'profiles', 'profiles.yaml');
  if (await fileExists(profilesPath)) {
    try {
      const profilesContent = await readFile(profilesPath, 'utf-8');

      // Basic validation - check if file is not empty
      if (profilesContent.trim().length === 0) {
        errors.push('profiles.yaml is empty');
      } else {
        const profiles = parseSimpleYaml(profilesContent);

        // Check at least 1 profile defined
        if (Object.keys(profiles).length === 0) {
          errors.push('profiles.yaml contains no profiles');
        } else {
          logger.debug(`Found ${Object.keys(profiles).length} profile(s)`);
        }
      }
    } catch (error) {
      errors.push(`Failed to parse profiles.yaml: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    warnings.push('No profiles.yaml found (will use defaults)');
  }

  // 4. Log validation results
  logger.debug(`Release validation results - Errors: ${errors.length}, Warnings: ${warnings.length}`);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
