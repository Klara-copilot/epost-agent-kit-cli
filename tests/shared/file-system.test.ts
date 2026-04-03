/**
 * Unit tests for File System utilities
 * Priority: P2 - Infrastructure
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTempDir, cleanupTempDir, createFileStructure } from '../helpers/test-utils.js';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import {
  fileExists,
  dirExists,
  safeReadFile,
  safeWriteFile,
  safeCopyDir,
  isProtectedFile,
} from '@/shared/file-system.js';

describe('FileSystem', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('File Existence', () => {
    it('should detect existing files', async () => {
      await createFileStructure(tempDir, {
        'test.txt': 'content',
      });

      const exists = await fileExists(join(tempDir, 'test.txt'));
      expect(exists).toBe(true);
    });

    it('should return false for non-existent files', async () => {
      const exists = await fileExists(join(tempDir, 'missing.txt'));
      expect(exists).toBe(false);
    });

    it('should detect existing directories', async () => {
      await createFileStructure(tempDir, {
        'subdir/file.txt': 'content',
      });

      const exists = await dirExists(join(tempDir, 'subdir'));
      expect(exists).toBe(true);
    });

    it('should return false for non-existent directories', async () => {
      const exists = await dirExists(join(tempDir, 'missing'));
      expect(exists).toBe(false);
    });
  });

  describe('Safe File Reading', () => {
    it('should read file content safely', async () => {
      await createFileStructure(tempDir, {
        'test.txt': 'test content',
      });

      const content = await safeReadFile(join(tempDir, 'test.txt'));
      expect(content).toBe('test content');
    });

    it('should return null for missing files', async () => {
      const content = await safeReadFile(join(tempDir, 'missing.txt'));
      expect(content).toBeNull();
    });

    it('should handle empty files', async () => {
      await createFileStructure(tempDir, {
        'empty.txt': '',
      });

      const content = await safeReadFile(join(tempDir, 'empty.txt'));
      expect(content).toBe('');
    });
  });

  describe('Safe File Writing', () => {
    it('should write file content safely', async () => {
      const filePath = join(tempDir, 'output.txt');
      await safeWriteFile(filePath, 'test content');

      const exists = await fileExists(filePath);
      expect(exists).toBe(true);

      const content = await safeReadFile(filePath);
      expect(content).toBe('test content');
    });

    it('should create parent directories', async () => {
      const filePath = join(tempDir, 'nested/dir/file.txt');
      await safeWriteFile(filePath, 'content');

      const exists = await fileExists(filePath);
      expect(exists).toBe(true);
    });

    it('should overwrite existing files', async () => {
      const filePath = join(tempDir, 'file.txt');
      await safeWriteFile(filePath, 'original');
      await safeWriteFile(filePath, 'updated');

      const content = await safeReadFile(filePath);
      expect(content).toBe('updated');
    });
  });

  describe('Directory Copying', () => {
    it('should copy directories recursively', async () => {
      const sourceDir = join(tempDir, 'source');
      const destDir = join(tempDir, 'dest');

      await createFileStructure(tempDir, {
        'source/file1.txt': 'content1',
        'source/subdir/file2.txt': 'content2',
      });

      await safeCopyDir(sourceDir, destDir);

      const exists1 = await fileExists(join(destDir, 'file1.txt'));
      const exists2 = await fileExists(join(destDir, 'subdir/file2.txt'));
      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
    });

    it('should handle empty directories', async () => {
      const sourceDir = join(tempDir, 'empty');
      const destDir = join(tempDir, 'dest');

      await mkdir(sourceDir, { recursive: true });
      await safeCopyDir(sourceDir, destDir);

      const exists = await dirExists(destDir);
      expect(exists).toBe(true);
    });
  });

  describe('Protected Files', () => {
    it('should identify exact .env file as protected', () => {
      expect(isProtectedFile('.env')).toBe(true);
    });

    it('should identify .env variants as protected', () => {
      expect(isProtectedFile('.env.local')).toBe(true);
      expect(isProtectedFile('.env.production')).toBe(true);
      expect(isProtectedFile('.env.test')).toBe(true);
    });

    it('should not protect regular files', () => {
      expect(isProtectedFile('README.md')).toBe(false);
      expect(isProtectedFile('src/index.ts')).toBe(false);
      expect(isProtectedFile('package.json')).toBe(false);
      expect(isProtectedFile('test.txt')).toBe(false);
    });

    it('should handle .env files in subdirectories', () => {
      expect(isProtectedFile('config/.env')).toBe(true);
      expect(isProtectedFile('secrets/.env.production')).toBe(true);
      expect(isProtectedFile('app/.env.local')).toBe(true);
    });

    it('should use basename for checking', () => {
      // isProtectedFile uses basename, so only the filename matters
      expect(isProtectedFile('deep/nested/path/.env')).toBe(true);
      expect(isProtectedFile('any/path/.env.local')).toBe(true);
    });
  });
});
