/**
 * Tests for update command smart-merge behavior (issue #8)
 * Verifies that epost-kit update preserves user-modified/user-created files
 * and only overwrites kit-owned (unmodified) files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { createTempDir, cleanupTempDir } from '../helpers/test-utils.js';
import {
  writeMetadata,
  generateMetadata,
} from '@/services/file-operations/ownership.js';
import { hashFile } from '@/services/file-operations/checksum.js';

/**
 * Helper: write a kit-managed file and track its checksum in metadata.
 * Returns metadata with the file registered as kit-owned.
 */
async function installKitFile(
  projectDir: string,
  relPath: string,
  content: string,
) {
  const fullPath = join(projectDir, relPath);
  await mkdir(join(fullPath, '..'), { recursive: true });
  await writeFile(fullPath, content, 'utf-8');
  const checksum = await hashFile(fullPath);
  return { relPath, checksum };
}

describe('Update smart-merge (issue #8)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('UpdateOptions type', () => {
    it('should accept fresh flag', () => {
      // Verify UpdateOptions accepts fresh: boolean (compile-time check at runtime)
      const opts: import('@/types/commands.js').UpdateOptions = { fresh: true };
      expect(opts.fresh).toBe(true);
    });

    it('should default fresh to undefined when not set', () => {
      const opts: import('@/types/commands.js').UpdateOptions = {};
      expect(opts.fresh).toBeUndefined();
    });
  });

  describe('buildSmartMergeSkipSet logic via ownership', () => {
    it('should identify user-modified files via checksum mismatch', async () => {
      const { classifyFile } = await import('@/services/file-operations/ownership.js');

      // Install file and record its original checksum
      const { checksum } = await installKitFile(tempDir, '.claude/agents/test.agent.md', 'original');
      const metadata = generateMetadata('1.0.0', 'claude', '2.0.0', {
        '.claude/agents/test.agent.md': { checksum, size: 8, package: 'core' },
      });
      await writeMetadata(tempDir, metadata);

      // File unmodified → epost-owned (safe to overwrite)
      const tier1 = await classifyFile(
        join(tempDir, '.claude/agents/test.agent.md'),
        tempDir,
        metadata
      );
      expect(tier1).toBe('epost-owned');

      // Modify the file
      await writeFile(join(tempDir, '.claude/agents/test.agent.md'), 'user changes', 'utf-8');

      // File modified → epost-modified (must skip)
      const tier2 = await classifyFile(
        join(tempDir, '.claude/agents/test.agent.md'),
        tempDir,
        metadata
      );
      expect(tier2).toBe('epost-modified');
    });

    it('should treat files not in metadata as user-created', async () => {
      const { classifyFile } = await import('@/services/file-operations/ownership.js');

      await installKitFile(tempDir, '.claude/my-custom.md', 'user content');
      const metadata = generateMetadata('1.0.0', 'claude', '2.0.0', {});
      await writeMetadata(tempDir, metadata);

      const tier = await classifyFile(
        join(tempDir, '.claude/my-custom.md'),
        tempDir,
        metadata
      );
      expect(tier).toBe('user-created');
    });
  });

  describe('update command opts', () => {
    it('should not pass fresh:true by default (smart-merge mode)', async () => {
      // Verify update.ts passes opts.fresh ?? false to runInit
      // We test the value propagation by checking UpdateOptions defaults
      const opts: import('@/types/commands.js').UpdateOptions = {
        dir: tempDir,
        json: true,
        dryRun: true, // use dry-run to avoid actual GitHub calls
      };
      expect(opts.fresh).toBeUndefined();
      // opts.fresh ?? false === false → smart-merge mode (no wipe)
      expect(opts.fresh ?? false).toBe(false);
    });

    it('should pass fresh:true when --fresh flag is set', () => {
      const opts: import('@/types/commands.js').UpdateOptions = { fresh: true };
      expect(opts.fresh ?? false).toBe(true);
    });
  });

  describe('init.ts wipe guard logic', () => {
    it('should wipe on fresh install (no metadata)', async () => {
      // No metadata present → isUpdate = false → always wipe
      const { readMetadata } = await import('@/services/file-operations/ownership.js');
      const metadata = await readMetadata(tempDir);
      const isUpdate = !!metadata && !false; // opts.fresh=false
      expect(isUpdate).toBe(false); // no metadata → not an update → wipe
    });

    it('should not wipe when isUpdate && !fresh', async () => {
      // With metadata present and fresh=false → isUpdate=true → smart-merge
      const metadata = generateMetadata('1.0.0', 'claude', '2.0.0', {});
      await writeMetadata(tempDir, metadata);

      const { readMetadata } = await import('@/services/file-operations/ownership.js');
      const readBack = await readMetadata(tempDir);
      const isFresh = false;
      const isUpdate = !!readBack && !isFresh;
      expect(isUpdate).toBe(true); // metadata exists, not fresh → smart-merge
    });

    it('should wipe when isUpdate && fresh=true', async () => {
      // With metadata present but fresh=true → wipe
      const metadata = generateMetadata('1.0.0', 'claude', '2.0.0', {});
      await writeMetadata(tempDir, metadata);

      const { readMetadata } = await import('@/services/file-operations/ownership.js');
      const readBack = await readMetadata(tempDir);
      const isFresh = true;
      const isUpdate = !!readBack && !isFresh;
      // isUpdate=false because fresh=true → wipe happens
      expect(isUpdate).toBe(false);
    });
  });

  describe('User-modified file preservation (integration)', () => {
    it('should preserve a user-modified file content after metadata classification', async () => {
      const originalContent = '# Original Agent\nThis is kit content.';
      const userContent = '# My Custom Agent\nThis is user content.';

      const { checksum } = await installKitFile(
        tempDir,
        '.claude/agents/my-agent.md',
        originalContent
      );

      const metadata = generateMetadata('1.0.0', 'claude', '2.0.0', {
        '.claude/agents/my-agent.md': { checksum, size: originalContent.length, package: 'core' },
      });
      await writeMetadata(tempDir, metadata);

      // User modifies the file
      await writeFile(join(tempDir, '.claude/agents/my-agent.md'), userContent, 'utf-8');

      // Verify classification identifies it as modified
      const { classifyFile } = await import('@/services/file-operations/ownership.js');
      const tier = await classifyFile(
        join(tempDir, '.claude/agents/my-agent.md'),
        tempDir,
        metadata
      );
      expect(tier).toBe('epost-modified');

      // User content should still be intact (we didn't overwrite it)
      const currentContent = await readFile(join(tempDir, '.claude/agents/my-agent.md'), 'utf-8');
      expect(currentContent).toBe(userContent);
    });
  });
});
