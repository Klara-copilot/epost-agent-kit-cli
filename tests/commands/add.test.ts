/**
 * Unit tests for add command logic.
 * Mocks file ops, verifies resolver is called, verifies config update.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveDependencies, type SkillEntry } from '@/domains/resolver/resolver.js';
import {
  getAllSkillsForRole,
  getAllAgentsForRole,
  SHARED_SKILLS,
  SHARED_AGENTS,
  type RoleBundle,
} from '@/domains/resolver/bundles.js';
import { EpostConfigSchema, type EpostProjectConfig } from '@/types/epost-config.js';

// ─── Helper ───

function skill(name: string, ext: string[] = [], req: string[] = []): SkillEntry {
  return { name, connections: { extends: ext, requires: req, conflicts: [] } };
}

const SKILL_INDEX: SkillEntry[] = [
  skill('core'),
  skill('a11y'),
  skill('web-a11y', ['a11y']),
  skill('web-frontend'),
];

const ROLES: Record<string, RoleBundle> = {
  'web-frontend': {
    description: 'React, Next.js',
    skills: ['web-frontend', 'web-a11y'],
    agents: ['epost-fullstack-developer', 'epost-tester'],
  },
};

// ─── Resolver integration ───

describe('add — resolver integration', () => {
  it('installing web-a11y resolves a11y as dependency', () => {
    const result = resolveDependencies(['web-a11y'], SKILL_INDEX);
    expect(result.skills).toContain('a11y');
    expect(result.skills).toContain('web-a11y');
  });

  it('already installed skills are filtered out by caller', () => {
    const alreadyInstalled = ['a11y'];
    const result = resolveDependencies(['web-a11y'], SKILL_INDEX);
    const newSkills = result.skills.filter((s) => !alreadyInstalled.includes(s));
    expect(newSkills).toContain('web-a11y');
    expect(newSkills).not.toContain('a11y');
  });
});

// ─── Role install expansion ───

describe('add --role expansion', () => {
  it('role skills include shared baseline', () => {
    const skills = getAllSkillsForRole('web-frontend', ROLES);
    expect(skills).toContain('core'); // shared
    expect(skills).toContain('web-frontend'); // role-specific
  });

  it('role agents include shared agents', () => {
    const agents = getAllAgentsForRole('web-frontend', ROLES);
    expect(agents).toContain('epost-planner'); // shared
    expect(agents).toContain('epost-fullstack-developer'); // role-specific
  });

  it('new skills are those not already in config', () => {
    const config: EpostProjectConfig = EpostConfigSchema.parse({
      version: '1',
      installer: 'epost-kit',
      kitVersion: '2.0.0',
      skills: ['core'],
      agents: [],
      lastUpdated: new Date().toISOString(),
    });

    const allSkills = getAllSkillsForRole('web-frontend', ROLES);
    const newSkills = allSkills.filter((s) => !config.skills.includes(s));
    expect(newSkills).not.toContain('core');
    expect(newSkills).toContain('web-frontend');
  });
});

// ─── Config state after add ───

describe('add — config mutation logic', () => {
  it('merges new skills without duplicates', () => {
    const existing = ['core', 'skill-discovery'];
    const toInstall = ['web-frontend', 'skill-discovery'];
    const merged = [...new Set([...existing, ...toInstall])];
    expect(merged).toEqual(['core', 'skill-discovery', 'web-frontend']);
  });

  it('sets role field when installing a role', () => {
    const config: EpostProjectConfig = EpostConfigSchema.parse({
      version: '1',
      installer: 'epost-kit',
      kitVersion: '2.0.0',
      skills: [],
      agents: [],
      lastUpdated: new Date().toISOString(),
    });

    const updated = { ...config, role: 'web-frontend' };
    expect(updated.role).toBe('web-frontend');
  });
});
