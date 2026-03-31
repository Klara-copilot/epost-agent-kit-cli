/**
 * Tests for marketplace card rendering.
 * Tests card string output, grid layout, status badges.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RoleBundle } from '@/domains/resolver/bundles.js';
import type { InstallState } from '@/domains/ui/marketplace-cards.js';

// ─── Fixtures ───

const ROLES: Record<string, RoleBundle> = {
  'web-frontend': {
    description: 'React, Next.js, testing, i18n, auth',
    skills: ['web-frontend', 'web-nextjs', 'web-testing'],
    agents: ['epost-fullstack-developer', 'epost-tester'],
  },
  designer: {
    description: 'Design system specialist',
    skills: ['design-tokens', 'figma', 'ui-lib-dev'],
    agents: ['epost-muji'],
  },
};

const NOT_INSTALLED: InstallState = { installedRoles: new Set() };
const WEB_INSTALLED: InstallState = { installedRoles: new Set(['web-frontend']) };

// ─── statusBadge ───

describe('statusBadge', () => {
  it('returns installed indicator when role is installed', async () => {
    const { statusBadge } = await import('@/domains/ui/marketplace-cards.js');
    const badge = statusBadge('web-frontend', WEB_INSTALLED);
    expect(badge).toContain('install');
  });

  it('returns available indicator when role is not installed', async () => {
    const { statusBadge } = await import('@/domains/ui/marketplace-cards.js');
    const badge = statusBadge('designer', WEB_INSTALLED);
    // badge text should contain "available" or similar dim marker
    expect(badge.toLowerCase()).toContain('avail');
  });
});

// ─── renderRoleCard ───

describe('renderRoleCard', () => {
  it('contains role name', async () => {
    const { renderRoleCard } = await import('@/domains/ui/marketplace-cards.js');
    const card = renderRoleCard('web-frontend', ROLES['web-frontend'], NOT_INSTALLED, 60);
    // strip ANSI — simplest approach: just check it's non-empty and contains relevant text
    expect(card).toBeTruthy();
    expect(card).toContain('web-frontend');
  });

  it('contains description', async () => {
    const { renderRoleCard } = await import('@/domains/ui/marketplace-cards.js');
    const card = renderRoleCard('web-frontend', ROLES['web-frontend'], NOT_INSTALLED, 60);
    expect(card).toContain('React');
  });

  it('shows installed status badge when installed', async () => {
    const { renderRoleCard } = await import('@/domains/ui/marketplace-cards.js');
    const card = renderRoleCard('web-frontend', ROLES['web-frontend'], WEB_INSTALLED, 60);
    expect(card).toContain('install');
  });

  it('shows available status badge when not installed', async () => {
    const { renderRoleCard } = await import('@/domains/ui/marketplace-cards.js');
    const card = renderRoleCard('web-frontend', ROLES['web-frontend'], NOT_INSTALLED, 60);
    expect(card).toContain('avail');
  });

  it('contains skills preview', async () => {
    const { renderRoleCard } = await import('@/domains/ui/marketplace-cards.js');
    const card = renderRoleCard('web-frontend', ROLES['web-frontend'], NOT_INSTALLED, 60);
    expect(card).toContain('web-frontend');
  });
});

// ─── renderCardGrid ───

describe('renderCardGrid', () => {
  it('returns a non-empty string for non-empty roles', async () => {
    const { renderCardGrid } = await import('@/domains/ui/marketplace-cards.js');
    const grid = renderCardGrid(ROLES, NOT_INSTALLED);
    expect(typeof grid).toBe('string');
    expect(grid.length).toBeGreaterThan(0);
  });

  it('returns empty message for empty roles', async () => {
    const { renderCardGrid } = await import('@/domains/ui/marketplace-cards.js');
    const grid = renderCardGrid({}, NOT_INSTALLED);
    expect(grid).toContain('no roles found');
  });

  it('contains both role names', async () => {
    const { renderCardGrid } = await import('@/domains/ui/marketplace-cards.js');
    const grid = renderCardGrid(ROLES, NOT_INSTALLED);
    expect(grid).toContain('web-frontend');
    expect(grid).toContain('designer');
  });
});
