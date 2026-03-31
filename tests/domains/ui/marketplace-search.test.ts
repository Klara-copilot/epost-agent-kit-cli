/**
 * Tests for marketplace search/filter logic.
 */

import { describe, it, expect } from 'vitest';
import { filterRoles } from '@/domains/ui/marketplace-search.js';
import type { RoleBundle } from '@/domains/resolver/bundles.js';

// ─── Fixtures ───

const ROLES: Record<string, RoleBundle> = {
  'web-frontend': {
    description: 'React, Next.js, testing, i18n, auth',
    skills: ['web-frontend', 'web-nextjs', 'web-testing', 'web-i18n', 'web-auth'],
    agents: ['epost-fullstack-developer', 'epost-tester'],
  },
  designer: {
    description: 'Design system specialist',
    skills: ['design-tokens', 'figma', 'ui-lib-dev'],
    agents: ['epost-muji'],
  },
  ios: {
    description: 'iOS Swift developer',
    skills: ['ios-development', 'ios-ui-lib'],
    agents: ['epost-fullstack-developer'],
  },
};

// ─── filterRoles ───

describe('filterRoles', () => {
  it('returns all roles for empty query', () => {
    const result = filterRoles(ROLES, '');
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('matches by role name (substring)', () => {
    const result = filterRoles(ROLES, 'web');
    expect(Object.keys(result)).toContain('web-frontend');
    expect(Object.keys(result)).not.toContain('ios');
  });

  it('matches by description keyword', () => {
    const result = filterRoles(ROLES, 'swift');
    expect(Object.keys(result)).toContain('ios');
    expect(Object.keys(result)).not.toContain('web-frontend');
  });

  it('matches by skill name', () => {
    const result = filterRoles(ROLES, 'figma');
    expect(Object.keys(result)).toContain('designer');
    expect(Object.keys(result)).not.toContain('ios');
  });

  it('is case-insensitive', () => {
    const result = filterRoles(ROLES, 'FIGMA');
    expect(Object.keys(result)).toContain('designer');
  });

  it('returns empty object when no match', () => {
    const result = filterRoles(ROLES, 'nonexistent-xyz-query');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('matches by agent name', () => {
    const result = filterRoles(ROLES, 'epost-muji');
    expect(Object.keys(result)).toContain('designer');
    expect(Object.keys(result)).not.toContain('ios');
  });
});
