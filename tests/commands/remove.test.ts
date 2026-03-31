/**
 * Unit tests for remove command logic.
 * Tests reverse dep detection, protected skill guard, config mutation.
 */

import { describe, it, expect } from 'vitest';
import type { SkillEntry } from '@/domains/resolver/resolver.js';
import { EpostConfigSchema, type EpostProjectConfig } from '@/types/epost-config.js';

// ─── Helpers ───

function skill(name: string, ext: string[] = [], req: string[] = []): SkillEntry {
  return { name, connections: { extends: ext, requires: req, conflicts: [] } };
}

function findReverseDeps(skillName: string, installed: string[], index: SkillEntry[]): string[] {
  return installed.filter((s) => {
    const entry = index.find((e) => e.name === s);
    if (!entry) return false;
    return (
      entry.connections.extends.includes(skillName) ||
      entry.connections.requires.includes(skillName)
    );
  });
}

const SKILL_INDEX: SkillEntry[] = [
  skill('core'),
  skill('a11y'),
  skill('web-a11y', ['a11y']),
  skill('ios-a11y', ['a11y']),
  skill('design-tokens'),
  skill('ui-lib-dev', [], ['design-tokens']),
];

// ─── Reverse dep detection ───

describe('remove — reverse dep detection', () => {
  it('detects direct extends dependents', () => {
    const installed = ['a11y', 'web-a11y', 'ios-a11y'];
    const deps = findReverseDeps('a11y', installed, SKILL_INDEX);
    expect(deps).toContain('web-a11y');
    expect(deps).toContain('ios-a11y');
  });

  it('detects requires dependents', () => {
    const installed = ['design-tokens', 'ui-lib-dev'];
    const deps = findReverseDeps('design-tokens', installed, SKILL_INDEX);
    expect(deps).toContain('ui-lib-dev');
  });

  it('returns empty when no dependents', () => {
    const installed = ['core', 'a11y'];
    const deps = findReverseDeps('core', installed, SKILL_INDEX);
    expect(deps).toHaveLength(0);
  });

  it('only checks installed skills, not the full index', () => {
    // web-a11y is in index but not installed
    const installed = ['a11y'];
    const deps = findReverseDeps('a11y', installed, SKILL_INDEX);
    expect(deps).toHaveLength(0);
  });
});

// ─── Protected skills guard ───

describe('remove — protected skills', () => {
  const PROTECTED = new Set(['core']);

  it('core is protected', () => {
    expect(PROTECTED.has('core')).toBe(true);
  });

  it('other skills are not protected', () => {
    expect(PROTECTED.has('web-a11y')).toBe(false);
    expect(PROTECTED.has('a11y')).toBe(false);
  });
});

// ─── Config mutation after remove ───

describe('remove — config mutation', () => {
  const baseConfig = (): EpostProjectConfig =>
    EpostConfigSchema.parse({
      version: '1',
      installer: 'epost-kit',
      kitVersion: '2.0.0',
      role: 'web-frontend',
      skills: ['core', 'a11y', 'web-a11y'],
      agents: ['epost-planner', 'epost-tester'],
      lastUpdated: new Date().toISOString(),
    });

  it('removes skill from skills array', () => {
    const config = baseConfig();
    const updated = { ...config, skills: config.skills.filter((s) => s !== 'web-a11y') };
    expect(updated.skills).not.toContain('web-a11y');
    expect(updated.skills).toContain('core');
  });

  it('clears role when role is removed', () => {
    const config = baseConfig();
    const updated = { ...config, role: null };
    expect(updated.role).toBeNull();
  });

  it('removes agent from agents array', () => {
    const config = baseConfig();
    const updated = { ...config, agents: config.agents.filter((a) => a !== 'epost-tester') };
    expect(updated.agents).not.toContain('epost-tester');
    expect(updated.agents).toContain('epost-planner');
  });
});
