/**
 * Unit tests for EpostProjectConfig schema.
 * Validates: required fields, optional fields, bad data rejection, defaults.
 */

import { describe, it, expect } from 'vitest';
import { EpostConfigSchema } from '@/types/epost-config.js';
import { z } from 'zod';

const VALID: z.input<typeof EpostConfigSchema> = {
  version: '1',
  installer: 'epost-kit@2.1.0',
  kitVersion: '2.1.0',
  skills: ['core', 'web-frontend'],
  agents: ['epost-fullstack-developer'],
  lastUpdated: '2026-03-21T00:00:00.000Z',
};

describe('EpostConfigSchema — valid', () => {
  it('accepts a minimal valid config', () => {
    const result = EpostConfigSchema.parse(VALID);
    expect(result.version).toBe('1');
    expect(result.skills).toEqual(['core', 'web-frontend']);
  });

  it('defaults updatesMode to interactive when absent', () => {
    const result = EpostConfigSchema.parse(VALID);
    expect(result.updatesMode).toBe('interactive');
  });

  it('accepts explicit updatesMode values', () => {
    for (const mode of ['interactive', 'auto', 'manual'] as const) {
      const result = EpostConfigSchema.parse({ ...VALID, updatesMode: mode });
      expect(result.updatesMode).toBe(mode);
    }
  });

  it('accepts role as string', () => {
    const result = EpostConfigSchema.parse({ ...VALID, role: 'web-frontend' });
    expect(result.role).toBe('web-frontend');
  });

  it('accepts role as null', () => {
    const result = EpostConfigSchema.parse({ ...VALID, role: null });
    expect(result.role).toBeNull();
  });

  it('allows role to be omitted', () => {
    const result = EpostConfigSchema.parse(VALID);
    expect(result.role).toBeUndefined();
  });
});

describe('EpostConfigSchema — invalid', () => {
  it('rejects wrong version literal', () => {
    expect(() =>
      EpostConfigSchema.parse({ ...VALID, version: '2' }),
    ).toThrow(z.ZodError);
  });

  it('rejects missing installer', () => {
    const { installer: _removed, ...rest } = VALID;
    expect(() => EpostConfigSchema.parse(rest)).toThrow(z.ZodError);
  });

  it('rejects invalid updatesMode', () => {
    expect(() =>
      EpostConfigSchema.parse({ ...VALID, updatesMode: 'never' }),
    ).toThrow(z.ZodError);
  });

  it('rejects skills as non-array', () => {
    expect(() =>
      EpostConfigSchema.parse({ ...VALID, skills: 'core' }),
    ).toThrow(z.ZodError);
  });
});
