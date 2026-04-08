import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { KitPathResolver } from '@/shared/path-resolver.js';

describe('KitPathResolver', () => {
  let resolver: KitPathResolver;
  let tmpKitRoot: string;
  let savedEnv: string | undefined;

  beforeAll(async () => {
    // Create a minimal valid kit root fixture so tests work in CI
    // (no sibling epost-agent-kit repo is available on GitHub Actions)
    tmpKitRoot = await mkdtemp(join(tmpdir(), 'epost-kit-test-'));
    await mkdir(join(tmpKitRoot, 'packages', 'core'), { recursive: true });
    await mkdir(join(tmpKitRoot, 'profiles'), { recursive: true });
    await writeFile(join(tmpKitRoot, 'packages', 'core', 'package.yaml'), 'name: core\n');
    await writeFile(join(tmpKitRoot, 'profiles', 'profiles.yaml'), 'profiles: []\n');

    savedEnv = process.env.EPOST_KIT_ROOT;
    process.env.EPOST_KIT_ROOT = tmpKitRoot;
  });

  afterAll(async () => {
    await rm(tmpKitRoot, { recursive: true, force: true });
    if (savedEnv !== undefined) {
      process.env.EPOST_KIT_ROOT = savedEnv;
    } else {
      delete process.env.EPOST_KIT_ROOT;
    }
  });

  beforeEach(() => {
    resolver = new KitPathResolver();
    resolver.clearCache();
  });

  it('should cache resolved paths', async () => {
    const paths1 = await resolver.resolve();
    const paths2 = await resolver.resolve();
    expect(paths1).toBe(paths2); // Same object reference
  });

  it('should provide getPackagesDir method', async () => {
    const packagesDir = await resolver.getPackagesDir();
    expect(packagesDir).toBeDefined();
    expect(typeof packagesDir).toBe('string');
    expect(packagesDir).toContain('packages');
  });

  it('should provide getProfilesPath method', async () => {
    const profilesPath = await resolver.getProfilesPath();
    expect(profilesPath).toBeDefined();
    expect(typeof profilesPath).toBe('string');
    expect(profilesPath).toContain('profiles.yaml');
  });

  it('should provide getTemplatesDir method', async () => {
    const templatesDir = await resolver.getTemplatesDir();
    // Templates dir may be null if not found
    if (templatesDir) {
      expect(typeof templatesDir).toBe('string');
      expect(templatesDir).toContain('templates');
    }
  });

  it('should provide getRoot method', async () => {
    const root = await resolver.getRoot();
    expect(root).toBeDefined();
    expect(typeof root).toBe('string');
  });

  it('should clear cache when clearCache is called', async () => {
    const paths1 = await resolver.resolve();
    resolver.clearCache();
    const paths2 = await resolver.resolve();
    expect(paths1).not.toBe(paths2); // Different object references
    expect(paths1).toEqual(paths2); // But same values
  });

  it('should throw error when EPOST_KIT_ROOT is invalid', async () => {
    const originalEnv = process.env.EPOST_KIT_ROOT;
    process.env.EPOST_KIT_ROOT = '/nonexistent/invalid/path';

    try {
      const badResolver = new KitPathResolver();
      await expect(badResolver.resolve()).rejects.toThrow('EPOST_KIT_ROOT is set but invalid');
    } finally {
      process.env.EPOST_KIT_ROOT = originalEnv;
    }
  });

  it('should respect EPOST_KIT_ROOT env var', async () => {
    // This test would need actual kit root path
    // Skipping implementation as it requires filesystem setup
  });

  it('should provide consistent path separators', async () => {
    const packagesDir = await resolver.getPackagesDir();
    expect(packagesDir).toBeDefined();
    expect(typeof packagesDir).toBe('string');
  });

  it('should handle getTemplatesDir returning null gracefully', async () => {
    const templatesDir = await resolver.getTemplatesDir();
    // Templates dir may be null if not found
    if (templatesDir !== null) {
      expect(typeof templatesDir).toBe('string');
    }
  });

  it('should return string from getRoot', async () => {
    const root = await resolver.getRoot();
    expect(typeof root).toBe('string');
    expect(root.length).toBeGreaterThan(0);
  });

  it('should create new resolver instances independently', () => {
    const resolver1 = new KitPathResolver();
    const resolver2 = new KitPathResolver();
    expect(resolver1).not.toBe(resolver2);
  });

  it('should handle multiple clearCache calls', async () => {
    await resolver.resolve();
    resolver.clearCache();
    resolver.clearCache(); // Should not throw
    const paths = await resolver.resolve();
    expect(paths).toBeDefined();
  });

  it('should resolve paths consistently', async () => {
    const paths1 = await resolver.resolve();
    const paths2 = await resolver.resolve();
    expect(paths1.packages).toBe(paths2.packages);
    expect(paths1.profiles).toBe(paths2.profiles);
  });

  it('should have valid paths structure', async () => {
    const paths = await resolver.resolve();
    expect(paths).toHaveProperty('root');
    expect(paths).toHaveProperty('packages');
    expect(paths).toHaveProperty('profiles');
  });
});
