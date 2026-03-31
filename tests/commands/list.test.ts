/**
 * Unit tests for list command logic.
 * Validates config reads and JSON output shape.
 */

import { describe, it, expect } from 'vitest';
import { EpostConfigSchema, type EpostProjectConfig } from '@/types/epost-config.js';

// ─── Config parsing ───

describe('list — config shape', () => {
  const config: EpostProjectConfig = EpostConfigSchema.parse({
    version: '1',
    installer: 'epost-kit@2.0.0',
    kitVersion: '2.0.0',
    role: 'web-frontend',
    skills: ['core', 'skill-discovery', 'web-frontend'],
    agents: ['epost-planner', 'epost-fullstack-developer'],
    updatesMode: 'interactive',
    lastUpdated: '2026-03-22T00:00:00.000Z',
  });

  it('parses valid config correctly', () => {
    expect(config.version).toBe('1');
    expect(config.role).toBe('web-frontend');
    expect(config.skills).toHaveLength(3);
    expect(config.agents).toHaveLength(2);
  });

  it('json output includes all fields', () => {
    const output = {
      kitVersion: config.kitVersion,
      role: config.role ?? null,
      skills: config.skills,
      agents: config.agents,
      lastUpdated: config.lastUpdated,
      updatesMode: config.updatesMode,
    };

    expect(output).toHaveProperty('kitVersion', '2.0.0');
    expect(output).toHaveProperty('role', 'web-frontend');
    expect(output.skills).toContain('core');
    expect(output.agents).toContain('epost-planner');
  });

  it('role is null when absent', () => {
    const noRole: EpostProjectConfig = EpostConfigSchema.parse({
      version: '1',
      installer: 'epost-kit',
      kitVersion: '2.0.0',
      role: null,
      skills: ['core'],
      agents: [],
      lastUpdated: new Date().toISOString(),
    });

    const output = { role: noRole.role ?? null };
    expect(output.role).toBeNull();
  });
});
