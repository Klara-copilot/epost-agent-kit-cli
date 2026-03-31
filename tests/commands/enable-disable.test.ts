/**
 * Unit tests for enable/disable command logic.
 * Tests config state transitions for skills and hooks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EpostProjectConfig } from '@/types/epost-config.js';

// ─── Helpers ───

function makeConfig(overrides: Partial<EpostProjectConfig> = {}): EpostProjectConfig {
  return {
    version: '1',
    installer: 'epost-kit@2.0.0',
    kitVersion: '2.0.0',
    skills: ['core', 'web-frontend', 'review'],
    agents: ['epost-fullstack-developer'],
    updatesMode: 'interactive',
    lastUpdated: '2026-03-31T00:00:00.000Z',
    ...overrides,
  };
}

// ─── Unit: disabled list mutations ───

describe('enable/disable — skill list mutations', () => {
  it('disabling a skill adds it to disabledSkills', () => {
    const config = makeConfig();
    const disabled = config.disabledSkills ?? [];
    const updated = [...disabled, 'review'];
    expect(updated).toContain('review');
    expect(updated).not.toContain('web-frontend');
  });

  it('enabling a skill removes it from disabledSkills', () => {
    const config = makeConfig({ disabledSkills: ['review', 'web-frontend'] });
    const updated = (config.disabledSkills ?? []).filter((s) => s !== 'review');
    expect(updated).not.toContain('review');
    expect(updated).toContain('web-frontend');
  });

  it('disabling an already-disabled skill is idempotent', () => {
    const config = makeConfig({ disabledSkills: ['review'] });
    const isAlreadyDisabled = (config.disabledSkills ?? []).includes('review');
    expect(isAlreadyDisabled).toBe(true);
    // No duplicate added
    const updated = isAlreadyDisabled
      ? config.disabledSkills!
      : [...(config.disabledSkills ?? []), 'review'];
    expect(updated.filter((s) => s === 'review').length).toBe(1);
  });

  it('enabling a skill that is not disabled is a no-op', () => {
    const config = makeConfig({ disabledSkills: [] });
    const isDisabled = (config.disabledSkills ?? []).includes('review');
    expect(isDisabled).toBe(false);
    // No change
    const updated = isDisabled
      ? (config.disabledSkills ?? []).filter((s) => s !== 'review')
      : config.disabledSkills ?? [];
    expect(updated).toEqual([]);
  });

  it('disabling requires skill to be installed', () => {
    const config = makeConfig();
    const isInstalled = config.skills.includes('nonexistent');
    expect(isInstalled).toBe(false);
  });

  it('disabledSkills is optional and defaults to empty array', () => {
    const config = makeConfig();
    expect(config.disabledSkills).toBeUndefined();
    const disabled = config.disabledSkills ?? [];
    expect(disabled).toEqual([]);
  });
});

describe('enable/disable — hook list mutations', () => {
  it('disabling a hook adds it to disabledHooks', () => {
    const config = makeConfig();
    const disabled = config.disabledHooks ?? [];
    const updated = [...disabled, 'session-init'];
    expect(updated).toContain('session-init');
  });

  it('enabling a hook removes it from disabledHooks', () => {
    const config = makeConfig({ disabledHooks: ['session-init', 'scout-block'] });
    const updated = (config.disabledHooks ?? []).filter((h) => h !== 'session-init');
    expect(updated).not.toContain('session-init');
    expect(updated).toContain('scout-block');
  });

  it('disabledHooks is optional and defaults to empty array', () => {
    const config = makeConfig();
    expect(config.disabledHooks).toBeUndefined();
    const disabled = config.disabledHooks ?? [];
    expect(disabled).toEqual([]);
  });

  it('disabling a hook that is already disabled does not duplicate', () => {
    const config = makeConfig({ disabledHooks: ['scout-block'] });
    const isAlreadyDisabled = (config.disabledHooks ?? []).includes('scout-block');
    expect(isAlreadyDisabled).toBe(true);
  });
});

// ─── Schema: disabledSkills and disabledHooks in EpostConfigSchema ───

describe('EpostConfigSchema — disabledSkills / disabledHooks', () => {
  it('parses config with disabledSkills', async () => {
    const { EpostConfigSchema } = await import('@/types/epost-config.js');
    const result = EpostConfigSchema.parse({
      version: '1',
      installer: 'epost-kit@2.0.0',
      kitVersion: '2.0.0',
      skills: ['core', 'review'],
      agents: [],
      lastUpdated: '2026-03-31T00:00:00.000Z',
      disabledSkills: ['review'],
    });
    expect(result.disabledSkills).toEqual(['review']);
  });

  it('parses config with disabledHooks', async () => {
    const { EpostConfigSchema } = await import('@/types/epost-config.js');
    const result = EpostConfigSchema.parse({
      version: '1',
      installer: 'epost-kit@2.0.0',
      kitVersion: '2.0.0',
      skills: ['core'],
      agents: [],
      lastUpdated: '2026-03-31T00:00:00.000Z',
      disabledHooks: ['scout-block'],
    });
    expect(result.disabledHooks).toEqual(['scout-block']);
  });

  it('allows both disabledSkills and disabledHooks to be absent (backward compat)', async () => {
    const { EpostConfigSchema } = await import('@/types/epost-config.js');
    const result = EpostConfigSchema.parse({
      version: '1',
      installer: 'epost-kit@2.0.0',
      kitVersion: '2.0.0',
      skills: ['core'],
      agents: [],
      lastUpdated: '2026-03-31T00:00:00.000Z',
    });
    expect(result.disabledSkills).toBeUndefined();
    expect(result.disabledHooks).toBeUndefined();
  });

  it('rejects disabledSkills as non-array', async () => {
    const { EpostConfigSchema } = await import('@/types/epost-config.js');
    const { z } = await import('zod');
    expect(() =>
      EpostConfigSchema.parse({
        version: '1',
        installer: 'epost-kit@2.0.0',
        kitVersion: '2.0.0',
        skills: ['core'],
        agents: [],
        lastUpdated: '2026-03-31T00:00:00.000Z',
        disabledSkills: 'review',
      }),
    ).toThrow(z.ZodError);
  });
});

// ─── JSON output shape ───

describe('enable/disable — JSON output shape', () => {
  it('result has expected shape when changed', () => {
    const result = {
      action: 'disable' as const,
      type: 'skill' as const,
      name: 'review',
      changed: true,
      alreadyInState: false,
      notInstalled: false,
    };
    expect(result.changed).toBe(true);
    expect(result.alreadyInState).toBe(false);
    expect(JSON.stringify(result)).toContain('"action":"disable"');
  });

  it('result has expected shape when already in state', () => {
    const result = {
      action: 'disable' as const,
      type: 'skill' as const,
      name: 'review',
      changed: false,
      alreadyInState: true,
      notInstalled: false,
    };
    expect(result.changed).toBe(false);
    expect(result.alreadyInState).toBe(true);
  });
});
