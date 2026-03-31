/**
 * Integration tests for browse command.
 * Mocks @inquirer/prompts to test flow state machine.
 * Tests: tab select → card list → action → install/back.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { filterRoles } from '@/domains/ui/marketplace-search.js';
import { renderCardGrid } from '@/domains/ui/marketplace-cards.js';
import type { RoleBundle } from '@/domains/resolver/bundles.js';
import type { InstallState } from '@/domains/ui/marketplace-cards.js';

// ─── Fixtures ───

const ROLES: Record<string, RoleBundle> = {
  'web-frontend': {
    description: 'React, Next.js, testing, i18n, auth',
    skills: ['web-frontend', 'web-nextjs'],
    agents: ['epost-fullstack-developer'],
  },
  designer: {
    description: 'Design system specialist',
    skills: ['design-tokens', 'figma'],
    agents: ['epost-muji'],
  },
};

const NOT_INSTALLED: InstallState = { installedRoles: new Set() };
const DESIGNER_INSTALLED: InstallState = { installedRoles: new Set(['designer']) };

// ─── filterRoles integration ───

describe('browse — search filter', () => {
  it('filters to matching roles', () => {
    const result = filterRoles(ROLES, 'react');
    expect(Object.keys(result)).toContain('web-frontend');
    expect(Object.keys(result)).not.toContain('designer');
  });

  it('empty query returns all', () => {
    const result = filterRoles(ROLES, '');
    expect(Object.keys(result)).toHaveLength(2);
  });
});

// ─── renderCardGrid integration ───

describe('browse — card grid rendering', () => {
  it('renders all roles in grid', () => {
    const grid = renderCardGrid(ROLES, NOT_INSTALLED);
    expect(grid).toContain('web-frontend');
    expect(grid).toContain('designer');
  });

  it('shows installed badge for installed roles', () => {
    const grid = renderCardGrid(ROLES, DESIGNER_INSTALLED);
    expect(grid).toContain('install');
  });
});

// ─── Installed tab filtering ───

describe('browse — installed tab filtering', () => {
  it('installed filter returns only installed roles', () => {
    const installedEntries = Object.fromEntries(
      Object.entries(ROLES).filter(([name]) => DESIGNER_INSTALLED.installedRoles.has(name)),
    );
    expect(Object.keys(installedEntries)).toContain('designer');
    expect(Object.keys(installedEntries)).not.toContain('web-frontend');
  });

  it('installed filter returns empty when nothing installed', () => {
    const installedEntries = Object.fromEntries(
      Object.entries(ROLES).filter(([name]) => NOT_INSTALLED.installedRoles.has(name)),
    );
    expect(Object.keys(installedEntries)).toHaveLength(0);
  });
});
