/**
 * Unit tests for Ownership Tracker
 * Priority: P1 - Core Business Logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTempDir, cleanupTempDir, createFileStructure } from '../helpers/test-utils.js';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  readMetadata,
  writeMetadata,
  generateMetadata,
  updateMetadata,
  isProtectedPath,
  classifyFile,
} from '@/services/file-operations/ownership.js';
import { hashFile } from '@/services/file-operations/checksum.js';

describe('OwnershipTracker', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('Protected Paths', () => {
    it('should identify .env files as protected', () => {
      expect(isProtectedPath('.env')).toBe(true);
      expect(isProtectedPath('.env.local')).toBe(true);
    });

    it('should identify secret files as protected', () => {
      expect(isProtectedPath('secret.key')).toBe(true);
      expect(isProtectedPath('cert.pem')).toBe(true);
    });

    it('should not protect regular markdown files', () => {
      expect(isProtectedPath('README.md')).toBe(false);
      expect(isProtectedPath('.claude/agents/test.md')).toBe(false);
    });
  });

  describe('Metadata Operations', () => {
    it('should generate fresh metadata', () => {
      const metadata = generateMetadata(
        '0.1.0',
        'claude',
        '1.0.0',
        {},
        { profile: 'full', installedPackages: ['core'] }
      );

      expect(metadata.cliVersion).toBe('0.1.0');
      expect(metadata.target).toBe('claude');
      expect(metadata.kitVersion).toBe('1.0.0');
      expect(metadata.profile).toBe('full');
      expect(metadata.installedPackages).toEqual(['core']);
      expect(metadata.installedAt).toBeDefined();
      expect(metadata.files).toEqual({});
    });

    it('should write and read metadata', async () => {
      const metadata = generateMetadata('0.1.0', 'claude', '1.0.0', {});
      await writeMetadata(tempDir, metadata);

      const read = await readMetadata(tempDir);
      expect(read).not.toBeNull();
      expect(read?.cliVersion).toBe('0.1.0');
      expect(read?.target).toBe('claude');
    });

    it('should return null for missing metadata', async () => {
      const metadata = await readMetadata(tempDir);
      expect(metadata).toBeNull();
    });

    it('should update metadata with new files', async () => {
      const initial = generateMetadata('0.1.0', 'claude', '1.0.0', {});
      await writeMetadata(tempDir, initial);

      await updateMetadata(tempDir, {
        add: {
          'test.md': {
            checksum: 'abc123',
            size: 100,
            package: 'core',
          },
        },
      });

      const updated = await readMetadata(tempDir);
      expect(updated?.files['test.md']).toBeDefined();
      expect(updated?.files['test.md'].checksum).toBe('abc123');
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should remove files from metadata', async () => {
      const initial = generateMetadata('0.1.0', 'claude', '1.0.0', {
        'test.md': { checksum: 'abc', size: 10, package: 'core' },
      });
      await writeMetadata(tempDir, initial);

      await updateMetadata(tempDir, {
        remove: ['test.md'],
      });

      const updated = await readMetadata(tempDir);
      expect(updated?.files['test.md']).toBeUndefined();
    });
  });

  describe('File Classification', () => {
    it('should classify new files as user-created', async () => {
      const filePath = join(tempDir, 'new-file.md');
      await writeFile(filePath, 'New content');

      const tier = await classifyFile(filePath, tempDir, null);
      expect(tier).toBe('user-created');
    });

    it('should classify unmodified files as epost-owned', async () => {
      const content = 'Test content';
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, content);

      const checksum = await hashFile(filePath);
      const metadata = generateMetadata('0.1.0', 'claude', '1.0.0', {
        'test.md': { checksum, size: content.length, package: 'core' },
      });

      const tier = await classifyFile(filePath, tempDir, metadata);
      expect(tier).toBe('epost-owned');
    });

    it('should classify modified files as epost-modified', async () => {
      const originalContent = 'Original content';
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, originalContent);

      const originalChecksum = await hashFile(filePath);
      const metadata = generateMetadata('0.1.0', 'claude', '1.0.0', {
        'test.md': { checksum: originalChecksum, size: originalContent.length, package: 'core' },
      });

      // Modify the file
      await writeFile(filePath, 'Modified content');

      const tier = await classifyFile(filePath, tempDir, metadata);
      expect(tier).toBe('epost-modified');
    });
  });
});
