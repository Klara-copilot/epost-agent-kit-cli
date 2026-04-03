/**
 * Unit tests for roles command logic.
 * Tests bundle loading and role data shape.
 */

import { describe, it, expect } from 'vitest';
import {
  mergeRoleBundle,
  getAllSkillsForRole,
  getAllAgentsForRole,
  SHARED_SKILLS,
  SHARED_AGENTS,
  type RoleBundle,
} from '@/domains/resolver/bundles.js';

// ─── Fixtures ───

const ROLES: Record<string, RoleBundle> = {
  base: {
    description: 'Base role',
    skills: ['core', 'skill-a'],
    agents: ['epost-fullstack-developer'],
  },
  child: {
    description: 'Child extends base',
    extends: ['base'],
    skills: ['skill-b'],
    agents: ['epost-tester'],
  },
  empty: {
    description: 'Empty role',
    skills: [],
    agents: [],
  },
};

// ─── mergeRoleBundle ───

describe('mergeRoleBundle', () => {
  it('returns own skills and agents for non-extended role', () => {
    const result = mergeRoleBundle('base', ROLES);
    expect(result.skills).toContain('core');
    expect(result.skills).toContain('skill-a');
    expect(result.agents).toContain('epost-fullstack-developer');
  });

  it('merges parent skills into child', () => {
    const result = mergeRoleBundle('child', ROLES);
    expect(result.skills).toContain('skill-a'); // from parent
    expect(result.skills).toContain('skill-b'); // own
  });

  it('merges parent agents into child', () => {
    const result = mergeRoleBundle('child', ROLES);
    expect(result.agents).toContain('epost-fullstack-developer'); // from parent
    expect(result.agents).toContain('epost-tester'); // own
  });

  it('returns empty for unknown role', () => {
    const result = mergeRoleBundle('nonexistent', ROLES);
    expect(result.skills).toHaveLength(0);
    expect(result.agents).toHaveLength(0);
  });
});

// ─── getAllSkillsForRole ───

describe('getAllSkillsForRole', () => {
  it('includes SHARED_SKILLS baseline', () => {
    const skills = getAllSkillsForRole('empty', ROLES);
    for (const s of SHARED_SKILLS) {
      expect(skills).toContain(s);
    }
  });

  it('includes role-specific skills', () => {
    const skills = getAllSkillsForRole('base', ROLES);
    expect(skills).toContain('skill-a');
  });

  it('deduplicates shared + role skills', () => {
    // core is in SHARED_SKILLS and also in base.skills
    const skills = getAllSkillsForRole('base', ROLES);
    const coreCount = skills.filter((s) => s === 'core').length;
    expect(coreCount).toBe(1);
  });
});

// ─── getAllAgentsForRole ───

describe('getAllAgentsForRole', () => {
  it('includes SHARED_AGENTS baseline', () => {
    const agents = getAllAgentsForRole('empty', ROLES);
    for (const a of SHARED_AGENTS) {
      expect(agents).toContain(a);
    }
  });

  it('includes role-specific agents', () => {
    const agents = getAllAgentsForRole('base', ROLES);
    expect(agents).toContain('epost-fullstack-developer');
  });

  it('deduplicates shared + role agents', () => {
    // epost-debugger is in SHARED_AGENTS and also in some roles
    const agents = getAllAgentsForRole('base', ROLES);
    const uniqueCount = new Set(agents).size;
    expect(uniqueCount).toBe(agents.length);
  });
});
