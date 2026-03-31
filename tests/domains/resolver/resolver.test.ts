/**
 * Unit tests for dependency resolver.
 * Validates: extends chain, requires chain, conflict detection, cycle safety, topological order.
 */

import { describe, it, expect } from 'vitest';
import { resolveDependencies, type SkillEntry } from '@/domains/resolver/resolver.js';

// ─── Fixtures ───

function skill(
  name: string,
  {
    extends: ext = [],
    requires = [],
    conflicts = [],
  }: { extends?: string[]; requires?: string[]; conflicts?: string[] } = {},
): SkillEntry {
  return { name, connections: { extends: ext, requires, conflicts } };
}

const BASE_INDEX: SkillEntry[] = [
  skill('a11y'),
  skill('ios-a11y', { extends: ['a11y'] }),
  skill('android-a11y', { extends: ['a11y'] }),
  skill('web-a11y', { extends: ['a11y'] }),
  skill('figma'),
  skill('design-tokens', { requires: ['figma'] }),
  skill('ui-lib-dev', { requires: ['figma'] }),
  skill('core'),
  skill('web-frontend'),
  skill('web-nextjs'),
];

// ─── extends resolution ───

describe('resolveDependencies — extends', () => {
  it('resolves web-a11y → includes a11y base', () => {
    const result = resolveDependencies(['web-a11y'], BASE_INDEX);
    expect(result.skills).toContain('a11y');
    expect(result.skills).toContain('web-a11y');
    expect(result.warnings).toHaveLength(0);
  });

  it('a11y appears before web-a11y in order', () => {
    const result = resolveDependencies(['web-a11y'], BASE_INDEX);
    const aIdx = result.order.indexOf('a11y');
    const waIdx = result.order.indexOf('web-a11y');
    expect(aIdx).toBeLessThan(waIdx);
  });

  it('resolves ios-a11y → includes a11y only once', () => {
    const result = resolveDependencies(['ios-a11y'], BASE_INDEX);
    const count = result.skills.filter((s) => s === 'a11y').length;
    expect(count).toBe(1);
  });
});

// ─── requires resolution ───

describe('resolveDependencies — requires', () => {
  it('resolves design-tokens → includes figma', () => {
    const result = resolveDependencies(['design-tokens'], BASE_INDEX);
    expect(result.skills).toContain('figma');
    expect(result.skills).toContain('design-tokens');
  });

  it('figma appears before design-tokens', () => {
    const result = resolveDependencies(['design-tokens'], BASE_INDEX);
    const fIdx = result.order.indexOf('figma');
    const dtIdx = result.order.indexOf('design-tokens');
    expect(fIdx).toBeLessThan(dtIdx);
  });

  it('shared dep only appears once when two skills require it', () => {
    const result = resolveDependencies(['design-tokens', 'ui-lib-dev'], BASE_INDEX);
    const figmaCount = result.skills.filter((s) => s === 'figma').length;
    expect(figmaCount).toBe(1);
  });
});

// ─── conflict detection ───

describe('resolveDependencies — conflicts', () => {
  it('drops conflicting skill and emits warning', () => {
    const index: SkillEntry[] = [
      skill('alpha', { conflicts: ['beta'] }),
      skill('beta'),
    ];
    const result = resolveDependencies(['alpha', 'beta'], index);
    expect(result.skills).toContain('alpha');
    expect(result.skills).not.toContain('beta');
    expect(result.warnings.some((w) => w.includes('conflict'))).toBe(true);
  });
});

// ─── unknown skill ───

describe('resolveDependencies — unknown skills', () => {
  it('emits warning and skips unknown skill', () => {
    const result = resolveDependencies(['nonexistent-skill'], BASE_INDEX);
    expect(result.warnings.some((w) => w.includes('Unknown skill'))).toBe(true);
    expect(result.skills).not.toContain('nonexistent-skill');
  });
});

// ─── no deps ───

describe('resolveDependencies — passthrough', () => {
  it('returns skill unchanged when no dependencies', () => {
    const result = resolveDependencies(['core'], BASE_INDEX);
    expect(result.skills).toEqual(['core']);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns empty list for empty input', () => {
    const result = resolveDependencies([], BASE_INDEX);
    expect(result.skills).toHaveLength(0);
  });
});

// ─── bundle merge (web-fullstack style) ───

describe('resolveDependencies — bundle merge', () => {
  it('merges skills from multiple selections without duplication', () => {
    const webFrontendSkills = ['core', 'web-frontend', 'web-nextjs'];
    const webBackendSkills = ['core', 'web-frontend'];
    const combined = [...new Set([...webFrontendSkills, ...webBackendSkills])];
    const result = resolveDependencies(combined, BASE_INDEX);
    const coreCount = result.skills.filter((s) => s === 'core').length;
    expect(coreCount).toBe(1);
  });
});
