/**
 * Unit tests for ConfigMerger
 * Covers: 3-level merge, source tracking, defaults, edge cases
 */

import { describe, it, expect } from 'vitest';
import { ConfigMerger } from '@/domains/config/config-merger.js';

describe('ConfigMerger.mergeWithSources', () => {
  it('merges all three levels: defaults, global, project', () => {
    const defaults = { skills: { research: { engine: 'websearch' } }, statusline: 'full' };
    const global = { statusline: 'compact' };
    const project = { skills: { research: { engine: 'perplexity' } } };

    const { merged } = ConfigMerger.mergeWithSources(defaults, global, project);
    expect(merged.skills.research.engine).toBe('perplexity');
    expect(merged.statusline).toBe('compact');
  });

  it('project overrides global', () => {
    const defaults = { a: 1 };
    const global = { a: 2 };
    const project = { a: 3 };

    const { merged } = ConfigMerger.mergeWithSources(defaults, global, project);
    expect(merged.a).toBe(3);
  });

  it('global overrides defaults', () => {
    const defaults = { a: 1 };
    const global = { a: 2 };
    const project = {};

    const { merged } = ConfigMerger.mergeWithSources(defaults, global, project);
    expect(merged.a).toBe(2);
  });

  it('tracks sources for each leaf field', () => {
    const defaults = { a: 1, b: 2 };
    const global = { b: 20 };
    const project = { c: 30 };

    const { sources } = ConfigMerger.mergeWithSources(defaults, global, project);
    expect(sources['a']).toBe('default');
    expect(sources['b']).toBe('global');
    expect(sources['c']).toBe('project');
  });

  it('tracks nested key sources (e.g. skills.research.engine)', () => {
    const defaults = { skills: { research: { engine: 'websearch' } } };
    const global = { skills: { research: { engine: 'perplexity' } } };
    const project = {};

    const { sources } = ConfigMerger.mergeWithSources(defaults, global, project);
    expect(sources['skills.research.engine']).toBe('global');
  });

  it('handles missing global (only defaults + project)', () => {
    const defaults = { a: 1, b: 2 };
    const global = {};
    const project = { b: 20 };

    const { merged, sources } = ConfigMerger.mergeWithSources(defaults, global, project);
    expect(merged.a).toBe(1);
    expect(merged.b).toBe(20);
    expect(sources['a']).toBe('default');
    expect(sources['b']).toBe('project');
  });

  it('handles empty project (only defaults + global)', () => {
    const defaults = { a: 1 };
    const global = { b: 2 };
    const project = {};

    const { merged, sources } = ConfigMerger.mergeWithSources(defaults, global, project);
    expect(merged.a).toBe(1);
    expect(merged.b).toBe(2);
    expect(sources['a']).toBe('default');
    expect(sources['b']).toBe('global');
  });

  it('handles all empty layers', () => {
    const { merged, sources } = ConfigMerger.mergeWithSources({}, {}, {});
    expect(merged).toEqual({});
    expect(Object.keys(sources)).toHaveLength(0);
  });

  it('project-level nested key overrides global nested key', () => {
    const defaults = { x: { y: { z: 'default' } } };
    const global = { x: { y: { z: 'global' } } };
    const project = { x: { y: { z: 'project' } } };

    const { merged, sources } = ConfigMerger.mergeWithSources(defaults, global, project);
    expect(merged.x.y.z).toBe('project');
    expect(sources['x.y.z']).toBe('project');
  });

  it('keys only in project get source=project', () => {
    const defaults = { a: 1 };
    const global = {};
    const project = { newKey: 'fresh' };

    const { sources } = ConfigMerger.mergeWithSources(defaults, global, project);
    expect(sources['newKey']).toBe('project');
  });
});

describe('ConfigMerger.getDefaults', () => {
  it('returns expected default values', () => {
    const defaults = ConfigMerger.getDefaults();
    expect(defaults.skills.research.engine).toBe('websearch');
    expect(defaults.statusline).toBe('full');
    expect(defaults.codingLevel).toBe(-1);
  });

  it('returns a copy (mutations do not affect internal state)', () => {
    const d1 = ConfigMerger.getDefaults();
    d1.statusline = 'mutated';
    const d2 = ConfigMerger.getDefaults();
    expect(d2.statusline).toBe('full');
  });
});
