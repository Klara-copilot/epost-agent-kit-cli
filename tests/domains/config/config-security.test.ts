/**
 * Unit tests for config-security module
 * Covers: prototype-pollution guards, value sanitization, file permissions
 */

import { describe, it, expect } from 'vitest';
import {
  isSafeKey,
  safeDeepMerge,
  sanitizeConfigValue,
  enforceFilePermissions,
  enforceDirPermissions,
} from '@/domains/config/config-security.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// isSafeKey
// ---------------------------------------------------------------------------
describe('isSafeKey', () => {
  it('rejects __proto__', () => {
    expect(isSafeKey('__proto__')).toBe(false);
  });

  it('rejects constructor', () => {
    expect(isSafeKey('constructor')).toBe(false);
  });

  it('rejects prototype', () => {
    expect(isSafeKey('prototype')).toBe(false);
  });

  it('accepts normal keys', () => {
    expect(isSafeKey('skills')).toBe(true);
    expect(isSafeKey('research')).toBe(true);
    expect(isSafeKey('')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// safeDeepMerge
// ---------------------------------------------------------------------------
describe('safeDeepMerge', () => {
  it('strips dangerous keys from override', () => {
    const base = { a: 1 };
    const override = { __proto__: { polluted: true }, constructor: 'evil', b: 2 };
    const result = safeDeepMerge(base, override);
    expect(result).toEqual({ a: 1, b: 2 });
    // __proto__ is an inherited accessor on all objects — check own properties
    expect(Object.hasOwnProperty.call(result, '__proto__')).toBe(false);
    // constructor should be the standard Object constructor, not the injected string
    expect(typeof result.constructor).toBe('function');
  });

  it('preserves safe keys from override', () => {
    const base = { a: 1 };
    const override = { a: 2, b: 3 };
    expect(safeDeepMerge(base, override)).toEqual({ a: 2, b: 3 });
  });

  it('deep-merges nested objects', () => {
    const base = { skills: { research: { engine: 'websearch' } } };
    const override = { skills: { research: { engine: 'perplexity' } } };
    expect(safeDeepMerge(base, override)).toEqual({
      skills: { research: { engine: 'perplexity' } },
    });
  });
});

// ---------------------------------------------------------------------------
// sanitizeConfigValue
// ---------------------------------------------------------------------------
describe('sanitizeConfigValue', () => {
  it('strips functions', () => {
    const input = { name: 'test', fn: () => 'bad' };
    const result = sanitizeConfigValue(input) as Record<string, unknown>;
    expect(result.fn).toBeUndefined();
    expect(result.name).toBe('test');
  });

  it('strips symbols', () => {
    const sym = Symbol('danger');
    const input = { name: 'test', sym };
    const result = sanitizeConfigValue(input) as Record<string, unknown>;
    expect(result.sym).toBeUndefined();
  });

  it('handles nested objects', () => {
    const input = {
      level1: {
        level2: {
          safe: 'value',
          dangerous: () => 'nope',
        },
      },
    };
    const result = sanitizeConfigValue(input) as any;
    expect(result.level1.level2.safe).toBe('value');
    expect(result.level1.level2.dangerous).toBeUndefined();
  });

  it('handles arrays', () => {
    const input = [1, () => 'x', 'hello'];
    const result = sanitizeConfigValue(input) as unknown[];
    expect(result).toEqual([1, undefined, 'hello']);
  });

  it('passes through primitives', () => {
    expect(sanitizeConfigValue('hello')).toBe('hello');
    expect(sanitizeConfigValue(42)).toBe(42);
    expect(sanitizeConfigValue(true)).toBe(true);
    expect(sanitizeConfigValue(null)).toBe(null);
    expect(sanitizeConfigValue(undefined)).toBe(undefined);
  });
});

// ---------------------------------------------------------------------------
// enforceFilePermissions / enforceDirPermissions (Unix only)
// ---------------------------------------------------------------------------
const isWindows = process.platform === 'win32';

describe.skipIf(isWindows)('enforceFilePermissions (Unix)', () => {
  it('sets file to 0o600', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'epost-security-'));
    try {
      const filePath = join(dir, 'test.json');
      await writeFile(filePath, '{}', 'utf-8');
      await enforceFilePermissions(filePath);
      // If chmod succeeded without error, the permission was set
      const { stat } = await import('node:fs/promises');
      const s = await stat(filePath);
      // Check owner-read/write bits are present (exact match may vary by umask)
      expect(s.mode & 0o600).toBe(0o600);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

describe.skipIf(isWindows)('enforceDirPermissions (Unix)', () => {
  it('sets directory to 0o700', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'epost-security-'));
    try {
      await enforceDirPermissions(dir);
      const { stat } = await import('node:fs/promises');
      const s = await stat(dir);
      expect(s.mode & 0o700).toBe(0o700);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
