/**
 * Test utilities for creating temporary directories and files
 */

import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Create a temporary directory for testing
 */
export async function createTempDir(): Promise<string> {
  const prefix = join(tmpdir(), 'epost-test-');
  return await mkdtemp(prefix);
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
    console.warn(`Failed to cleanup ${dir}:`, error);
  }
}

/**
 * Create a file structure in a directory
 */
export async function createFileStructure(
  baseDir: string,
  structure: Record<string, string>
): Promise<void> {
  for (const [path, content] of Object.entries(structure)) {
    const fullPath = join(baseDir, path);
    const dir = join(fullPath, '..');
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
  }
}

/**
 * Create a minimal kit structure for testing
 */
export async function createKitStructure(baseDir: string): Promise<void> {
  await createFileStructure(baseDir, {
    'package.json': JSON.stringify({ name: 'epost-agent-kit', version: '1.0.0' }),
    'packages/core/package.yaml': 'name: core\nversion: 1.0.0\n',
    'profiles.yaml': 'full:\n  display_name: Full Profile\n  packages: [core]\n',
  });
}
