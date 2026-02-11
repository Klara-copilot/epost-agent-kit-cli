/**
 * Helpers for creating temporary test projects and kit structures
 */

import { createTempDir, createFileStructure, createKitStructure } from './test-utils.js';

export interface TestProject {
  dir: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a temporary test project directory
 */
export async function createTestProject(options?: {
  withMetadata?: boolean;
}): Promise<TestProject> {
  const dir = await createTempDir();

  const structure: Record<string, string> = {
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
    }),
  };

  if (options?.withMetadata) {
    structure['.epost-metadata.json'] = JSON.stringify({
      cliVersion: '0.1.0',
      files: {},
    });
  }

  await createFileStructure(dir, structure);

  return {
    dir,
    cleanup: async () => {
      const { cleanupTempDir } = await import('./test-utils.js');
      await cleanupTempDir(dir);
    },
  };
}

/**
 * Create a temporary kit directory with full structure
 */
export async function createTestKit(): Promise<TestProject> {
  const dir = await createTempDir();
  await createKitStructure(dir);

  return {
    dir,
    cleanup: async () => {
      const { cleanupTempDir } = await import('./test-utils.js');
      await cleanupTempDir(dir);
    },
  };
}
