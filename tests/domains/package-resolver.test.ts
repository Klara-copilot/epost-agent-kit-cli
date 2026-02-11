/**
 * Unit tests for Package Resolver
 * Priority: P1 - Core Business Logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTempDir, cleanupTempDir, createFileStructure } from '../helpers/test-utils.js';
import { join } from 'node:path';
import {
  loadProfiles,
  loadAllManifests,
  resolvePackages,
  topologicalSort,
} from '@/domains/packages/package-resolver.js';

describe('PackageResolver', () => {
  let tempDir: string;
  let packagesDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
    packagesDir = join(tempDir, 'packages');
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  describe('Profile Loading', () => {
    it('should load profiles from YAML', async () => {
      await createFileStructure(tempDir, {
        'profiles.yaml': `
profiles:
  full:
    display_name: Full Profile
    packages:
      - core
      - backend
  minimal:
    display_name: Minimal Profile
    packages:
      - core
`,
      });

      const profiles = await loadProfiles(join(tempDir, 'profiles.yaml'));
      expect(profiles.profiles.full).toBeDefined();
      expect(profiles.profiles.full.display_name).toBe('Full Profile');
      expect(profiles.profiles.full.packages).toEqual(['core', 'backend']);
      expect(profiles.profiles.minimal.packages).toEqual(['core']);
    });

    it('should handle empty profiles file', async () => {
      await createFileStructure(tempDir, {
        'profiles.yaml': '',
      });

      const profiles = await loadProfiles(join(tempDir, 'profiles.yaml'));
      expect(profiles.profiles).toEqual({});
    });
  });

  describe('Package Discovery', () => {
    it('should scan packages directory', async () => {
      await createFileStructure(tempDir, {
        'packages/core/package.yaml': `
name: core
version: 1.0.0
description: Core package
layer: 1
platforms: [claude]
dependencies: []
provides:
  agents: []
  skills: []
  commands: []
files: {}
settings_strategy: base
`,
        'packages/backend/package.yaml': `
name: backend
version: 1.0.0
description: Backend package
layer: 2
platforms: [claude]
dependencies:
  - core
provides:
  agents: []
  skills: []
  commands: []
files: {}
settings_strategy: merge
`,
      });

      const manifests = await loadAllManifests(packagesDir);
      expect(manifests.size).toBe(2);
      expect(manifests.has('core')).toBe(true);
      expect(manifests.has('backend')).toBe(true);
    });

    it('should parse package metadata correctly', async () => {
      await createFileStructure(tempDir, {
        'packages/core/package.yaml': `
name: core
version: 1.0.0
description: Core package
layer: 1
platforms: [claude]
dependencies: []
provides:
  agents:
    - orchestrator
  skills:
    - code-review
  commands: []
files: {}
settings_strategy: base
`,
      });

      const manifests = await loadAllManifests(packagesDir);
      const core = manifests.get('core');
      expect(core?.name).toBe('core');
      expect(core?.version).toBe('1.0.0');
      expect(core?.layer).toBe(1);
      expect(core?.provides.agents).toContain('orchestrator');
      expect(core?.provides.skills).toContain('code-review');
    });
  });

  describe('Dependency Resolution', () => {
    beforeEach(async () => {
      await createFileStructure(tempDir, {
        'packages/core/package.yaml': `
name: core
version: 1.0.0
layer: 1
platforms: [claude]
dependencies: []
provides:
  agents: []
  skills: []
  commands: []
files: {}
settings_strategy: base
description: Core
`,
        'packages/backend/package.yaml': `
name: backend
version: 1.0.0
layer: 2
platforms: [claude]
dependencies:
  - core
provides:
  agents: []
  skills: []
  commands: []
files: {}
settings_strategy: merge
description: Backend
`,
      });
    });

    it('should resolve dependencies in topological order', async () => {
      const manifests = await loadAllManifests(packagesDir);
      const resolved = topologicalSort(['backend', 'core'], manifests);

      expect(resolved).toEqual(['core', 'backend']);
      // Core must come before backend
      expect(resolved.indexOf('core')).toBeLessThan(
        resolved.indexOf('backend')
      );
    });

    it('should handle packages without dependencies', async () => {
      const manifests = await loadAllManifests(packagesDir);
      const resolved = topologicalSort(['core'], manifests);

      expect(resolved).toEqual(['core']);
    });
  });
});
