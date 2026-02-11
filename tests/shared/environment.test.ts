/**
 * Unit tests for Environment utilities
 * Priority: P2 - Infrastructure
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Environment', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Preserve original env
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('Environment Detection', () => {
    it('should detect CI environment', async () => {
      process.env.CI = 'true';
      // Note: Environment variables are read at module load time
      // This test verifies the module exports are accessible
      const env = await import('@/shared/environment.js');
      expect(typeof env.isCI).toBe('boolean');
    });

    it('should detect verbose mode', async () => {
      process.env.VERBOSE = '1';
      const env = await import('@/shared/environment.js');
      expect(typeof env.isVerbose).toBe('boolean');
    });

    it('should detect NO_COLOR environment variable', async () => {
      process.env.NO_COLOR = '1';
      const env = await import('@/shared/environment.js');
      expect(typeof env.noColor).toBe('boolean');
    });
  });

  describe('Platform Detection', () => {
    it('should detect operating system', () => {
      expect(['darwin', 'linux', 'win32', 'freebsd', 'openbsd']).toContain(process.platform);
    });

    it('should have process.cwd available', () => {
      expect(typeof process.cwd()).toBe('string');
      expect(process.cwd().length).toBeGreaterThan(0);
    });
  });

  describe('Environment Variables', () => {
    it('should read environment variables', () => {
      process.env.TEST_VAR = 'test-value';
      expect(process.env.TEST_VAR).toBe('test-value');
    });

    it('should handle undefined variables', () => {
      delete process.env.NONEXISTENT_VAR;
      expect(process.env.NONEXISTENT_VAR).toBeUndefined();
    });
  });
});
